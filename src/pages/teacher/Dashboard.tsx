import React, { useEffect, useMemo, useState } from 'react';
import { Link, Routes, Route } from 'react-router-dom';
import DashboardLayout from '../../layout/DashboardLayout';
import ExamBuilder from './ExamBuilder';
import ResultsDashboard from './ResultsDashboard';
import ExamsList from './ExamsList';
import TeacherProfile from './TeacherProfile';
import ExamSessionsMonitor from './ExamSessionsMonitor';
import CourseEnrollments from './CourseEnrollments';
import TeacherCourses from './TeacherCourses';
import { courseApi, examApi, resultApi, type Exam, type TeacherResultRow } from '../../api';
import { useAuth } from '../../contexts';
import type { NavItem } from '../../layout/DashboardLayout';
import { extractErrorMessage } from '../../utils/errorUtils';
import { filterCoursesByTeacher, getCourseName, normalizeExamStatus } from '../../utils/queryme';
import './TeacherPages.css';

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const ExamIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
  </svg>
);
const CourseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);
const SessionsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const ResultsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const StudentsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const teacherNav: NavItem[] = [
  { label: 'Dashboard', path: '/teacher', icon: <HomeIcon /> },
  { label: 'Courses', path: '/teacher/courses', icon: <CourseIcon /> },
  { label: 'Exams', path: '/teacher/exams', icon: <ExamIcon /> },
  { label: 'Sessions', path: '/teacher/sessions', icon: <SessionsIcon /> },
  { label: 'Results', path: '/teacher/results', icon: <ResultsIcon /> },
  { label: 'Students', path: '/teacher/students', icon: <StudentsIcon /> },
];

