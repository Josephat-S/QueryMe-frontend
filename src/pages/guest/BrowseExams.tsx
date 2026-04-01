import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface MockExam {
  id: string;
  title: string;
  teacher: string;
  questions: number;
  duration: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
}

const exams: MockExam[] = [
  { id: '1', title: 'SQL Fundamentals', teacher: 'Prof. Smith', questions: 15, duration: 45, difficulty: 'Easy', category: 'Basics' },
  { id: '2', title: 'Advanced JOINS', teacher: 'Dr. Jones', questions: 10, duration: 60, difficulty: 'Medium', category: 'Intermediate' },
  { id: '3', title: 'Subqueries & CTEs', teacher: 'Prof. Smith', questions: 12, duration: 50, difficulty: 'Medium', category: 'Intermediate' },
  { id: '4', title: 'Database Optimization', teacher: 'Dr. Jones', questions: 8, duration: 90, difficulty: 'Hard', category: 'Advanced' },
  { id: '5', title: 'Data Analysis with SQL', teacher: 'Prof. Smith', questions: 20, duration: 120, difficulty: 'Hard', category: 'Advanced' },
  { id: '6', title: 'Aggregation Functions', teacher: 'Dr. Jones', questions: 10, duration: 30, difficulty: 'Easy', category: 'Basics' },
];

const BrowseExams: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const filteredExams = exams.filter(exam =>
    exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              placeholder="Search by title or category..."
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
                <span className={`badge ${exam.difficulty === 'Easy' ? 'badge-green' : exam.difficulty === 'Medium' ? 'badge-orange' : 'badge-red'}`}>
                  {exam.difficulty}
                </span>
                <span className="badge badge-gray">{exam.category}</span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 8px 0' }}>{exam.title}</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Created by {exam.teacher}</p>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {exam.duration}m
                </div>
                <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /></svg>
                  {exam.questions} Questions
                </div>
              </div>

              <button
                className="btn btn-secondary w-full"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => navigate(`/guest/exam/${exam.id}`)}
              >
                View Details & Results
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
              <p>Try searching for a different title or category.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseExams;
