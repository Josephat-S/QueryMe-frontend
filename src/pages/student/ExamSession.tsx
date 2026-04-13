/* eslint-disable react-x/no-array-index-key */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { examApi, questionApi, queryApi, sessionApi, type Exam, type QuerySubmissionResponse, type Session } from '../../api';
import { useAuth } from '../../contexts';
import { extractErrorMessage } from '../../utils/errorUtils';
import { getCourseName, getExamTimeLimit, getSessionRemainingMs, isSessionComplete } from '../../utils/queryme';
import './ExamSession.css';

interface QuestionViewModel {
  id: string;
  number: number;
  prompt: string;
  marks: number;
}

interface SubmissionFeedback {
  visible: boolean;
  score?: number;
  isCorrect?: boolean;
  resultColumns?: string[];
  resultRows?: unknown[][];
  message?: string;
}

const ExamSession: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<QuestionViewModel[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<string>>(new Set());
  const [feedbackByQuestion, setFeedbackByQuestion] = useState<Record<string, SubmissionFeedback>>({});
  const [queryError, setQueryError] = useState('');
  const [isSubmittingQuery, setIsSubmittingQuery] = useState(false);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const autoSubmitRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    const loadSession = async () => {
      if (!examId || !user) {
        setError('A valid exam session requires both an exam and a signed-in student.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [loadedExam, loadedQuestions, studentSessions] = await Promise.all([
          examApi.getExam(examId, controller.signal),
          questionApi.getQuestions(examId, controller.signal),
          sessionApi.getSessionsByStudent(user.id, controller.signal),
        ]);

        if (controller.signal.aborted) {
          return;
        }

        const existingSession = studentSessions.find(
          (candidate) => String(candidate.examId) === examId && !isSessionComplete(candidate),
        );

        const liveSession = existingSession || await sessionApi.startSession(
          { examId, studentId: user.id },
          controller.signal,
        );

        if (controller.signal.aborted) {
          return;
        }

        setExam(loadedExam);
        setQuestions(
          loadedQuestions.map((question, index) => ({
            id: String(question.id),
            number: index + 1,
            prompt: question.prompt,
            marks: question.marks,
          })),
        );
        setSession(liveSession);
        setTimeLeftMs(getSessionRemainingMs(liveSession));
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(extractErrorMessage(err, 'Failed to load this exam session.'));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadSession();

    return () => controller.abort();
  }, [examId, user]);

  useEffect(() => {
    if (!session?.expiresAt || isSessionComplete(session)) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      const remaining = getSessionRemainingMs(session);
      setTimeLeftMs(remaining);

      if (remaining <= 0 && !autoSubmitRef.current) {
        autoSubmitRef.current = true;
        void sessionApi.submitSession(String(session.id))
          .then(() => navigate('/student/results'))
          .catch(() => {
            setError('Your session reached its time limit and the auto-submit call failed. Please submit manually if the session is still open.');
          });
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [navigate, session]);

  const currentQuestion = questions[currentIndex];
  const currentSql = currentQuestion ? (draftAnswers[currentQuestion.id] || '') : '';
  const currentFeedback = currentQuestion ? feedbackByQuestion[currentQuestion.id] : undefined;

  const answeredCount = useMemo(
    () => Object.values(draftAnswers).filter((value) => value.trim()).length,
    [draftAnswers],
  );

  const totalMarks = useMemo(
    () => questions.reduce((sum, question) => sum + question.marks, 0),
    [questions],
  );

  const saveDraft = (questionId: string, nextValue: string) => {
    setDraftAnswers((previous) => ({
      ...previous,
      [questionId]: nextValue,
    }));
  };

  const switchQuestion = (nextIndex: number) => {
    setCurrentIndex(nextIndex);
    setQueryError('');
  };

  const formatTime = (remainingMs: number) => {
    const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeLeftMs <= 5 * 60 * 1000) {
      return '#e53e3e';
    }
    if (timeLeftMs <= 15 * 60 * 1000) {
      return '#dd6b20';
    }
    return '#38a169';
  };

  const getResultTable = (feedback?: SubmissionFeedback) => {
    if (!feedback?.resultColumns?.length || !feedback.resultRows?.length) {
      return null;
    }

    return [feedback.resultColumns, ...feedback.resultRows.map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? '')) : []))];
  };

  const submitCurrentQuery = async () => {
    if (!examId || !currentQuestion || !session || !user) {
      return;
    }

    if (!currentSql.trim()) {
      setQueryError('Write a SQL statement before submitting.');
      return;
    }

    setIsSubmittingQuery(true);
    setQueryError('');

    try {
      const response = await queryApi.submitQuery({
        sessionId: session.id,
        examId,
        questionId: currentQuestion.id,
        studentId: user.id,
        query: currentSql,
      });

      if (!response.submissionId) {
        setQueryError(response.executionError || 'We could not record this submission. Please try again.');
        return;
      }

      const feedback = normalizeFeedback(response);

      setSubmittedQuestions((previous) => new Set(previous).add(currentQuestion.id));
      setFeedbackByQuestion((previous) => ({
        ...previous,
        [currentQuestion.id]: feedback,
      }));
      setQueryError('');

      if (currentIndex < questions.length - 1) {
        switchQuestion(currentIndex + 1);
      }
    } catch (err) {
      setQueryError(extractErrorMessage(err, 'Failed to submit your query.'));
    } finally {
      setIsSubmittingQuery(false);
    }
  };

  const submitExam = async () => {
    if (!session) {
      return;
    }

    setIsSubmittingExam(true);
    setError(null);

    try {
      await sessionApi.submitSession(String(session.id));
      navigate('/student/results');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to submit your exam session.'));
    } finally {
      setIsSubmittingExam(false);
      setShowConfirmSubmit(false);
    }
  };

  if (loading) {
    return (
      <div className="exam-session">
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading exam session...</div>
      </div>
    );
  }

  if (error || !exam || !currentQuestion) {
    return (
      <div className="exam-session">
        <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>
          <div>{error || 'This exam session is unavailable.'}</div>
          <button className="btn btn-primary" onClick={() => navigate('/student/exams')} style={{ marginTop: '18px' }}>
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  const resultTable = getResultTable(currentFeedback);

  return (
    <div className="exam-session">
      <div className="exam-header">
        <div className="exam-header-left">
          <h1 className="exam-title">{exam.title}</h1>
          <div className="exam-meta">
            <span>📚 {getCourseName(exam.course, exam.courseId)}</span>
            <span>📝 {questions.length} Questions</span>
            <span>💯 {totalMarks} Marks</span>
            <span>⏱ {getExamTimeLimit(exam) || 'N/A'} mins</span>
          </div>
        </div>
        <div className="exam-header-right">
          <div className="exam-timer" style={{ color: getTimerColor(), borderColor: getTimerColor() }}>
            {formatTime(timeLeftMs)}
          </div>
          <div className="exam-progress">
            <span className="exam-progress-text">{answeredCount}/{questions.length} drafted</span>
            <div className="exam-progress-bar">
              <div className="exam-progress-fill" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowConfirmSubmit(true)} disabled={isSubmittingExam}>
            {isSubmittingExam ? 'Submitting...' : 'Submit Exam'}
          </button>
        </div>
      </div>

      <div className="exam-body">
        <div className="exam-question-nav">
          <div className="exam-qnav-title">Questions</div>
          <div className="exam-qnav-grid">
            {questions.map((question, index) => (
              <button
                key={question.id}
                className={`exam-qnav-btn ${index === currentIndex ? 'current' : ''} ${submittedQuestions.has(question.id) ? 'submitted' : ''} ${draftAnswers[question.id]?.trim() ? 'answered' : ''}`}
                onClick={() => switchQuestion(index)}
              >
                {question.number}
              </button>
            ))}
          </div>
        </div>

        <div className="exam-workspace">
          <div className="exam-question-card">
            <div className="exam-question-header">
              <span className="exam-question-num">Question {currentQuestion.number}</span>
              <span className="badge badge-purple">{currentQuestion.marks} marks</span>
            </div>
            <p className="exam-question-text">{currentQuestion.prompt}</p>
          </div>

          <div className="exam-editor-card">
            <div className="exam-editor-header">
              <span>SQL Editor</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => saveDraft(currentQuestion.id, currentSql)} disabled={!currentSql.trim()}>
                  Save Draft
                </button>
                <button className="btn btn-primary btn-sm" onClick={submitCurrentQuery} disabled={isSubmittingQuery}>
                  {isSubmittingQuery ? 'Submitting...' : 'Submit Query'}
                </button>
              </div>
            </div>
            <div className="exam-editor-area">
              <div className="exam-editor-gutter">
                {currentSql.split('\n').map((_, index) => (
                  <div key={`line-${index}`} className="exam-line-num">{index + 1}</div>
                ))}
              </div>
              <textarea
                className="exam-textarea"
                value={currentSql}
                onChange={(event) => saveDraft(currentQuestion.id, event.target.value)}
                placeholder="-- Write your SQL query here..."
                spellCheck={false}
              />
            </div>
            {submittedQuestions.has(currentQuestion.id) && (
              <div className="exam-submitted-badge">Submission recorded for this question.</div>
            )}
          </div>

          <div className="exam-results-card">
            <div className="exam-results-header">
              <span>Submission Feedback</span>
              {currentFeedback?.visible && typeof currentFeedback.score === 'number' && (
                <span className="badge badge-green">Score: {currentFeedback.score}</span>
              )}
            </div>
            <div className="exam-results-body">
              {queryError && (
                <div className="exam-results-error">
                  {queryError}
                </div>
              )}

              {!queryError && currentFeedback?.message && (
                <div className="exam-results-empty">
                  <p>{currentFeedback.message}</p>
                </div>
              )}

              {resultTable && (
                <div className="exam-results-table-wrap">
                  <table className="exam-results-table">
                    <thead>
                      <tr>
                        {resultTable[0].map((column, index) => (
                          <th key={`header-${index}`}>{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultTable.slice(1).map((row, rowIndex) => (
                        <tr key={`row-${rowIndex}`}>
                          {row.map((cell, cellIndex) => (
                            <td key={`cell-${cellIndex}`}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!queryError && !currentFeedback && (
                <div className="exam-results-empty">
                  <p>Submit a query to receive grading feedback for this question.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showConfirmSubmit && (
        <div className="exam-modal-overlay">
          <div className="exam-modal">
            <h3>Submit exam?</h3>
            <p>You have drafted answers for <strong>{answeredCount}</strong> out of <strong>{questions.length}</strong> questions.</p>
            <div className="exam-modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowConfirmSubmit(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitExam} disabled={isSubmittingExam}>
                {isSubmittingExam ? 'Submitting...' : 'Submit Exam'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const normalizeFeedback = (response: QuerySubmissionResponse): SubmissionFeedback => {
  if (response.resultsVisible === false) {
    return {
      visible: false,
      message: 'Your query was submitted successfully. Detailed results are hidden until the exam visibility rules allow them.',
    };
  }

  if (response.executionError) {
    return {
      visible: false,
      message: 'Your query was submitted successfully for this question.',
    };
  }

  return {
    visible: true,
    score: response.score,
    isCorrect: response.isCorrect,
    resultColumns: response.resultColumns || [],
    resultRows: response.resultRows || [],
    message: response.resultColumns?.length || response.resultRows?.length
      ? undefined
      : 'Submission saved. No tabular rows were returned for display.',
  };
};

export default ExamSession;
