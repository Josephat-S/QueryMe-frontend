import React, { useEffect, useMemo, useState } from 'react';
import { courseApi, examApi, resultApi, sessionApi, type StudentExamResult } from '../../api';
import { PageSkeleton } from '../../components/PageSkeleton';
import { useAuth } from '../../contexts';
import { extractErrorMessage } from '../../utils/errorUtils';
import { formatDateTime } from '../../utils/queryme';

interface ResultRow {
  sessionId: string;
  examId: string;
  title: string;
  course: string;
  submittedAt: string;
  visible: boolean;
  totalScore: number;
  totalMaxScore: number;
  visibilityMode: string;
  questions: NonNullable<StudentExamResult['questions']>;
}

const MyResults: React.FC = () => {
  const { user } = useAuth();
  const [activeResult, setActiveResult] = useState<ResultRow | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadResults = async () => {
      if (!user) {
        setError('Please sign in to view your results.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [sessions, courses] = await Promise.all([
          sessionApi.getSessionsByStudent(user.id, controller.signal),
          courseApi.getCourses(controller.signal).catch(() => []),
        ]);
        const courseNamesById = new Map(courses.map((course) => [String(course.id), course.name]));

        const rows = await Promise.all(
          sessions.map(async (session) => {
            const [exam, sessionResult] = await Promise.all([
              examApi.getExam(String(session.examId), controller.signal).catch(() => null),
              resultApi.getSessionResult(String(session.id), controller.signal).catch(() => null),
            ]);
            const courseNameFromExam = exam?.course?.name?.trim();
            const courseNameFromMap = exam?.courseId ? courseNamesById.get(String(exam.courseId)) : undefined;

            return {
              sessionId: String(session.id),
              examId: String(session.examId),
              title: exam?.title || 'Exam',
              course: courseNameFromExam || courseNameFromMap || 'Unknown Course',
              submittedAt: session.submittedAt || session.startedAt || '',
              visible: sessionResult?.visible ?? false,
              totalScore: sessionResult?.totalScore ?? 0,
              totalMaxScore: sessionResult?.totalMaxScore ?? 0,
              visibilityMode: String(sessionResult?.visibilityMode || exam?.visibilityMode || 'N/A'),
              questions: sessionResult?.questions || [],
            } satisfies ResultRow;
          }),
        );

        if (!controller.signal.aborted) {
          setResults(
            rows.sort(
              (left, right) => new Date(right.submittedAt || 0).getTime() - new Date(left.submittedAt || 0).getTime(),
            ),
          );
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(extractErrorMessage(err, 'Failed to load your results.'));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadResults();

    return () => controller.abort();
  }, [user]);

  const visibleResults = useMemo(
    () => results.filter((result) => result.visible && result.totalMaxScore > 0),
    [results],
  );

  const averageScore = useMemo(() => {
    if (visibleResults.length === 0) {
      return 0;
    }

    return Math.round(
      visibleResults.reduce((sum, result) => sum + (result.totalScore / result.totalMaxScore) * 100, 0) / visibleResults.length,
    );
  }, [visibleResults]);

  if (loading) {
    return <PageSkeleton title="My Results" rows={6} />;
  }

  if (error) {
    return (
      <div>
        <div className="page-header">
          <h1>My Results</h1>
          <p>View your exam scores and released feedback.</p>
        </div>
        <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>{error}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>My Results</h1>
        <p>Only the results the backend marks as visible are shown in detail.</p>
      </div>

      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-card-value">{results.length}</div>
          <div className="stat-card-label">Total Sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{visibleResults.length}</div>
          <div className="stat-card-label">Visible Results</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{averageScore}%</div>
          <div className="stat-card-label">Average Visible Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{results.length - visibleResults.length}</div>
          <div className="stat-card-label">Awaiting Release</div>
        </div>
      </div>

      <div className="content-card">
        <div className="content-card-header">
          <h2>Session History</h2>
        </div>
        <div className="content-card-body hidden md:block" style={{ padding: 0 }}>
          <table className="data-table min-w-120">
            <thead>
              <tr>
                <th>Exam</th>
                <th>Submitted</th>
                <th>Visibility</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.sessionId}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1a1a2e' }}>{result.title}</div>
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{result.course}</div>
                    </td>
                    <td style={{ fontSize: '12px', color: '#666' }}>{formatDateTime(result.submittedAt)}</td>
                    <td>
                      <span className={`badge ${result.visible ? 'badge-green' : 'badge-gray'}`}>
                        {result.visible ? result.visibilityMode : 'Hidden'}
                      </span>
                    </td>
                    <td>
                      {result.visible ? (
                        <button
                          type="button"
                          aria-label={`View score details for ${result.title}`}
                          onClick={() => setActiveResult(result)}
                          style={{
                            minWidth: '110px',
                            justifyContent: 'center',
                            padding: '6px 12px',
                            borderRadius: '999px',
                            border: '1px solid #c4b5fd',
                            background: '#f5f3ff',
                            color: '#6a3cb0',
                            fontWeight: 700,
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          View {result.totalScore}/{result.totalMaxScore}
                        </button>
                      ) : (
                        <span style={{ color: '#888' }}>Awaiting release</span>
                      )}
                    </td>
                  </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
                    No exam sessions have been recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {results.map((result) => (
            <div key={`mobile-${result.sessionId}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="font-semibold text-slate-800">{result.title}</div>
              <div className="mt-1 text-xs text-slate-500">{result.course}</div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div><strong>Submitted:</strong> {formatDateTime(result.submittedAt)}</div>
                <div><strong>Visibility:</strong> {result.visible ? result.visibilityMode : 'Hidden'}</div>
              </div>
              <div className="mt-3">
                {result.visible ? (
                  <button
                    type="button"
                    aria-label={`View score details for ${result.title}`}
                    onClick={() => setActiveResult(result)}
                    className="inline-flex w-full items-center justify-center rounded-full border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700 underline"
                  >
                    View {result.totalScore}/{result.totalMaxScore}
                  </button>
                ) : (
                  <span className="text-sm text-slate-500">Awaiting release</span>
                )}
              </div>
            </div>
          ))}
          {results.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
              No exam sessions have been recorded yet.
            </div>
          )}
        </div>
      </div>

      {activeResult && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.52)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(3px)',
            padding: '20px',
          }}
          onClick={() => setActiveResult(null)}
          role="presentation"
        >
          <div
            className="content-card"
            style={{ width: 'min(980px, 100%)', maxHeight: '85vh', overflow: 'hidden' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="content-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ marginBottom: '4px' }}>{activeResult.title}</h2>
                <div style={{ fontSize: '12px', color: '#666' }}>{activeResult.course}</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveResult(null)}>
                Close
              </button>
            </div>

            <div className="content-card-body" style={{ overflowY: 'auto', maxHeight: 'calc(85vh - 96px)' }}>
              <div style={{ marginBottom: '14px', fontSize: '13px', color: '#4a5568' }}>
                Session score: <strong>{activeResult.totalScore}/{activeResult.totalMaxScore}</strong>
              </div>

              {activeResult.questions.length > 0 ? (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {activeResult.questions.map((question, index) => (
                    <div
                      key={String(question.questionId)}
                      style={{
                        border: '1px solid #e8e8ee',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        background: '#fff',
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#6a3cb0', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Question {index + 1}
                      </div>
                      <div style={{ fontSize: '13px', color: '#1a1a2e', fontWeight: 600, marginBottom: '10px' }}>
                        {question.prompt}
                      </div>
                      <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '8px' }}>
                        <strong>Answered:</strong> {question.submittedQuery?.trim() || 'No answer submitted.'}
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="badge badge-gray">Scored: {question.score ?? 0}/{question.maxScore ?? 0}</span>
                        <span className={`badge ${question.isCorrect ? 'badge-green' : 'badge-orange'}`}>
                          {question.isCorrect ? 'Correct' : 'Reviewed'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#666' }}>No question breakdown was returned for this session.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyResults;
