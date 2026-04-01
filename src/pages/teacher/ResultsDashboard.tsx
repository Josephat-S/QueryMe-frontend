/* eslint-disable react-x/no-array-index-key */
import React, { useState } from 'react';
import './TeacherPages.css';

/* ── Types ── */
type StudentStatus = 'Graded' | 'Pending Review' | 'Missed';

interface StudentResult {
  id: number;
  name: string;
  submittedAt: string;
  score: number;
  total: number;
  status: StudentStatus;
}

interface AnswerKey {
  questionNumber: number;
  prompt: string;
  referenceQuery: string;
  expectedColumns: string[];
  expectedRows: string[][];
  generatedAt: string;
  marks: number;
}

interface MockExam {
  id: string;
  title: string;
  course: string;
  status: 'active' | 'closed' | 'published';
  students: StudentResult[];
  answerKeys: AnswerKey[];
}

/* ── Mock Data ── */
const mockExams: MockExam[] = [
  {
    id: 'e1',
    title: 'SQL Midterm Exam',
    course: 'Database Systems 101',
    status: 'closed',
    students: [
      { id: 1, name: 'Alice Brown',   submittedAt: '10 mins ago', score: 92, total: 100, status: 'Graded' },
      { id: 2, name: 'Bob Wilson',    submittedAt: '1 hour ago',  score: 85, total: 100, status: 'Graded' },
      { id: 3, name: 'Charlie Davis', submittedAt: '2 hours ago', score: 78, total: 100, status: 'Graded' },
      { id: 4, name: 'Diana Prince',  submittedAt: 'Just now',    score: 95, total: 100, status: 'Pending Review' },
      { id: 5, name: 'Evan Wright',   submittedAt: '-',           score: 0,  total: 100, status: 'Missed' },
    ],
    answerKeys: [
      {
        questionNumber: 1,
        prompt: 'Select all employees earning more than 60000.',
        referenceQuery: 'SELECT * FROM employees WHERE salary > 60000;',
        expectedColumns: ['id', 'name', 'salary'],
        expectedRows: [['1', 'John Smith', '75000'], ['3', 'Bob Wilson', '58000']],
        generatedAt: '2026-04-10 09:55 AM',
        marks: 25,
      },
      {
        questionNumber: 2,
        prompt: 'Count the total number of employees.',
        referenceQuery: 'SELECT COUNT(*) AS total FROM employees;',
        expectedColumns: ['total'],
        expectedRows: [['3']],
        generatedAt: '2026-04-10 09:56 AM',
        marks: 25,
      },
      {
        questionNumber: 3,
        prompt: 'List employees ordered by salary descending.',
        referenceQuery: 'SELECT * FROM employees ORDER BY salary DESC;',
        expectedColumns: ['id', 'name', 'salary'],
        expectedRows: [['1','John Smith','75000'],['2','Jane Doe','62000'],['3','Bob Wilson','58000']],
        generatedAt: '2026-04-10 09:57 AM',
        marks: 50,
      },
    ],
  },
  {
    id: 'e2',
    title: 'Joins & Aggregates Quiz',
    course: 'Advanced SQL',
    status: 'active',
    students: [
      { id: 1, name: 'Faith Osei',    submittedAt: '5 mins ago',  score: 88, total: 60, status: 'Graded' },
      { id: 2, name: 'George Kimani', submittedAt: '20 mins ago', score: 54, total: 60, status: 'Pending Review' },
    ],
    answerKeys: [
      {
        questionNumber: 1,
        prompt: 'Join employees and departments on department_id.',
        referenceQuery: 'SELECT e.name, d.name FROM employees e JOIN departments d ON e.dept_id = d.id;',
        expectedColumns: ['e.name', 'd.name'],
        expectedRows: [['John Smith','Engineering'],['Jane Doe','Marketing']],
        generatedAt: '2026-03-28 08:00 AM',
        marks: 30,
      },
      {
        questionNumber: 2,
        prompt: 'Get average salary per department.',
        referenceQuery: 'SELECT dept_id, AVG(salary) AS avg_salary FROM employees GROUP BY dept_id;',
        expectedColumns: ['dept_id', 'avg_salary'],
        expectedRows: [['1','72500'],['2','62000']],
        generatedAt: '2026-03-28 08:01 AM',
        marks: 30,
      },
    ],
  },
];

const statusColor: Record<string, string> = {
  active:    '#16a34a',
  closed:    '#dc2626',
  published: '#2563eb',
};

