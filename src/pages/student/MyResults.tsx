import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts';
import { examApi, resultApi, sessionApi } from '../../services/api';

interface QuestionDetail {
  number: number;
  marks: number;
  scored: number;
  submitted: boolean;
}

interface ExamResult {
  sessionId: string;
  title: string;
  course: string;
  date: string;
  score: number;
  total: number;
  percentage: number;
  status: 'passed' | 'failed' | 'submitted' | 'timed_out';
  teacher: string;
  questionsDetail: QuestionDetail[];
}

const MyResults: React.FC = () => {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadResults = async () => {
      if (!user) {
        setError('Please log in to view your results.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const sessions = await sessionApi.getSessionsByStudent(String(user.id));

        const loadedResults = await Promise.all(
          sessions.map(async session => {
            const exam = await examApi.getExam(session.examId);
            let resultData = null;

            try {
              resultData = await resultApi.getResult(session.id);
            } catch {
              // If result details are unavailable, continue with session data.
            }

            const totalMarks = resultData?.totalMarks ?? session.totalMarks ?? exam.questions?.reduce((sum, question) => sum + question.marks, 0) ?? 0;
            const score = resultData?.score ?? session.score ?? 0;
            const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
            const status: ExamResult['status'] = resultData?.percentage !== undefined
              ? (resultData.percentage >= 50 ? 'passed' : 'failed')
              : session.status === 'timed_out'
                ? 'timed_out'
                : session.status === 'submitted'
                  ? 'submitted'
                  : 'submitted';

            return {
              sessionId: session.id,
              title: exam.title,
              course: exam.course?.name || exam.courseId || 'Unknown Course',
              date: session.submittedAt || session.startedAt || '',
              score,
              total: totalMarks,
              percentage,
              status,
              teacher: exam.teacher?.name || 'Unknown Teacher',
              questionsDetail: exam.questions?.map((question, index) => ({
                number: index + 1,
                marks: question.marks,
                scored: resultData?.answers?.[question.id] ? question.marks : 0,
                submitted: Boolean(resultData?.answers?.[question.id] || session.answers?.[question.id]),
              })) ?? [],
            };
          })
        );

        setResults(loadedResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load results');
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [user]);

  const totalExams = results.length;
  const passedCount = results.filter(r => r.status === 'passed').length;
  const averageScore = totalExams > 0
    ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / totalExams)
    : 0;

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1>My Results</h1>
          <p>Loading results from your backend data.</p>
        </div>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div>Loading results...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="page-header">
          <h1>My Results</h1>
          <p>View your exam scores and detailed feedback</p>
        </div>
        <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>
          <div>Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>My Results</h1>
        <p>View your exam scores and detailed feedback</p>
      </div>

      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(106, 60, 176, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6a3cb0" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
          </div>
          <div className="stat-card-value">{totalExams}</div>
          <div className="stat-card-label">Exams Taken</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(56, 161, 105, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38a169" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div className="stat-card-value">{passedCount}</div>
          <div className="stat-card-label">Passed</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(49, 130, 206, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3182ce" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
          </div>
          <div className="stat-card-value">{averageScore}%</div>
          <div className="stat-card-label">Average Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(229, 62, 62, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          </div>
          <div className="stat-card-value">{totalExams - passedCount}</div>
          <div className="stat-card-label">Not Passed</div>
        </div>
      </div>

      <div className="content-card">
        <div className="content-card-header">
          <h2>Exam History</h2>
        </div>
        <div className="content-card-body" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Exam</th>
                <th>Course</th>
                <th>Date</th>
                <th>Score</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {results.map(result => (
                <React.Fragment key={result.sessionId}>
                  <tr style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === result.sessionId ? null : result.sessionId)}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1a1a2e' }}>{result.title}</div>
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>👤 {result.teacher}</div>
                    </td>
                    <td style={{ fontSize: '12px', color: '#666' }}>{result.course}</td>
                    <td style={{ fontSize: '12px', color: '#666' }}>{result.date ? new Date(result.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#1a1a2e', fontSize: '15px' }}>{result.score}</span>
                      <span style={{ color: '#888', fontSize: '12px' }}>/{result.total}</span>
                    </td>
                    <td>
                      <span className={`badge ${result.status === 'passed' ? 'badge-green' : result.status === 'failed' ? 'badge-red' : 'badge-gray'}`}>{result.status}</span>
                    </td>
                    <td>
                      <span style={{ color: '#aaa', fontSize: '14px', transition: 'transform 0.2s', display: 'inline-block', transform: expanded === result.sessionId ? 'rotate(90deg)' : 'rotate(0)' }}>▶</span>
                    </td>
                  </tr>
                  {expanded === result.sessionId && (
                    <tr>
                      <td colSpan={6} style={{ background: '#fafafe', padding: '16px 24px' }}>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          {result.questionsDetail.map(q => (
                            <div key={q.number} style={{
                              padding: '10px 16px',
                              borderRadius: '10px',
                              background: '#fff',
                              border: '1px solid #e8e8ee',
                              minWidth: '100px',
                              textAlign: 'center',
                            }}>
                              <div style={{ fontSize: '10px', fontWeight: 700, color: '#888', marginBottom: '4px', textTransform: 'uppercase' }}>Q{q.number}</div>
                              <div style={{ fontSize: '18px', fontWeight: 700, color: q.scored === q.marks ? '#38a169' : q.scored === 0 ? '#e53e3e' : '#dd6b20' }}>
                                {q.scored}<span style={{ fontSize: '12px', color: '#888' }}>/{q.marks}</span>
                              </div>
                              {!q.submitted && <div style={{ fontSize: '9px', color: '#e53e3e', marginTop: '2px' }}>Not submitted</div>}
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: '12px', display: 'flex', gap: '12px', fontSize: '11px', color: '#888' }}>
                          <span>📊 Score: <strong style={{ color: '#1a1a2e' }}>{result.percentage}%</strong></span>
                          <span>📝 Questions reviewed: <strong style={{ color: '#1a1a2e' }}>{result.questionsDetail.length}</strong></span>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
                    No results available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MyResults;
