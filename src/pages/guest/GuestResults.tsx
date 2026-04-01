import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../teacher/TeacherPages.css';

/* ── Types ── */
interface MockExam {
  id: string;
  title: string;
  course: string;
  status: 'active' | 'closed' | 'published';
}

/* ── Mock Data (matching teacher portal) ── */
const mockExams: MockExam[] = [
  {
    id: 'e1',
    title: 'SQL Midterm Exam',
    course: 'Database Systems 101',
    status: 'closed',
  },
  {
    id: 'e2',
    title: 'Joins & Aggregates Quiz',
    course: 'Advanced SQL',
    status: 'active',
  },
];

const statusColor: Record<string, string> = {
  active:    '#16a34a',
  closed:    '#dc2626',
  published: '#2563eb',
};

const GuestResults: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="teacher-page" style={{ padding: '40px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="res-select-gate" style={{ maxWidth: '600px', width: '100%' }}>
        <div className="res-gate-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6a3cb0" strokeWidth="1.5">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </div>
        <h2 className="res-gate-title">View Exam Results</h2>
        <p className="res-gate-sub">Select an exam below to view student scores and answer keys (Guest View).</p>
        <div className="res-gate-list" style={{ marginTop: '24px' }}>
          {mockExams.map(e => (
            <button key={e.id} className="res-gate-exam-btn" onClick={() => navigate(`/guest/exam/${e.id}`)}>
              <div>
                <div className="res-gate-exam-title">{e.title}</div>
                <div className="res-gate-exam-course">{e.course}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="res-gate-status-pill" style={{ background: statusColor[e.status] + '18', color: statusColor[e.status], border: `1px solid ${statusColor[e.status]}44` }}>
                  {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GuestResults;
