/* eslint-disable react-x/no-array-index-key */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import alasql from 'alasql';
import './TeacherPages.css';

interface Question {
  id: number;
  number: number;
  prompt: string;
  marks: number;
  expectedQuery: string;
  orderSensitive?: boolean;
  partialMarks?: boolean;
}

const ExamBuilder: React.FC = () => {
  const [examTitle, setExamTitle] = useState('New SQL Midterm');
  const [courseName, setCourseName] = useState('Database Systems 101');
  const [examDescription, setExamDescription] = useState('');
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [timeLimit, setTimeLimit] = useState(90);
  const [startTime, setStartTime] = useState('2026-04-10T10:00');
  const [endTime, setEndTime] = useState('2026-04-10T11:30');
  const navigate = useNavigate();

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
        <h1 className="builder-title">Exam Builder</h1>
        <div className="builder-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/teacher/exams')}>Cancel</button>
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
              {questions.map(q => (
                <div
                  key={q.id}
                  className={`qlist-item ${activeQId === q.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveQId(q.id);
                    setQueryResult(null);
                    setQueryError('');
                  }}
                >
                  <div className="qlist-num">{q.number}</div>
                  <div style={{ fontSize: '12px', color: '#4a5568', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px', flex: 1 }}>
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
