import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../teacher/TeacherPages.css';
import { examApi, Exam as ApiExam } from '../../services/api';

const statusColor: Record<string, string> = {
  active: '#16a34a',
  closed: '#dc2626',
  published: '#2563eb',
};

const GuestResults: React.FC = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState<ApiExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadExams = async () => {
      try {
        setLoading(true);
        const published = await examApi.getPublishedExams();
        setExams(published);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load exams');
      } finally {
        setLoading(false);
      }
    };

    loadExams();
  }, []);

  if (loading) {
    return (
      <div className="teacher-page" style={{ padding: '40px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading exams...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="teacher-page" style={{ padding: '40px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red' }}>
        <div>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="teacher-page" style={{ padding: '40px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="res-select-gate" style={{ maxWidth: '600px', width: '100%' }}>
        <div className="res-gate-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6a3cb0" strokeWidth="1.5">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </div>
        <h2 className="res-gate-title">View Exam Results</h2>
        <p className="res-gate-sub">Select an exam below to view student score summaries (Guest View).</p>
        <div className="res-gate-list" style={{ marginTop: '24px' }}>
          {exams.map(e => (
            <button key={e.id} className="res-gate-exam-btn" onClick={() => navigate(`/guest/exam/${e.id}`)}>
              <div>
                <div className="res-gate-exam-title">{e.title}</div>
                <div className="res-gate-exam-course">{e.course?.name || e.courseId || 'Unknown course'}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="res-gate-status-pill" style={{ background: (statusColor[e.status || 'started'] || '#9ca3af') + '18', color: statusColor[e.status || 'started'] || '#9ca3af', border: `1px solid ${(statusColor[e.status || 'started'] || '#9ca3af')}44` }}>
                  {(e.status || 'started').charAt(0).toUpperCase() + (e.status || 'started').slice(1)}
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
