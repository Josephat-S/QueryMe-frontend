import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/* ── Types ── */
interface StudentResult {
  id: number;
  name: string;
  submittedAt: string;
  score: number;
  total: number;
  status: 'Graded' | 'Pending Review' | 'Missed';
}

interface AnswerKey {
  questionNumber: number;
  prompt: string;
  marks: number;
}

interface ExamData {
  id: string;
  title: string;
  teacher: string;
  course: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  duration: number;
  students: StudentResult[];
  questions: AnswerKey[];
}

/* ── Mock Data (Expanded for Guest View) ── */
const examDetails: Record<string, ExamData> = {
  '1': {
    id: '1',
    title: 'SQL Fundamentals',
    teacher: 'Prof. Smith',
    course: 'Intro to Databases',
    category: 'Basics',
    difficulty: 'Easy',
    duration: 45,
    students: [
      { id: 1, name: 'Alice Brown', submittedAt: '10 mins ago', score: 92, total: 100, status: 'Graded' },
      { id: 2, name: 'Bob Wilson', submittedAt: '1 hour ago', score: 85, total: 100, status: 'Graded' },
      { id: 3, name: 'Charlie Davis', submittedAt: '2 hours ago', score: 78, total: 100, status: 'Graded' },
    ],
    questions: [
      { questionNumber: 1, prompt: 'Select all columns from the employees table.', marks: 10 },
      { questionNumber: 2, prompt: 'Find the names of users who joined in 2023.', marks: 15 },
      { questionNumber: 3, prompt: 'Calculate the average salary by department.', marks: 25 },
    ],
  },
  '2': {
    id: '2',
    title: 'Advanced JOINS',
    teacher: 'Dr. Jones',
    course: 'Database Systems 201',
    category: 'Intermediate',
    difficulty: 'Medium',
    duration: 60,
    students: [
      { id: 4, name: 'Diana Prince', submittedAt: '30 mins ago', score: 95, total: 100, status: 'Graded' },
      { id: 5, name: 'Evan Wright', submittedAt: '3 hours ago', score: 88, total: 100, status: 'Graded' },
    ],
    questions: [
      { questionNumber: 1, prompt: 'Perform a LEFT JOIN between Orders and Customers.', marks: 20 },
      { questionNumber: 2, prompt: 'Use a SELF JOIN to find employees and their managers.', marks: 30 },
    ],
  },
};

const GuestExamDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const exam = examDetails[id || ''] || examDetails['1']; // Fallback for demo

  return (
    <div className="guest-exam-details" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
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
              padding: 0
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back to Browse
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px' }}>{exam.title}</h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', color: '#64748b', fontSize: '14px' }}>
            <span>{exam.course}</span>
            <span>•</span>
            <span>By {exam.teacher}</span>
            <span className={`badge ${exam.difficulty === 'Easy' ? 'badge-green' : exam.difficulty === 'Medium' ? 'badge-orange' : 'badge-red'}`} style={{ marginLeft: '12px' }}>
              {exam.difficulty}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
           <div className="badge badge-gray" style={{ marginBottom: '8px' }}>Read-Only Mode</div>
           <div style={{ fontSize: '12px', color: '#94a3b8' }}>Viewing as Guest</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
        {/* Main Content: Student Results */}
        <div>
          <div className="content-card" style={{ marginBottom: '24px' }}>
            <div className="content-card-body" style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 20px', color: '#1a1a2e' }}>Student Attendance & Results</h2>
              <table className="results-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
                    <th style={{ padding: '12px 0' }}>Student</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {exam.students.map(student => (
                    <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#718096', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600 }}>
                            {student.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span style={{ fontWeight: 500 }}>{student.name}</span>
                        </div>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '13px' }}>{student.submittedAt}</td>
                      <td>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: student.status === 'Graded' ? '#10b981' : '#f59e0b' }}>
                          • {student.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ 
                          fontWeight: 700, 
                          color: student.score >= 90 ? '#10b981' : student.score >= 70 ? '#3b82f6' : '#ef4444',
                          background: student.score >= 90 ? '#ecfdf5' : student.score >= 70 ? '#eff6ff' : '#fef2f2',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '13px'
                        }}>
                          {student.score}/{student.total}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar: Prepared Questions */}
        <div>
          <div className="content-card">
            <div className="content-card-body" style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px', color: '#1a1a2e' }}>Exam Prepared</h2>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Questions and point distribution for this assessment.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {exam.questions.map(q => (
                  <div key={q.questionNumber} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#718096' }}>Question {q.questionNumber}</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', background: '#e2e8f0', borderRadius: '4px' }}>{q.marks} pts</span>
                    </div>
                    <p style={{ fontSize: '13px', margin: 0, color: '#1a1a2e', lineHeight: '1.4' }}>{q.prompt}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestExamDetails;
