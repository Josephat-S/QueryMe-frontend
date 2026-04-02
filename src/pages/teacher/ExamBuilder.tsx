/* eslint-disable react-x/no-array-index-key */
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './TeacherPages.css';

// SheetJS is loaded via CDN script in index.html — available as window.XLSX
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const XLSXLib = () => (window as any).XLSX as any;

interface Question {
  id: number;
  number: number;
  prompt: string;
  marks: number;
  expectedQuery: string;
  orderSensitive?: boolean;
  partialMarks?: boolean;
}

interface Student {
  id: string;
  name: string;
  email: string;
  studentId: string;
}

type ExamStatus = 'draft' | 'published' | 'active' | 'closed';

const ExamBuilder: React.FC = () => {
  const [examTitle, setExamTitle] = useState('New SQL Midterm');
  const [courseName, setCourseName] = useState('Database Systems 101');
  const [examDescription, setExamDescription] = useState('');
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [timeLimit, setTimeLimit] = useState(90);
  const [startTime, setStartTime] = useState('2026-04-10T10:00');
  const [endTime, setEndTime] = useState('2026-04-10T11:30');
  const navigate = useNavigate();

  // Exam status
  const [examStatus, setExamStatus] = useState<ExamStatus>('draft');
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  // Students state
  const [students, setStudents] = useState<Student[]>([]);
  const [studentImportError, setStudentImportError] = useState('');
  const [studentImportSuccess, setStudentImportSuccess] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [studentDragOver, setStudentDragOver] = useState(false);
  const studentFileRef = useRef<HTMLInputElement>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState(false);

  // Database Setup Script
  const [examSetupSql, setExamSetupSql] = useState(
    "CREATE TABLE employees (id INT, name STRING, salary INT);\n" +
    "INSERT INTO employees VALUES (1, 'John Smith', 75000);\n" +
    "INSERT INTO employees VALUES (2, 'Jane Doe', 62000);\n" +
    "INSERT INTO employees VALUES (3, 'Bob Wilson', 58000);"
  );
  const [importedFileName, setImportedFileName] = useState('sample-schema.sql');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportedFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setExamSetupSql(text);
        setQueryError('');
        setQueryResult(null);
      };
      reader.readAsText(file);
    }
  };

  const parseStudentFile = (file: File) => {
    setStudentImportError('');
    setStudentImportSuccess('');
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['xlsx', 'xls', 'csv'];
    if (!ext || !allowedExts.includes(ext)) {
      setStudentImportError('Unsupported file type. Please upload an .xlsx, .xls, or .csv file.');
      return;
    }

    const processRows = (rows: Record<string, string>[]) => {
      if (rows.length === 0) {
        setStudentImportError('The sheet is empty. Please add student rows.');
        return;
      }
      const normalize = (s: string) => s?.toString().toLowerCase().replace(/[^a-z]/g, '') || '';
      const headers = Object.keys(rows[0]);
      const findCol = (...aliases: string[]) =>
        headers.find(h => aliases.some(a => normalize(h).includes(a))) || '';
      const nameCol = findCol('name', 'fullname', 'studentname');
      const emailCol = findCol('email', 'mail');
      const idCol = findCol('id', 'studentid', 'regno', 'rollno', 'number');
      if (!nameCol && !emailCol && !idCol) {
        setStudentImportError('Could not detect columns. Ensure your sheet has columns: Name, Email, Reg Number.');
        return;
      }
      const parsed: Student[] = rows
        .map((row, i) => ({
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + i),
          name: nameCol ? String(row[nameCol] || '') : '',
          email: emailCol ? String(row[emailCol] || '') : '',
          studentId: idCol ? String(row[idCol] || '') : '',
        }))
        .filter(s => s.name || s.email || s.studentId);
      if (parsed.length === 0) {
        setStudentImportError('No valid student rows found. Check that your data rows are filled in.');
        return;
      }
      setStudents(prev => {
        const existingEmails = new Set(prev.map(s => s.email.toLowerCase()));
        const existingIds = new Set(prev.map(s => s.studentId.toLowerCase()));
        const newOnes = parsed.filter(
          s => !existingEmails.has(s.email.toLowerCase()) && !existingIds.has(s.studentId.toLowerCase())
        );
        return [...prev, ...newOnes];
      });
      setStudentImportSuccess(`✓ Imported ${parsed.length} student(s) from "${file.name}"`);
    };

    if (ext === 'csv') {
      // Native CSV parse — no library needed
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = (e.target?.result as string) || '';
          const lines = text.split(/\r?\n/).filter(l => l.trim());
          if (lines.length < 2) { setStudentImportError('CSV has no data rows.'); return; }
          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          const rows: Record<string, string>[] = lines.slice(1).map(line => {
            const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
            return Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']));
          });
          processRows(rows);
        } catch (err) {
          setStudentImportError('CSV parse error: ' + (err instanceof Error ? err.message : String(err)));
        }
      };
      reader.readAsText(file);
    } else {
      // Excel — use SheetJS from CDN (window.XLSX)
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const XLSX = XLSXLib();
          if (!XLSX) {
            setStudentImportError('Excel parser not yet loaded. Please wait a moment and try again, or use a .csv file.');
            return;
          }
          const workbook = XLSX.read(e.target?.result, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          processRows(rows);
        } catch (err) {
          setStudentImportError('Excel parse error: ' + (err instanceof Error ? err.message : String(err)));
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleStudentFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseStudentFile(file);
    e.target.value = '';
  };

  const handleStudentDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setStudentDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseStudentFile(file);
  };

  const handleAddStudentManually = () => {
    if (!newStudentName.trim() && !newStudentEmail.trim() && !newStudentId.trim()) return;
    const s: Student = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name: newStudentName.trim(),
      email: newStudentEmail.trim(),
      studentId: newStudentId.trim(),
    };
    setStudents(prev => [...prev, s]);
    setNewStudentName('');
    setNewStudentEmail('');
    setNewStudentId('');
    setStudentImportSuccess('');
    setStudentImportError('');
  };

  const handleRemoveStudent = (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
  };


  const handleEnrollStudents = () => {
    if (students.length === 0) return;
    setEnrolling(true);
    setEnrollSuccess(false);
    // Simulate API call – replace with real backend call
    setTimeout(() => {
      setEnrolledStudents([...students]);
      setEnrolling(false);
      setEnrollSuccess(true);
      setStudentImportSuccess('');
      setStudentImportError('');
    }, 800);
  };

  const handleClearStudents = () => {
    setStudents([]);
    setEnrolledStudents([]);
    setEnrollSuccess(false);
    setStudentImportSuccess('');
    setStudentImportError('');
  };

  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 1,
      number: 1,
      prompt: 'Write a SQL query to select all employees earning more than 60000.',
      marks: 10,
      expectedQuery: 'SELECT * FROM employees WHERE salary > 60000;',
      orderSensitive: false,
      partialMarks: false
    }
  ]);

  // Drag-to-reorder state
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const [activeQId, setActiveQId] = useState<number>(1);
  const activeQ = questions.find(q => q.id === activeQId) || questions[0];

  // Mock testing state
  const [isRunning, setIsRunning] = useState(false);
  const [queryError, setQueryError] = useState('');
  const [queryResult, setQueryResult] = useState<string[][] | null>(null);

  const handleAddQuestion = () => {
    const newId = questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1;
    const newQ: Question = {
      id: newId,
      number: questions.length + 1,
      prompt: '',
      marks: 10,
      expectedQuery: '',
      orderSensitive: false,
      partialMarks: false
    };
    setQuestions([...questions, newQ]);
    setActiveQId(newId);
    setQueryResult(null);
    setQueryError('');
  };

  const handleUpdateQuestion = (field: keyof Question, value: string | number | boolean) => {
    setQuestions(questions.map(q =>
      q.id === activeQId ? { ...q, [field]: value } : q
    ));
  };

  // ---- Publish handler ----
  const handlePublish = () => {
    if (examStatus === 'draft') {
      setPublishing(true);
      setTimeout(() => {
        setExamStatus('published');
        setPublishedAt(new Date().toLocaleString());
        setPublishing(false);
      }, 900);
    } else if (examStatus === 'published') {
      setExamStatus('active');
    } else if (examStatus === 'active') {
      setExamStatus('closed');
    }
  };

  // ---- Drag-to-reorder handlers ----
  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };
  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) { dragItem.current = null; dragOverItem.current = null; return; }
    const reordered = [...questions];
    const [moved] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, moved);
    const renumbered = reordered.map((q, i) => ({ ...q, number: i + 1 }));
    setQuestions(renumbered);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleTestQuery = () => {
    if (!activeQ.expectedQuery.trim()) {
      setQueryError('Please write a SQL query first.');
      return;
    }
    setIsRunning(true);
    setQueryError('');
    setQueryResult(null);

    // Simulate network delay for realistic feedback
    setTimeout(() => {
      const dbId = 'testdb_' + Date.now();
      try {
        // Create an isolated database
        alasql(`CREATE DATABASE ${dbId}`);
        alasql(`USE ${dbId}`);

        // 1. Run the database setup script (CREATE TABLE, INSERT...)
        if (examSetupSql.trim()) {
          alasql(examSetupSql);
        }

        // 2. Run the expected query to see if it works
        const rawRes = alasql(activeQ.expectedQuery);

        // 3. Format results for the table UI
        if (Array.isArray(rawRes)) {
          // Handle SELECT resulting in array of objects
          if (rawRes.length > 0 && typeof rawRes[0] === 'object') {
            const columns = Object.keys(rawRes[0]);
            const formattedRes = [columns];
            rawRes.forEach((row: Record<string, unknown>) => {
              formattedRes.push(columns.map(col => String(row[col])));
            });
            setQueryResult(formattedRes);
          } else if (rawRes.length === 0) {
            setQueryResult([['Result'], ['0 rows returned']]);
          } else {
            // Handle raw arrays or primitives
            setQueryResult([['Result'], [String(rawRes)]]);
          }
        } else {
          // Handle updates/inserts returning a number
          setQueryResult([['Result'], [`${rawRes} row(s) affected`]]);
        }
      } catch (err: unknown) {
        setQueryError('SQL Error: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        alasql(`DROP DATABASE ${dbId}`);
        setIsRunning(false);
      }
    }, 600);
  };

  return (
    <div className="teacher-page">
      <div className="builder-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 className="builder-title">Exam Builder</h1>
          {/* Status badge */}
          <span className={`exam-status-badge exam-status-${examStatus}`}>
            {examStatus === 'draft' && '✏️ Draft'}
            {examStatus === 'published' && '📢 Published'}
            {examStatus === 'active' && '🟢 Active'}
            {examStatus === 'closed' && '🔒 Closed'}
          </span>
          {publishedAt && (
            <span style={{ fontSize: '11px', color: '#888', marginLeft: '4px' }}>Published {publishedAt}</span>
          )}
        </div>
        <div className="builder-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/teacher/exams')}>Cancel</button>
          {/* Publish / status-cycle button */}
          {examStatus !== 'closed' && (
            <button
              className={`btn-publish btn-publish-${examStatus}`}
              onClick={handlePublish}
              disabled={publishing}
            >
              {publishing ? (
                <><span className="enroll-spinner" /> Publishing...</>
              ) : examStatus === 'draft' ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                  Publish Exam
                </>
              ) : examStatus === 'published' ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="10 8 16 12 10 16" /></svg>
                  Activate Exam
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  Close Exam
                </>
              )}
            </button>
          )}
          {examStatus === 'closed' && (
            <span className="exam-closed-pill">🔒 Exam Closed</span>
          )}
          <button className="btn btn-primary" onClick={() => navigate('/teacher/exams')}>Save Changes</button>
        </div>
      </div>

      <div className="builder-body">
        {/* Sidebar: Settings and Question List */}
        <div className="builder-sidebar">
          <div className="builder-section">
            <h3>Exam Settings</h3>

            <div className="form-group">
              <label>Exam Title</label>
              <input
                type="text"
                className="form-control"
                value={examTitle}
                onChange={e => setExamTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Course Name</label>
              <input
                type="text"
                className="form-control"
                value={courseName}
                onChange={e => setCourseName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                className="form-control"
                style={{ minHeight: '60px', resize: 'vertical' }}
                value={examDescription}
                onChange={e => setExamDescription(e.target.value)}
                placeholder="Overview of this exam..."
              />
            </div>

            <div className="form-group">
              <label>Time Limit (minutes)</label>
              <input
                type="number"
                className="form-control"
                value={timeLimit}
                onChange={e => setTimeLimit(Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>Start Time</label>
              <input
                type="datetime-local"
                className="form-control"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>End Time</label>
              <input
                type="datetime-local"
                className="form-control"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Max Attempts</label>
              <input
                type="number"
                className="form-control"
                value={maxAttempts}
                onChange={e => setMaxAttempts(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="builder-section questions-section" style={{ flex: 1, overflowY: 'auto' }}>
            <div className="qlist-header">
              <h3>Questions</h3>
              <span className="badge badge-purple">{questions.reduce((a, b) => a + Number(b.marks || 0), 0)} Total Marks</span>
            </div>

            <div className="qlist">
              {questions.map((q, index) => (
                <div
                  key={q.id}
                  className={`qlist-item ${activeQId === q.id ? 'active' : ''}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => {
                    setActiveQId(q.id);
                    setQueryResult(null);
                    setQueryError('');
                  }}
                >
                  {/* Drag handle */}
                  <div className="qlist-drag-handle" title="Drag to reorder" onClick={e => e.stopPropagation()}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
                      <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                      <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
                    </svg>
                  </div>
                  <div className="qlist-num">{q.number}</div>
                  <div style={{ fontSize: '12px', color: '#4a5568', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px', flex: 1 }}>
                    {q.prompt || 'New Question...'}
                  </div>
                  <div className="qlist-marks">{q.marks}m</div>
                </div>
              ))}
            </div>

            <button className="btn-add-q" onClick={handleAddQuestion} style={{ marginTop: '16px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Question
            </button>
          </div>
        </div>

        {/* Workspace: Question Editor */}
        <div className="builder-workspace">

          {/* ===== Students Section ===== */}
          <div
            className={`builder-card students-card${studentDragOver ? ' students-drag-active' : ''}`}
            onDragOver={e => { e.preventDefault(); setStudentDragOver(true); }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setStudentDragOver(false); }}
            onDrop={handleStudentDrop}
          >
            {/* Hidden file input – triggered by the import button */}
            <input
              ref={studentFileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={handleStudentFileUpload}
            />

            {/* Header row */}
            <div className="students-card-header">
              <div>
                <h2 className="students-card-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Enrolled Students
                </h2>
                <p className="students-card-sub">Import an Excel / CSV sheet or add students manually.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                {students.length > 0 && (
                  <span className="badge badge-purple">{students.length} student{students.length !== 1 ? 's' : ''}</span>
                )}


                {/* ★ PRIMARY IMPORT BUTTON ★ */}
                <button
                  className="btn-import-excel"
                  onClick={() => studentFileRef.current?.click()}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18" />
                    <path d="M9 21V9" />
                    <polyline points="14 14 17 17 20 14" />
                    <line x1="17" y1="17" x2="17" y2="11" />
                  </svg>
                  Import Excel Sheet
                </button>
              </div>
            </div>

            {/* Drag-and-drop hint banner (only shown when no students yet) */}
            {students.length === 0 && (
              <div
                className={`student-dropzone${studentDragOver ? ' dragover' : ''}`}
                onClick={() => studentFileRef.current?.click()}
                style={{ cursor: 'pointer' }}
              >
                <div className="student-dropzone-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="12" y2="12" />
                    <line x1="15" y1="15" x2="12" y2="12" />
                  </svg>
                </div>
                <p className="student-dropzone-label">
                  {studentDragOver
                    ? <strong>Release to import!</strong>
                    : <><strong>Drag & drop</strong> your Excel / CSV here, or click <strong>Import Excel Sheet</strong> above</>
                  }
                </p>
                <p className="student-dropzone-hint">Supported: .xlsx · .xls · .csv — Required columns: <em>Name, Email, Reg Number</em></p>
              </div>
            )}

            {/* Feedback messages */}
            {studentImportError && (
              <div className="student-alert student-alert-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                {studentImportError}
              </div>
            )}
            {studentImportSuccess && (
              <div className="student-alert student-alert-success">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#319795" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                {studentImportSuccess}
              </div>
            )}

            {/* Manual Add Row */}
            <div className="student-manual-row">
              <input
                type="text"
                className="form-control"
                placeholder="Full Name"
                value={newStudentName}
                onChange={e => setNewStudentName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddStudentManually()}
              />
              <input
                type="email"
                className="form-control"
                placeholder="Email"
                value={newStudentEmail}
                onChange={e => setNewStudentEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddStudentManually()}
              />
              <input
                type="text"
                className="form-control"
                placeholder="Reg Number"
                value={newStudentId}
                onChange={e => setNewStudentId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddStudentManually()}
              />
              <button className="btn btn-primary btn-sm students-add-btn" onClick={handleAddStudentManually}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add
              </button>
            </div>

            {/* Students Table */}
            {students.length > 0 ? (
              <div className="students-table-wrap">
                <table className="students-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Reg Number</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => (
                      <tr key={s.id}>
                        <td className="students-table-num">{i + 1}</td>
                        <td>
                          <div className="students-table-avatar">
                            <span className="students-avatar-letter">{s.name ? s.name[0].toUpperCase() : '?'}</span>
                            <span className="students-table-name">{s.name || <em style={{ color: '#aaa' }}>—</em>}</span>
                          </div>
                        </td>
                        <td className="students-table-email">{s.email || <em style={{ color: '#aaa' }}>—</em>}</td>
                        <td><span className="students-id-badge">{s.studentId || <em style={{ color: '#aaa' }}>—</em>}</span></td>
                        <td>
                          <button className="students-remove-btn" onClick={() => handleRemoveStudent(s.id)} title="Remove student">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="students-empty">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d0c4f0" strokeWidth="1.2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <p>No students added yet.<br/>Upload a spreadsheet or add them manually above.</p>
              </div>
            )}

            {/* ── Enroll footer ── */}
            <div className="students-enroll-footer">
              <div className="students-enroll-status">
                {enrollSuccess ? (
                  <span className="students-enrolled-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    {enrolledStudents.length} student{enrolledStudents.length !== 1 ? 's' : ''} enrolled in this exam
                  </span>
                ) : students.length > 0 ? (
                  <span className="students-pending-badge">
                    {students.length} student{students.length !== 1 ? 's' : ''} ready — click Enroll to confirm
                  </span>
                ) : (
                  <span className="students-none-badge">No students added yet</span>
                )}
              </div>
              <div className="students-enroll-actions">
                {students.length > 0 && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleClearStudents}
                    title="Clear all students"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      <path d="M10 11v6" /><path d="M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                    Clear All
                  </button>
                )}
                <button
                  className={`btn btn-enroll${students.length === 0 ? ' btn-enroll-disabled' : ''}${enrollSuccess ? ' btn-enroll-done' : ''}`}
                  onClick={handleEnrollStudents}
                  disabled={students.length === 0 || enrolling}
                >
                  {enrolling ? (
                    <>
                      <span className="enroll-spinner" />
                      Enrolling...
                    </>
                  ) : enrollSuccess ? (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      Re-Enroll Students
                    </>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="8.5" cy="7" r="4" />
                        <line x1="20" y1="8" x2="20" y2="14" />
                        <line x1="23" y1="11" x2="17" y2="11" />
                      </svg>
                      Enroll Students to Exam
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Database Setup Section */}
          <div className="builder-card" style={{ paddingBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0', color: '#1a1a2e' }}>Import Database</h2>
                <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>Upload a .sql script to initialize tables and mock data for validating your queries.</p>
              </div>
              <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Import Database
                <input type="file" accept=".sql" style={{ display: 'none' }} onChange={handleFileUpload} />
              </label>
            </div>

            {importedFileName && examSetupSql ? (
              <div style={{ marginTop: '16px', padding: '12px', background: '#e6fffa', border: '1px solid #319795', borderRadius: '6px', fontSize: '13px', color: '#234e52', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#319795" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span><strong>{importedFileName}</strong> imported successfully. ({examSetupSql.split('\n').filter(line => line.trim() !== '').length} lines of SQL)</span>
              </div>
            ) : (
              <div style={{ marginTop: '16px', padding: '16px', border: '2px dashed #cbd5e0', borderRadius: '6px', fontSize: '13px', color: '#a0aec0', textAlign: 'center' }}>
                No database script imported yet. Click the button above to upload a .sql file.
              </div>
            )}
          </div>

          {activeQ && (
            <div className="builder-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#1a1a2e' }}>Editing Question {activeQ.number}</h2>
                <button className="btn btn-secondary btn-sm" style={{ color: '#e53e3e', borderColor: '#fc8181', background: 'transparent' }} onClick={() => {
                  if (questions.length > 1) {
                    setQuestions(questions.filter(q => q.id !== activeQ.id));
                    setActiveQId(questions.find(q => q.id !== activeQ.id)?.id || 1);
                  }
                }}>
                  Delete Question
                </button>
              </div>

              <div className="form-group left-label">
                <label>Question Prompt (Markdown supported)</label>
                <textarea
                  className="form-control"
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  value={activeQ.prompt}
                  onChange={e => handleUpdateQuestion('prompt', e.target.value)}
                  placeholder="E.g., Write a query to find all employees..."
                />
              </div>

              <div className="form-group left-label" style={{ maxWidth: '150px' }}>
                <label>Marks</label>
                <input
                  type="number"
                  className="form-control"
                  value={activeQ.marks}
                  onChange={e => handleUpdateQuestion('marks', Number(e.target.value))}
                />
              </div>

              <div style={{ display: 'flex', gap: '30px', alignItems: 'center', marginBottom: '24px' }}>
                <div className="toggle-group" style={{ margin: 0, justifyContent: 'flex-start', gap: '10px' }}>
                  <span className="toggle-label" style={{ fontSize: '13px' }}>Order Sensitive Results?</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={activeQ.orderSensitive || false}
                      onChange={e => handleUpdateQuestion('orderSensitive', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="toggle-group" style={{ margin: 0, justifyContent: 'flex-start', gap: '10px' }}>
                  <span className="toggle-label" style={{ fontSize: '13px' }}>Allow Partial Marks?</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={activeQ.partialMarks || false}
                      onChange={e => handleUpdateQuestion('partialMarks', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="form-group left-label" style={{ marginTop: '16px', marginBottom: 0 }}>
                <label style={{ fontSize: '14px', color: '#1a1a2e' }}>Test Expected Query</label>
                <p style={{ fontSize: '12px', color: '#888', margin: '0 0 12px 0' }}>Write the correct SQL query and test it against the mock database setup.</p>

                {/* MySQL Editor */}
                <div className="mock-mysql-editor">
                  <div className="mock-mysql-header">
                    <span>SQL Editor</span>
                    <button className="btn btn-primary btn-sm" onClick={handleTestQuery} disabled={isRunning}>
                      {isRunning ? '⏳ Running...' : '▶ Run Query'}
                    </button>
                  </div>
                  <div className="mock-mysql-body">
                    <div className="mock-mysql-gutter">
                      {activeQ.expectedQuery.split('\n').map((_, i) => (
                        <div key={`line-${i}`} className="mock-mysql-line">{i + 1}</div>
                      ))}
                      {activeQ.expectedQuery.split('\n').length === 0 && <div className="mock-mysql-line">1</div>}
                    </div>
                    <textarea
                      className="mock-mysql-textarea"
                      value={activeQ.expectedQuery}
                      onChange={e => handleUpdateQuestion('expectedQuery', e.target.value)}
                      placeholder="-- expected query..."
                      spellCheck={false}
                    />
                  </div>
                </div>

                {/* Results Panel */}
                <div className="query-test-results">
                  <div className="query-test-header">
                    <span>Test Results</span>
                    {queryResult && <span className="badge badge-green">{queryResult.length - 1} row(s)</span>}
                  </div>
                  <div className="query-test-body">
                    {queryError && (
                      <div className="query-test-error">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                        {queryError}
                      </div>
                    )}
                    {queryResult && (
                      <table className="query-test-table">
                        <thead>
                          <tr>
                            {queryResult[0].map((col, i) => <th key={`header-${i}`}>{col}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {queryResult.slice(1).map((row, ri) => (
                            <tr key={`row-${ri}`}>
                              {row.map((cell, ci) => <td key={`cell-${ci}`}>{cell}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {!queryResult && !queryError && (
                      <div className="query-test-empty">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                        <p>Run your query to preview testing results here</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamBuilder;
