import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { examApi, resultApi, sessionApi, type Exam, type StudentExamResult } from '../../api';
import { useAuth } from '../../contexts';
import { extractErrorMessage } from '../../utils/errorUtils';
import {
  formatDateTime,
  getCourseName,
  getExamTimeLimit,
  isExamPublished,
} from '../../utils/queryme';

interface UpcomingExamItem {
  id: string;
  title: string;
  course: string;
  duration: string;
  visibilityMode: string;
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

        setUpcomingExams(
          publishedExams
            .filter(isExamPublished)
            .map((exam) => ({
              id: String(exam.id),
              title: exam.title,
              course: getCourseName(exam.course, exam.courseId),
              duration: getExamTimeLimit(exam) ? `${getExamTimeLimit(exam)} min` : 'No limit',
              visibilityMode: String(exam.visibilityMode || 'N/A'),
            })),
        );

        const recentSessionDetails = await Promise.all(
          [...sessions]
            .sort((left, right) => {
              const leftTime = new Date(left.submittedAt || left.startedAt || 0).getTime();
              const rightTime = new Date(right.submittedAt || right.startedAt || 0).getTime();
              return rightTime - leftTime;
            })
            .slice(0, 4)
            .map(async (session) => {
              const [exam, result] = await Promise.all([
                examApi.getExam(String(session.examId), controller.signal).catch(() => null as Exam | null),
                resultApi.getSessionResult(String(session.id), controller.signal).catch(() => null as StudentExamResult | null),
              ]);

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

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1>{getGreeting()}, {user?.name?.split(' ')[0] || 'Student'}</h1>
          <p>Loading your exam activity from the backend.</p>
        </div>
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="page-header">
          <h1>Student Dashboard</h1>
          <p>Review your available exams and recent session outcomes.</p>
        </div>
        <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>{error}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>{getGreeting()}, {user?.name?.split(' ')[0] || 'Student'}</h1>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-value">{upcomingExams.length}</div>
          <div className="stat-card-label">Available Exams</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{recentResults.length}</div>
          <div className="stat-card-label">Recent Sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{averageScore}%</div>
          <div className="stat-card-label">Visible Average</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">
            {recentResults.filter((result) => result.visible).length}
          </div>
          <div className="stat-card-label">Released Results</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '18px' }}>
        <div className="content-card">
          <div className="content-card-header">
            <h2>Available Exams</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/student/exams')}>
              View All
            </button>
          </div>
          <div className="content-card-body" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Exam</th>
                  <th>Duration</th>
                  <th>Visibility</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {upcomingExams.map((exam) => (
                  <tr key={exam.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1a1a2e' }}>{exam.title}</div>
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{exam.course}</div>
                    </td>
                    <td>{exam.duration}</td>
                    <td>
                      <span className="badge badge-gray">{exam.visibilityMode}</span>
                    </td>
                    <td>
                      <button className="btn btn-primary btn-sm" onClick={() => navigate(`/student/exam-session/${exam.id}`)}>
                        Start
                      </button>
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

        <div className="content-card">
          <div className="content-card-header">
            <h2>Recent Results</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/student/results')}>
              View All
            </button>
          </div>
          <div className="content-card-body" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Exam</th>
                  <th>Submitted</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentResults.map((result) => (
                  <tr key={result.sessionId}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1a1a2e' }}>{result.title}</div>
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{result.course}</div>
                    </td>
                    <td style={{ fontSize: '12px' }}>{formatDateTime(result.submittedAt)}</td>
                    <td>
                      {result.visible ? (
                        <span className="badge badge-green">
                          {result.score}/{result.total}
                        </span>
                      ) : (
                        <span className="badge badge-gray">{result.statusLabel}</span>
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
