import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageSkeleton } from '../../components/PageSkeleton';
import { useAuth } from '../../contexts';
import { useTheme } from '../../contexts';
import { useTeacherCourses } from '../../hooks/useTeacherCourses';

const TeacherCourses: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { data: courses, loading, error: coursesError, refresh } = useTeacherCourses(user?.id);
  const [refreshing, setRefreshing] = useState(false);

  const sortedCourses = useMemo(
    () => [...courses].sort((left, right) => left.name.localeCompare(right.name)),
    [courses],
  );

  const describedCourses = useMemo(
    () => sortedCourses.filter((course) => course.description?.trim()).length,
    [sortedCourses],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  if (loading) {
    return <PageSkeleton title="Courses" rows={5} />;
  }

  const pageError = coursesError;

  return (
    <div className="teacher-page" style={{ padding: 'clamp(12px, 2.8vw, 24px)', overflowY: 'auto' }}>
      <div className="page-header">
        <h1>Courses</h1>
        <p>View your assigned courses. Use them for exams and student enrollment.</p>
      </div>

      <div className="stat-grid" style={{ marginBottom: '20px', width: '100%' }}>
        <div className="stat-card"><div className="stat-card-value">{sortedCourses.length}</div><div className="stat-card-label">Total Courses</div></div>
        <div className="stat-card"><div className="stat-card-value">{describedCourses}</div><div className="stat-card-label">With Description</div></div>
        <div className="stat-card"><div className="stat-card-value">{sortedCourses.length - describedCourses}</div><div className="stat-card-label">Need Description</div></div>
      </div>

      {pageError && <div style={{ marginBottom: '16px', color: '#e53e3e', fontSize: '13px' }}>{pageError}</div>}

      <div style={{ width: '100%' }}>
        <div className="content-card">
          <div className="content-card-header">
            <h2>Your Courses</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => void handleRefresh()} disabled={refreshing}>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {sortedCourses.length === 0 ? (
            <div className="course-empty" style={{ padding: '40px', textAlign: 'center', backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
              <p style={{ margin: 0, fontWeight: 600, color: isDarkMode ? '#f1f5f9' : '#475569' }}>No courses assigned yet.</p>
              <p style={{ margin: '8px 0 0', fontSize: '13px', color: isDarkMode ? '#94a3b8' : '#64748b' }}>If you believe this is an error, please contact your administrator.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '16px', marginTop: '16px' }}>
              {sortedCourses.map((course) => (
                <div
                  key={String(course.id)}
                  style={{
                    borderRadius: '12px',
                    border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                    padding: '20px',
                    boxShadow: isDarkMode ? '0 6px 16px rgba(0, 0, 0, 0.24)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = isDarkMode ? '0 10px 22px rgba(0, 0, 0, 0.34)' : '0 8px 16px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = isDarkMode ? '0 6px 16px rgba(0, 0, 0, 0.24)' : '0 2px 8px rgba(0, 0, 0, 0.04)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: isDarkMode ? '#f8fafc' : '#1a202c', margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.name}</h3>
                    <span style={{ padding: '4px 10px', backgroundColor: '#d1fae5', color: '#047857', borderRadius: '6px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>Ready</span>
                  </div>

                  <p style={{ fontSize: '13px', color: isDarkMode ? '#94a3b8' : '#718096', margin: '0', lineHeight: '1.5', minHeight: '40px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {course.description?.trim() || 'No description provided.'}
                  </p>

                  <div style={{ fontSize: '12px', color: isDarkMode ? '#64748b' : '#a0aec0', marginTop: '4px' }}>
                    Teacher: {course.teacherName || user?.name || 'You'}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, fontSize: '12px' }}
                      onClick={() => navigate(`/teacher/students?courseId=${encodeURIComponent(String(course.id))}`)}
                    >
                      Enroll
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, fontSize: '12px' }}
                      onClick={() => navigate(`/teacher/exams/builder?courseId=${encodeURIComponent(String(course.id))}`)}
                    >
                      Create Exam
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherCourses;
