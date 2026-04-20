import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { examApi, type Exam, type TeacherResultRow } from '../../api';
import { useAuth } from '../../contexts';
import { normalizeExamStatus } from '../../utils/queryme';
import { PageSkeleton } from '../../components/PageSkeleton';
import { useTeacherCourses } from '../../hooks/useTeacherCourses';
import { useTeacherResults } from '../../hooks/useTeacherResults';

interface RecentStudentActivity {
  studentId: string;
  studentName: string;
  submissionCount: number;
  latestSubmittedAt: string | null;
}

const getSubmissionTimestamp = (submittedAt?: string) => new Date(submittedAt || 0).getTime();

const TeacherHome: React.FC = () => {
  const { user } = useAuth();

  const { data: courses, loading: coursesLoading, error: coursesError } = useTeacherCourses(user?.id);
  const { data: submissionRows, loading: resultsLoading, error: resultsError } = useTeacherResults(user?.id);

  // Fetch exams for first 3 courses in parallel — each is individually cached
  const firstThreeCourses = courses.slice(0, 3);
  const examQueries = useQueries({
    queries: firstThreeCourses.map((course) => ({
      queryKey: ['exams-by-course', String(course.id)],
      queryFn: ({ signal }: { signal?: AbortSignal }) =>
        examApi.getExamsByCourse(String(course.id), { signal }),
      staleTime: 60_000,
      enabled: firstThreeCourses.length > 0,
    })),
  });

  const loading = coursesLoading || resultsLoading || examQueries.some((q) => q.isLoading);
  const error = coursesError || resultsError || null;

  const courseExams = useMemo<Exam[]>(() => {
    const allExams = examQueries.flatMap((q) => q.data ?? []);
    // Deduplicate by id
    return [...new Map(allExams.map((exam) => [String(exam.id), exam])).values()];
  }, [examQueries]);

  const courseNamesById = useMemo<Record<string, string>>(() => (
    courses.reduce<Record<string, string>>((acc, course) => {
      const id = String(course.id || '');
      const name = course.name?.trim();
      if (id && name) acc[id] = name;
      return acc;
    }, {})
  ), [courses]);

  const stats = useMemo(() => {
    const published = courseExams.filter((e) => normalizeExamStatus(e.status) === 'PUBLISHED').length;
    return {
      exams: courseExams.length,
      published,
      drafts: courseExams.length - published,
      submissions: submissionRows.length,
    };
  }, [courseExams, submissionRows]);

  const recentStudents = useMemo<RecentStudentActivity[]>(() => {
    const studentsMap = new Map<string, RecentStudentActivity>();

    (submissionRows as TeacherResultRow[]).forEach((row) => {
      const studentId = String(row.studentId || '');
      const studentName = String(row.studentName || 'Unknown Student');

      if (!studentId) return;

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
    const validRows = (submissionRows as TeacherResultRow[]).filter(
      (row) => typeof row.score === 'number' && typeof row.maxScore === 'number',
    );
    if (validRows.length === 0) return 0;
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
          <div className="text-3xl font-semibold tracking-tight text-slate-900">{stats.submissions}</div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tracked Submissions</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-3xl font-semibold tracking-tight text-slate-900">{`${averageScore}%`}</div>
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
            <>
              {recentStudents.map((student) => (
                <div key={student.studentId} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">{student.studentName.charAt(0).toUpperCase() || '?'}</div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold text-slate-800">{student.studentName}</span>
                    <span className="text-xs text-slate-500">Latest submission received</span>
                  </div>
                  <div className="ml-auto flex flex-col items-end">
                    <span className="text-sm font-semibold text-emerald-600">{student.submissionCount} total</span>
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
