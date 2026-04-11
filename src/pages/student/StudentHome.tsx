import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts';
import { useNavigate } from 'react-router-dom';
import { examApi, resultApi, sessionApi } from '../../services/api';

interface UpcomingExamItem {
  id: string;
  title: string;
  course: string;
  date: string;
  duration: string;
  questions: number;
}

interface RecentResultItem {
  sessionId: string;
  title: string;
  course: string;
  date: string;
  score: number;
  total: number;
  status: 'passed' | 'failed' | 'submitted' | 'timed_out';
}

const StudentHome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [upcomingExams, setUpcomingExams] = useState<UpcomingExamItem[]>([]);
  const [recentResults, setRecentResults] = useState<RecentResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user) {
        setError('Please log in to see your dashboard.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [publishedExams, sessions] = await Promise.all([
          examApi.getPublishedExams(),
          sessionApi.getSessionsByStudent(String(user.id)),
        ]);

        setUpcomingExams(
          publishedExams.map(exam => ({
            id: exam.id,
            title: exam.title,
            course: exam.course?.name || exam.courseId || 'Unknown Course',
            date: exam.publishedAt || exam.startTime || exam.createdAt || '',
            duration: exam.timeLimit ? `${exam.timeLimit} min` : exam.timeLimitMins ? `${exam.timeLimitMins} min` : 'N/A',
            questions: exam.questions?.length ?? 0,
          }))
        );

        const results = await Promise.all(
          sessions.map(async session => {
            let score = session.score ?? 0;
            let total = session.totalMarks ?? 0;
            let status: RecentResultItem['status'] = session.status === 'timed_out' ? 'timed_out' : session.status === 'submitted' ? 'submitted' : 'submitted';

            try {
              const result = await resultApi.getResult(session.id);
              score = result.score ?? score;
              total = result.totalMarks ?? total;
              status = result.percentage !== undefined ? (result.percentage >= 50 ? 'passed' : 'failed') : status;
            } catch {
              // Ignore missing result details if the backend does not expose them for this session
            }

            const exam = await examApi.getExam(session.examId);

            return {
              sessionId: session.id,
              title: exam.title,
              course: exam.course?.name || exam.courseId || 'Unknown Course',
              date: session.submittedAt || session.startedAt || '',
              score,
              total,
              status,
            };
          })
        );

        setRecentResults(
          results
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 3)
        );
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1>{getGreeting()}, {user?.name?.split(' ')[0] || 'Student'} 👋</h1>
          <p>Loading your latest activity from the backend.</p>
        </div>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div>Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="page-header">
          <h1>Student Dashboard</h1>
          <p>Review your available exams and recent scores</p>
        </div>
        <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>
          <div>Error: {error}</div>
        </div>
      </div>
    );
  }

  const completedCount = recentResults.length;
  const averageScore = completedCount > 0
    ? Math.round(recentResults.reduce((sum, r) => sum + (r.total > 0 ? (r.score / r.total) * 100 : 0), 0) / completedCount)
    : 0;

  return (
    <div>
      <div className="page-header">
        <h1>{getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
        <p>Here's an overview of your latest exam activity.</p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(106, 60, 176, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6a3cb0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div className="stat-card-value">{upcomingExams.length}</div>
          <div className="stat-card-label">Available Exams</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(56, 161, 105, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38a169" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="stat-card-value">{completedCount}</div>
          <div className="stat-card-label">Completed Sessions</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(49, 130, 206, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3182ce" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <div className="stat-card-value">{averageScore}%</div>
          <div className="stat-card-label">Average Score</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(221, 107, 32, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dd6b20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="stat-card-value">{recentResults.length}</div>
          <div className="stat-card-label">Recent Submissions</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '18px' }}>
        <div className="content-card">
          <div className="content-card-header">
            <h2>📋 Available Exams</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/student/exams')}>View All</button>
          </div>
          <div className="content-card-body" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Exam</th>
                  <th>Course</th>
                  <th>Duration</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {upcomingExams.map(exam => (
                  <tr key={exam.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1a1a2e' }}>{exam.title}</div>
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{exam.course}</div>
                    </td>
                    <td style={{ fontSize: '12px', color: '#666' }}>{new Date(exam.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                    <td><span className="badge badge-purple">{exam.duration}</span></td>
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
                      No available exams found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="content-card">
          <div className="content-card-header">
            <h2>📊 Recent Results</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/student/results')}>View All</button>
          </div>
          <div className="content-card-body" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Exam</th>
                  <th>Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentResults.map(r => (
                  <tr key={r.sessionId}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1a1a2e' }}>{r.title}</div>
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{r.course}</div>
                    </td>
                    <td style={{ fontWeight: 700, color: '#1a1a2e' }}>{r.score}/{r.total}</td>
                    <td>
                      <span className={`badge ${r.status === 'passed' ? 'badge-green' : r.status === 'failed' ? 'badge-red' : 'badge-gray'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentResults.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
                      No recent results available yet.
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
