import React from 'react';
import { useAuth } from '../../contexts';
import { useNavigate } from 'react-router-dom';

// Mock data
const upcomingExams = [
  { id: 1, title: 'SQL Basics - Midterm', course: 'Database Systems', date: '2026-04-02', duration: '90 min', questions: 8 },
  { id: 2, title: 'Advanced Joins Quiz', course: 'Database Systems', date: '2026-04-05', duration: '45 min', questions: 5 },
  { id: 3, title: 'Subqueries & Aggregation', course: 'Data Management', date: '2026-04-10', duration: '60 min', questions: 6 },
];

const recentResults = [
  { id: 1, title: 'SELECT Basics Quiz', score: 85, total: 100, date: '2026-03-25', status: 'passed' },
  { id: 2, title: 'CREATE TABLE Exercise', score: 92, total: 100, date: '2026-03-20', status: 'passed' },
  { id: 3, title: 'WHERE Clause Practice', score: 45, total: 100, date: '2026-03-15', status: 'failed' },
];

const StudentHome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h1>{getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
        <p>Here's an overview of your SQL exam activities</p>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(106, 60, 176, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6a3cb0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div className="stat-card-value">3</div>
          <div className="stat-card-label">Upcoming Exams</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(56, 161, 105, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38a169" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="stat-card-value">12</div>
          <div className="stat-card-label">Exams Completed</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(49, 130, 206, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3182ce" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <div className="stat-card-value">78%</div>
          <div className="stat-card-label">Average Score</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(221, 107, 32, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dd6b20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="stat-card-value">47</div>
          <div className="stat-card-label">Queries Submitted</div>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '18px' }}>
        {/* Upcoming Exams */}
        <div className="content-card">
          <div className="content-card-header">
            <h2>📋 Upcoming Exams</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/student/exams')}>View All</button>
          </div>
          <div className="content-card-body" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Exam</th>
                  <th>Date</th>
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
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Results */}
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
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1a1a2e' }}>{r.title}</div>
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </td>
                    <td style={{ fontWeight: 700, color: '#1a1a2e' }}>{r.score}/{r.total}</td>
                    <td>
                      <span className={`badge ${r.status === 'passed' ? 'badge-green' : 'badge-red'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentHome;
