import React, { useState, useEffect, useCallback } from 'react';
import './ExamSession.css';

interface Question {
  id: number;
  number: number;
  prompt: string;
  marks: number;
  submitted: boolean;
  answer?: string;
}

const mockQuestions: Question[] = [
  { id: 1, number: 1, prompt: 'Write a SQL query to select all columns from the "employees" table where the salary is greater than 50000.', marks: 10, submitted: false },
  { id: 2, number: 2, prompt: 'Write a query to find the average salary for each department. Display the department name and average salary, ordered by average salary descending.', marks: 15, submitted: false },
  { id: 3, number: 3, prompt: 'Write a query using a JOIN to display employee names along with their department names. Only include employees who have a department assigned.', marks: 15, submitted: false },
  { id: 4, number: 4, prompt: 'Write a subquery to find all employees whose salary is above the company average salary.', marks: 12, submitted: false },
  { id: 5, number: 5, prompt: 'Create a query that counts the number of employees in each department and only shows departments with more than 5 employees.', marks: 10, submitted: false },
  { id: 6, number: 6, prompt: 'Write a query to find the top 3 highest-paid employees in each department using window functions.', marks: 18, submitted: false },
  { id: 7, number: 7, prompt: 'Write an INSERT statement to add a new employee with the following details: name="Jane Doe", department_id=3, salary=65000, hire_date=CURRENT_DATE.', marks: 10, submitted: false },
  { id: 8, number: 8, prompt: 'Write a query to find employees who were hired in the last 30 days and display their name, hire date, and department.', marks: 10, submitted: false },
];

