import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseApi, examApi, type Course, type Exam } from '../../api';
import { PageSkeleton } from '../../components/PageSkeleton';
import { useAuth } from '../../contexts';
import { useToast } from '../../components/ToastContext';
import { extractErrorMessage } from '../../utils/errorUtils';
import { filterCoursesByTeacher, normalizeExamStatus } from '../../utils/queryme';

interface ExamRow {
  id: string;
  title: string;
  course: string;
  status: string;
  questionsCount: number;
  maxAttempts: number;
  visibilityMode: string;
}

const ExamsList: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyExamId, setBusyExamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    if (!user) {
      setExams([]);
      return;
    }

    const allCourses = await courseApi.getCourses({ page: 1, pageSize: 100, signal });
    const accessibleCourses = filterCoursesByTeacher(allCourses, user.id);

    // Fetch exams in chunks to avoid overwhelming the browser connection pool
    const uniqueExams: Exam[] = [];
    const CHUNK_SIZE = 5;
    for (let i = 0; i < accessibleCourses.length; i += CHUNK_SIZE) {
      const chunk = accessibleCourses.slice(i, i + CHUNK_SIZE);
      if (signal?.aborted) break;

      const examLists = await Promise.all(
        chunk.map((course) =>
          examApi.getExamsByCourse(String(course.id), { signal }).catch(() => [] as Exam[]),
        ),
      );

      examLists.flat().forEach((exam) => {
        if (!uniqueExams.find(existing => String(existing.id) === String(exam.id))) {
          uniqueExams.push(exam);
        }
      });
    }

    const courseNamesById = accessibleCourses.reduce<Record<string, string>>((acc, course) => {
      const id = String(course.id || '');
      const name = course.name?.trim();

      if (id && name) {
        acc[id] = name;
      }

      return acc;
    }, {});

    // We'll skip upfront question counts for all exams to speed up load.
    // If the backend didn't include them, we show a dash or 0.
    
    const rows = uniqueExams
      .map((exam) => ({
        id: String(exam.id),
        title: exam.title,
        course: exam.course?.name?.trim() || courseNamesById[String(exam.courseId)] || 'Unknown Course',
        status: normalizeExamStatus(exam.status) || 'DRAFT',
        questionsCount: exam.questions?.length ?? 0,
        maxAttempts: exam.maxAttempts ?? 1,
        visibilityMode: String(exam.visibilityMode || 'N/A'),
      }))
      .sort((left, right) => left.title.localeCompare(right.title));

    setCourses(accessibleCourses);
    setExams(rows);
  }, [user]);

  useEffect(() => {
    const controller = new AbortController();

    void loadData(controller.signal)
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(extractErrorMessage(err, 'Failed to load your exams.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [loadData]);

  const stats = useMemo(() => ({
    total: exams.length,
    published: exams.filter((exam) => exam.status === 'PUBLISHED').length,
    drafts: exams.filter((exam) => exam.status === 'DRAFT').length,
    closed: exams.filter((exam) => exam.status === 'CLOSED').length,
  }), [exams]);

  const runAction = async (examId: string, action: 'publish' | 'unpublish' | 'close' | 'delete') => {
    setBusyExamId(examId);
    setError(null);

    try {
      if (action === 'publish') {
        await examApi.publishExam(examId);
      } else if (action === 'unpublish') {
        await examApi.unpublishExam(examId);
      } else if (action === 'close') {
        await examApi.closeExam(examId);
      } else {
        await examApi.deleteExam(examId);
      }

      await loadData();
      showToast('success', 'Exam updated', `The exam action "${action}" completed successfully.`);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update the selected exam.'));
    } finally {
      setBusyExamId(null);
    }
  };

  if (loading) {
    return <PageSkeleton title="Exams" rows={6} />;
  }

  return (
    <div className="teacher-page space-y-5 p-4 text-slate-700 sm:p-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-6 text-slate-800 shadow-sm">
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(16,185,129,0.14), transparent 34%), radial-gradient(circle at bottom left, rgba(59,130,246,0.12), transparent 34%)' }}
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="m-0 text-3xl font-semibold tracking-tight text-slate-900">Exams</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Manage exams from the backend course catalog and publish them when ready.
            </p>
          </div>
          <button className="inline-flex items-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-400" onClick={() => navigate('/teacher/exams/builder')}>
            Create New Exam
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-3xl font-semibold tracking-tight text-slate-900">{stats.total}</div><div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Total Exams</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-3xl font-semibold tracking-tight text-slate-900">{stats.published}</div><div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Published</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-3xl font-semibold tracking-tight text-slate-900">{stats.drafts}</div><div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Drafts</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-3xl font-semibold tracking-tight text-slate-900">{courses.length}</div><div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Courses</div></div>
      </div>

      {error && (
        <div style={{ marginBottom: '16px', color: '#e53e3e', fontSize: '13px' }}>{error}</div>
      )}

      {exams.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          No exams were returned from your accessible courses yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-220 text-sm">
            <thead>
              <tr>
                <th className="bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-violet-700">Exam</th>
                <th className="bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-violet-700">Questions</th>
                <th className="bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-violet-700">Max Attempts</th>
                <th className="bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-violet-700">Visibility</th>
                <th className="bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-violet-700">Status</th>
                <th className="bg-slate-50 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-violet-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr key={exam.id}>
                  <td className="border-t border-slate-100 px-4 py-3">
                    <div className="font-semibold text-slate-800">{exam.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{exam.course}</div>
                  </td>
                  <td className="border-t border-slate-100 px-4 py-3 text-slate-700">{exam.questionsCount}</td>
                  <td className="border-t border-slate-100 px-4 py-3 text-slate-700">{exam.maxAttempts}</td>
                  <td className="border-t border-slate-100 px-4 py-3 text-slate-700">{exam.visibilityMode}</td>
                  <td className="border-t border-slate-100 px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${exam.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' : exam.status === 'CLOSED' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                      {exam.status}
                    </span>
                  </td>
                  <td className="border-t border-slate-100 px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700" onClick={() => navigate(`/teacher/exams/builder/${exam.id}`)}>
                        Edit
                      </button>
                      {exam.status === 'DRAFT' && (
                        <button className="inline-flex items-center rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60" disabled={busyExamId === exam.id} onClick={() => void runAction(exam.id, 'publish')}>
                          Publish
                        </button>
                      )}
                      {exam.status === 'PUBLISHED' && (
                        <>
                          <button className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={busyExamId === exam.id} onClick={() => void runAction(exam.id, 'unpublish')}>
                            Unpublish
                          </button>
                          <button className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={busyExamId === exam.id} onClick={() => void runAction(exam.id, 'close')}>
                            Close
                          </button>
                        </>
                      )}
                      {exam.status === 'DRAFT' && (
                        <button className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60" disabled={busyExamId === exam.id} onClick={() => void runAction(exam.id, 'delete')}>
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>

          <div className="space-y-3 p-4 md:hidden">
            {exams.map((exam) => (
              <div key={`mobile-${exam.id}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="font-semibold text-slate-800">{exam.title}</div>
                <div className="mt-1 text-xs text-slate-500">{exam.course}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div><strong>Questions:</strong> {exam.questionsCount}</div>
                  <div><strong>Attempts:</strong> {exam.maxAttempts}</div>
                  <div><strong>Visibility:</strong> {exam.visibilityMode}</div>
                  <div><strong>Status:</strong> {exam.status}</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700" onClick={() => navigate(`/teacher/exams/builder/${exam.id}`)}>
                    Edit
                  </button>
                  {exam.status === 'DRAFT' && (
                    <button className="inline-flex items-center rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60" disabled={busyExamId === exam.id} onClick={() => void runAction(exam.id, 'publish')}>
                      Publish
                    </button>
                  )}
                  {exam.status === 'PUBLISHED' && (
                    <>
                      <button className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={busyExamId === exam.id} onClick={() => void runAction(exam.id, 'unpublish')}>
                        Unpublish
                      </button>
                      <button className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={busyExamId === exam.id} onClick={() => void runAction(exam.id, 'close')}>
                        Close
                      </button>
                    </>
                  )}
                  {exam.status === 'DRAFT' && (
                    <button className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60" disabled={busyExamId === exam.id} onClick={() => void runAction(exam.id, 'delete')}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamsList;
