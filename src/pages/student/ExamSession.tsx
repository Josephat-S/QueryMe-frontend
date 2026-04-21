/* eslint-disable react-x/no-array-index-key */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { examApi, queryApi, sessionApi, type Exam, type QuerySubmissionResponse, type Session } from '../../api';
import { InlineSkeleton } from '../../components/PageSkeleton';
import { useAuth } from '../../contexts';
import { extractErrorMessage } from '../../utils/errorUtils';
import { getCourseName, getExamTimeLimit, getSessionRemainingMs, isSessionComplete } from '../../utils/queryme';
import { EXAM_SESSION_TW } from '../../theme/twStyles';
import { useStudentSessions } from '../../hooks/useStudentSessions';
import { useQuestions } from '../../hooks/useQuestions';



interface SubmissionFeedback {
  visible: boolean;
  score?: number;
  isCorrect?: boolean;
  resultColumns?: string[];
  resultRows?: unknown[][];
  message?: string;
}

// ── Isolated Timer Component to prevent full-page re-renders every second ──
const ExamTimer: React.FC<{ session: Session; onExpire: () => void; isPaused: boolean }> = ({ session, onExpire, isPaused }) => {
  // Clamp to 0 so a stale-but-not-submitted session with a past expiresAt
  // does NOT produce a negative starting value that fires onExpire immediately.
  const [timeLeftMs, setTimeLeftMs] = useState(() => Math.max(0, getSessionRemainingMs(session)));

  useEffect(() => {
    if (!session.expiresAt || isSessionComplete(session)) return undefined;

    // If the session was already expired when this component mounted, fire
    // onExpire on the next tick rather than letting the interval do it
    // (prevents the 1-second delay from masking an already-expired session).
    if (getSessionRemainingMs(session) <= 0) {
      const t = window.setTimeout(() => onExpire(), 0);
      return () => window.clearTimeout(t);
    }

    const interval = window.setInterval(() => {
      if (isPaused) return;

      setTimeLeftMs((prev) => {
        const next = prev - 1000;
        if (next <= 0) {
          window.clearInterval(interval);
          onExpire();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [session, onExpire, isPaused]);

  const totalSeconds = Math.max(0, Math.floor(timeLeftMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const color = timeLeftMs <= 5 * 60 * 1000 ? '#e53e3e' : timeLeftMs <= 15 * 60 * 1000 ? '#dd6b20' : '#38a169';

  return (
    <div className="exam-timer" style={{ color, borderColor: color }}>
      {`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`}
    </div>
  );
};

// ── Isolated Editor Component to prevent full-page re-renders on keystroke ──
const ExamEditor: React.FC<{
  initialValue: string;
  onChange: (value: string) => void;
}> = ({ initialValue, onChange }) => {
  const [localValue, setLocalValue] = useState(initialValue);

  // Debounce the push to parent so the UI doesn't lag while typing rapidly
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== initialValue) {
        onChange(localValue);
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [localValue, initialValue, onChange]);

  const lines = useMemo(() => localValue.split('\n'), [localValue]);

  return (
    <div className="exam-editor-area">
      <div className="exam-editor-gutter">
        {lines.map((_, index) => (
          <div key={`line-${index}`} className="exam-line-num">{index + 1}</div>
        ))}
      </div>
      <textarea
        className="exam-textarea"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => {
          if (localValue !== initialValue) onChange(localValue);
        }}
        placeholder="-- Write your SQL query here..."
        spellCheck={false}
      />
    </div>
  );
};

const ExamSession: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [exam, setExam] = useState<Exam | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<string>>(() => new Set());
  const [feedbackByQuestion, setFeedbackByQuestion] = useState<Record<string, SubmissionFeedback>>({});
  const [queryError, setQueryError] = useState('');
  const [isSubmittingQuery, setIsSubmittingQuery] = useState(false);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isSubmittingOnLeave, setIsSubmittingOnLeave] = useState(false);
  const [pendingNavigationPath, setPendingNavigationPath] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Lockdown states — modal starts open so the student always sees instructions first.
  const [showLockdownModal, setShowLockdownModal] = useState(true);
  const [isFirstLockdown, setIsFirstLockdown] = useState(true);
  const [lockdownCountdown, setLockdownCountdown] = useState(15);
  const [lockdownWarningCount, setLockdownWarningCount] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const autoSubmitRef = useRef(false);
  const heartbeatIntervalRef = useRef<number | null>(null);
  // True only after the student has successfully entered fullscreen at least once.
  // The countdown must NEVER fire before this is set.
  const hasEnteredFullscreenRef = useRef(false);

  // ── Cached hooks: sessions + questions come from cache on repeat visits ──────────
  const { data: studentSessions, loading: sessionsLoading } = useStudentSessions(user?.id);
  const { data: rawQuestions, loading: questionsLoading } = useQuestions(examId);

  const questions = useMemo(() =>
    rawQuestions.map((q, index) => ({
      id: String(q.id),
      number: index + 1,
      prompt: q.prompt,
      marks: q.marks,
    })),
    [rawQuestions],
  );

  useEffect(() => {
    const controller = new AbortController();

    const loadSession = async () => {
      if (!examId || !user) {
        setError('To access the editor, you need to start the exam first.');
        setLoading(false);
        return;
      }

      // Wait until cached sessions and questions are ready (avoids duplicate network calls)
      if (sessionsLoading || questionsLoading) return;

      setLoading(true);
      setError(null);

      try {
        const loadedExam = await examApi.getExam(examId, controller.signal);

        if (controller.signal.aborted) return;

        const existingSession = studentSessions.find(
          (candidate) =>
            String(candidate.examId) === examId &&
            !isSessionComplete(candidate) &&
            // Exclude sessions whose time has already elapsed — reusing an expired
            // session would cause ExamTimer to fire onExpire immediately on mount.
            (!candidate.expiresAt || getSessionRemainingMs(candidate) > 0),
        );

        const liveSession = existingSession || await sessionApi.startSession(
          { examId, studentId: user.id },
          controller.signal,
        );

        if (controller.signal.aborted) return;

        setExam(loadedExam);
        setSession(liveSession);

        // Load persisted drafts from localStorage
        const persisted = localStorage.getItem(`qm_drafts_${liveSession.id}`);
        if (persisted) {
          try {
            const parsed = JSON.parse(persisted);
            setDraftAnswers((prev) => ({ ...prev, ...parsed }));
          } catch (e) {
            console.error('Failed to parse persisted drafts', e);
          }
        }
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
  // sessionsLoading and questionsLoading are intentionally dependencies so we re-run once cached data arrives
  }, [examId, questionsLoading, sessionsLoading, studentSessions, user]);

  // ── Lockdown & Fullscreen Logic ───────────────────────────────────────────
  const enterFullscreen = async () => {
    try {
      if (containerRef.current) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
          await (containerRef.current as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
        }
        // Do NOT set isFirstLockdown(false) here — the fullscreen promise resolving
        // does NOT guarantee fullscreenchange has fired yet. We set it inside
        // handleFullscreenChange when we confirm fullscreenElement is actually set.
      }
    } catch (err) {
      console.error('Fullscreen request failed:', err);
    }
  };

  const triggerImmediateSubmission = useCallback(async (reason: string) => {
    if (autoSubmitRef.current || !session) return;
    autoSubmitRef.current = true;
    
    console.warn(`Lockdown Violation: ${reason}. Submitting exam...`);
    try {
      await sessionApi.submitSession(String(session.id));
      navigate('/student/results', { 
        state: { 
          message: `Your exam was automatically submitted because you ${reason}. To maintain integrity, leaving the exam environment is not allowed.` 
        } 
      });
    } catch (err) {
      console.error('Auto-submission failed:', err);
      navigate('/student/results');
    }
  }, [navigate, session]);

  // ── Separate useEffect for Countdown Timer ───────────────────────────────
  useEffect(() => {
    // Guard: only count down if the student has previously confirmed fullscreen entry.
    // Without this guard, the countdown would start the moment isFirstLockdown becomes
    // false — which could happen mid-entry before fullscreen is actually confirmed.
    if (!showLockdownModal || !hasEnteredFullscreenRef.current || autoSubmitRef.current) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setLockdownCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          void triggerImmediateSubmission('failed to return to full-screen mode in time');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [showLockdownModal, triggerImmediateSubmission]);

  useEffect(() => {
    if (lockdownWarningCount >= 3 && !autoSubmitRef.current) {
      void triggerImmediateSubmission('exceeded full-screen exit limit (3 times)');
    }
  }, [lockdownWarningCount, triggerImmediateSubmission]);

  useEffect(() => {
    if (loading || !session || isSessionComplete(session)) return undefined;

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(document.fullscreenElement);

      if (isCurrentlyFullscreen) {
        // Student successfully entered fullscreen — mark as confirmed and clear modal.
        hasEnteredFullscreenRef.current = true;
        setIsFirstLockdown(false);
        setShowLockdownModal(false);
      } else if (!autoSubmitRef.current) {
        // Student exited fullscreen — show re-entry modal and start countdown
        // only if they had previously confirmed fullscreen entry.
        setShowLockdownModal(true);
        if (hasEnteredFullscreenRef.current) {
          setLockdownCountdown(15);
          setLockdownWarningCount((prev) => prev + 1);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && !autoSubmitRef.current && hasEnteredFullscreenRef.current) {
        const confirmLeave = window.confirm('You are attempting to leave or switch away from the exam tab. Choose OK to submit immediately and leave, or Cancel to return and stay on this tab.');
        if (confirmLeave) {
          void triggerImmediateSubmission('chose to leave the exam tab');
        }
      }
    };

    const handleBlur = () => {
      if (autoSubmitRef.current || !hasEnteredFullscreenRef.current) return;

      setTimeout(() => {
        if (!document.hasFocus() && !autoSubmitRef.current) {
          const confirmStay = window.confirm('SECURITY WARNING: Losing focus on the exam window is not allowed. Choose OK to submit immediately, or Cancel to stay on the exam.');
          if (confirmStay) {
            void triggerImmediateSubmission('lost focus on the exam window');
          }
        }
      }, 500);
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSessionComplete(session) && !autoSubmitRef.current) {
        e.preventDefault();
        e.returnValue = 'Your exam will be submitted if you leave.';
        return e.returnValue;
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // The modal is initialised to true in useState, so no synchronous
    // setState is needed here. It will be dismissed by handleFullscreenChange
    // once the student successfully enters fullscreen.

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [loading, session, triggerImmediateSubmission]);

  // Heartbeat and Focus Locking
  useEffect(() => {
    if (!session || isSessionComplete(session)) return undefined;

    // Start heartbeat
    heartbeatIntervalRef.current = window.setInterval(() => {
      sessionApi.sendHeartbeat(String(session.id)).catch(console.error);
    }, 60000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (heartbeatIntervalRef.current) window.clearInterval(heartbeatIntervalRef.current);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [session]);

  // Persist drafts to localStorage
  useEffect(() => {
    if (session?.id && Object.keys(draftAnswers).length > 0) {
      localStorage.setItem(`qm_drafts_${session.id}`, JSON.stringify(draftAnswers));
    }
  }, [draftAnswers, session?.id]);

  // The 1-second interval has been moved to <ExamTimer />

  useEffect(() => {
    const handleNavigationAttempt = (event: MouseEvent) => {
      if (!session || isSessionComplete(session) || autoSubmitRef.current || isSubmittingExam || isSubmittingOnLeave) {
        return;
      }

      if (!(event.target instanceof Element)) {
        return;
      }

      const anchor = event.target.closest('a[href]') as HTMLAnchorElement | null;

      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) {
        return;
      }

      const rawHref = anchor.getAttribute('href');
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
        return;
      }

      const destination = new URL(anchor.href, window.location.origin);
      if (destination.origin !== window.location.origin) {
        return;
      }

      const nextPath = `${destination.pathname}${destination.search}${destination.hash}`;
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

      if (nextPath === currentPath) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setPendingNavigationPath(nextPath);
      setShowLeaveModal(true);
    };

    document.addEventListener('click', handleNavigationAttempt, true);

    return () => {
      document.removeEventListener('click', handleNavigationAttempt, true);
    };
  }, [isSubmittingExam, isSubmittingOnLeave, session]);

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

  // formatTime and getTimerColor were moved to ExamTimer

  const switchQuestion = (nextIndex: number) => {
    setCurrentIndex(nextIndex);
    setQueryError('');
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

  const submitAndLeave = async () => {
    if (!session || !pendingNavigationPath) {
      setShowLeaveModal(false);
      return;
    }

    setIsSubmittingOnLeave(true);
    setError(null);

    try {
      await sessionApi.submitSession(String(session.id));
      autoSubmitRef.current = true;
      setShowLeaveModal(false);
      navigate(pendingNavigationPath);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to submit your exam session before leaving this page.'));
      setShowLeaveModal(false);
    } finally {
      setIsSubmittingOnLeave(false);
      setPendingNavigationPath(null);
    }
  };

  if (loading) {
    return (
      <div className="exam-session">
        <InlineSkeleton rows={6} className="mx-4 mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm" />
      </div>
    );
  }

  if (error || !exam || !currentQuestion) {
    return (
      <div className="exam-session">
        <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>
          <div>{error || 'This exam session is unavailable.'}</div>
          <div style={{ marginTop: '10px' }}>
            <Link to="/student/exams" style={{ color: '#6a3cb0', fontWeight: 600, textDecoration: 'underline' }}>
              Go to Available Exams
            </Link>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/student/exams')} style={{ marginTop: '18px' }}>
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  const resultTable = getResultTable(currentFeedback);

  return (
    <div className={EXAM_SESSION_TW} ref={containerRef}>
      <div className="exam-header">
        <div className="exam-header-left">
          <h1 className="exam-title">{exam.title}</h1>
          <div className="exam-meta">
            <span>Course: {getCourseName(exam.course, exam.courseId)}</span>
            <span>Questions: {questions.length}</span>
            <span>Marks: {totalMarks}</span>
            <span>Time Limit: {getExamTimeLimit(exam) || 'N/A'} mins</span>
          </div>
        </div>
        <div className="exam-header-right">
          {session && (
            <ExamTimer
              session={session}
              isPaused={!isOnline}
              onExpire={() => {
                if (autoSubmitRef.current) return;
                autoSubmitRef.current = true;
                void sessionApi.submitSession(String(session.id))
                  .then(() => navigate('/student/results'))
                  .catch(() => setError('Time limit reached but auto-submit failed. Please submit manually.'));
              }}
            />
          )}
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
              <div className="exam-editor-actions" style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => saveDraft(currentQuestion.id, currentSql)} disabled={!currentSql.trim()}>
                  Save Draft
                </button>
                <button className="btn btn-primary btn-sm" onClick={submitCurrentQuery} disabled={isSubmittingQuery}>
                  {isSubmittingQuery ? 'Submitting...' : 'Submit Query'}
                </button>
              </div>
            </div>
            <ExamEditor
              key={currentQuestion.id}
              initialValue={currentSql}
              onChange={(value) => saveDraft(currentQuestion.id, value)}
            />
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

      {showLeaveModal && (
        <div className="exam-modal-overlay">
          <div className="exam-modal">
            <h3>Leave exam page?</h3>
            <p>
              Leaving this page will submit your exam immediately.
            </p>
            <div className="exam-modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  if (isSubmittingOnLeave) {
                    return;
                  }
                  setShowLeaveModal(false);
                  setPendingNavigationPath(null);
                }}
              >
                Stay on Exam
              </button>
              <button className="btn btn-primary" onClick={submitAndLeave} disabled={isSubmittingOnLeave}>
                {isSubmittingOnLeave ? 'Submitting...' : 'Leave and Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLockdownModal && (
        <div className="exam-modal-overlay" style={{ zIndex: 10000, backgroundColor: 'rgba(15, 23, 42, 0.98)', backdropFilter: 'blur(8px)' }}>
          <div className="exam-modal" style={{ maxWidth: '480px', textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>{isFirstLockdown ? '📝' : '⏳'}</div>
            <h3 style={{ fontSize: '24px', marginBottom: '16px', color: '#1e293b' }}>
              {isFirstLockdown ? 'Exam Instructions' : 'Lockdown Violation'}
            </h3>
            <p style={{ color: '#64748b', lineHeight: '1.6', marginBottom: '32px' }}>
              {isFirstLockdown 
                ? 'To begin your exam, you must enter secure lockdown mode. This will open the exam in full-screen. Switching tabs or losing focus will result in immediate submission.'
                : 'You have exited full-screen mode. To maintain exam integrity, you must re-enter lockdown mode immediately.'}
            </p>

            {!isFirstLockdown && (
              <div className="mb-8 rounded-lg bg-rose-50 p-4 text-rose-700">
                <div className="text-3xl font-bold">{lockdownCountdown}</div>
                <div className="text-xs font-semibold uppercase tracking-wider">Seconds remaining until auto-submit</div>
              </div>
            )}
            
            <div className="flex flex-col gap-3">
              <button 
                className="btn btn-primary w-full py-4 text-sm font-bold tracking-widest" 
                onClick={enterFullscreen}
                style={{ height: '56px' }}
              >
                {isFirstLockdown ? 'START EXAM IN LOCKDOWN' : 'RE-ENTER LOCKDOWN MODE'}
              </button>
              <button 
                className="btn btn-secondary w-full py-3 text-xs font-semibold text-rose-600 hover:bg-rose-50" 
                onClick={() => {
                  if (window.confirm('Are you sure you want to quit? This will submit your exam immediately.')) {
                    void submitExam();
                  }
                }}
              >
                QUIT AND SUBMIT EXAM
              </button>
            </div>
            
            <p className="mt-8 text-xs text-slate-400">
              {isFirstLockdown 
                ? 'Your session will be monitored for suspicious activity.'
                : lockdownWarningCount > 0 ? `Warning ${lockdownWarningCount} of 3. You will be automatically submitted if you exit full-screen 3 times.` : 'Please return to full-screen to continue.'}
            </p>
          </div>
        </div>
      )}

      {!isOnline && (
        <div className="exam-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="exam-modal" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📡</div>
            <h3>Connection Lost</h3>
            <p>Your internet connection was lost. The exam timer has been paused.</p>
            <p style={{ fontWeight: 600, color: '#6a3cb0' }}>Please wait for the connection to be restored to continue your exam.</p>
            <div style={{ marginTop: '20px' }}>
              <div className="animate-pulse flex items-center justify-center gap-2 text-slate-500">
                <div className="h-2 w-2 rounded-full bg-slate-400"></div>
                <span>Reconnecting...</span>
              </div>
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
