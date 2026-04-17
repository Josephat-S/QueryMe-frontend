import React, { useEffect, useMemo, useState } from 'react';
import { courseApi, examApi, sessionApi, userApi, type Exam, type Session } from '../../api';
import { PageSkeleton } from '../../components/PageSkeleton';
import { extractErrorMessage } from '../../utils/errorUtils';
import { getUserDisplayName } from '../../utils/queryme';

interface ActivityRow {
  id: string;
  event: 'EXAM_CREATED' | 'STUDENT_FINISHED';
  examTitle: string;
  actorName: string;
  statusLabel: string;
  occurredAt: string;
}

const ROWS_PER_PAGE = 8;

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
);

const getText = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return undefined;
};

const getKnownIdentifiers = (value: unknown): string[] => {
  const record = asRecord(value);
  const keys = ['id', 'uuid', 'userId', 'user_id', 'authUserId', 'auth_user_id', 'studentId', 'student_id', 'teacherId', 'teacher_id', 'publicId'];
  const nestedUser = asRecord(record.user);

  return [...keys, ...keys.map((key) => `user.${key}`)]
    .map((key) => {
      if (key.startsWith('user.')) {
        return nestedUser[key.replace('user.', '')];
      }

      return record[key];
    })
    .map((candidate) => (typeof candidate === 'number' ? String(candidate) : getText(candidate)))
    .filter((candidate): candidate is string => Boolean(candidate));
};

const getPossiblePersonName = (value: unknown): string | undefined => {
  const record = asRecord(value);
  const nestedUser = asRecord(record.user);
  const keys = ['studentName', 'student_name', 'teacherName', 'teacher_name', 'name', 'fullName', 'full_name', 'createdByName', 'created_by_name'];

  for (const key of keys) {
    const candidate = getText(record[key]) || getText(nestedUser[key]);
    if (candidate) {
      return candidate;
    }
  }

  return undefined;
};