const ExamSession: React.FC = () => {
  const [questions] = useState<Question[]>(mockQuestions);
  const [currentQ, setCurrentQ] = useState(0);
  const [sqlCode, setSqlCode] = useState('');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submittedQs, setSubmittedQs] = useState<Set<number>>(new Set());
  const [queryResult, setQueryResult] = useState<string[][] | null>(null);
  const [queryError, setQueryError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90 * 60); // 90 minutes in seconds
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  const current = questions[currentQ];

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeLeft <= 300) return '#e53e3e';
    if (timeLeft <= 900) return '#dd6b20';
    return '#38a169';
  };

  // Switch question
  const switchQuestion = useCallback((idx: number) => {
    // Save current answer
    if (current) {
      setAnswers(prev => ({ ...prev, [current.id]: sqlCode }));
    }
    setCurrentQ(idx);
    setSqlCode(answers[questions[idx].id] || '');
    setQueryResult(null);
    setQueryError('');
  }, [current, sqlCode, answers, questions]);

  // Run query (mock)
  const runQuery = () => {
    if (!sqlCode.trim()) {
      setQueryError('Please write a SQL query first.');
      return;
    }
    setIsRunning(true);
    setQueryError('');
    setQueryResult(null);

    // Simulate query execution
    setTimeout(() => {
      const lower = sqlCode.toLowerCase().trim();
      if (lower.includes('select')) {
        setQueryResult([
          ['id', 'name', 'department', 'salary'],
          ['1', 'John Smith', 'Engineering', '75000'],
          ['2', 'Jane Doe', 'Marketing', '62000'],
          ['3', 'Bob Wilson', 'Engineering', '58000'],
          ['4', 'Alice Brown', 'Sales', '71000'],
          ['5', 'Charlie Davis', 'Engineering', '82000'],
        ]);
      } else if (lower.includes('insert') || lower.includes('update') || lower.includes('delete')) {
        setQueryResult([['Result'], ['1 row(s) affected']]);
      } else {
        setQueryError('Query executed but returned no results. Check your syntax.');
      }
      setIsRunning(false);
    }, 800);
  };

  // Submit answer for current question
  const submitAnswer = () => {
    setAnswers(prev => ({ ...prev, [current.id]: sqlCode }));
    setSubmittedQs(prev => new Set([...prev, current.id]));
  };

  // Submit entire exam
  const submitExam = () => {
    setShowConfirmSubmit(false);
    alert('Exam submitted successfully! Redirecting to results...');
    window.location.href = '/student/results';
  };

  const totalMarks = questions.reduce((a, q) => a + q.marks, 0);
  const answeredCount = Object.keys(answers).filter(k => answers[Number(k)]?.trim()).length;

  return (
    <div className="exam-session">
      {/* Exam Header */}
      <div className="exam-header">
        <div className="exam-header-left">
          <h1 className="exam-title">SQL Basics - Midterm Exam</h1>
          <div className="exam-meta">
            <span>📚 Database Systems 101</span>
            <span>👤 Prof. Smith</span>
            <span>📝 {questions.length} Questions</span>
            <span>💯 {totalMarks} Marks</span>
          </div>
        </div>
        <div className="exam-header-right">
          <div className="exam-timer" style={{ color: getTimerColor(), borderColor: getTimerColor() }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            {formatTime(timeLeft)}
          </div>
          <div className="exam-progress">
            <span className="exam-progress-text">{answeredCount}/{questions.length} answered</span>
            <div className="exam-progress-bar">
              <div className="exam-progress-fill" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowConfirmSubmit(true)}>
            Submit Exam
          </button>
        </div>
      </div>

      <div className="exam-body">
        {/* Question sidebar */}
        <div className="exam-question-nav">
          <div className="exam-qnav-title">Questions</div>
          <div className="exam-qnav-grid">
            {questions.map((q, i) => (
              <button
                key={q.id}
                className={`exam-qnav-btn ${i === currentQ ? 'current' : ''} ${submittedQs.has(q.id) ? 'submitted' : ''} ${answers[q.id]?.trim() ? 'answered' : ''}`}
                onClick={() => switchQuestion(i)}
              >
                {q.number}
              </button>
            ))}
          </div>
          <div className="exam-qnav-legend">
            <div><span className="legend-dot current" />Current</div>
            <div><span className="legend-dot answered" />Answered</div>
            <div><span className="legend-dot submitted" />Submitted</div>
            <div><span className="legend-dot" />Not answered</div>
          </div>
        </div>

        {/* Main exam area */}
        <div className="exam-workspace">
          {/* Question prompt */}
          <div className="exam-question-card">
            <div className="exam-question-header">
              <span className="exam-question-num">Question {current.number}</span>
              <span className="badge badge-purple">{current.marks} marks</span>
            </div>
            <p className="exam-question-text">{current.prompt}</p>
          </div>

          {/* SQL Editor */}
          <div className="exam-editor-card">
            <div className="exam-editor-header">
              <span>SQL Editor</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" onClick={runQuery} disabled={isRunning}>
                  {isRunning ? '⏳ Running...' : '▶ Run Query'}
                </button>
                <button className="btn btn-primary btn-sm" onClick={submitAnswer} disabled={!sqlCode.trim()}>
                  ✓ Submit Answer
                </button>
              </div>
            </div>
            <div className="exam-editor-area">
              <div className="exam-editor-gutter">
                {sqlCode.split('\n').map((_, i) => (
                  <div key={i} className="exam-line-num">{i + 1}</div>
                ))}
                {sqlCode.split('\n').length === 0 && <div className="exam-line-num">1</div>}
              </div>
              <textarea
                className="exam-textarea"
                value={sqlCode}
                onChange={(e) => setSqlCode(e.target.value)}
                placeholder="-- Write your SQL query here..."
                spellCheck={false}
              />
            </div>
            {submittedQs.has(current.id) && (
              <div className="exam-submitted-badge">✓ Answer submitted for this question</div>
            )}
          </div>

          {/* Results panel */}
          <div className="exam-results-card">
            <div className="exam-results-header">
              <span>Query Results</span>
              {queryResult && <span className="badge badge-green">{queryResult.length - 1} row(s)</span>}
            </div>
            <div className="exam-results-body">
              {queryError && (
                <div className="exam-results-error">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                  {queryError}
                </div>
              )}
              {queryResult && (
                <div className="exam-results-table-wrap">
                  <table className="exam-results-table">
                    <thead>
                      <tr>
                        {queryResult[0].map((col, i) => <th key={i}>{col}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResult.slice(1).map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => <td key={ci}>{cell}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!queryResult && !queryError && (
                <div className="exam-results-empty">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                  <p>Run your query to see results here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm submit modal */}
      {showConfirmSubmit && (
        <div className="exam-modal-overlay">
          <div className="exam-modal">
            <h3>Submit Exam?</h3>
            <p>You have answered <strong>{answeredCount}</strong> out of <strong>{questions.length}</strong> questions.</p>
            {answeredCount < questions.length && (
              <p style={{ color: '#e53e3e', fontSize: '12px' }}>⚠ You have {questions.length - answeredCount} unanswered question(s).</p>
            )}
            <div className="exam-modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowConfirmSubmit(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitExam}>Submit Exam</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamSession;
