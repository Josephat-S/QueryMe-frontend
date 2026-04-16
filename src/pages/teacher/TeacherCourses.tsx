import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseApi, type Course } from '../../api';
import { PageSkeleton } from '../../components/PageSkeleton';
import { useToast } from '../../components/ToastProvider';
import { useAuth } from '../../contexts';
import { useTheme } from '../../contexts';
import { extractErrorMessage } from '../../utils/errorUtils';
import { filterCoursesByTeacher } from '../../utils/queryme';

const TeacherCourses: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCourses = useCallback(async (signal?: AbortSignal) => {
    if (!user) {
      setCourses([]);
      return;
    }

    const allCourses = await courseApi.getCourses(signal);
    setCourses(filterCoursesByTeacher(allCourses, user.id));
  }, [user]);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    void loadCourses(controller.signal)
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(extractErrorMessage(err, 'Failed to load your courses.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [loadCourses]);

  const sortedCourses = useMemo(
    () => [...courses].sort((left, right) => left.name.localeCompare(right.name)),
    [courses],
  );

  const describedCourses = useMemo(
    () => sortedCourses.filter((course) => course.description?.trim()).length,
    [sortedCourses],
  );

  const handleRefresh = async () => {
    setError(null);

    try {
      await loadCourses();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to refresh your courses.'));
    }
  };

  const handleCreateCourse = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      setError('Course name is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const createdCourse = await courseApi.createCourse({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      setCourses((previous) => {
        const remainingCourses = previous.filter((course) => String(course.id) !== String(createdCourse.id));
        return [...remainingCourses, createdCourse];
      });
      setName('');
      setDescription('');
      showToast('success', 'Course created', `"${createdCourse.name}" is now ready for exams and enrollments.`);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to create the course.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageSkeleton title="Courses" rows={5} />;
  }

  return (
    <div className="teacher-page" style={{ padding: '24px', overflowY: 'auto' }}>
      <div className="page-header">
        <h1>Courses</h1>
        <p>Create courses from the teacher portal and use them immediately for exams and student enrollment.</p>
      </div>

      <div className="stat-grid" style={{ marginBottom: '20px', width: '100%' }}>
        <div className="stat-card"><div className="stat-card-value">{sortedCourses.length}</div><div className="stat-card-label">Total Courses</div></div>
        <div className="stat-card"><div className="stat-card-value">{describedCourses}</div><div className="stat-card-label">With Description</div></div>
        <div className="stat-card"><div className="stat-card-value">{sortedCourses.length - describedCourses}</div><div className="stat-card-label">Need Description</div></div>
      </div>

      {error && <div style={{ marginBottom: '16px', color: '#e53e3e', fontSize: '13px' }}>{error}</div>}

      <div className="course-page-grid" style={{ gap: '20px', width: '100%' }}>
        <div className="content-card">
          <div className="content-card-header">
            <h2>Create Course</h2>
          </div>
          <div className="content-card-body">
            <form onSubmit={(event) => void handleCreateCourse(event)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="course-form-field">
                <label className="course-form-label" htmlFor="teacher-course-name">Course Name</label>
                <input
                  id="teacher-course-name"
                  className="form-input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Database Systems"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="course-form-field">
                <label className="course-form-label" htmlFor="teacher-course-description">Description</label>
                <textarea
                  id="teacher-course-description"
                  className="form-input"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Short summary of the course, class level, or exam focus."
                  style={{ width: '100%', minHeight: '120px', resize: 'vertical' }}
                />
              </div>

              <div className="course-helper-box">
                New courses are linked to your teacher account and become available in the exam builder right away.
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button className="btn btn-primary w-full sm:w-auto" type="submit" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Course'}
                </button>
                <button
                  className="btn btn-secondary w-full sm:w-auto"
                  type="button"
                  disabled={saving || (!name && !description)}
                  onClick={() => {
                    setName('');
                    setDescription('');
                    setError(null);
                  }}
                >
                  Clear
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="content-card">
          <div className="content-card-header">
            <h2>Your Courses</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => void handleRefresh()} disabled={saving}>
              Refresh
            </button>
          </div>

          {sortedCourses.length === 0 ? (
            <div className="course-empty">
              <p>No courses have been created from your portal yet.</p>
              <p>Your first course will appear here as soon as you save it.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
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
