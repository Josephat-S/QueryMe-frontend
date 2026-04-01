import React, { useState, useRef } from 'react';
import './TeacherPages.css';

/* ── Types matching course_enrollments table ── */
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

/* ── Mock Data (mirrors course_enrollments + courses) ── */
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

const genId = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
const nowStr = () => new Date().toLocaleString('sv').slice(0, 16);

/* ── Component ── */
const CourseEnrollments: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>(mockCourses);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [searchQ, setSearchQ] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [dragOver, setDragOver] = useState(false);

  /* manual add form */
  const [addName, setAddName]       = useState('');
  const [addEmail, setAddEmail]     = useState('');
  const [addStudentId, setAddStudentId]   = useState('');
  const [showAddRow, setShowAddRow] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const course = courses.find(c => c.id === selectedCourseId) ?? null;
  const filtered = course
    ? course.students.filter(s =>
        s.name.toLowerCase().includes(searchQ.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQ.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchQ.toLowerCase())
      )
    : [];

  /* ── helpers ── */
  const patchCourse = (id: string, students: CourseStudent[]) =>
    setCourses(prev => prev.map(c => c.id === id ? { ...c, students } : c));

  const handleRemove = (enrollId: string) => {
    if (!course) return;
    patchCourse(course.id, course.students.filter(s => s.id !== enrollId));
  };

  const handleAddManually = () => {
    if (!course || (!addName.trim() && !addEmail.trim() && !addStudentId.trim())) return;
    const newS: CourseStudent = {
      id: genId(),
      studentId: addStudentId.trim() || '—',
      name: addName.trim() || '—',
      email: addEmail.trim() || '—',
      enrolledAt: nowStr(),
    };
    patchCourse(course.id, [...course.students, newS]);
    setAddName(''); setAddEmail(''); setAddStudentId('');
    setShowAddRow(false);
    setImportSuccess(`✓ Added ${newS.name} to ${course.name}`);
    setImportError('');
  };

  /* ── CSV parse (native, no library) ── */
  const parseCSV = (text: string, fileName: string) => {
    if (!course) return;
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) { setImportError('No data rows found in file.'); return; }
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    const norm = (aliases: string[]) => headers.findIndex(h => aliases.some(a => h.includes(a)));
    const niName  = norm(['name', 'fullname', 'student name']);
    const niEmail = norm(['email', 'mail']);
    const niId    = norm(['id', 'student id', 'regno', 'rollno']);
    if (niName < 0 && niEmail < 0 && niId < 0) {
      setImportError('Cannot detect columns. File must have Name, Email, or Reg Number columns.');
      return;
    }
    const existingEmails = new Set(course.students.map(s => s.email.toLowerCase()));
    const existingIds    = new Set(course.students.map(s => s.studentId.toLowerCase()));
    const newStudents: CourseStudent[] = [];
    lines.slice(1).forEach((line, i) => {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const name  = niName  >= 0 ? cols[niName]  ?? '' : '';
      const email = niEmail >= 0 ? cols[niEmail] ?? '' : '';
      const sid   = niId    >= 0 ? cols[niId]    ?? '' : '';
      if (!name && !email && !sid) return;
      if (existingEmails.has(email.toLowerCase()) || existingIds.has(sid.toLowerCase())) return;
      newStudents.push({ id: genId() + i, studentId: sid || '—', name: name || '—', email: email || '—', enrolledAt: nowStr() });
      existingEmails.add(email.toLowerCase());
      existingIds.add(sid.toLowerCase());
    });
    if (newStudents.length === 0) {
      setImportError('All students in this file are already enrolled, or no valid rows found.');
      return;
    }
    patchCourse(course.id, [...course.students, ...newStudents]);
    setImportSuccess(`✓ Enrolled ${newStudents.length} student(s) from "${fileName}"`);
    setImportError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImportError(''); setImportSuccess('');
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
      setImportError('Unsupported file. Please use .csv, .xlsx, or .xls');
      return;
    }
    if (ext === 'csv') {
      const reader = new FileReader();
      reader.onload = ev => parseCSV(ev.target?.result as string, file.name);
      reader.readAsText(file);
    } else {
      // xlsx via CDN window.XLSX
      const reader = new FileReader();
      reader.onload = ev => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const XLSX = (window as any).XLSX;
        if (!XLSX) { setImportError('Excel parser not ready. Please use a .csv file.'); return; }
        const wb = XLSX.read(ev.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const csv = [
          Object.keys(rows[0] ?? {}).join(','),
          ...rows.map(r => Object.values(r).join(','))
        ].join('\n');
        parseCSV(csv, file.name);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange({ target: { files: [file], value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>);
  };

  /* ── Render: Course selector ── */
  if (!course) {
    return (
      <div className="teacher-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="res-select-gate">
          <div className="res-gate-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6a3cb0" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h2 className="res-gate-title">Course Enrollments</h2>
          <p className="res-gate-sub">Select a course to manage its enrolled students.</p>
          <div className="res-gate-list">
            {courses.map(c => (
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

  /* ── Render: Enrollment Manager ── */
  return (
    <div
      className={`teacher-page${dragOver ? ' students-drag-active' : ''}`}
      style={{ overflow: 'hidden' }}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* Header */}
      <div className="builder-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedCourseId(''); setSearchQ(''); setImportError(''); setImportSuccess(''); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Courses
          </button>
          <div>
            <h1 className="builder-title" style={{ fontSize: '17px', marginBottom: '1px' }}>{course.name}</h1>
            <span style={{ fontSize: '12px', color: '#888' }}>{course.code} · {course.totalExams} exam{course.totalExams !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span className="badge badge-purple">{course.students.length} enrolled</span>
          <button className="btn-import-excel" onClick={() => fileRef.current?.click()}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
              <polyline points="14 14 17 17 20 14"/><line x1="17" y1="17" x2="17" y2="11"/>
            </svg>
            Import Excel Sheet
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { setShowAddRow(true); setImportError(''); setImportSuccess(''); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '5px' }}>
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Student
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Feedback */}
        {importError && (
          <div className="enroll-alert enroll-alert-error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            {importError}
          </div>
        )}
        {importSuccess && (
          <div className="enroll-alert enroll-alert-success">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
            {importSuccess}
          </div>
        )}

        {/* Drag-and-drop zone (only when empty) */}
        {course.students.length === 0 && (
          <div className={`student-dropzone${dragOver ? ' dragover' : ''}`} onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer' }}>
            <div className="student-dropzone-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="12" y2="12"/><line x1="15" y1="15" x2="12" y2="12"/>
              </svg>
            </div>
            <p className="student-dropzone-label">
              {dragOver ? <strong>Release to import!</strong> : <><strong>Drag & drop</strong> Excel / CSV here, or click <strong>Import Excel Sheet</strong> above</>}
            </p>
            <p className="student-dropzone-hint">Supported: .xlsx · .xls · .csv — Columns: <em>Name, Email, Reg Number</em></p>
          </div>
        )}

        {/* Table card */}
        {(course.students.length > 0 || showAddRow) && (
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
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {/* Manual add row */}
                  {showAddRow && (
                    <tr className="enroll-add-row">
                      <td>
                        <input className="enroll-inline-input" placeholder="Full name" value={addName} onChange={e => setAddName(e.target.value)} />
                      </td>
                      <td>
                        <input className="enroll-inline-input" placeholder="REG001" value={addStudentId} onChange={e => setAddStudentId(e.target.value)} />
                      </td>
                      <td>
                        <input className="enroll-inline-input" placeholder="student@uni.edu" value={addEmail} onChange={e => setAddEmail(e.target.value)} />
                      </td>
                      <td style={{ color: '#a0aec0', fontSize: '12px' }}>Now</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button className="enroll-save-btn" onClick={handleAddManually}>Save</button>
                          <button className="enroll-cancel-btn" onClick={() => { setShowAddRow(false); setAddName(''); setAddEmail(''); setAddStudentId(''); }}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}
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
                      <td>
                        <button className="enroll-remove-btn" onClick={() => handleRemove(s.id)} title="Remove from course">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                          </svg>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && !showAddRow && (
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
        )}

        <p className="sess-legend" style={{ marginTop: 0 }}>
          <span>Changes are course-level and apply to all exams in this course.</span>
          <span>Connect to <code>course_enrollments</code> table to replace mock data.</span>
        </p>
      </div>
    </div>
  );
};

export default CourseEnrollments;
