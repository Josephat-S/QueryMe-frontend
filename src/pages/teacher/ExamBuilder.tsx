import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { courseApi, examApi, questionApi, type Course, type Question, type VisibilityMode } from '../../api';
import { useAuth } from '../../contexts';
import { useToast } from '../../components/ToastProvider';
import { extractErrorMessage } from '../../utils/errorUtils';
import { filterCoursesByTeacher, normalizeExamStatus } from '../../utils/queryme';
import './TeacherPages.css';

interface QuestionDraft {
  localId: string;
  questionId?: string;
  prompt: string;
  referenceQuery: string;
  marks: number;
  orderSensitive: boolean;
  partialMarks: boolean;
}

const DEFAULT_VISIBILITY: VisibilityMode = 'END_OF_EXAM';

const createQuestionDraft = (question?: Question): QuestionDraft => ({
  localId: question ? String(question.id) : crypto.randomUUID(),
  questionId: question ? String(question.id) : undefined,
  prompt: question?.prompt || '',
  referenceQuery: String(question?.referenceQuery || ''),
  marks: question?.marks || 10,
  orderSensitive: Boolean(question?.orderSensitive),
  partialMarks: Boolean(question?.partialMarks),
});

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
  const [questions, setQuestions] = useState<QuestionDraft[]>([createQuestionDraft()]);
  const [examStatus, setExamStatus] = useState('DRAFT');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readOnly = useMemo(() => Boolean(examId) && examStatus !== 'DRAFT', [examId, examStatus]);
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
            setTitle(exam.title);
            setCourseId(String(exam.courseId));
            setDescription(exam.description || '');
            setMaxAttempts(exam.maxAttempts ?? 1);
            setTimeLimitMins(exam.timeLimitMins ?? exam.timeLimit ?? 60);
            setVisibilityMode(String(exam.visibilityMode || DEFAULT_VISIBILITY));
            setSeedSql(String(exam.seedSql || ''));
            setExamStatus(normalizeExamStatus(exam.status) || 'DRAFT');
            setQuestions(existingQuestions.length ? existingQuestions.map((question) => createQuestionDraft(question)) : [createQuestionDraft()]);
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

  const validateForm = (): string | null => {
    if (!title.trim()) {
      return 'Exam title is required.';
    }
    if (!courseId) {
      return 'Select a course before saving.';
    }
    if (!seedSql.trim()) {
      return 'Seed SQL is required before the backend can validate question answers.';
    }
    for (const [index, question] of questions.entries()) {
      if (!question.prompt.trim()) {
        return `Question ${index + 1} is missing a prompt.`;
      }
      if (!question.referenceQuery.trim()) {
        return `Question ${index + 1} is missing a reference query.`;
      }
    }
    return null;
  };

  const persistExam = async (publishAfterSave: boolean) => {
    if (readOnly) {
      showToast('warning', 'Exam locked', 'Only draft exams can be edited from this builder.');
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const examPayload = {
        courseId,
        title: title.trim(),
        description: description.trim(),
        maxAttempts,
        timeLimitMins,
        visibilityMode,
        seedSql,
      };

      const savedExam = examId
        ? await examApi.updateExam(examId, examPayload)
        : await examApi.createExam(examPayload);

      const persistedExamId = String(savedExam.id);
      const savedQuestions: Question[] = [];

      for (const [index, question] of questions.entries()) {
        const payload = {
          prompt: question.prompt.trim(),
          referenceQuery: question.referenceQuery.trim(),
          marks: question.marks,
          orderIndex: index + 1,
          orderSensitive: question.orderSensitive,
          partialMarks: question.partialMarks,
        };

        const savedQuestion = question.questionId
          ? await questionApi.updateQuestion(persistedExamId, question.questionId, payload)
          : await questionApi.createQuestion(persistedExamId, payload);

        savedQuestions.push(savedQuestion);
      }

      if (publishAfterSave) {
        await examApi.publishExam(persistedExamId);
      }

      setQuestions(savedQuestions.map(createQuestionDraft));
      showToast('success', publishAfterSave ? 'Exam published' : 'Draft saved', publishAfterSave ? 'The exam and its questions were published successfully.' : 'Your draft exam has been saved.');
      navigate('/teacher/exams');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to save the exam.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="teacher-page" style={{ padding: '24px' }}>Loading exam builder...</div>;
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
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/teacher/exams')}>Cancel</button>
          <button className="btn btn-secondary" onClick={() => void persistExam(false)} disabled={saving || readOnly}>
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button className="btn btn-primary" onClick={() => void persistExam(true)} disabled={saving || readOnly}>
            {saving ? 'Publishing...' : 'Publish Exam'}
          </button>
        </div>
      </div>

      <div style={{ padding: '24px', display: 'grid', gap: '20px' }}>
        {error && <div style={{ color: '#e53e3e', fontSize: '13px' }}>{error}</div>}
        {readOnly && (
          <div style={{ color: '#dd6b20', fontSize: '13px' }}>
            This exam is no longer in draft status. The backend only allows updates to draft exams, so the form is read-only.
          </div>
        )}

        <div className="builder-card">
          <h2 className="students-card-title">Exam Details</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
            <input className="form-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Exam title" disabled={Boolean(readOnly)} />
            <select className="form-input" value={courseId} onChange={(event) => setCourseId(event.target.value)} disabled={Boolean(readOnly)}>
              <option value="">Select course</option>
              {courses.map((course) => (
                <option key={String(course.id)} value={String(course.id)}>{course.name}</option>
              ))}
            </select>
            <textarea className="form-input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Exam description" style={{ gridColumn: '1 / -1', minHeight: '96px' }} disabled={Boolean(readOnly)} />
            <input className="form-input" type="number" min={1} value={maxAttempts} onChange={(event) => setMaxAttempts(Number(event.target.value) || 1)} disabled={Boolean(readOnly)} />
            <input className="form-input" type="number" min={1} value={timeLimitMins} onChange={(event) => setTimeLimitMins(Number(event.target.value) || 60)} disabled={Boolean(readOnly)} />
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            The backend uses this SQL to provision the exam dataset and generate answer keys for every question.
          </p>
          <textarea className="form-input" value={seedSql} onChange={(event) => setSeedSql(event.target.value)} style={{ width: '100%', minHeight: '220px', marginTop: '14px', fontFamily: 'monospace' }} disabled={Boolean(readOnly)} />
        </div>

        <div className="builder-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="students-card-title">Questions</h2>
            <button className="btn btn-primary btn-sm" onClick={addQuestion} disabled={Boolean(readOnly)}>
              Add Question
            </button>
          </div>

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
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr', gap: '12px' }}>
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
        </div>
      </div>
    </div>
  );
};

export default ExamBuilder;
