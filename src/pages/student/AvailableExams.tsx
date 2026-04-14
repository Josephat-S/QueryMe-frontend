import React from 'react';
import { useNavigate } from 'react-router-dom';
import { resultApi } from '../../api';
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

  const exams = data ?? [];
  const sessions = sessionsData ?? [];
  const [marksByExamId, setMarksByExamId] = React.useState<Record<string, string>>({});

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

      const marksEntries = await Promise.all(
        [...completedByExam.entries()].map(async ([examId, latestSession]) => {
          try {
            const result = await resultApi.getSessionResult(String(latestSession.id), controller.signal);

            if (result.totalMaxScore != null && result.totalMaxScore > 0 && result.totalScore != null) {
              return [examId, `${result.totalScore}/${result.totalMaxScore}`] as const;
            }

            return [examId, 'N/A'] as const;
          } catch {
            return [examId, 'N/A'] as const;
          }
        }),
      );

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

  if (isLoading) {
    return (
      <div>
        <div className="page-header">
          <h1>Available Exams</h1>
          <p>Loading the exams currently visible to your account.</p>
        </div>
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading exams...</div>
      </div>
    );
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '18px' }}>
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

                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 6px' }}>{exam.title}</h3>
                <p style={{ fontSize: '12px', color: '#888', margin: '0 0 14px', lineHeight: 1.5 }}>
                  {exam.description || 'No description provided.'}
                </p>

                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#666', marginBottom: '14px' }}>
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
                  onClick={() => navigate(`/student/exam-session/${exam.id}`)}
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
    </div>
  );
};

export default AvailableExams;
