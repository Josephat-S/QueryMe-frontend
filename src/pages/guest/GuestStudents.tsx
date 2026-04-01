import React, { useState } from 'react';
import '../teacher/TeacherPages.css';

/* ── Types ── */
interface CourseStudent {
  id: string;
  studentId: string;
  name: string;
  email: string;
  enrolledAt: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
  totalExams: number;
  students: CourseStudent[];
}

/* ── Mock Data (matching teacher portal) ── */
const mockCourses: Course[] = [
  {
    id: 'c1',
    name: 'Database Systems 101',
    code: 'DBS-101',
    totalExams: 3,
    students: [
      { id: 'e1', studentId: '24/DBS/001', name: 'Alice Brown',   email: 'alice@uni.edu',   enrolledAt: '2026-01-15 09:00' },
      { id: 'e2', studentId: '24/DBS/002', name: 'Bob Wilson',    email: 'bob@uni.edu',     enrolledAt: '2026-01-15 09:02' },
      { id: 'e3', studentId: '24/DBS/003', name: 'Charlie Davis', email: 'charlie@uni.edu', enrolledAt: '2026-01-16 10:30' },
      { id: 'e4', studentId: '24/DBS/004', name: 'Diana Prince',  email: 'diana@uni.edu',   enrolledAt: '2026-01-17 14:00' },
      { id: 'e5', studentId: '24/DBS/005', name: 'Evan Wright',   email: 'evan@uni.edu',    enrolledAt: '2026-01-18 08:45' },
    ],
  },
  {
    id: 'c2',
    name: 'Advanced SQL',
    code: 'SQL-301',
    totalExams: 2,
    students: [
      { id: 'e6', studentId: '24/SQL/001', name: 'Faith Osei',    email: 'faith@uni.edu',   enrolledAt: '2026-02-01 11:00' },
      { id: 'e7', studentId: '24/SQL/002', name: 'George Kimani', email: 'george@uni.edu',  enrolledAt: '2026-02-01 11:05' },
    ],
  },
  {
    id: 'c3',
    name: 'Data Engineering Fundamentals',
    code: 'DE-201',
    totalExams: 1,
    students: [],
  },
];

const GuestStudents: React.FC = () => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [searchQ, setSearchQ] = useState('');

  const course = mockCourses.find(c => c.id === selectedCourseId) ?? null;
  const filtered = course
    ? course.students.filter(s =>
        s.name.toLowerCase().includes(searchQ.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQ.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchQ.toLowerCase())
      )
    : [];

  /* ── Render: Course selector ── */
  if (!course) {
    return (
      <div className="teacher-page" style={{ padding: '40px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="res-select-gate" style={{ maxWidth: '600px', width: '100%' }}>
          <div className="res-gate-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6a3cb0" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h2 className="res-gate-title">Course Enrollments</h2>
          <p className="res-gate-sub">Select a course to view its enrolled students (Guest View).</p>
          <div className="res-gate-list" style={{ marginTop: '24px' }}>
            {mockCourses.map(c => (
              <button key={c.id} className="res-gate-exam-btn" onClick={() => setSelectedCourseId(c.id)}>
                <div>
                  <div className="res-gate-exam-title">{c.name}</div>
                  <div className="res-gate-exam-course">{c.code} · {c.totalExams} exam{c.totalExams !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="enroll-badge-count">{c.students.length} student{c.students.length !== 1 ? 's' : ''}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Render: Read-Only Student List ── */
  return (
    <div className="teacher-page" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div className="builder-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedCourseId(''); setSearchQ(''); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back to Courses
          </button>
          <div>
            <h1 className="builder-title" style={{ fontSize: '17px', marginBottom: '1px' }}>{course.name}</h1>
            <span style={{ fontSize: '12px', color: '#888' }}>{course.code} · {course.totalExams} exam{course.totalExams !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span className="badge badge-gray">Read-Only Mode</span>
          <span className="badge badge-purple">{course.students.length} enrolled</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Table card */}
        <div className="builder-card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Table toolbar */}
          <div className="sess-table-header">
            <span style={{ fontWeight: 700, fontSize: '14px' }}>
              Enrolled Students — {filtered.length} of {course.students.length}
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                className="res-search-input"
                placeholder="Search name / email / ID..."
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="sess-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Reg Number</th>
                  <th>Email</th>
                  <th>Enrolled At</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div className="sess-student-cell">
                        <span className="sess-avatar" style={{ borderRadius: '50%' }}>{s.name[0]?.toUpperCase()}</span>
                        <span className="sess-student-name">{s.name}</span>
                      </div>
                    </td>
                    <td><span className="sess-sandbox-badge" style={{ fontFamily: 'inherit', fontSize: '12px', fontWeight: 600 }}>{s.studentId}</span></td>
                    <td style={{ fontSize: '13px', color: '#4a5568' }}>{s.email}</td>
                    <td><span className="sess-time-main" style={{ fontSize: '12px' }}>{s.enrolledAt}</span></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <div className="students-empty" style={{ padding: '40px 20px' }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.2">
                          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                        </svg>
                        <p>{searchQ ? 'No students match your search.' : 'No students enrolled yet.'}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="sess-legend" style={{ marginTop: 0 }}>
          <span>Viewing enrollment data in read-only mode.</span>
        </p>
      </div>
    </div>
  );
};

export default GuestStudents;
