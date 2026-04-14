import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseApi, type Course } from '../../api';
import { useToast } from '../../components/ToastProvider';
import { useAuth } from '../../contexts';
import { extractErrorMessage } from '../../utils/errorUtils';
import { filterCoursesByTeacher } from '../../utils/queryme';
import './TeacherPages.css';

const TeacherCourses: React.FC = () => {
  const { user } = useAuth();
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
    return <div className="teacher-page" style={{ padding: '24px' }}>Loading courses...</div>;
  }

  return (
    <div className="teacher-page" style={{ padding: '24px', overflowY: 'auto' }}>
      <div className="page-header">
        <h1>Courses</h1>
        <p>Create courses from the teacher portal and use them immediately for exams and student enrollment.</p>
      </div>

      <div className="stat-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card"><div className="stat-card-value">{sortedCourses.length}</div><div className="stat-card-label">Total Courses</div></div>
        <div className="stat-card"><div className="stat-card-value">{describedCourses}</div><div className="stat-card-label">With Description</div></div>
        <div className="stat-card"><div className="stat-card-value">{sortedCourses.length - describedCourses}</div><div className="stat-card-label">Need Description</div></div>
      </div>

      {error && <div style={{ marginBottom: '16px', color: '#e53e3e', fontSize: '13px' }}>{error}</div>}

      <div className="course-page-grid">
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
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Course'}
                </button>
                <button
                  className="btn btn-secondary"
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
            <div>
              {sortedCourses.map((course) => (
                <div key={String(course.id)} className="course-list-row">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span className="td-draft-title" style={{ fontSize: '15px', whiteSpace: 'normal' }}>{course.name}</span>
                      <span className="td-draft-badge td-badge-upcoming">Ready</span>
                    </div>
                    <p className="course-description">{course.description?.trim() || 'No description provided yet.'}</p>
                    <div className="course-list-meta">
                      <span className="course-chip">Teacher: {course.teacherName || user?.name || 'You'}</span>
                    </div>
                  </div>

                  <div className="course-list-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/teacher/students?courseId=${encodeURIComponent(String(course.id))}`)}
                    >
                      Enroll Students
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
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
