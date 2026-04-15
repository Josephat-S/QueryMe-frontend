import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { examApi, resultApi, sessionApi, type Exam, type StudentExamResult } from '../../api';
import { PageSkeleton } from '../../components/PageSkeleton';
import { useAuth } from '../../contexts';
import { extractErrorMessage } from '../../utils/errorUtils';
import {
  formatDateTime,
  getCourseName,
  getExamTimeLimit,
  isSessionComplete,
  normalizeExamStatus,
} from '../../utils/queryme';

interface UpcomingExamItem {
  id: string;
  title: string;
  course: string;
  duration: string;
  visibilityMode: string;
  actionLabel: string;
  actionDisabled: boolean;
  actionState: 'START' | 'REATTEMPT' | 'ATTEMPTED' | 'CLOSED';
  attemptsSummary: string;
}

interface RecentResultItem {
  sessionId: string;
  examId: string;
  title: string;
  course: string;
  submittedAt: string;
  score: number;
  total: number;
  visible: boolean;
  statusLabel: string;
}

const StudentHome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [upcomingExams, setUpcomingExams] = useState<UpcomingExamItem[]>([]);
  const [recentResults, setRecentResults] = useState<RecentResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadDashboard = async () => {
      if (!user) {
        setError('Please sign in to see your dashboard.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [publishedExams, sessions] = await Promise.all([
          examApi.getPublishedExams(controller.signal),
          sessionApi.getSessionsByStudent(user.id, controller.signal),
        ]);

        if (controller.signal.aborted) {
          return;
        }

        const completedAttemptsByExam = sessions.reduce<Record<string, number>>((accumulator, session) => {
          if (!isSessionComplete(session)) {
            return accumulator;
          }

          const examId = String(session.examId);
          accumulator[examId] = (accumulator[examId] || 0) + 1;
          return accumulator;
        }, {});

        setUpcomingExams(
          publishedExams
            .map((exam) => ({
              id: String(exam.id),
              title: exam.title,
              course: getCourseName(exam.course, exam.courseId),
              duration: getExamTimeLimit(exam) ? `${getExamTimeLimit(exam)} min` : 'No limit',
              visibilityMode: String(exam.visibilityMode || 'N/A'),
              ...(() => {
                const examId = String(exam.id);
                const attemptsUsed = completedAttemptsByExam[examId] || 0;
                const maxAttempts = Math.max(1, Number(exam.maxAttempts || 1));
                const status = normalizeExamStatus(exam.status);

                if (status === 'CLOSED') {
                  return {
                    actionLabel: 'Closed',
                    actionDisabled: true,
                    actionState: 'CLOSED' as const,
                    attemptsSummary: `Attempts: ${Math.min(attemptsUsed, maxAttempts)}/${maxAttempts}`,
                  };
                }

                if (attemptsUsed <= 0) {
                  return {
                    actionLabel: 'Start',
                    actionDisabled: false,
                    actionState: 'START' as const,
                    attemptsSummary: `Attempts: 0/${maxAttempts}`,
                  };
                }

                if (attemptsUsed < maxAttempts) {
                  return {
                    actionLabel: 'Re-attempt',
                    actionDisabled: false,
                    actionState: 'REATTEMPT' as const,
                    attemptsSummary: `Attempts: ${attemptsUsed}/${maxAttempts}`,
                  };
                }

                return {
                  actionLabel: 'Attempted',
                  actionDisabled: true,
                  actionState: 'ATTEMPTED' as const,
                  attemptsSummary: `Attempts: ${maxAttempts}/${maxAttempts}`,
                };
              })(),
            })),
        );

        const publishedExamById = new Map(publishedExams.map((exam) => [String(exam.id), exam]));

        const recentSessionDetails = await Promise.all(
          [...sessions]
            .sort((left, right) => {
              const leftTime = new Date(left.submittedAt || left.startedAt || 0).getTime();
              const rightTime = new Date(right.submittedAt || right.startedAt || 0).getTime();
              return rightTime - leftTime;
            })
            .slice(0, 4)
            .map(async (session) => {
              const exam = publishedExamById.get(String(session.examId)) || null as Exam | null;
              const result = await resultApi.getSessionResult(String(session.id), controller.signal).catch(() => null as StudentExamResult | null);

              return {
                session,
                exam,
                result,
              };
            }),
        );

        if (controller.signal.aborted) {
          return;
        }

        setRecentResults(
          recentSessionDetails.map(({ session, exam, result }) => {
            const total = result?.totalMaxScore ?? 0;
            const score = result?.totalScore ?? 0;
            const visible = result?.visible ?? false;
            const statusLabel = visible
              ? total > 0 && score >= total / 2
                ? 'Passed'
                : 'Reviewed'
              : (session.isSubmitted || session.submittedAt) ? 'Awaiting release' : 'In progress';

            return {
              sessionId: String(session.id),
              examId: String(session.examId),
              title: exam?.title || 'Exam',
              course: getCourseName(exam?.course, exam?.courseId),
              submittedAt: session.submittedAt || session.startedAt || '',
              score,
              total,
              visible,
              statusLabel,
            };
          }),
        );
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(extractErrorMessage(err, 'Unable to load your dashboard.'));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => controller.abort();
  }, [user]);

  const averageScore = useMemo(() => {
    const visibleResults = recentResults.filter((result) => result.visible && result.total > 0);
    if (visibleResults.length === 0) {
      return 0;
    }

    return Math.round(
      visibleResults.reduce((sum, result) => sum + (result.score / result.total) * 100, 0) / visibleResults.length,
    );
  }, [recentResults]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Good morning';
    }
    if (hour < 17) {
      return 'Good afternoon';
    }
    return 'Good evening';
  };

  const getActionButtonClass = (state: UpcomingExamItem['actionState']) => {
    if (state === 'START') {
      return 'inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:from-indigo-700 hover:to-violet-700';
    }

    return 'inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700';
  };

  const getActionButtonStyle = (state: UpcomingExamItem['actionState']): React.CSSProperties | undefined => {
    if (state === 'REATTEMPT') {
      return {
        background: '#ddf4ff',
        borderColor: '#90cdf4',
        color: '#1e3a8a',
      };
    }

    if (state === 'ATTEMPTED') {
      return {
        background: '#f3f4f6',
        borderColor: '#d1d5db',
        color: '#6b7280',
      };
    }

    if (state === 'CLOSED') {
      return {
        background: '#fee2e2',
        borderColor: '#fca5a5',
        color: '#991b1b',
      };
    }

    return undefined;
  };

  if (loading) {
    return <PageSkeleton title={`${getGreeting()}, ${user?.name?.split(' ')[0] || 'Student'}`} rows={5} />;
  }

  if (error) {
    return (
      <div className="space-y-5 text-left">
        <div className="mb-5">
          <h1 className="m-0 text-3xl font-semibold tracking-tight text-slate-800">Student Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Review your available exams and recent session outcomes.</p>
        </div>
        <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-left">
      <div className="mb-5">
        <h1 className="m-0 text-3xl font-semibold tracking-tight text-slate-800">{getGreeting()}, {user?.name?.split(' ')[0] || 'Student'}</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-3xl font-bold text-slate-800">{upcomingExams.length}</div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">Available Exams</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-3xl font-bold text-slate-800">{recentResults.length}</div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">Recent Sessions</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-3xl font-bold text-slate-800">{averageScore}%</div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">Visible Average</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-3xl font-bold text-slate-800">
            {recentResults.filter((result) => result.visible).length}
          </div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">Released Results</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="m-0 text-lg font-semibold text-slate-800">Available Exams</h2>
            <button className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700" onClick={() => navigate('/student/exams')}>
              View All
            </button>
          </div>
          <div className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="bg-slate-50 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-violet-700">Exam</th>
                  <th className="bg-slate-50 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-violet-700">Duration</th>
                  <th className="bg-slate-50 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-violet-700">Visibility</th>
                  <th className="bg-slate-50 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-violet-700"></th>
                </tr>
              </thead>
              <tbody>
                {upcomingExams.map((exam) => (
                  <tr key={exam.id}>
                    <td className="border-t border-slate-100 px-3 py-2.5">
                      <div style={{ fontWeight: 600, color: '#1a1a2e' }}>{exam.title}</div>
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{exam.course}</div>
                    </td>
                    <td className="border-t border-slate-100 px-3 py-2.5">{exam.duration}</td>
                    <td className="border-t border-slate-100 px-3 py-2.5">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{exam.visibilityMode}</span>
                    </td>
                    <td className="border-t border-slate-100 px-3 py-2.5">
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <button
                          className={getActionButtonClass(exam.actionState)}
                          style={getActionButtonStyle(exam.actionState)}
                          onClick={() => navigate(`/student/exam-session/${exam.id}`)}
                          disabled={exam.actionDisabled}
                        >
                          {exam.actionLabel}
                        </button>
                        <span style={{ fontSize: '11px', color: '#888' }}>{exam.attemptsSummary}</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {upcomingExams.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
                      No published exams are available right now.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="m-0 text-lg font-semibold text-slate-800">Recent Results</h2>
            <button className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700" onClick={() => navigate('/student/results')}>
              View All
            </button>
          </div>
          <div className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="bg-slate-50 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-violet-700">Exam</th>
                  <th className="bg-slate-50 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-violet-700">Submitted</th>
                  <th className="bg-slate-50 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-violet-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentResults.map((result) => (
                  <tr key={result.sessionId}>
                    <td className="border-t border-slate-100 px-3 py-2.5">
                      <div style={{ fontWeight: 600, color: '#1a1a2e' }}>{result.title}</div>
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{result.course}</div>
                    </td>
                    <td className="border-t border-slate-100 px-3 py-2.5" style={{ fontSize: '12px' }}>{formatDateTime(result.submittedAt)}</td>
                    <td className="border-t border-slate-100 px-3 py-2.5">
                      {result.visible ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          {result.score}/{result.total}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{result.statusLabel}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {recentResults.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
                      Your recent session history will appear here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentHome;
