import React from 'react';

interface Lesson {
  id: string;
  title: string;
  description: string;
  category: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  topics: number;
}

const mockLessons: Lesson[] = [
  { id: 'l1', title: 'SQL Basics: SELECT & FROM', description: 'Master the core building blocks of every SQL query.', category: 'Beginner', duration: '20 min', topics: 5 },
  { id: 'l2', title: 'Filtering Data with WHERE', description: 'Learn how to narrow down your results using Boolean logic.', category: 'Beginner', duration: '15 min', topics: 4 },
  { id: 'l3', title: 'Joining Tables: INNER & LEFT', description: 'Combine data from multiple sources with precision.', category: 'Intermediate', duration: '35 min', topics: 6 },
  { id: 'l4', title: 'Aggregate Functions: COUNT, SUM, AVG', description: 'Summarize and analyze large datasets efficiently.', category: 'Intermediate', duration: '25 min', topics: 5 },
  { id: 'l5', title: 'Subqueries & Common Table Expressions', description: 'Structure complex logic into readable, modular queries.', category: 'Advanced', duration: '45 min', topics: 7 },
  { id: 'l6', title: 'Window Functions for Analytics', description: 'Perform advanced calculations across sets of rows.', category: 'Advanced', duration: '40 min', topics: 8 },
];

const GuestLessons: React.FC = () => {
  return (
    <div className="guest-lessons" style={{ padding: '24px' }}>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1>SQL Lessons</h1>
        <p>Explore curated learning paths to sharpen your database skills.</p>
      </div>

      <div className="lesson-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {mockLessons.map(lesson => (
          <div key={lesson.id} className="content-card" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
            <div className="content-card-body" style={{ padding: '24px', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span className={`badge ${lesson.category === 'Beginner' ? 'badge-green' : lesson.category === 'Intermediate' ? 'badge-orange' : 'badge-red'}`}>
                  {lesson.category}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{lesson.duration}</span>
              </div>
              
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 10px 0' }}>{lesson.title}</h3>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>{lesson.description}</p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                 <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                   {lesson.topics} Topics
                 </div>
              </div>

              <button 
                className="btn btn-secondary" 
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => alert('As a guest, you can preview the lesson syllabus. Please sign up to access the interactive editor.')}
              >
                Preview Lesson
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GuestLessons;
