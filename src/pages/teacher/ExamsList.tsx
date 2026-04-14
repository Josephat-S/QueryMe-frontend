import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseApi, examApi, questionApi, type Course, type Exam } from '../../api';
import { useAuth } from '../../contexts';
import { useToast } from '../../components/ToastProvider';
import { extractErrorMessage } from '../../utils/errorUtils';
import { filterCoursesByTeacher, normalizeExamStatus } from '../../utils/queryme';
import './TeacherPages.css';

interface ExamRow {
  id: string;
  title: string;
  course: string;
  status: string;
  questionsCount: number;
  maxAttempts: number;
  visibilityMode: string;
}

const ExamsList: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyExamId, setBusyExamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (signal?: AbortSignal) => {
    if (!user) {
      setExams([]);
      return;
    }

    const allCourses = await courseApi.getCourses(signal);
    const accessibleCourses = filterCoursesByTeacher(allCourses, user.id);

    const examLists = await Promise.all(
      accessibleCourses.map((course) =>
        examApi.getExamsByCourse(String(course.id), signal).catch(() => [] as Exam[]),
      ),
    );

    const uniqueExams = [...new Map(
      examLists
        .flat()
        .map((exam) => [String(exam.id), exam]),
    ).values()];

    const courseNamesById = accessibleCourses.reduce<Record<string, string>>((acc, course) => {
      const id = String(course.id || '');
      const name = course.name?.trim();

      if (id && name) {
        acc[id] = name;
      }

      return acc;
    }, {});

    const questionCounts = await Promise.all(
      uniqueExams.map(async (exam) => {
        const examId = String(exam.id);

        try {
          const questions = await questionApi.getQuestions(examId, signal);
          return [examId, questions.length] as const;
        } catch {
          return [examId, exam.questions?.length ?? 0] as const;
        }
      }),
    );

    const questionCountByExamId = new Map(questionCounts);

    const rows = uniqueExams
      .map((exam) => ({
        id: String(exam.id),
        title: exam.title,
        course: exam.course?.name?.trim() || courseNamesById[String(exam.courseId)] || 'Unknown Course',
        status: normalizeExamStatus(exam.status) || 'DRAFT',
        questionsCount: questionCountByExamId.get(String(exam.id)) ?? 0,
        maxAttempts: exam.maxAttempts ?? 1,
        visibilityMode: String(exam.visibilityMode || 'N/A'),
      }))
      .sort((left, right) => left.title.localeCompare(right.title));

    setCourses(accessibleCourses);
    setExams(rows);
  };

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    void loadData(controller.signal)
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(extractErrorMessage(err, 'Failed to load your exams.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [user]);

  const stats = useMemo(() => ({
    total: exams.length,
    published: exams.filter((exam) => exam.status === 'PUBLISHED').length,
    drafts: exams.filter((exam) => exam.status === 'DRAFT').length,
    closed: exams.filter((exam) => exam.status === 'CLOSED').length,
  }), [exams]);

  const runAction = async (examId: string, action: 'publish' | 'unpublish' | 'close' | 'delete') => {
    setBusyExamId(examId);
    setError(null);

    try {
      if (action === 'publish') {
        await examApi.publishExam(examId);
      } else if (action === 'unpublish') {
        await examApi.unpublishExam(examId);
      } else if (action === 'close') {
        await examApi.closeExam(examId);
      } else {
        await examApi.deleteExam(examId);
      }

      await loadData();
      showToast('success', 'Exam updated', `The exam action "${action}" completed successfully.`);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update the selected exam.'));
    } finally {
      setBusyExamId(null);
    }
  };

  if (loading) {
    return (
      <div className="teacher-page" style={{ padding: '24px', overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading exams...</div>
      </div>
    );
  }

  return (
    <div className="teacher-page" style={{ padding: '24px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="builder-title" style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>Exams</h1>
          <p className="exam-list-desc" style={{ fontSize: '14px', margin: 0 }}>
            Manage exams from the backend course catalog and publish them when ready.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/teacher/exams/builder')}>
          Create New Exam
        </button>
      </div>

      <div className="stat-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card"><div className="stat-card-value">{stats.total}</div><div className="stat-card-label">Total Exams</div></div>
        <div className="stat-card"><div className="stat-card-value">{stats.published}</div><div className="stat-card-label">Published</div></div>
        <div className="stat-card"><div className="stat-card-value">{stats.drafts}</div><div className="stat-card-label">Drafts</div></div>
        <div className="stat-card"><div className="stat-card-value">{courses.length}</div><div className="stat-card-label">Courses</div></div>
      </div>

      {error && (
        <div style={{ marginBottom: '16px', color: '#e53e3e', fontSize: '13px' }}>{error}</div>
      )}

      {exams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          No exams were returned from your accessible courses yet.
        </div>
      ) : (
        <div className="results-table-card" style={{ marginTop: 0 }}>
          <table className="results-table">
            <thead>
              <tr>
                <th>Exam</th>
                <th>Questions</th>
                <th>Max Attempts</th>
                <th>Visibility</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr key={exam.id}>
                  <td>
                    <div className="exam-list-title">{exam.title}</div>
                    <div className="exam-list-course">{exam.course}</div>
                  </td>
                  <td className="exam-list-highlight">{exam.questionsCount}</td>
                  <td>{exam.maxAttempts}</td>
                  <td>{exam.visibilityMode}</td>
                  <td>
                    <span className={`badge ${exam.status === 'PUBLISHED' ? 'badge-green' : exam.status === 'CLOSED' ? 'badge-red' : 'badge-gray'}`}>
                      {exam.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/teacher/exams/builder/${exam.id}`)}>
                        Edit
                      </button>
                      {exam.status === 'DRAFT' && (
                        <button className="btn btn-primary btn-sm" disabled={busyExamId === exam.id} onClick={() => void runAction(exam.id, 'publish')}>
                          Publish
                        </button>
                      )}
                      {exam.status === 'PUBLISHED' && (
                        <>
                          <button className="btn btn-secondary btn-sm" disabled={busyExamId === exam.id} onClick={() => void runAction(exam.id, 'unpublish')}>
                            Unpublish
                          </button>
                          <button className="btn btn-secondary btn-sm" disabled={busyExamId === exam.id} onClick={() => void runAction(exam.id, 'close')}>
                            Close
                          </button>
                        </>
                      )}
                      {exam.status === 'DRAFT' && (
                        <button className="btn btn-secondary btn-sm" disabled={busyExamId === exam.id} onClick={() => void runAction(exam.id, 'delete')}>
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ExamsList;
