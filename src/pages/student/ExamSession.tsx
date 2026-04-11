/* eslint-disable react-x/no-array-index-key */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examApi, questionApi, sessionApi, queryApi, Exam, ExamSession as ApiSession } from '../../services/api';
import './ExamSession.css';

interface Question {
  id: string;
  number: number;
  prompt: string;
  marks: number;
  submitted: boolean;
  answer?: string;
}

const ExamSession: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [session, setSession] = useState<ApiSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [sqlCode, setSqlCode] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittedQs, setSubmittedQs] = useState<Set<string>>(() => new Set());
  const [queryResult, setQueryResult] = useState<string[][] | null>(null);
  const [queryError, setQueryError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  // Load exam and start session
  useEffect(() => {
    const loadExam = async () => {
      if (!examId) {
        setError('Invalid exam ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // First check if user is authenticated
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication required. Please log in again.');
          setLoading(false);
          return;
        }

        // Fetch exam details
        const examData = await examApi.getExam(examId);
        setExam(examData);

        // Fetch questions
        const questionsData = await questionApi.getQuestions(examId);
        const transformedQuestions: Question[] = questionsData.map((q, index) => ({
          id: q.id,
          number: index + 1,
          prompt: q.prompt,
          marks: q.marks,
          submitted: false,
          answer: '',
        }));
        setQuestions(transformedQuestions);

        // Start or resume exam session
        const userStr = localStorage.getItem('queryme_user');
        const studentId = userStr ? JSON.parse(userStr).id : undefined;

        if (!studentId) {
          throw new Error('Unable to determine student identity. Please log in again.');
        }

        const studentSessions = await sessionApi.getSessionsByStudent(studentId);
        const existingSession = studentSessions.find(s => s.examId === examId);

        const sessionData = existingSession
          ? existingSession
          : await sessionApi.startSession(examId, studentId);

        setSession(sessionData);

        // Set timer
        const timeLimitSeconds = (examData.timeLimit || examData.timeLimitMins || 60) * 60;
        setTimeLeft(timeLimitSeconds);

        // Load existing answers if session was already started
        if (sessionData.answers) {
          setAnswers(sessionData.answers);
          setSubmittedQs(new Set(Object.keys(sessionData.answers)));
        }

      } catch (err) {
        console.error('Exam loading error:', err);
        let errorMessage = 'Failed to load exam';
        
        if (err instanceof Error) {
          if (err.message.includes('404') || err.message.includes('Not Found')) {
            errorMessage = 'Exam not found. It may have been deleted or you may not have access.';
          } else if (err.message.includes('403') || err.message.includes('Forbidden')) {
            errorMessage = 'You do not have permission to access this exam.';
          } else if (err.message.includes('401') || err.message.includes('Unauthorized')) {
            errorMessage = 'Your session has expired. Please log in again.';
          } else if (err.message.includes('Failed to fetch')) {
            errorMessage = 'Cannot connect to the server. Please check your internet connection.';
          } else {
            errorMessage = err.message;
          }
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadExam();
  }, [examId]);

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

  // Run query
  const runQuery = async () => {
    if (!sqlCode.trim()) {
      setQueryError('Please write a SQL query first.');
      return;
    }
    if (!examId || !current?.id) return;

    setIsRunning(true);
    setQueryError('');
    setQueryResult(null);

    try {
      const result = await queryApi.submitQuery({
        query: sqlCode,
        examId,
        questionId: current.id,
      });

      if (result.success && result.data) {
        // Convert data to table format
        if (Array.isArray(result.data) && result.data.length > 0) {
          const headers = Object.keys(result.data[0]);
          const rows = result.data.map(row =>
            headers.map(header => String(row[header] || ''))
          );
          setQueryResult([headers, ...rows]);
        } else {
          setQueryResult([['Result'], ['Query executed successfully']]);
        }
      } else {
        setQueryError(result.error || 'Query execution failed');
      }
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : 'Failed to execute query');
    } finally {
      setIsRunning(false);
    }
  };

  // Submit answer for current question
  const submitAnswer = () => {
    const newAnswers = { ...answers, [current.id]: sqlCode };
    setAnswers(newAnswers);
    setSubmittedQs(prev => new Set([...prev, current.id]));
  };

  // Submit entire exam
  const submitExam = async () => {
    if (!session?.id) return;

    try {
      await sessionApi.submitSession(session.id, answers);
      setShowConfirmSubmit(false);
      navigate('/student/results');
    } catch (err) {
      alert('Failed to submit exam: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="exam-session">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div>Loading exam...</div>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="exam-session">
        <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>
          <div>Error: {error || 'Exam not found'}</div>
          <button className="btn btn-primary" onClick={() => navigate('/student/exams')}>
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  const totalMarks = questions.reduce((a, q) => a + q.marks, 0);
  const answeredCount = Object.keys(answers).filter(k => answers[k]?.trim()).length;

  return (
    <div className="exam-session">
      {/* Exam Header */}
      <div className="exam-header">
        <div className="exam-header-left">
          <h1 className="exam-title">{exam.title}</h1>
          <div className="exam-meta">
            <span>📚 {exam.course?.name || 'Unknown Course'}</span>
            <span>👤 {exam.teacher?.name || 'Unknown Teacher'}</span>
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
                  <div key={`line-${i}`} className="exam-line-num">{i + 1}</div>
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
