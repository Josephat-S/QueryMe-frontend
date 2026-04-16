import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { courseApi, examApi, questionApi, type Course, type Exam, type Question, type VisibilityMode } from '../../api';
import { PageSkeleton } from '../../components/PageSkeleton';
import { useAuth } from '../../contexts';
import { useToast } from '../../components/ToastContext';
import { extractErrorMessage } from '../../utils/errorUtils';
import { filterCoursesByTeacher, normalizeExamStatus } from '../../utils/queryme';

interface QuestionDraft {
  localId: string;
  questionId?: string;
  prompt: string;
  referenceQuery: string;
  marks: number;
  orderSensitive: boolean;
  partialMarks: boolean;
  savedSnapshot?: string;
  savedOrderIndex?: number;
}

interface PersistedExamContext {
  examId: string;
  wasCreated: boolean;
  wasReused: boolean;
}

const DEFAULT_VISIBILITY: VisibilityMode = 'END_OF_EXAM';

const buildQuestionSnapshot = (question: Pick<QuestionDraft, 'prompt' | 'referenceQuery' | 'marks' | 'orderSensitive' | 'partialMarks'>): string => JSON.stringify({
  prompt: question.prompt.trim(),
  referenceQuery: question.referenceQuery.trim(),
  marks: question.marks,
  orderSensitive: question.orderSensitive,
  partialMarks: question.partialMarks,
});

const createQuestionDraft = (question?: Question): QuestionDraft => {
  const draft: QuestionDraft = {
    localId: question ? String(question.id) : crypto.randomUUID(),
    questionId: question ? String(question.id) : undefined,
    prompt: question?.prompt || '',
    referenceQuery: String(question?.referenceQuery || ''),
    marks: question?.marks || 10,
    orderSensitive: Boolean(question?.orderSensitive),
    partialMarks: Boolean(question?.partialMarks),
  };

  if (question) {
    draft.savedSnapshot = buildQuestionSnapshot(draft);
    draft.savedOrderIndex = question.orderIndex;
  }

  return draft;
};

const normalizeExamText = (value?: string | null): string => (value || '').trim();

const getComparableTimeLimit = (exam: Partial<Exam>): number => exam.timeLimitMins ?? exam.timeLimit ?? 0;

