import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { examApi, Exam as ApiExam } from '../../services/api';

interface Exam {
  id: string;
  title: string;
  courseName: string;
  description?: string;
  publishedAt?: string;
  timeLimitMins: number;
  maxAttempts: number;
  status: 'available' | 'upcoming' | 'completed';
  visibilityMode: string;
}

const AvailableExams: React.FC = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'available' | 'upcoming' | 'completed'>('all');

  useEffect(() => {
    const fetchExams = async () => {
      try {
        setLoading(true);
        const publishedExams = await examApi.getPublishedExams();

        const transformedExams: Exam[] = publishedExams.map(exam => ({
          id: exam.id,
          title: exam.title,
          courseName: exam.course?.name || exam.courseId || 'Unknown Course',
          description: exam.description || 'No description provided.',
          publishedAt: exam.publishedAt || exam.createdAt,
          timeLimitMins: exam.timeLimit ?? exam.timeLimitMins ?? 0,
          maxAttempts: exam.maxAttempts ?? 1,
          status: getExamStatus(exam),
          visibilityMode: exam.visibilityMode || 'UNKNOWN',
        }));

        setExams(transformedExams);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load exams';
        if (errorMessage.toLowerCase().includes('authentication') || errorMessage.toLowerCase().includes('access denied')) {
          setError('Authentication required. Please log in again.');
        } else {
          setError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

  const getExamStatus = (exam: ApiExam): Exam['status'] => {
    const status = String(exam.status || '').toLowerCase();
    if (status === 'closed') return 'completed';
    if (status === 'draft' || status === 'scheduled' || status === 'upcoming') return 'upcoming';
    if (status === 'published' || status === 'active') return 'available';
    return 'available';
  };

  const filtered = filter === 'all' ? exams : exams.filter(e => e.status === filter);

  const getStatusBadge = (status: Exam['status']) => {
    switch (status) {
      case 'available':
        return 'badge-green';
      case 'upcoming':
        return 'badge-orange';
      case 'completed':
        return 'badge-gray';
      default:
        return 'badge-gray';
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1>Available Exams</h1>
          <p>View and take your assigned SQL examinations</p>
        </div>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div>Loading exams...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="page-header">
          <h1>Available Exams</h1>
          <p>View and take your assigned SQL examinations</p>
        </div>
        <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>
          <div>Error: {error}</div>
          {error.includes('Authentication') || error.includes('log in') ? (
            <div style={{ marginTop: '20px' }}>
              <button
                className="btn btn-primary"
                onClick={() => window.location.href = '/auth'}
              >
                Go to Login
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Available Exams</h1>
        <p>View and take your assigned SQL examinations</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '22px' }}>
        {(['all', 'available', 'upcoming', 'completed'] as const).map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f)}
            style={{ textTransform: 'capitalize' }}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          No exams found for the selected filter.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '18px' }}>
          {filtered.map(exam => (
            <div key={exam.id} className="content-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="content-card-body" style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span className={`badge ${getStatusBadge(exam.status)}`}>{exam.status}</span>
                  <span style={{ fontSize: '11px', color: '#888' }}>
                    {exam.publishedAt ? new Date(exam.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No publish date'}
                  </span>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 6px' }}>{exam.title}</h3>
                <p style={{ fontSize: '12px', color: '#888', margin: '0 0 14px', lineHeight: 1.5 }}>{exam.description}</p>

                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#666', marginBottom: '14px' }}>
                  <span>📚 Course: {exam.courseName}</span>
                  <span>🔒 Visibility: {exam.visibilityMode}</span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', fontSize: '12px', color: '#888', padding: '10px 0', borderTop: '1px solid #f0f0f5' }}>
                  <span><strong style={{ color: '#333' }}>{exam.timeLimitMins || 'N/A'}</strong> Min Time</span>
                  <span><strong style={{ color: '#333' }}>{exam.maxAttempts}</strong> Max Attempts</span>
                  {exam.publishedAt && <span><strong style={{ color: '#333' }}>{new Date(exam.publishedAt).toLocaleDateString()}</strong> Published</span>}
                </div>
              </div>

              {exam.status === 'available' && (
                <div style={{ padding: '0 22px 22px' }}>
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate(`/student/exam-session/${exam.id}`)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    Start Exam
                  </button>
                </div>
              )}
              {exam.status === 'completed' && (
                <div style={{ padding: '0 22px 22px' }}>
                  <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/student/results')}>
                    View Result
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AvailableExams;
