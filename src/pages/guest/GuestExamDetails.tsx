import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examApi, Exam as ApiExam } from '../../services/api';

const GuestExamDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<ApiExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadExam = async () => {
      if (!id) {
        setError('Invalid exam ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const loadedExam = await examApi.getExam(id);
        setExam(loadedExam);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load exam details');
      } finally {
        setLoading(false);
      }
    };

    loadExam();
  }, [id]);

  if (loading) {
    return (
      <div className="guest-exam-details" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading exam details...</div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="guest-exam-details" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', color: 'red', padding: '40px' }}>
          <div>Error: {error || 'Exam not found'}</div>
          <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => navigate('/guest/browse')}>
            Back to Browse
          </button>
        </div>
      </div>
    );
  }

  const duration = exam.timeLimit || exam.timeLimitMins || 0;

  return (
    <div className="guest-exam-details" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <button
            onClick={() => navigate('/guest/browse')}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              marginBottom: '12px',
              fontSize: '14px',
              padding: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back to Browse
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px' }}>{exam.title}</h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', color: '#64748b', fontSize: '14px', flexWrap: 'wrap' }}>
            <span>{exam.course?.name || exam.courseId || 'Unnamed course'}</span>
            <span>•</span>
            <span>By {exam.teacher?.name || 'Unknown teacher'}</span>
            <span className="badge badge-gray" style={{ marginLeft: '12px' }}>
              {(exam.status || 'draft').charAt(0).toUpperCase() + (exam.status || 'draft').slice(1)}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="badge badge-gray" style={{ marginBottom: '8px' }}>Read-Only Mode</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Viewing as Guest</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
        <div>
          <div className="content-card" style={{ marginBottom: '24px' }}>
            <div className="content-card-body" style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 20px', color: '#1a1a2e' }}>Exam Overview</h2>
              <div style={{ display: 'grid', gap: '12px', color: '#4a5568', fontSize: '14px' }}>
                <div><strong>Duration:</strong> {duration ? `${duration} minutes` : 'TBD'}</div>
                <div><strong>Published:</strong> {exam.publishedAt ? new Date(exam.publishedAt).toLocaleString() : 'N/A'}</div>
                <div><strong>Visibility:</strong> {exam.visibilityMode || 'N/A'}</div>
                <div><strong>Questions:</strong> {exam.questions?.length ?? 'Unknown'}</div>
              </div>
            </div>
          </div>

          <div className="content-card">
            <div className="content-card-body" style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px', color: '#1a1a2e' }}>Question Preview</h2>
              {exam.questions?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {exam.questions.map((question, index) => (
                    <div key={question.id || index} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#718096' }}>Question {index + 1}</span>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', background: '#e2e8f0', borderRadius: '4px' }}>{(question as any).marks ?? 'N/A'} pts</span>
                      </div>
                      <p style={{ fontSize: '13px', margin: 0, color: '#1a1a2e', lineHeight: '1.4' }}>{question.prompt || 'Question text unavailable'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#64748b', fontSize: '14px' }}>Exam question details are not available for guest preview.</div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="content-card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px', color: '#1a1a2e' }}>Guest Preview Notes</h2>
            <p style={{ fontSize: '14px', color: '#4a5568', lineHeight: '1.6' }}>
              This page is populated from backend exam data. Student result details are only available after authentication and authorized access.
            </p>
            <div style={{ marginTop: '18px', display: 'grid', gap: '12px' }}>
              <div style={{ padding: '12px', borderRadius: '10px', background: '#f1f5f9', color: '#1f2937' }}>
                <strong>Course</strong>
                <div>{exam.course?.name || exam.courseId || 'Unknown'}</div>
              </div>
              <div style={{ padding: '12px', borderRadius: '10px', background: '#f1f5f9', color: '#1f2937' }}>
                <strong>Instructor</strong>
                <div>{exam.teacher?.name || 'Unknown'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestExamDetails;