const SystemLogs: React.FC = () => {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadActivity = async () => {
      setLoading(true);
      setError(null);

      try {
        const [courses, teachers, students, publishedExams] = await Promise.all([
          courseApi.getCourses({ page: 1, pageSize: 20, signal: controller.signal }),
          userApi.getTeachers({ page: 1, pageSize: 50, signal: controller.signal }).catch(() => []),
          userApi.getStudents({ page: 1, pageSize: 50, signal: controller.signal }).catch(() => []),
          examApi.getPublishedExams({ page: 1, pageSize: 20, signal: controller.signal }).catch(() => []),
        ]);
        const courseById = new Map(courses.map((course) => [String(course.id), course]));

        const teacherById = new Map<string, (typeof teachers)[number]>();
        const studentById = new Map<string, (typeof students)[number]>();

        teachers.forEach((teacher) => {
          getKnownIdentifiers(teacher).forEach((identifier) => {
            teacherById.set(identifier, teacher);
          });
        });

        students.forEach((student) => {
          getKnownIdentifiers(student).forEach((identifier) => {
            studentById.set(identifier, student);
          });
        });

        // Combine published exams with some course-specific exams (first 5 courses)
        const additionalExams = await Promise.all(
          courses.slice(0, 5).map((course) => examApi.getExamsByCourse(String(course.id), { signal: controller.signal }).catch(() => [] as Exam[])),
        );
        const allExams = [...publishedExams, ...additionalExams.flat()];
        // De-duplicate exams by ID
        const exams = Array.from(new Map(allExams.map(exam => [String(exam.id), exam])).values());

        const createdEvents: ActivityRow[] = exams
          .filter((exam) => Boolean(exam.createdAt))
          .map((exam) => {
            const examRecord = asRecord(exam);
            const linkedCourse = courseById.get(String(exam.courseId));
            const linkedCourseRecord = asRecord(linkedCourse);
            const teacherFromExam = exam.teacher;
            const teacherFromExamCourse = exam.course?.teacherId ? teacherById.get(String(exam.course.teacherId)) : undefined;
            const teacherFromLinkedCourse = linkedCourse?.teacherId ? teacherById.get(String(linkedCourse.teacherId)) : undefined;
            const examCreatedById = [
              getText(examRecord.createdBy),
              getText(examRecord.createdById),
              getText(examRecord.created_by),
              getText(examRecord.created_by_id),
            ].find(Boolean);
            const teacherFromCreatedBy = examCreatedById ? teacherById.get(examCreatedById) : undefined;
            const directCreatorName = getPossiblePersonName(exam);
            const creatorCandidates = [
              directCreatorName,
              getText(asRecord(exam.course).teacherName),
              getText(linkedCourseRecord.teacherName),
              getText(linkedCourseRecord.teacher_name),
              getUserDisplayName(teacherFromCreatedBy),
              getUserDisplayName(teacherFromExam),
              getUserDisplayName(teacherFromExamCourse),
              getUserDisplayName(teacherFromLinkedCourse),
            ];
            const creatorName = creatorCandidates.find((candidate) => candidate && candidate !== 'Unknown User') || 'Unknown Person';

            return {
              id: `exam-created-${String(exam.id)}-${String(exam.createdAt)}`,
              event: 'EXAM_CREATED',
              examTitle: exam.title || 'Untitled Exam',
              actorName: creatorName === 'Unknown User' ? 'Unknown Person' : creatorName,
              statusLabel: 'CREATED',
              occurredAt: String(exam.createdAt),
            };
          });

        if (!controller.signal.aborted) {
          setRows(createdEvents);
        }

        // Fetch sessions for the first 10 exams using controlled chunks to avoid massive waterfall
        const examsToFetch = exams.slice(0, 10);
        const CHUNK_SIZE = 3;
        
        for (let i = 0; i < examsToFetch.length; i += CHUNK_SIZE) {
          const chunk = examsToFetch.slice(i, i + CHUNK_SIZE);
          if (controller.signal.aborted) break;

          const sessionLists = await Promise.all(
            chunk.map(async (exam) => {
              const sessions = await sessionApi.getSessionsByExam(String(exam.id), { page: 1, pageSize: 20, signal: controller.signal }).catch(() => [] as Session[]);

              return sessions
                .filter((session) => Boolean(session.submittedAt || session.isSubmitted))
                .map((session) => {
                  const sessionRecord = asRecord(session);
                  const sessionStudentIdentifiers = [String(session.studentId), ...getKnownIdentifiers(sessionRecord)];
                  const matchedStudent = sessionStudentIdentifiers
                    .map((identifier) => studentById.get(identifier))
                    .find(Boolean);
                  const inlineName = getPossiblePersonName(sessionRecord);
                  const studentName = inlineName || getUserDisplayName(matchedStudent);

                  return {
                    id: `session-finished-${String(session.id)}`,
                    event: 'STUDENT_FINISHED',
                    examTitle: exam.title || 'Untitled Exam',
                    actorName: studentName === 'Unknown User' ? 'Unknown Person' : studentName,
                    statusLabel: 'FINISHED',
                    occurredAt: String(session.submittedAt || session.startedAt || ''),
                  } satisfies ActivityRow;
                });
            }),
          );

          if (!controller.signal.aborted) {
            setRows((prev) => {
              const newRows = [...prev, ...sessionLists.flat()];
              // De-duplicate and sort
              return Array.from(new Map(newRows.map(r => [r.id, r])).values())
                .sort((left, right) => new Date(right.occurredAt || 0).getTime() - new Date(left.occurredAt || 0).getTime());
            });
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(extractErrorMessage(err, 'Failed to load operational activity.'));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadActivity();
    return () => controller.abort();
  }, []);

  const filteredRows = useMemo(
    () => rows.filter((row) => `${row.examTitle} ${row.actorName} ${row.statusLabel}`.toLowerCase().includes(search.toLowerCase())),
    [rows, search],
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(
    () => filteredRows.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE),
    [filteredRows, safePage],
  );

  if (loading) {
    return <PageSkeleton title="Operational Activity" rows={6} />;
  }

  return (
    <div>
      <div className="page-header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1>Operational Activity</h1>
          <p>Recent session lifecycle events derived from the exam and session modules.</p>
        </div>
      </div>

      {error && <div style={{ marginBottom: '16px', color: '#e53e3e' }}>{error}</div>}

      <div className="content-card">
        <div className="content-card-header" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="form-input w-full sm:w-auto"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by exam, person, or status..."
            style={{ width: '260px', maxWidth: '100%' }}
          />
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#666' }}>{filteredRows.length} entries</span>
        </div>
        <div className="content-card-body hidden md:block" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="data-table min-w-175">
            <thead>
              <tr>
                <th>Activity</th>
                <th>Exam</th>
                <th>Person</th>
                <th>Status</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.event === 'EXAM_CREATED' ? 'Exam Created' : 'Student Finished Exam'}</td>
                  <td>{row.examTitle}</td>
                  <td>{row.actorName}</td>
                  <td><span className="badge badge-gray">{row.statusLabel}</span></td>
                  <td>{new Date(row.occurredAt).toLocaleString()}</td>
                </tr>
              ))}
              {pagedRows.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
                    No operational activity matched the current search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 p-4 md:hidden">
          {pagedRows.map((row) => (
            <div key={`mobile-${row.id}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{row.event === 'EXAM_CREATED' ? 'Exam Created' : 'Student Finished Exam'}</div>
              <div className="mt-1 font-semibold text-slate-800">{row.examTitle}</div>
              <div className="mt-1 text-xs text-slate-500">{row.actorName}</div>
              <div className="mt-3 flex items-center justify-between">
                <span className="badge badge-gray">{row.statusLabel}</span>
                <span className="text-xs text-slate-500">{new Date(row.occurredAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
          {pagedRows.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
              No operational activity matched the current search.
            </div>
          )}
        </div>
        {filteredRows.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', padding: '16px 24px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Showing {Math.min((safePage - 1) * ROWS_PER_PAGE + 1, filteredRows.length)}-
              {Math.min(safePage * ROWS_PER_PAGE, filteredRows.length)} of {filteredRows.length}
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                className="btn btn-secondary btn-sm"
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((previous) => Math.max(1, previous - 1))}
              >
                Previous
              </button>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#4a5568' }}>
                Page {safePage} of {totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((previous) => Math.min(totalPages, previous + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemLogs;
