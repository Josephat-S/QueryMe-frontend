import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { PageSkeleton } from '../../components/PageSkeleton';
import { useAuth } from '../../contexts';
import { useTheme } from '../../contexts';
import { useTeacherCourses } from '../../hooks/useTeacherCourses';
import { courseApi } from '../../api';
import { useToast } from '../../components/ToastContext';

/* ─── Create Course Modal ─────────────────────────────────────── */

interface CreateCourseModalProps {
  isDark: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CreateCourseModal: React.FC<CreateCourseModalProps> = ({ isDark, onClose, onCreated }) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; code?: string }>({});
  const nameRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const validate = () => {
    const errs: { name?: string; code?: string } = {};
    if (!name.trim()) errs.name = 'Course name is required.';
    if (code.trim() && !/^[A-Za-z0-9_-]{2,20}$/.test(code.trim()))
      errs.code = 'Code must be 2–20 alphanumeric characters (dashes/underscores allowed).';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await courseApi.createCourse({ name: name.trim(), ...(code.trim() ? { code: code.trim() } : {}) });
      showToast('success', 'Course created!', `"${name.trim()}" has been attached to your profile.`);
      onCreated();
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'response' in err
          ? String((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? err)
          : 'Failed to create course. Please try again.';
      showToast('error', 'Creation failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: isDark ? '1px solid #334155' : '1px solid #d1d5db',
    background: isDark ? '#0f172a' : '#f9fafb',
    color: isDark ? '#f1f5f9' : '#111827',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.18s',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: isDark ? '#94a3b8' : '#374151',
    marginBottom: '6px',
  };

  const errStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#e53e3e',
    marginTop: '4px',
  };

  return (
    /* ── Backdrop ── */
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
      role="presentation"
    >
      {/* ── Sheet ── */}
      <div
        style={{
          background: isDark ? '#1e293b' : '#fff',
          borderRadius: '20px',
          padding: '32px 28px',
          width: '480px',
          maxWidth: '94vw',
          boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
          animation: 'scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: isDark ? '#f8fafc' : '#111827' }}>
              Create New Course
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: isDark ? '#64748b' : '#6b7280' }}>
              This course will be automatically attached to your teacher account.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px',
              lineHeight: 1,
              color: isDark ? '#64748b' : '#9ca3af',
              padding: '2px',
            }}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Course Name */}
          <div>
            <label htmlFor="course-name" style={labelStyle}>
              Course Name <span style={{ color: '#e53e3e' }}>*</span>
            </label>
            <input
              id="course-name"
              ref={nameRef}
              type="text"
              placeholder="e.g. Database Administration"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined }));
              }}
              style={{
                ...inputStyle,
                borderColor: fieldErrors.name ? '#e53e3e' : isDark ? '#334155' : '#d1d5db',
              }}
              disabled={submitting}
              autoComplete="off"
            />
            {fieldErrors.name && <p style={errStyle}>{fieldErrors.name}</p>}
          </div>

          {/* Course Code */}
          <div>
            <label htmlFor="course-code" style={labelStyle}>
              Course Code <span style={{ color: isDark ? '#64748b' : '#9ca3af', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              id="course-code"
              type="text"
              placeholder="e.g. CS301"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                if (fieldErrors.code) setFieldErrors((p) => ({ ...p, code: undefined }));
              }}
              style={{
                ...inputStyle,
                borderColor: fieldErrors.code ? '#e53e3e' : isDark ? '#334155' : '#d1d5db',
              }}
              disabled={submitting}
              maxLength={20}
              autoComplete="off"
            />
            {fieldErrors.code && <p style={errStyle}>{fieldErrors.code}</p>}
            <p style={{ margin: '5px 0 0', fontSize: '11px', color: isDark ? '#475569' : '#9ca3af' }}>
              A short unique identifier for this course (e.g. CS301, DB-ADM).
            </p>
          </div>

          {/* Teacher attachment info banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: '10px',
              background: isDark ? 'rgba(16,185,129,0.1)' : '#ecfdf5',
              border: isDark ? '1px solid rgba(16,185,129,0.25)' : '1px solid #a7f3d0',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '1px', flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span style={{ fontSize: '12px', color: isDark ? '#34d399' : '#065f46', lineHeight: 1.5 }}>
              The course will be created and linked to <strong>your teacher profile</strong> automatically — no further action needed.
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                border: isDark ? '1px solid #334155' : '1px solid #e5e7eb',
                background: 'transparent',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                color: isDark ? '#94a3b8' : '#374151',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '10px 26px',
                borderRadius: '10px',
                border: 'none',
                background: submitting ? '#a7f3d0' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: submitting ? '#065f46' : '#fff',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: '14px',
                boxShadow: submitting ? 'none' : '0 4px 14px rgba(16,185,129,0.35)',
                transition: 'all 0.18s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {submitting && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                </svg>
              )}
              {submitting ? 'Creating...' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.88) } to { opacity:1; transform:scale(1) } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
};

/* ─── TeacherCourses Page ─────────────────────────────────────── */

const TeacherCourses: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: courses, loading, error: coursesError, refresh } = useTeacherCourses(user?.id);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const handleCourseCreated = () => {
    void queryClient.invalidateQueries({ queryKey: ['courses'] });
  };

  if (loading) {
    return <PageSkeleton title="Courses" rows={5} />;
  }

  const pageError = coursesError;

  return (
    <div className="teacher-page" style={{ padding: 'clamp(12px, 2.8vw, 24px)', overflowY: 'auto' }}>
      {/* Create Course Modal */}
      {showCreateModal && (
        <CreateCourseModal
          isDark={isDarkMode}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCourseCreated}
        />
      )}

      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0 }}>Courses</h1>
            <p style={{ marginTop: '4px', marginBottom: 0 }}>Manage your courses. Create a new course or view ones you own.</p>
          </div>
          <button
            id="create-course-btn"
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '14px',
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Course
          </button>
        </div>
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
            <div
              style={{
                padding: '56px 40px',
                textAlign: 'center',
                backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                borderRadius: '12px',
                border: '2px dashed #cbd5e1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={isDarkMode ? '#475569' : '#cbd5e1'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <p style={{ margin: 0, fontWeight: 600, color: isDarkMode ? '#f1f5f9' : '#475569' }}>No courses yet.</p>
              <p style={{ margin: 0, fontSize: '13px', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                Click <strong>New Course</strong> above to create your first course — it'll be linked to your account automatically.
              </p>
              <button
                className="btn btn-primary btn-sm"
                style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => setShowCreateModal(true)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create First Course
              </button>
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
                    cursor: 'default',
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

                  {/* Course code badge */}
                  {typeof course.code === 'string' && course.code.trim() && (
                    <span style={{ display: 'inline-flex', alignSelf: 'flex-start', padding: '3px 8px', backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', color: isDarkMode ? '#94a3b8' : '#475569', borderRadius: '6px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px' }}>
                      {course.code}
                    </span>
                  )}

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
