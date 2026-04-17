import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { courseApi, examApi, resultApi, type Exam, type TeacherResultRow } from '../../api';
import { useAuth } from '../../contexts';
import { extractErrorMessage } from '../../utils/errorUtils';
import { filterCoursesByTeacher, normalizeExamStatus } from '../../utils/queryme';
import { PageSkeleton } from '../../components/PageSkeleton';

interface RecentStudentActivity {
  studentId: string;
  studentName: string;
  submissionCount: number;
  latestSubmittedAt: string | null;
}

const getSubmissionTimestamp = (submittedAt?: string) => new Date(submittedAt || 0).getTime();

const TeacherHome: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    exams: 0,
    published: 0,
    drafts: 0,
    submissions: 0,
  });
  const [submissionRows, setSubmissionRows] = useState<TeacherResultRow[]>([]);
  const [courseExams, setCourseExams] = useState<Exam[]>([]);
  const [courseNamesById, setCourseNamesById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadDashboard = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const courses = await courseApi.getCourses({ page: 1, pageSize: 100, signal: controller.signal });
        const teacherCourses = filterCoursesByTeacher(courses, user.id);
        const nextCourseNamesById = teacherCourses.reduce<Record<string, string>>((acc, course) => {
          const id = String(course.id || '');
          const name = course.name?.trim();

          if (id && name) {
            acc[id] = name;
          }

          return acc;
        }, {});
        
        // Only fetch exams for the first 3 teacher courses for dashboard overview
        const coursesToFetch = teacherCourses.slice(0, 3);
        const examLists = await Promise.all(
          coursesToFetch.map((course) => examApi.getExamsByCourse(String(course.id), { signal: controller.signal }).catch(() => [] as Exam[])),
        );

        const exams = [...new Map(
          examLists
            .flat()
            .map((exam) => [String(exam.id), exam]),
        ).values()];
        const publishedExams = exams.filter((exam) => normalizeExamStatus(exam.status) === 'PUBLISHED');

        if (!controller.signal.aborted) {
          setStats((prev) => ({
            ...prev,
            exams: exams.length,
            published: publishedExams.length,
            drafts: exams.length - publishedExams.length,
          }));
          setCourseExams(exams);
          setCourseNamesById(nextCourseNamesById);
          setLoading(false); // Show stats and exams immediately
        }

        // Now fetch submissions in the background
        setLoadingSubmissions(true);
        const submissions = await resultApi.getResultsByTeacher(user.id, { page: 1, pageSize: 20, signal: controller.signal });

        if (!controller.signal.aborted) {
          setStats((prev) => ({
            ...prev,
            submissions: submissions.length,
          }));
          setSubmissionRows(submissions);
          setLoadingSubmissions(false);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(extractErrorMessage(err, 'Failed to load teacher dashboard data.'));
          setLoading(false);
          setLoadingSubmissions(false);
        }
      }
    };

    void loadDashboard();
    return () => controller.abort();
  }, [user]);

  const recentStudents = useMemo(() => {
    const studentsMap = new Map<string, RecentStudentActivity>();

    submissionRows.forEach((row) => {
      const studentId = String(row.studentId || '');
      const studentName = String(row.studentName || 'Unknown Student');

      if (!studentId) {
        return;
      }

      const existing = studentsMap.get(studentId);
      if (existing) {
        existing.submissionCount += 1;
        if (getSubmissionTimestamp(row.submittedAt) > getSubmissionTimestamp(existing.latestSubmittedAt || undefined)) {
          existing.latestSubmittedAt = row.submittedAt || null;
        }
      } else {
        studentsMap.set(studentId, {
          studentId,
          studentName,
          submissionCount: 1,
          latestSubmittedAt: row.submittedAt || null,
        });
      }
    });

    return Array.from(studentsMap.values())
      .sort((a, b) => getSubmissionTimestamp(b.latestSubmittedAt || undefined) - getSubmissionTimestamp(a.latestSubmittedAt || undefined))
      .slice(0, 5);
  }, [submissionRows]);

  const averageScore = useMemo(() => {
    const validRows = submissionRows.filter((row) => typeof row.score === 'number' && typeof row.maxScore === 'number');
    if (validRows.length === 0) {
      return 0;
    }

    return Math.round(
      validRows.reduce((sum, row) => sum + ((row.score || 0) / (row.maxScore || 1)) * 100, 0) / validRows.length,
    );
  }, [submissionRows]);

  const getDashboardCourseName = (exam: Exam): string => (
    exam.course?.name?.trim() || courseNamesById[String(exam.courseId)] || ''
  );

  if (loading) {
    return <PageSkeleton title="Teacher Dashboard" rows={5} />;
  }

  return (
    <div className="space-y-5 text-slate-700">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-6 text-slate-800 shadow-sm">
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(16,185,129,0.14), transparent 34%), radial-gradient(circle at bottom left, rgba(59,130,246,0.12), transparent 34%)' }}
        />
        <div className="relative flex flex-col gap-5">
          <div>
            <h1 className="m-0 text-3xl font-semibold tracking-tight text-slate-900">Teacher Dashboard</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">Live overview for your backend-connected exam workspace.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/teacher/courses" className="inline-flex items-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-400">Create Course</Link>
            <Link to="/teacher/students" className="inline-flex items-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-400">Register Students</Link>
            <Link to="/teacher/exams/builder" className="inline-flex items-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-400">Create New Exam</Link>
            <Link to="/teacher/exams" className="inline-flex items-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-400">Manage Exams</Link>
            <Link to="/teacher/courses" className="inline-flex items-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-400">Manage Courses</Link>
            <Link to="/teacher/sessions" className="inline-flex items-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-400">Live Sessions</Link>
            <Link to="/teacher/results" className="inline-flex items-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-400">Review Results</Link>
          </div>
        </div>
      </section>

      {error && <div style={{ marginBottom: '16px', color: '#e53e3e' }}>{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-3xl font-semibold tracking-tight text-slate-900">{stats.exams}</div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Total Exams</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-3xl font-semibold tracking-tight text-slate-900">{stats.published}</div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Published Exams</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-3xl font-semibold tracking-tight text-slate-900">{loadingSubmissions && stats.submissions === 0 ? '...' : stats.submissions}</div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tracked Submissions</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-3xl font-semibold tracking-tight text-slate-900">{loadingSubmissions ? '...' : `${averageScore}%`}</div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Recent Average</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="m-0 text-base font-semibold text-slate-800">Recent Students</h2>
            <Link to="/teacher/results" className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-700">See all -&gt;</Link>
          </div>
          <div className="px-5 py-2">
            {loadingSubmissions ? (
              <div className="py-6 text-sm text-slate-500">Loading student activity...</div>
            ) : (
              <>
                {recentStudents.map((student) => (
                  <div key={student.studentId} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">{student.studentName.charAt(0).toUpperCase() || '?'}</div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-semibold text-slate-800">{student.studentName}</span>
                      <span className="text-xs text-slate-500">Latest submission received</span>
                    </div>
                    <div className="ml-auto flex flex-col items-end">
                      <span className="text-sm font-semibold text-emerald-600">
                        {student.submissionCount} total
                      </span>
                      <span className="text-xs text-slate-400">
                        {student.latestSubmittedAt ? new Date(student.latestSubmittedAt).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
                {recentStudents.length === 0 && (
                  <div className="py-6 text-sm text-slate-500">Students with recent submissions will appear here.</div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="m-0 text-base font-semibold text-slate-800">Exams by Course</h2>
            <Link to="/teacher/exams" className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-700">Manage -&gt;</Link>
          </div>
          <div className="px-5 py-2">
            {courseExams.map((exam) => {
              const courseName = getDashboardCourseName(exam);

              return (
                <div key={String(exam.id)} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold text-slate-800">{exam.title}</span>
                    {courseName ? <span className="td-draft-course">{courseName}</span> : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${normalizeExamStatus(exam.status) === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {normalizeExamStatus(exam.status) || 'DRAFT'}
                    </span>
                  </div>
                </div>
              );
            })}
            {courseExams.length === 0 && (
              <div className="py-6 text-sm text-slate-500">Create your first course exam to populate this panel.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherHome;
