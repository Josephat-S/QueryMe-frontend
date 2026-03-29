import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './TeacherPages.css';

interface ExamDraft {
  id: number;
  title: string;
  course: string;
  startTime: string;
  endTime: string;
  status: 'Draft' | 'Published' | 'Completed';
  questionsCount: number;
}

const mockExams: ExamDraft[] = [
  { id: 1, title: 'SQL Basics - Midterm Exam', course: 'Database Systems 101', startTime: '2026-04-10T10:00', endTime: '2026-04-10T11:30', status: 'Published', questionsCount: 8 },
  { id: 2, title: 'Advanced Joins Quiz', course: 'Database Systems 101', startTime: '2026-04-15T14:00', endTime: '2026-04-15T15:00', status: 'Draft', questionsCount: 5 },
  { id: 3, title: 'Data Modeling Final', course: 'Database Design 201', startTime: '2026-05-20T09:00', endTime: '2026-05-20T12:00', status: 'Draft', questionsCount: 15 },
];

const ExamsList: React.FC = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState<ExamDraft[]>(mockExams);

  const togglePublish = (id: number) => {
    setExams(exams.map(ex => {
      if (ex.id === id) {
        return { ...ex, status: ex.status === 'Published' ? 'Draft' : 'Published' };
      }
      return ex;
    }));
  };

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
            {exams.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                  No exams created yet. Click "Create New Exam" to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExamsList;
