import React from 'react';
import { useNavigate } from 'react-router-dom';
import { resultApi, type Exam, type Session } from '../../api';
import { PageSkeleton } from '../../components/PageSkeleton';
import { usePublishedExams } from '../../hooks/usePublishedExams';
import { useStudentSessions } from '../../hooks/useStudentSessions';
import { useAuth } from '../../contexts';
import { getExamTimeLimit, isSessionComplete, normalizeExamStatus } from '../../utils/queryme';

type ExamActionState = 'START' | 'REATTEMPT' | 'ATTEMPTED' | 'CLOSED';

interface ExamCardView {
  id: string;
  title: string;
  description: string;
  publishedAt?: string;
  visibilityMode: string;
  courseName: string;
  durationMins: number;
  maxAttempts: number;
  actionLabel: string;
  actionState: ExamActionState;
  actionDisabled: boolean;
  attemptsSummary: string;
  marksLabel: string;
  sortRank: number;
}

const EMPTY_EXAMS: Exam[] = [];
const EMPTY_SESSIONS: Session[] = [];

const AvailableExams: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, refresh } = usePublishedExams();
  const {
    data: sessionsData,
    loading: sessionsLoading,
    error: sessionsError,
    refresh: refreshSessions,
  } = useStudentSessions(user?.id);

  const exams = data ?? EMPTY_EXAMS;
  const sessions = sessionsData ?? EMPTY_SESSIONS;
  const [marksByExamId, setMarksByExamId] = React.useState<Record<string, string>>({});
  const [pendingStartExam, setPendingStartExam] = React.useState<Pick<ExamCardView, 'id' | 'title' | 'durationMins'> | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();

    const loadLatestExamMarks = async () => {
      const completedByExam = new Map<string, typeof sessions[number]>();

      sessions
        .filter((session) => isSessionComplete(session))
        .forEach((session) => {
          const examId = String(session.examId);
          const current = completedByExam.get(examId);

          if (!current) {
            completedByExam.set(examId, session);
            return;
          }

          const currentTime = new Date(current.submittedAt || current.startedAt || 0).getTime();
          const nextTime = new Date(session.submittedAt || session.startedAt || 0).getTime();

          if (nextTime > currentTime) {
            completedByExam.set(examId, session);
          }
        });

      const completedSessions = [...completedByExam.entries()];
      const marksEntries: [string, string][] = [];
      const CHUNK_SIZE = 4;

      for (let i = 0; i < Math.min(completedSessions.length, 12); i += CHUNK_SIZE) {
        const chunk = completedSessions.slice(i, i + CHUNK_SIZE);
        if (controller.signal.aborted) break;

        const results = await Promise.all(
          chunk.map(async ([examId, latestSession]) => {
            try {
              const result = await resultApi.getSessionResult(String(latestSession.id), controller.signal);

              if (result.totalMaxScore != null && result.totalMaxScore > 0 && result.totalScore != null) {
                return [examId, `${result.totalScore}/${result.totalMaxScore}`] as [string, string];
              }

              return [examId, 'N/A'] as [string, string];
            } catch {
              return [examId, 'N/A'] as [string, string];
            }
          }),
        );
        marksEntries.push(...results);
      }

      if (!controller.signal.aborted) {
        setMarksByExamId(Object.fromEntries(marksEntries));
      }
    };

    void loadLatestExamMarks();
    return () => controller.abort();
  }, [sessions]);

  const examCards = React.useMemo<ExamCardView[]>(() => {
    const completedAttemptsByExam = sessions.reduce<Record<string, number>>((accumulator, session) => {
      if (!isSessionComplete(session)) {
        return accumulator;
      }

      const examId = String(session.examId);
      accumulator[examId] = (accumulator[examId] || 0) + 1;
      return accumulator;
    }, {});

    return exams
      .map((exam) => {
        const id = String(exam.id);
        const attemptsUsed = completedAttemptsByExam[id] || 0;
        const maxAttempts = Math.max(1, Number(exam.maxAttempts || 1));
        const status = normalizeExamStatus(exam.status);

        if (status === 'CLOSED') {
          return {
            id,
            title: exam.title,
            description: exam.description || 'No description provided.',
            publishedAt: exam.publishedAt,
            visibilityMode: String(exam.visibilityMode || 'N/A'),
            courseName: exam.course?.name?.trim() || 'Unknown Course',
            durationMins: getExamTimeLimit(exam),
            maxAttempts,
            actionLabel: 'Closed',
            actionState: 'CLOSED' as const,
            actionDisabled: true,
            attemptsSummary: `Attempts: ${Math.min(attemptsUsed, maxAttempts)}/${maxAttempts}`,
            marksLabel: marksByExamId[id] || 'N/A',
            sortRank: 2,
          };
        }

        if (attemptsUsed <= 0) {
          return {
            id,
            title: exam.title,
            description: exam.description || 'No description provided.',
            publishedAt: exam.publishedAt,
            visibilityMode: String(exam.visibilityMode || 'N/A'),
            courseName: exam.course?.name?.trim() || 'Unknown Course',
            durationMins: getExamTimeLimit(exam),
            maxAttempts,
            actionLabel: 'Start',
            actionState: 'START' as const,
            actionDisabled: false,
            attemptsSummary: `Attempts: 0/${maxAttempts}`,
            marksLabel: '',
            sortRank: 0,
          };
        }

        if (attemptsUsed < maxAttempts) {
          return {
            id,
            title: exam.title,
            description: exam.description || 'No description provided.',
            publishedAt: exam.publishedAt,
            visibilityMode: String(exam.visibilityMode || 'N/A'),
            courseName: exam.course?.name?.trim() || 'Unknown Course',
            durationMins: getExamTimeLimit(exam),
            maxAttempts,
            actionLabel: 'Re-attempt',
            actionState: 'REATTEMPT' as const,
            actionDisabled: false,
            attemptsSummary: `Attempts: ${attemptsUsed}/${maxAttempts}`,
            marksLabel: marksByExamId[id] || 'N/A',
            sortRank: 0,
          };
        }

        return {
          id,
          title: exam.title,
          description: exam.description || 'No description provided.',
          publishedAt: exam.publishedAt,
          visibilityMode: String(exam.visibilityMode || 'N/A'),
          courseName: exam.course?.name?.trim() || 'Unknown Course',
          durationMins: getExamTimeLimit(exam),
          maxAttempts,
          actionLabel: 'Attempted',
          actionState: 'ATTEMPTED' as const,
          actionDisabled: true,
          attemptsSummary: `Attempts: ${maxAttempts}/${maxAttempts}`,
          marksLabel: marksByExamId[id] || 'N/A',
          sortRank: 1,
        };
      })
      .sort((left, right) => (
        left.sortRank - right.sortRank
        || left.title.localeCompare(right.title)
      ));
  }, [exams, marksByExamId, sessions]);

  const isLoading = loading || sessionsLoading;
  const pageError = error || sessionsError;

  const getActionButtonClass = (state: ExamActionState) => {
    if (state === 'START') {
      return 'btn btn-primary';
    }

    return 'btn btn-secondary';
  };

  const getActionButtonStyle = (state: ExamActionState): React.CSSProperties | undefined => {
    if (state === 'REATTEMPT') {
      return { background: '#ddf4ff', borderColor: '#90cdf4', color: '#1e3a8a' };
    }

    if (state === 'ATTEMPTED') {
      return { background: '#f3f4f6', borderColor: '#d1d5db', color: '#6b7280' };
    }

    if (state === 'CLOSED') {
      return { background: '#fee2e2', borderColor: '#fca5a5', color: '#991b1b' };
    }

    return undefined;
  };

  const handleExamAction = (exam: ExamCardView) => {
    if (exam.actionState === 'START') {
      setPendingStartExam({
        id: exam.id,
        title: exam.title,
        durationMins: exam.durationMins,
      });
      return;
    }

    navigate(`/student/exam-session/${exam.id}`);
  };

  if (isLoading) {
    return <PageSkeleton title="Available Exams" rows={6} />;
  }

  if (pageError) {
    return (
      <div>
        <div className="page-header">
          <h1>Available Exams</h1>
          <p>View and start the exams assigned to you.</p>
        </div>
        <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>
          <div>{pageError}</div>
          <button
            className="btn btn-primary"
            style={{ marginTop: '18px' }}
            onClick={() => {
              void Promise.all([refresh(), refreshSessions()]);
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Available Exams</h1>
        <p>These exams are loaded directly from the published exam feed.</p>
      </div>

      {examCards.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          No published exams are currently visible to you.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: '18px' }}>
          {examCards.map((exam) => (
            <div key={exam.id} className="content-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="content-card-body" style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span className={`badge ${exam.actionState === 'CLOSED' ? 'badge-red' : 'badge-green'}`}>
                    {exam.actionState === 'CLOSED' ? 'Closed' : 'Published'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#888' }}>
                    {exam.publishedAt ? new Date(exam.publishedAt).toLocaleDateString() : 'No publish date'}
                  </span>
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 6px', overflowWrap: 'anywhere' }}>{exam.title}</h3>
                <p style={{ fontSize: '12px', color: '#888', margin: '0 0 14px', lineHeight: 1.5 }}>
                  {exam.description || 'No description provided.'}
                </p>

                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#666', marginBottom: '14px', flexWrap: 'wrap' }}>
                  <span>Course: {exam.courseName}</span>
                  <span>Visibility: {String(exam.visibilityMode || 'N/A')}</span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', fontSize: '12px', color: '#888', padding: '10px 0', borderTop: '1px solid #f0f0f5' }}>
                  <span><strong style={{ color: '#333' }}>{exam.durationMins || 'N/A'}</strong> Min Time</span>
                  <span><strong style={{ color: '#333' }}>{exam.maxAttempts}</strong> Max Attempts</span>
                </div>
              </div>

              <div style={{ padding: '0 22px 22px' }}>
                <button
                  className={getActionButtonClass(exam.actionState)}
                  style={{ width: '100%', justifyContent: 'center', ...getActionButtonStyle(exam.actionState) }}
                  onClick={() => handleExamAction(exam)}
                  disabled={exam.actionDisabled}
                >
                  {exam.actionLabel}
                </button>
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#888', textAlign: 'center' }}>{exam.attemptsSummary}</div>
                {exam.actionState !== 'START' && (
                  <div style={{ marginTop: '8px', textAlign: 'center' }}>
                    <span className="badge badge-green">Marks: {exam.marksLabel}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingStartExam && (
        <div
          className="student-start-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'grid',
            placeItems: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            padding: '16px',
          }}
          role="presentation"
          onClick={() => setPendingStartExam(null)}
        >
          <div
            className="student-start-modal"
            style={{
              width: '100%',
              maxWidth: '420px',
              borderRadius: '16px',
              backgroundColor: 'white',
              padding: 'clamp(16px, 3.5vw, 32px)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="start-exam-title"
            aria-describedby="start-exam-description"
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div
                style={{
                  display: 'inline-grid',
                  placeItems: 'center',
                  width: '64px',
                  height: '64px',
                  borderRadius: '9999px',
                  background: 'linear-gradient(135deg, #c7d2fe 0%, #ddd6fe 100%)',
                  color: '#4f46e5',
                  fontSize: '32px',
                  fontWeight: 900,
                  marginBottom: '18px',
                  boxShadow: '0 4px 6px rgba(79, 70, 229, 0.12)',
                }}
              >
                ?
              </div>
              <h3 id="start-exam-title" style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 700, color: '#1e293b' }}>
                Ready to begin?
              </h3>
              <p id="start-exam-description" style={{ margin: 0, fontSize: '15px', color: '#64748b', lineHeight: 1.6 }}>
                You're about to start <strong>{pendingStartExam.title}</strong>
                <br />
                Duration: <strong>{pendingStartExam.durationMins || 'N/A'} min</strong>
              </p>
            </div>
            <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '16px', marginBottom: '24px', borderLeft: '4px solid #4f46e5' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
                This action will lock in your attempt and open the exam session. You cannot pause or navigate away once started.
              </p>
            </div>
            <div className="student-start-modal-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                onClick={() => setPendingStartExam(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: '1.5px solid #cbd5e1',
                  backgroundColor: 'white',
                  color: '#475569',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.borderColor = '#94a3b8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const examId = pendingStartExam.id;
                  setPendingStartExam(null);
                  navigate(`/student/exam-session/${examId}`);
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(79, 70, 229, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)';
                }}
              >
                Start Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailableExams;