const ExamBuilder: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [description, setDescription] = useState('');
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [timeLimitMins, setTimeLimitMins] = useState(60);
  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>(DEFAULT_VISIBILITY);
  const [seedSql, setSeedSql] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [examStatus, setExamStatus] = useState('DRAFT');
  const [workingExamId, setWorkingExamId] = useState<string | null>(examId ?? null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const activeExamId = workingExamId ?? examId ?? null;
  const readOnly = useMemo(() => Boolean(activeExamId) && examStatus !== 'DRAFT', [activeExamId, examStatus]);
  const requestedCourseId = searchParams.get('courseId') || '';

  useEffect(() => {
    const controller = new AbortController();

    const loadBuilder = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const allCourses = await courseApi.getCourses(controller.signal);
        const teacherCourses = filterCoursesByTeacher(allCourses, user.id);

        if (!controller.signal.aborted) {
          setCourses(teacherCourses);
          if (!examId) {
            const preferredCourseId = requestedCourseId && teacherCourses.some((course) => String(course.id) === requestedCourseId)
              ? requestedCourseId
              : teacherCourses[0]
                ? String(teacherCourses[0].id)
                : '';

            setCourseId((previous) => previous || preferredCourseId);
          }
        }

        if (examId) {
          const [exam, existingQuestions] = await Promise.all([
            examApi.getExam(examId, controller.signal),
            questionApi.getQuestions(examId, controller.signal),
          ]);

          if (!controller.signal.aborted) {
            setWorkingExamId(String(exam.id));
            setTitle(exam.title);
            setCourseId(String(exam.courseId));
            setDescription(exam.description || '');
            setMaxAttempts(exam.maxAttempts ?? 1);
            setTimeLimitMins(exam.timeLimitMins ?? exam.timeLimit ?? 60);
            setVisibilityMode(String(exam.visibilityMode || DEFAULT_VISIBILITY));
            setSeedSql(String(exam.seedSql || ''));
            setExamStatus(normalizeExamStatus(exam.status) || 'DRAFT');
            setQuestions(existingQuestions.length ? existingQuestions.map((question) => createQuestionDraft(question)) : []);
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(extractErrorMessage(err, 'Failed to load the exam builder.'));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadBuilder();
    return () => controller.abort();
  }, [examId, requestedCourseId, user]);

  const updateQuestion = (localId: string, patch: Partial<QuestionDraft>) => {
    setQuestions((previous) => previous.map((question) => (question.localId === localId ? { ...question, ...patch } : question)));
  };

  const addQuestion = () => {
    setQuestions((previous) => [...previous, createQuestionDraft()]);
  };

  const removeQuestion = (localId: string) => {
    setQuestions((previous) => {
      const question = previous.find((item) => item.localId === localId);
      if (question?.questionId) {
        showToast('warning', 'Question retained', 'Existing questions cannot be deleted from the frontend because the backend does not expose a delete-question endpoint.');
        return previous;
      }

      return previous.length > 1 ? previous.filter((item) => item.localId !== localId) : previous;
    });
  };

  const handleSeedFile = async (file: File) => {
    const content = await file.text();
    setSeedSql(content);
  };

  const validateExamForm = (requireSeedSql: boolean): string | null => {
    if (!title.trim()) {
      return 'Exam title is required.';
    }
    if (!courseId) {
      return 'Select a course before saving.';
    }
    if (requireSeedSql && !seedSql.trim()) {
      return 'Seed SQL is required before the backend can prepare question answer keys.';
    }
    return null;
  };

  const getPreparedQuestions = (): Array<{
    source: QuestionDraft;
    orderIndex: number;
    snapshot: string;
    payload: {
      prompt: string;
      referenceQuery: string;
      marks: number;
      orderIndex: number;
      orderSensitive: boolean;
      partialMarks: boolean;
    };
  }> => {
    const nonEmptyQuestions = questions.filter((question) => question.prompt.trim() || question.referenceQuery.trim());

    return nonEmptyQuestions.map((question, index) => {
      const prompt = question.prompt.trim();
      const referenceQuery = question.referenceQuery.trim();

      if (!prompt) {
        throw new Error(`Question ${index + 1} is missing a prompt.`);
      }

      if (!referenceQuery) {
        throw new Error(`Question ${index + 1} is missing a reference query.`);
      }

      const orderIndex = index + 1;
      const payload = {
        prompt,
        referenceQuery,
        marks: question.marks,
        orderIndex,
        orderSensitive: question.orderSensitive,
        partialMarks: question.partialMarks,
      };

      return {
        source: question,
        orderIndex,
        snapshot: buildQuestionSnapshot(payload),
        payload,
      };
    });
  };

  const findReusableDraftExamId = async (): Promise<string | null> => {
    if (activeExamId || !courseId) {
      return null;
    }

    const existingCourseExams = await examApi.getExamsByCourse(courseId);
    const matchingDrafts = existingCourseExams
      .filter((candidate) => normalizeExamStatus(candidate.status) === 'DRAFT')
      .filter((candidate) => candidate.title.trim() === title.trim())
      .filter((candidate) => normalizeExamText(candidate.description) === description.trim())
      .filter((candidate) => (candidate.maxAttempts ?? 1) === maxAttempts)
      .filter((candidate) => getComparableTimeLimit(candidate) === timeLimitMins)
      .filter((candidate) => String(candidate.visibilityMode || DEFAULT_VISIBILITY) === String(visibilityMode))
      .filter((candidate) => normalizeExamText(candidate.seedSql) === seedSql.trim())
      .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime());

    return matchingDrafts[0] ? String(matchingDrafts[0].id) : null;
  };

  const persistDraft = async (requireSeedSql: boolean): Promise<PersistedExamContext> => {
    const validationError = validateExamForm(requireSeedSql);

    if (validationError) {
      throw new Error(validationError);
    }

    setSaveProgress(activeExamId ? 'Updating exam draft...' : 'Creating exam draft...');

    const examPayload = {
      courseId,
      title: title.trim(),
      description: description.trim(),
      maxAttempts,
      timeLimitMins,
      visibilityMode,
      seedSql: seedSql.trim() || undefined,
    };

    const reusableExamId = await findReusableDraftExamId();
    const targetExamId = activeExamId || reusableExamId;
    const wasCreated = !targetExamId;
    const wasReused = Boolean(reusableExamId) && !activeExamId;
    const savedExam = targetExamId
      ? await examApi.updateExam(targetExamId, examPayload)
      : await examApi.createExam(examPayload);

    const persistedExamId = String(savedExam.id);
    setWorkingExamId(persistedExamId);
    setExamStatus(normalizeExamStatus(savedExam.status) || 'DRAFT');

    if (wasCreated || wasReused) {
      navigate(`/teacher/exams/builder/${persistedExamId}`, { replace: true });
    }

    return {
      examId: persistedExamId,
      wasCreated,
      wasReused,
    };
  };

  const persistQuestions = async (persistedExamId: string) => {
    const preparedQuestions = getPreparedQuestions();

    for (const preparedQuestion of preparedQuestions) {
      const { source, orderIndex, snapshot, payload } = preparedQuestion;
      const requiresMutation = !source.questionId
        || source.savedSnapshot !== snapshot
        || source.savedOrderIndex !== orderIndex;

      if (!requiresMutation) {
        continue;
      }

      setSaveProgress(`Saving question ${orderIndex} of ${preparedQuestions.length}...`);

      let savedQuestion: Question;

      try {
        savedQuestion = source.questionId
          ? await questionApi.updateQuestion(persistedExamId, source.questionId, payload)
          : await questionApi.createQuestion(persistedExamId, payload);
      } catch (err) {
        throw new Error(extractErrorMessage(err, `Failed while saving question ${orderIndex}.`));
      }

      const persistedDraft = {
        ...createQuestionDraft(savedQuestion),
        localId: source.localId,
        savedSnapshot: snapshot,
        savedOrderIndex: orderIndex,
      };

      setQuestions((previous) => previous.map((item) => (
        item.localId === source.localId ? persistedDraft : item
      )));
    }

    setQuestions((previous) => {
      const preparedByLocalId = new Map(preparedQuestions.map((question) => [question.source.localId, question]));

      return previous.map((question) => {
        const preparedQuestion = preparedByLocalId.get(question.localId);

        if (!preparedQuestion) {
          return question;
        }

        return {
          ...question,
          savedSnapshot: preparedQuestion.snapshot,
          savedOrderIndex: preparedQuestion.orderIndex,
        };
      });
    });

    return preparedQuestions.length;
  };

  const handleSaveDraft = async () => {
    if (readOnly) {
      showToast('warning', 'Exam locked', 'Only draft exams can be edited from this builder.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { wasCreated, wasReused } = await persistDraft(false);
      showToast(
        'success',
        wasCreated ? 'Draft created' : wasReused ? 'Draft reopened' : 'Draft updated',
        wasCreated
          ? 'The exam draft was created. You can now add questions and publish later.'
          : wasReused
            ? 'An existing matching draft was reopened so you can continue without creating duplicates.'
          : 'The exam draft details were updated.',
      );
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to save the exam.'));
    } finally {
      setSaving(false);
      setSaveProgress('');
    }
  };

  const handleSaveQuestions = async () => {
    if (readOnly) {
      showToast('warning', 'Exam locked', 'Only draft exams can be edited from this builder.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { examId: persistedExamId } = await persistDraft(true);
      const questionsCount = await persistQuestions(persistedExamId);

      if (questionsCount === 0) {
        showToast('warning', 'No questions to save', 'Add at least one complete question before saving question content.');
        return;
      }

      showToast('success', 'Questions saved', `${questionsCount} question${questionsCount === 1 ? '' : 's'} were saved to the draft exam.`);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to save the exam questions.'));
      if (workingExamId || activeExamId) {
        showToast('info', 'Draft progress kept', 'Retrying from this page will continue with the same draft instead of creating another exam.');
      }
    } finally {
      setSaving(false);
      setSaveProgress('');
    }
  };

  const handlePublishExam = async () => {
    if (readOnly) {
      showToast('warning', 'Exam locked', 'Only draft exams can be edited from this builder.');
      return;
    }

    if (!activeExamId) {
      setError('Save the exam as a draft first before publishing.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { examId: persistedExamId } = await persistDraft(true);
      const questionsCount = await persistQuestions(persistedExamId);

      if (questionsCount === 0) {
        throw new Error('Add at least one complete question before publishing this exam.');
      }

      setSaveProgress('Publishing exam...');
      await examApi.publishExam(persistedExamId);
      setExamStatus('PUBLISHED');
      showToast('success', 'Exam published', 'The draft exam was published successfully.');
      navigate('/teacher/exams');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to publish the exam.'));
      showToast('info', 'Draft progress kept', 'Your draft remains saved. Once the questions are ready, you can publish from this page.');
    } finally {
      setSaving(false);
      setSaveProgress('');
    }
  };

  if (loading) {
    return <PageSkeleton title="Exam Builder" rows={6} />;
  }

  return (
    <div className="teacher-page">
      <div className="builder-header">
        <div>
          <h1 className="builder-title">{examId ? 'Edit Exam' : 'Create Exam'}</h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#666' }}>
            This builder now saves directly to the backend exam and question modules.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/teacher/exams')}>Cancel</button>
          <button className="btn btn-secondary" onClick={() => void handleSaveDraft()} disabled={saving || readOnly}>
            {saving ? saveProgress || 'Saving...' : 'Save Draft'}
          </button>
          <button className="btn btn-secondary" onClick={() => void handleSaveQuestions()} disabled={saving || readOnly || !activeExamId}>
            {saving ? saveProgress || 'Saving...' : 'Save Questions'}
          </button>
          <button className="btn btn-primary" onClick={() => void handlePublishExam()} disabled={saving || readOnly || !activeExamId}>
            {saving ? saveProgress || 'Publishing...' : 'Publish Exam'}
          </button>
        </div>
      </div>

      <div style={{ padding: 'clamp(12px, 2.8vw, 24px)', display: 'grid', gap: '20px' }}>
        {error && <div style={{ color: '#e53e3e', fontSize: '13px' }}>{error}</div>}
        {!activeExamId && (
          <div style={{ color: '#2563eb', fontSize: '13px' }}>
            Step 1: save the exam as a draft. After that, the builder will attach questions to that same draft and publishing will be enabled.
          </div>
        )}
        {readOnly && (
          <div style={{ color: '#dd6b20', fontSize: '13px' }}>
            This exam is no longer in draft status. The backend only allows updates to draft exams, so the form is read-only.
          </div>
        )}

        <div className="builder-card">
          <h2 className="students-card-title">Exam Details</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '16px', marginTop: '16px' }}>
            <input className="form-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Exam title" disabled={Boolean(readOnly)} />
            <select className="form-input" value={courseId} onChange={(event) => setCourseId(event.target.value)} disabled={Boolean(readOnly)}>
              <option value="">Select course</option>
              {courses.map((course) => (
                <option key={String(course.id)} value={String(course.id)}>{course.name}</option>
              ))}
            </select>
            <textarea className="form-input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Exam description" style={{ gridColumn: '1 / -1', minHeight: '96px' }} disabled={Boolean(readOnly)} />
            <div style={{ display: 'grid', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Max Attempts</label>
              <input
                className="form-input"
                type="number"
                min={1}
                value={maxAttempts}
                onChange={(event) => setMaxAttempts(Number(event.target.value) || 1)}
                disabled={Boolean(readOnly)}
                aria-label="Maximum attempts allowed"
              />
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>How many times a student can submit this exam.</span>
            </div>
            <div style={{ display: 'grid', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Time Limit (Minutes)</label>
              <input
                className="form-input"
                type="number"
                min={1}
                value={timeLimitMins}
                onChange={(event) => setTimeLimitMins(Number(event.target.value) || 60)}
                disabled={Boolean(readOnly)}
                aria-label="Exam time limit in minutes"
              />
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Total duration available for each exam session.</span>
            </div>
            <select className="form-input" value={visibilityMode} onChange={(event) => setVisibilityMode(event.target.value)} disabled={Boolean(readOnly)}>
              <option value="IMMEDIATE">Immediate</option>
              <option value="END_OF_EXAM">End of Exam</option>
              <option value="NEVER">Never</option>
            </select>
            <div className="form-input" style={{ display: 'flex', alignItems: 'center' }}>
              Status: {examStatus}
            </div>
          </div>
        </div>

        <div className="builder-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h2 className="students-card-title">Seed SQL</h2>
            <label className="btn btn-secondary btn-sm" style={{ cursor: readOnly ? 'not-allowed' : 'pointer', opacity: readOnly ? 0.6 : 1 }}>
              Upload `.sql`
              <input type="file" accept=".sql,text/plain" style={{ display: 'none' }} disabled={Boolean(readOnly)} onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleSeedFile(file);
                }
              }} />
            </label>
          </div>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            The backend uses this SQL to provision the exam dataset and generate answer keys for every question. Multi-statement scripts are allowed, and final INSERT/UPDATE/DELETE statements can omit RETURNING because the backend adds it automatically.
          </p>
          <textarea className="form-input" value={seedSql} onChange={(event) => setSeedSql(event.target.value)} style={{ width: '100%', minHeight: '220px', marginTop: '14px', fontFamily: 'monospace' }} disabled={Boolean(readOnly)} />
        </div>

        <div className="builder-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="students-card-title">Questions</h2>
            <button className="btn btn-primary btn-sm" onClick={addQuestion} disabled={Boolean(readOnly) || !activeExamId}>
              Add Question
            </button>
          </div>

          {!activeExamId ? (
            <div style={{ color: '#666', fontSize: '13px' }}>
              Save the draft first. Question answer keys are generated by the backend against the saved exam dataset, so questions are attached after the draft exists.
            </div>
          ) : questions.length === 0 ? (
            <div style={{ color: '#666', fontSize: '13px' }}>
              No questions have been added yet. Add at least one question before publishing this exam.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {questions.map((question, index) => (
                <div key={question.localId} style={{ border: '1px solid #e8e8ee', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <strong>Question {index + 1}</strong>
                    <button className="btn btn-secondary btn-sm" onClick={() => removeQuestion(question.localId)} disabled={Boolean(readOnly)}>
                      Remove
                    </button>
                  </div>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <textarea className="form-input" value={question.prompt} onChange={(event) => updateQuestion(question.localId, { prompt: event.target.value })} placeholder="Question prompt" style={{ minHeight: '90px' }} disabled={Boolean(readOnly)} />
                    <textarea className="form-input" value={question.referenceQuery} onChange={(event) => updateQuestion(question.localId, { referenceQuery: event.target.value })} placeholder="Reference SQL query" style={{ minHeight: '110px', fontFamily: 'monospace' }} disabled={Boolean(readOnly)} />
                    <div className="exam-builder-question-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 160px) minmax(0, 1fr) minmax(0, 1fr)', gap: '12px' }}>
                      <input className="form-input" type="number" min={1} value={question.marks} onChange={(event) => updateQuestion(question.localId, { marks: Number(event.target.value) || 1 })} disabled={Boolean(readOnly)} />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" checked={question.orderSensitive} onChange={(event) => updateQuestion(question.localId, { orderSensitive: event.target.checked })} disabled={Boolean(readOnly)} />
                        Order sensitive
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" checked={question.partialMarks} onChange={(event) => updateQuestion(question.localId, { partialMarks: event.target.checked })} disabled={Boolean(readOnly)} />
                        Partial marks
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamBuilder;
