import React from 'react';
import './TeacherPages.css';

interface StudentResult {
  id: number;
  name: string;
  submittedAt: string;
  score: number;
  total: number;
  status: 'Graded' | 'Pending Review' | 'Missed';
}

const mockResults: StudentResult[] = [
  { id: 1, name: 'Alice Brown', submittedAt: '10 mins ago', score: 92, total: 100, status: 'Graded' },
  { id: 2, name: 'Bob Wilson', submittedAt: '1 hour ago', score: 85, total: 100, status: 'Graded' },
  { id: 3, name: 'Charlie Davis', submittedAt: '2 hours ago', score: 78, total: 100, status: 'Graded' },
  { id: 4, name: 'Diana Prince', submittedAt: 'Just now', score: 95, total: 100, status: 'Pending Review' },
  { id: 5, name: 'Evan Wright', submittedAt: '-', score: 0, total: 100, status: 'Missed' },
];

const ResultsDashboard: React.FC = () => {
  return (
    <div className="teacher-page" style={{ padding: '24px', overflowY: 'auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px', color: '#1a1a2e' }}>Exam Results</h1>
        <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>Review student submissions for <strong>SQL Basics - Midterm Exam</strong></p>
      </div>

      <div className="stat-grid" style={{ marginBottom: '0' }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(56, 161, 105, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38a169" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div className="stat-card-value">87.5%</div>
          <div className="stat-card-label">Average Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(49, 130, 206, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3182ce" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
          </div>
          <div className="stat-card-value">42/45</div>
          <div className="stat-card-label">Submissions</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(221, 107, 32, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dd6b20" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </div>
          <div className="stat-card-value">3</div>
          <div className="stat-card-label">Pending Review</div>
        </div>
      </div>

      <div className="results-table-card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e8e8ee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#1a1a2e' }}>Student Scores</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="Search students..." 
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e8e8ee', fontSize: '13px', outline: 'none' }}
            />
            <button className="btn btn-secondary btn-sm" style={{ height: 'auto', padding: '6px 12px' }}>Export CSV</button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="results-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Submission Time</th>
                <th>Status</th>
                <th>Score</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockResults.map(res => (
                <tr key={res.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#6a3cb0', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                        {res.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span style={{ fontWeight: 600 }}>{res.name}</span>
                    </div>
                  </td>
                  <td style={{ color: '#666', fontSize: '13px' }}>{res.submittedAt}</td>
                  <td>
                    {res.status === 'Graded' && <span style={{ color: '#38a169', fontSize: '13px', fontWeight: 600 }}>• Graded</span>}
                    {res.status === 'Pending Review' && <span style={{ color: '#dd6b20', fontSize: '13px', fontWeight: 600 }}>• Pending</span>}
                    {res.status === 'Missed' && <span style={{ color: '#e53e3e', fontSize: '13px', fontWeight: 600 }}>• Missed</span>}
                  </td>
                  <td>
                    {res.status === 'Missed' ? (
                      <span style={{ color: '#a0aec0' }}>- / {res.total}</span>
                    ) : (
                      <span className={`score-badge ${res.score >= 90 ? 'score-high' : res.score >= 70 ? 'score-med' : 'score-low'}`}>
                        {res.score}/{res.total}
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary btn-sm" style={{ background: 'transparent', borderColor: '#dcdce4' }} disabled={res.status === 'Missed'}>
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResultsDashboard;
