import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Exam {
  id: number;
  title: string;
  course: string;
  description: string;
  date: string;
  duration: string;
  questions: number;
  totalMarks: number;
  status: 'available' | 'upcoming' | 'completed' | 'in-progress';
  teacher: string;
}

const mockExams: Exam[] = [
  { id: 1, title: 'SQL Basics - Midterm Exam', course: 'Database Systems 101', description: 'Covers SELECT, WHERE, ORDER BY, GROUP BY, HAVING, and basic JOIN operations.', date: '2026-04-02', duration: '90 min', questions: 8, totalMarks: 100, status: 'available', teacher: 'Prof. Smith' },
  { id: 2, title: 'Advanced Joins Quiz', course: 'Database Systems 101', description: 'Inner, outer, cross and self joins with multi-table queries.', date: '2026-04-05', duration: '45 min', questions: 5, totalMarks: 50, status: 'available', teacher: 'Prof. Smith' },
  { id: 3, title: 'Subqueries & Aggregation', course: 'Data Management', description: 'Nested subqueries, correlated subqueries, and aggregate functions.', date: '2026-04-10', duration: '60 min', questions: 6, totalMarks: 70, status: 'upcoming', teacher: 'Dr. Johnson' },
  { id: 4, title: 'DDL & Schema Design', course: 'Data Management', description: 'CREATE, ALTER, DROP statements and normalization exercises.', date: '2026-04-15', duration: '75 min', questions: 10, totalMarks: 80, status: 'upcoming', teacher: 'Dr. Johnson' },
  { id: 5, title: 'SELECT Basics Quiz', course: 'Database Systems 101', description: 'Basic SELECT statements, filtering and sorting.', date: '2026-03-25', duration: '30 min', questions: 5, totalMarks: 50, status: 'completed', teacher: 'Prof. Smith' },
  { id: 6, title: 'CREATE TABLE Exercise', course: 'Database Systems 101', description: 'Creating tables with constraints and relationships.', date: '2026-03-20', duration: '45 min', questions: 4, totalMarks: 40, status: 'completed', teacher: 'Prof. Smith' },
];

const AvailableExams: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'available' | 'upcoming' | 'completed'>('all');

  const filtered = filter === 'all' ? mockExams : mockExams.filter(e => e.status === filter);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available': return 'badge-green';
      case 'upcoming': return 'badge-orange';
      case 'completed': return 'badge-gray';
      case 'in-progress': return 'badge-blue';
      default: return 'badge-gray';
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Available Exams</h1>
        <p>View and take your assigned SQL examinations</p>
      </div>

      {/* Filter tabs */}
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

      {/* Exam cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '18px' }}>
        {filtered.map(exam => (
          <div key={exam.id} className="content-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="content-card-body" style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span className={`badge ${getStatusBadge(exam.status)}`}>{exam.status}</span>
                <span style={{ fontSize: '11px', color: '#888' }}>{new Date(exam.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 6px' }}>{exam.title}</h3>
              <p style={{ fontSize: '12px', color: '#888', margin: '0 0 14px', lineHeight: 1.5 }}>{exam.description}</p>
              
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#666', marginBottom: '14px' }}>
                <span>📚 {exam.course}</span>
                <span>👤 {exam.teacher}</span>
              </div>

              <div style={{ display: 'flex', gap: '18px', fontSize: '12px', color: '#888', padding: '10px 0', borderTop: '1px solid #f0f0f5' }}>
                <span><strong style={{ color: '#333' }}>{exam.questions}</strong> Questions</span>
                <span><strong style={{ color: '#333' }}>{exam.totalMarks}</strong> Marks</span>
                <span><strong style={{ color: '#333' }}>{exam.duration}</strong></span>
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
    </div>
  );
};

export default AvailableExams;
