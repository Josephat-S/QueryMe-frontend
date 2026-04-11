import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { examApi, Exam as ApiExam } from '../../services/api';

const BrowseExams: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [exams, setExams] = useState<ApiExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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

  const filteredExams = exams.filter(exam =>
    exam.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.course?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(exam.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="browse-exams">
        <div className="page-header">
          <h1>Browse Exams</h1>
          <p>Loading published exams from backend.</p>
        </div>
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading exams...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="browse-exams">
        <div className="page-header">
          <h1>Browse Exams</h1>
          <p>Explore the variety of SQL assessments available in our platform.</p>
        </div>
        <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="browse-exams">
      <div className="page-header">
        <h1>Browse Exams</h1>
        <p>Explore the variety of SQL assessments available in our platform.</p>
      </div>

      <div className="content-card" style={{ marginBottom: '24px' }}>
        <div className="content-card-body" style={{ padding: '12px 22px' }}>
          <div className="dash-navbar-search" style={{ width: '100%', maxWidth: 'none', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by title or course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ fontSize: '14px' }}
            />
          </div>
        </div>
      </div>

      <div className="exam-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {filteredExams.map(exam => (
          <div key={exam.id} className="content-card stat-card" style={{ padding: '0' }}>
            <div className="content-card-body" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span className={`badge ${(exam.status || 'draft') === 'published' ? 'badge-green' : (exam.status || 'draft') === 'active' ? 'badge-orange' : 'badge-gray'}`}>
                  {(exam.status || 'draft').charAt(0).toUpperCase() + (exam.status || 'draft').slice(1)}
                </span>
                <span className="badge badge-gray">{exam.course?.name || exam.courseId || 'Unnamed course'}</span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 8px 0' }}>{exam.title}</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>{exam.description || 'No description provided.'}</p>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {exam.timeLimit || exam.timeLimitMins ? `${exam.timeLimit || exam.timeLimitMins}m` : 'TBD'}
                </div>
                <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /></svg>
                  {exam.questions?.length ?? 'N/A'} Questions
                </div>
              </div>

              <button
                className="btn btn-secondary w-full"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => navigate(`/guest/exam/${exam.id}`)}
              >
                View Details
              </button>
            </div>
          </div>
        ))}

        {filteredExams.length === 0 && (
          <div className="content-card" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </div>
              <h3>No exams found</h3>
              <p>Try searching for a different title or course.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseExams;
