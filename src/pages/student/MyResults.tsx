import React, { useState } from 'react';

interface ExamResult {
  id: number;
  title: string;
  course: string;
  date: string;
  score: number;
  total: number;
  questions: number;
  correct: number;
  status: 'passed' | 'failed';
  teacher: string;
  visibility: 'immediate' | 'end_of_exam' | 'hidden';
  questionsDetail: { number: number; marks: number; scored: number; submitted: boolean }[];
}

const mockResults: ExamResult[] = [
  {
    id: 1, title: 'SELECT Basics Quiz', course: 'Database Systems 101', date: '2026-03-25', score: 85, total: 100, questions: 5, correct: 4, status: 'passed', teacher: 'Prof. Smith', visibility: 'immediate',
    questionsDetail: [
      { number: 1, marks: 20, scored: 20, submitted: true },
      { number: 2, marks: 20, scored: 20, submitted: true },
      { number: 3, marks: 20, scored: 15, submitted: true },
      { number: 4, marks: 20, scored: 20, submitted: true },
      { number: 5, marks: 20, scored: 10, submitted: true },
    ]
  },
  {
    id: 2, title: 'CREATE TABLE Exercise', course: 'Database Systems 101', date: '2026-03-20', score: 92, total: 100, questions: 4, correct: 4, status: 'passed', teacher: 'Prof. Smith', visibility: 'immediate',
    questionsDetail: [
      { number: 1, marks: 25, scored: 25, submitted: true },
      { number: 2, marks: 25, scored: 25, submitted: true },
      { number: 3, marks: 25, scored: 22, submitted: true },
      { number: 4, marks: 25, scored: 20, submitted: true },
    ]
  },
  {
    id: 3, title: 'WHERE Clause Practice', course: 'Database Systems 101', date: '2026-03-15', score: 45, total: 100, questions: 5, correct: 2, status: 'failed', teacher: 'Prof. Smith', visibility: 'immediate',
    questionsDetail: [
      { number: 1, marks: 20, scored: 20, submitted: true },
      { number: 2, marks: 20, scored: 0, submitted: false },
      { number: 3, marks: 20, scored: 15, submitted: true },
      { number: 4, marks: 20, scored: 10, submitted: true },
      { number: 5, marks: 20, scored: 0, submitted: false },
    ]
  },
  {
    id: 4, title: 'JOIN Operations Test', course: 'Data Management', date: '2026-03-10', score: 78, total: 100, questions: 6, correct: 5, status: 'passed', teacher: 'Dr. Johnson', visibility: 'end_of_exam',
    questionsDetail: [
      { number: 1, marks: 15, scored: 15, submitted: true },
      { number: 2, marks: 20, scored: 18, submitted: true },
      { number: 3, marks: 15, scored: 15, submitted: true },
      { number: 4, marks: 20, scored: 10, submitted: true },
      { number: 5, marks: 15, scored: 15, submitted: true },
      { number: 6, marks: 15, scored: 5, submitted: true },
    ]
  },
];

const MyResults: React.FC = () => {
  const [expanded, setExpanded] = useState<number | null>(null);

  const overallAvg = Math.round(mockResults.reduce((a, r) => a + (r.score / r.total) * 100, 0) / mockResults.length);
  const passed = mockResults.filter(r => r.status === 'passed').length;

  return (
    <div>
      <div className="page-header">
        <h1>My Results</h1>
        <p>View your exam scores and detailed feedback</p>
      </div>

      {/* Summary stats */}
      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(106, 60, 176, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6a3cb0" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
          </div>
          <div className="stat-card-value">{mockResults.length}</div>
          <div className="stat-card-label">Total Exams Taken</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(56, 161, 105, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38a169" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div className="stat-card-value">{passed}</div>
          <div className="stat-card-label">Passed</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(49, 130, 206, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3182ce" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
          </div>
          <div className="stat-card-value">{overallAvg}%</div>
          <div className="stat-card-label">Average Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(229, 62, 62, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          </div>
          <div className="stat-card-value">{mockResults.length - passed}</div>
          <div className="stat-card-label">Failed</div>
        </div>
      </div>

      {/* Results list */}
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
              {mockResults.map(r => (
                <React.Fragment key={r.id}>
                  <tr style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1a1a2e' }}>{r.title}</div>
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>👤 {r.teacher}</div>
                    </td>
                    <td style={{ fontSize: '12px', color: '#666' }}>{r.course}</td>
                    <td style={{ fontSize: '12px', color: '#666' }}>{new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#1a1a2e', fontSize: '15px' }}>{r.score}</span>
                      <span style={{ color: '#888', fontSize: '12px' }}>/{r.total}</span>
                    </td>
                    <td>
                      <span className={`badge ${r.status === 'passed' ? 'badge-green' : 'badge-red'}`}>{r.status}</span>
                    </td>
                    <td>
                      <span style={{ color: '#aaa', fontSize: '14px', transition: 'transform 0.2s', display: 'inline-block', transform: expanded === r.id ? 'rotate(90deg)' : 'rotate(0)' }}>▶</span>
                    </td>
                  </tr>
                  {expanded === r.id && (
                    <tr>
                      <td colSpan={6} style={{ background: '#fafafe', padding: '16px 24px' }}>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          {r.questionsDetail.map(q => (
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
                          <span>📊 Score: <strong style={{ color: '#1a1a2e' }}>{Math.round((r.score / r.total) * 100)}%</strong></span>
                          <span>📝 Questions answered: <strong style={{ color: '#1a1a2e' }}>{r.correct}/{r.questions}</strong></span>
                          <span>👁 Visibility: <strong style={{ color: '#1a1a2e' }}>{r.visibility.replace('_', ' ')}</strong></span>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MyResults;
