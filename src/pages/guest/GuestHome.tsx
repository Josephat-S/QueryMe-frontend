import React from 'react';
import { Link } from 'react-router-dom';
import { InlineSkeleton } from '../../components/PageSkeleton';
import { usePublicCatalog } from '../../hooks/usePublicCatalog';

const GuestHome: React.FC = () => {
  const { data, loading, error, refresh } = usePublicCatalog();
  const courses = data?.courses ?? [];
  const classGroups = data?.classGroups ?? [];
  const featuredCourses = courses.slice(0, 3);

  return (
    <div className="guest-home">
      <div className="page-header">
        <h1>Welcome to QueryMe</h1>
        <p>Public access is limited to the course and class-group catalog until a user signs in.</p>
      </div>

      {error && (
        <div className="content-card" style={{ marginBottom: '20px' }}>
          <div className="content-card-body" style={{ color: '#e53e3e', display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center' }}>
            <span>{error}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => void refresh()}>Retry</button>
          </div>
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(113, 128, 150, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#718096" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
          </div>
          <div className="stat-card-value">View-only</div>
          <div className="stat-card-label">Access Level</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(106, 60, 176, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6a3cb0" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
          </div>
          <div className="stat-card-value">{loading ? <span className="inline-block h-7 w-16 animate-pulse rounded-lg bg-slate-300/60" /> : courses.length}</div>
          <div className="stat-card-label">Public Courses</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(56, 161, 105, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38a169" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1.11-1.79l-7-3.5a2 2 0 0 0-1.78 0l-7 3.5A2 2 0 0 0 3 8v8a2 2 0 0 0 1.11 1.79l7 3.5a2 2 0 0 0 1.78 0l7-3.5A2 2 0 0 0 21 16z" /></svg>
          </div>
          <div className="stat-card-value">{loading ? <span className="inline-block h-7 w-16 animate-pulse rounded-lg bg-slate-300/60" /> : classGroups.length}</div>
          <div className="stat-card-label">Class Groups</div>
        </div>
      </div>

      <div className="guest-home-footer" style={{ marginTop: '24px' }}>
        <div className="content-card">
          <div className="content-card-header">
            <h2>Public Catalog</h2>
          </div>
          <div className="content-card-body">
            <div className="empty-state" style={{ padding: '20px' }}>
              <div className="empty-state-icon" style={{ background: 'rgba(113, 128, 150, 0.1)', color: '#718096' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              </div>
              <h3>Read-only access</h3>
              <p style={{ marginBottom: '20px' }}>
                Teachers and students unlock exams, sessions, and grading after authentication. As a guest, you can safely explore the published course structure first.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/guest/catalog" className="btn btn-secondary">
                  Browse Course Catalog
                </Link>
                <Link to="/auth" className="btn btn-primary">
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="content-card" style={{ marginTop: '20px' }}>
        <div className="content-card-header">
          <h2>Featured Courses</h2>
        </div>
        <div className="content-card-body">
          {loading ? (
            <InlineSkeleton rows={3} className="px-0" />
          ) : featuredCourses.length === 0 ? (
            <div style={{ padding: '12px 0', color: '#666' }}>No public courses were returned by the backend.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {featuredCourses.map((course) => {
                const courseGroups = classGroups.filter((group) => String(group.courseId) === String(course.id));

                return (
                  <div key={String(course.id)} style={{ border: '1px solid #e8e8ee', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ fontWeight: 700, color: '#1a1a2e', marginBottom: '8px' }}>{course.name}</div>
                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '10px', minHeight: '40px' }}>
                      {course.description || 'No course description was provided by the backend.'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                      <span>{course.teacherName || 'Teacher not listed'}</span>
                      <span>{courseGroups.length} class group{courseGroups.length === 1 ? '' : 's'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuestHome;
