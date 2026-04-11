import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { examApi } from '../../services/api';
import './TeacherPages.css';

interface ExamDraft {
  id: string;
  title: string;
  course: string;
  startTime: string;
  endTime: string;
  status: 'Draft' | 'Published' | 'Completed';
  questionsCount: number;
}

type StoredExam = {
  id: string;
  title: string;
  courseId?: string;
  startTime?: string;
  endTime?: string;
  status?: 'draft' | 'published' | 'active' | 'closed';
  questionsCount?: number;
};

const ExamsList: React.FC = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState<ExamDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        setLoading(true);
        
        // Get current user info
        const userStr = localStorage.getItem('queryme_user');
        const user = userStr ? JSON.parse(userStr) : null;
        
        if (!user || !user.id) {
          setError('User not authenticated');
          return;
        }
        
        // Get exams created by this teacher from localStorage
        const teacherExamsKey = `teacher_exams_${user.id}`;
        const teacherExams = localStorage.getItem(teacherExamsKey);
        let sessionExams: StoredExam[] = [];
        
        if (teacherExams) {
          sessionExams = JSON.parse(teacherExams) as StoredExam[];
        }
        
        // Transform session exams to display format
        const transformedExams: ExamDraft[] = sessionExams.map(exam => ({
          id: exam.id,
          title: exam.title,
          course: exam.courseId || 'Unknown Course',
          startTime: exam.startTime || '',
          endTime: exam.endTime || '',
          status: exam.status === 'published' ? 'Published' : exam.status === 'draft' ? 'Draft' : 'Completed',
          questionsCount: exam.questionsCount || 0,
        }));
        
        setExams(transformedExams);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load exams');
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

  const togglePublish = async (id: string) => {
    try {
      const exam = exams.find(e => e.id === id);
      if (!exam) return;

      if (exam.status === 'Published') {
        await examApi.unpublishExam(id);
        setExams(exams.map(ex => ex.id === id ? { ...ex, status: 'Draft' } : ex));
      } else {
        await examApi.publishExam(id);
        setExams(exams.map(ex => ex.id === id ? { ...ex, status: 'Published' } : ex));
      }
    } catch (err) {
      alert('Failed to update exam status: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="teacher-page" style={{ padding: '24px', overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div>Loading exams...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="teacher-page" style={{ padding: '24px', overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>
          <div>Error: {error}</div>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-page" style={{ padding: '24px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="builder-title" style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>My Exams</h1>
          <p className="exam-list-desc" style={{ fontSize: '14px', margin: 0 }}>Manage your prepared exams, edit questions, and publish them to students.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/teacher/exams/builder')}>
          + Create New Exam
        </button>
      </div>

      {exams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          No exams found. Create your first exam to get started.
        </div>
      ) : (
        <div className="results-table-card" style={{ marginTop: 0 }}>
          <table className="results-table">
            <thead>
              <tr>
                <th>Exam Title & Course</th>
                <th>Questions</th>
                <th>Window</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.map(exam => (
                <tr key={exam.id}>
                  <td>
                    <div className="exam-list-title">{exam.title}</div>
                    <div className="exam-list-course">{exam.course}</div>
                  </td>
                  <td className="exam-list-highlight">{exam.questionsCount}</td>
                  <td>
                    <div className="exam-list-date">
                      <strong>Start:</strong> {new Date(exam.startTime).toLocaleString()}
                    </div>
                    <div className="exam-list-date">
                    <strong>End:</strong> {new Date(exam.endTime).toLocaleString()}
                  </div>
                </td>
                <td>
                  {exam.status === 'Published' ? (
                     <span className="badge badge-green">Published</span>
                  ) : exam.status === 'Draft' ? (
                     <span className="badge badge-gray">Draft</span>
                  ) : (
                     <span className="badge badge-red">Completed</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '6px 12px' }}
                      onClick={() => navigate('/teacher/exams/builder')}
                    >
                      Edit
                    </button>
                    <button
                      className={`btn btn-sm ${exam.status === 'Published' ? 'btn-secondary' : 'btn-primary'}`}
                      style={{ padding: '6px 12px' }}
                      onClick={() => togglePublish(exam.id)}
                    >
                      {exam.status === 'Published' ? 'Unpublish' : 'Publish'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
};

export default ExamsList;