/* ── Component ── */
const ResultsDashboard: React.FC = () => {
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [searchQ, setSearchQ]                 = useState('');
  const [reviewStudent, setReviewStudent]     = useState<StudentResult | null>(null);


  const exam = mockExams.find(e => e.id === selectedExamId) ?? null;

  const filtered = exam
    ? exam.students.filter(s => s.name.toLowerCase().includes(searchQ.toLowerCase()))
    : [];

  const avgScore = exam && exam.students.filter(s => s.status !== 'Missed').length > 0
    ? Math.round(
        exam.students.filter(s => s.status !== 'Missed').reduce((a, s) => a + s.score, 0) /
        exam.students.filter(s => s.status !== 'Missed').length
      )
    : 0;



  /* ── Render: Exam selector gate ── */
  if (!exam) {
    return (
      <div className="teacher-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="res-select-gate">
          <div className="res-gate-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6a3cb0" strokeWidth="1.5">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </div>
          <h2 className="res-gate-title">View Exam Results</h2>
          <p className="res-gate-sub">Select an exam below to view student scores and answer keys.</p>
          <div className="res-gate-list">
            {mockExams.map(e => (
              <button key={e.id} className="res-gate-exam-btn" onClick={() => setSelectedExamId(e.id)}>
                <div>
                  <div className="res-gate-exam-title">{e.title}</div>
                  <div className="res-gate-exam-course">{e.course}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="res-gate-status-pill" style={{ background: statusColor[e.status] + '18', color: statusColor[e.status], border: `1px solid ${statusColor[e.status]}44` }}>
                    {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                  </span>
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

  /* ── Render: Review / Answer Keys panel ── */
  if (reviewStudent) {
    return (
      <div className="teacher-page" style={{ overflow: 'hidden' }}>
        {/* Panel header */}
        <div className="builder-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setReviewStudent(null)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back
            </button>
            <h1 className="builder-title" style={{ fontSize: '16px' }}>
              Answer Keys — {exam.title}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="sess-student-cell">
              <span className="sess-avatar">{reviewStudent.name.split(' ').map(n => n[0]).join('')}</span>
              <div>
                <div className="sess-student-name">{reviewStudent.name}</div>
                <div className="sess-student-email">
                  Score: <strong>{reviewStudent.status === 'Missed' ? '—' : `${reviewStudent.score}/${reviewStudent.total}`}</strong>
                  &nbsp;·&nbsp;{reviewStudent.status}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {exam.answerKeys.map(ak => (
            <div key={ak.questionNumber} className="builder-card ak-card">
              {/* Question header */}
              <div className="ak-q-header">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
                  <span className="ak-q-num">Q{ak.questionNumber}</span>
                  <span className="ak-q-prompt">{ak.prompt}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <span className="ak-marks-badge">{ak.marks} marks</span>
                </div>
              </div>

              <div className="ak-body">
                {/* Reference query */}
                <div className="ak-section">
                  <div className="ak-section-label">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                    Reference Query
                  </div>
                  <pre className="ak-code">{ak.referenceQuery}</pre>
                </div>

                {/* Expected columns */}
                <div className="ak-section">
                  <div className="ak-section-label">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                    Expected Columns ({ak.expectedColumns.length})
                  </div>
                  <div className="ak-cols-row">
                    {ak.expectedColumns.map((col, i) => (
                      <span key={i} className="ak-col-tag">{col}</span>
                    ))}
                  </div>
                </div>

                {/* Expected rows */}
                <div className="ak-section">
                  <div className="ak-section-label">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>
                    Expected Rows ({ak.expectedRows.length})
                  </div>
                  <div className="ak-table-wrap">
                    <table className="ak-table">
                      <thead>
                        <tr>{ak.expectedColumns.map((col, i) => <th key={i}>{col}</th>)}</tr>
                      </thead>
                      <tbody>
                        {ak.expectedRows.map((row, ri) => (
                          <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="ak-footer">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Key generated at {ak.generatedAt}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Render: Results table ── */
  return (
    <div className="teacher-page" style={{ padding: '24px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px', color: '#1a1a2e' }}>Exam Results</h1>
          <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
            Review student submissions for <strong>{exam.title}</strong> · {exam.course}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedExamId(''); setSearchQ(''); }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '5px' }}>
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Change Exam
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(56,161,105,0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38a169" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div className="stat-card-value">{avgScore}%</div>
          <div className="stat-card-label">Average Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(49,130,206,0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3182ce" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <div className="stat-card-value">{exam.students.filter(s => s.status !== 'Missed').length}/{exam.students.length}</div>
          <div className="stat-card-label">Submissions</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(221,107,32,0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dd6b20" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="stat-card-value">{exam.students.filter(s => s.status === 'Pending Review').length}</div>
          <div className="stat-card-label">Pending Review</div>
        </div>
      </div>

      {/* Table */}
      <div className="results-table-card">
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e8e8ee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#1a1a2e' }}>Student Scores</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="res-search-input"
              placeholder="Search students..."
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
            />
            <button className="btn btn-secondary btn-sm">Export CSV</button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="results-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Submission Time</th>
                <th>Status</th>
                <th>Score</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(res => (
                <tr key={res.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#6a3cb0', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                        {res.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span style={{ fontWeight: 600 }}>{res.name}</span>
                    </div>
                  </td>
                  <td style={{ color: '#666', fontSize: '13px' }}>{res.submittedAt}</td>
                  <td>
                    {res.status === 'Graded'         && <span style={{ color: '#38a169', fontSize: '13px', fontWeight: 600 }}>• Graded</span>}
                    {res.status === 'Pending Review'  && <span style={{ color: '#dd6b20', fontSize: '13px', fontWeight: 600 }}>• Pending</span>}
                    {res.status === 'Missed'          && <span style={{ color: '#e53e3e', fontSize: '13px', fontWeight: 600 }}>• Missed</span>}
                  </td>
                  <td>
                    {res.status === 'Missed' ? (
                      <span style={{ color: '#a0aec0' }}>— / {res.total}</span>
                    ) : (
                      <span className={`score-badge ${res.score >= 90 ? 'score-high' : res.score >= 70 ? 'score-med' : 'score-low'}`}>
                        {res.score}/{res.total}
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="ak-review-btn"
                      disabled={res.status === 'Missed'}
                      onClick={() => setReviewStudent(res)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResultsDashboard;
