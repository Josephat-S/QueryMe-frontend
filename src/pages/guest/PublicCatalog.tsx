import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageSkeleton } from '../../components/PageSkeleton';
import { usePublicCatalog } from '../../hooks/usePublicCatalog';

const PublicCatalog: React.FC = () => {
  const { data, loading, error, refresh } = usePublicCatalog();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');

  const courses = data?.courses ?? [];
  const classGroups = data?.classGroups ?? [];

  const courseGroupsCount = useMemo(
    () => Object.fromEntries(courses.map((course) => [
      String(course.id),
      classGroups.filter((group) => String(group.courseId) === String(course.id)).length,
    ])),
    [classGroups, courses],
  );

  const filteredCourses = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return courses.filter((course) => {
      if (!normalizedSearch) {
        return true;
      }

      return [
        course.name,
        course.description,
        course.teacherName,
        String(course.id),
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
    });
  }, [courses, searchTerm]);

  const filteredClassGroups = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return classGroups.filter((group) => {
      const matchesCourse = !selectedCourseId || String(group.courseId) === selectedCourseId;
      if (!matchesCourse) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const course = courses.find((candidate) => String(candidate.id) === String(group.courseId));
      return [
        group.name,
        String(group.id),
        course?.name,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
    });
  }, [classGroups, courses, searchTerm, selectedCourseId]);

  if (loading) {
    return <PageSkeleton title="Course Catalog" rows={6} />;
  }

  if (error) {
    return (
      <div>
        <div className="page-header">
          <h1>Course Catalog</h1>
          <p>Browse the public course structure before signing in.</p>
        </div>
        <div className="content-card">
          <div className="content-card-body" style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ color: '#e53e3e', marginBottom: '16px' }}>{error}</div>
            <button className="btn btn-primary" onClick={() => void refresh()}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Course Catalog</h1>
        <p>Only public endpoints are used here: courses and class groups. Exams and results stay protected behind authentication.</p>
      </div>

      <div className="content-card" style={{ marginBottom: '20px' }}>
        <div className="content-card-body" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr) auto', gap: '12px' }}>
          <input
            className="form-input"
            placeholder="Search courses, teachers, or class groups..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <select className="form-input" value={selectedCourseId} onChange={(event) => setSelectedCourseId(event.target.value)}>
            <option value="">All courses</option>
            {courses.map((course) => (
              <option key={String(course.id)} value={String(course.id)}>
                {course.name}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary" onClick={() => { setSearchTerm(''); setSelectedCourseId(''); }}>
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="content-card">
          <div className="content-card-header">
            <h2>Courses</h2>
          </div>
          <div className="content-card-body" style={{ display: 'grid', gap: '14px' }}>
            {filteredCourses.length === 0 ? (
              <div style={{ color: '#666' }}>No courses matched your current filter.</div>
            ) : (
              filteredCourses.map((course) => (
                <div key={String(course.id)} style={{ border: '1px solid #e8e8ee', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 700, color: '#1a1a2e' }}>{course.name}</div>
                    <span className="badge badge-purple">{courseGroupsCount[String(course.id)] || 0} groups</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>
                    {course.description || 'No course description was returned by the API.'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', fontSize: '12px', color: '#666' }}>
                    <span>Teacher: {course.teacherName || 'Not listed'}</span>
                    <span>{courseGroupsCount[String(course.id)] || 0} group{(courseGroupsCount[String(course.id)] || 0) === 1 ? '' : 's'} available</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="content-card">
          <div className="content-card-header">
            <h2>Class Groups</h2>
          </div>
          <div className="content-card-body" style={{ display: 'grid', gap: '12px' }}>
            {filteredClassGroups.length === 0 ? (
              <div style={{ color: '#666' }}>No class groups matched your current filter.</div>
            ) : (
              filteredClassGroups.map((group) => {
                const parentCourse = courses.find((course) => String(course.id) === String(group.courseId));

                return (
                  <div key={String(group.id)} style={{ border: '1px solid #e8e8ee', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ fontWeight: 700, marginBottom: '6px' }}>{group.name}</div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                      Course: {parentCourse?.name || 'Course'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Public class group
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="content-card" style={{ marginTop: '20px' }}>
        <div className="content-card-body" style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <strong style={{ display: 'block', marginBottom: '4px' }}>Need exams, attempts, or results?</strong>
            <span style={{ color: '#666', fontSize: '13px' }}>Those flows require an authenticated student, teacher, admin, or managed guest account.</span>
          </div>
          <Link to="/auth" className="btn btn-primary">Go to Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default PublicCatalog;