const TeacherDashboardHome: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    exams: 0,
    published: 0,
    drafts: 0,
    submissions: 0,
  });
  const [recentSubmissions, setRecentSubmissions] = useState<TeacherResultRow[]>([]);
  const [courseExams, setCourseExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadDashboard = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const courses = await courseApi.getCourses(controller.signal);
        const teacherCourses = filterCoursesByTeacher(courses, user.id);
        const examLists = await Promise.all(
          teacherCourses.map((course) => examApi.getExamsByCourse(String(course.id), controller.signal).catch(() => [] as Exam[])),
        );

        const exams = [...new Map(
          examLists
            .flat()
            .map((exam) => [String(exam.id), exam]),
        ).values()];
        const publishedExams = exams.filter((exam) => normalizeExamStatus(exam.status) === 'PUBLISHED');

        const dashboards = await Promise.all(
          publishedExams.map((exam) => resultApi.getExamDashboard(String(exam.id), controller.signal).catch(() => [] as TeacherResultRow[])),
        );

        const submissionRows = dashboards
          .flat()
          .sort((left, right) => new Date(right.submittedAt || 0).getTime() - new Date(left.submittedAt || 0).getTime())
          .slice(0, 5);

        if (!controller.signal.aborted) {
          setStats({
            exams: exams.length,
            published: publishedExams.length,
            drafts: exams.filter((exam) => normalizeExamStatus(exam.status) === 'DRAFT').length,
            submissions: dashboards.flat().length,
          });
          setRecentSubmissions(submissionRows);
          setCourseExams(exams.slice(0, 6));
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(extractErrorMessage(err, 'Failed to load the teacher dashboard.'));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();
    return () => controller.abort();
  }, [user]);

  const averageScore = useMemo(() => {
    const validRows = recentSubmissions.filter((row) => typeof row.score === 'number' && typeof row.maxScore === 'number' && row.maxScore > 0);
    if (validRows.length === 0) {
      return 0;
    }

    return Math.round(
      validRows.reduce((sum, row) => sum + ((row.score || 0) / (row.maxScore || 1)) * 100, 0) / validRows.length,
    );
  }, [recentSubmissions]);

  if (loading) {
    return <div style={{ padding: '24px' }}>Loading teacher dashboard...</div>;
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <h1>Teacher Dashboard</h1>
        <p>Live overview for your backend-connected exam workspace.</p>
      </div>

      {error && <div style={{ marginBottom: '16px', color: '#e53e3e' }}>{error}</div>}

      <div className="td-quick-actions">
        <Link to="/teacher/courses" className="td-qa-btn td-qa-primary">Create Course</Link>
        <Link to="/teacher/students" className="td-qa-btn td-qa-primary">Register Students</Link>
        <Link to="/teacher/exams/builder" className="td-qa-btn td-qa-primary">Create New Exam</Link>
        <Link to="/teacher/exams" className="td-qa-btn td-qa-secondary">Manage Exams</Link>
        <Link to="/teacher/courses" className="td-qa-btn td-qa-secondary">Manage Courses</Link>
        <Link to="/teacher/sessions" className="td-qa-btn td-qa-secondary">Live Sessions</Link>
        <Link to="/teacher/results" className="td-qa-btn td-qa-secondary">Review Results</Link>
      </div>

      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card"><div className="stat-card-value">{stats.exams}</div><div className="stat-card-label">Total Exams</div></div>
        <div className="stat-card"><div className="stat-card-value">{stats.published}</div><div className="stat-card-label">Published Exams</div></div>
        <div className="stat-card"><div className="stat-card-value">{stats.submissions}</div><div className="stat-card-label">Tracked Submissions</div></div>
        <div className="stat-card"><div className="stat-card-value">{averageScore}%</div><div className="stat-card-label">Recent Average</div></div>
      </div>

      <div className="td-lower-grid">
        <div className="content-card">
          <div className="content-card-header">
            <h2>Recent Submissions</h2>
            <Link to="/teacher/results" className="td-see-all">See all →</Link>
          </div>
          <div>
            {recentSubmissions.map((submission, index) => (
              <div key={`${submission.sessionId}-${submission.questionId}-${index}`} className="td-activity-row">
                <div className="td-activity-avatar">{(submission.studentName || '?')[0]}</div>
                <div className="td-activity-info">
                  <span className="td-activity-name">{submission.studentName || submission.studentId}</span>
                  <span className="td-activity-exam">{submission.questionPrompt || submission.questionId}</span>
                </div>
                <div className="td-activity-meta">
                  <span className="td-activity-score">
                    {submission.score ?? 0}/{submission.maxScore ?? 0}
                  </span>
                  <span className="td-activity-time">
                    {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
            ))}
            {recentSubmissions.length === 0 && (
              <div style={{ padding: '16px 0', color: '#666' }}>Recent graded submissions will appear here.</div>
            )}
          </div>
        </div>

        <div className="content-card">
          <div className="content-card-header">
            <h2>Exams by Course</h2>
            <Link to="/teacher/exams" className="td-see-all">Manage →</Link>
          </div>
          <div style={{ padding: '8px 0' }}>
            {courseExams.map((exam) => (
              <div key={String(exam.id)} className="td-draft-row">
                <div className="td-draft-info">
                  <span className="td-draft-title">{exam.title}</span>
                  <span className="td-draft-course">{getCourseName(exam.course, exam.courseId)}</span>
                </div>
                <div className="td-draft-right">
                  <span className={`td-draft-badge ${normalizeExamStatus(exam.status) === 'PUBLISHED' ? 'td-badge-upcoming' : 'td-badge-draft'}`}>
                    {normalizeExamStatus(exam.status) || 'DRAFT'}
                  </span>
                </div>
              </div>
            ))}
            {courseExams.length === 0 && (
              <div style={{ padding: '16px 0', color: '#666' }}>Create your first course exam to populate this panel.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TeacherDashboard: React.FC = () => (
  <DashboardLayout navItems={teacherNav} portalTitle="Teacher Portal" accentColor="#38a169">
    <Routes>
      <Route path="/" element={<TeacherDashboardHome />} />
      <Route path="/courses" element={<TeacherCourses />} />
      <Route path="/exams" element={<ExamsList />} />
      <Route path="/exams/builder" element={<ExamBuilder />} />
      <Route path="/exams/builder/:examId" element={<ExamBuilder />} />
      <Route path="/sessions" element={<ExamSessionsMonitor />} />
      <Route path="/results" element={<ResultsDashboard />} />
      <Route path="/profile" element={<TeacherProfile />} />
      <Route path="/students" element={<CourseEnrollments />} />
    </Routes>
  </DashboardLayout>
);

export default TeacherDashboard;
