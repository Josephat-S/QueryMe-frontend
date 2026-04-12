import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseApi, examApi, resultApi, userApi, type Exam, type PlatformUser, type TeacherResultRow } from '../../api';
import { extractErrorMessage } from '../../utils/errorUtils';
import { getCourseName, getPlatformUserRole, withPlatformUserRole } from '../../utils/queryme';

const AdminHome: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [recentRows, setRecentRows] = useState<TeacherResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadOverview = async () => {
      setLoading(true);
      setError(null);

      try {
        const [admins, teachers, students, guests, courses] = await Promise.all([
          userApi.getAdmins(controller.signal).catch(() => [] as PlatformUser[]),
          userApi.getTeachers(controller.signal).catch(() => [] as PlatformUser[]),
          userApi.getStudents(controller.signal).catch(() => [] as PlatformUser[]),
          userApi.getGuests(controller.signal).catch(() => [] as PlatformUser[]),
          courseApi.getCourses(controller.signal),
        ]);

        const examLists = await Promise.all(
          courses.map((course) => examApi.getExamsByCourse(String(course.id), controller.signal).catch(() => [] as Exam[])),
        );

        const allExams = examLists.flat();
        const dashboards = await Promise.all(
          allExams.map((exam) => resultApi.getExamDashboard(String(exam.id), controller.signal).catch(() => [] as TeacherResultRow[])),
        );

        if (!controller.signal.aborted) {
          setUsers([
            ...withPlatformUserRole(admins, 'ADMIN'),
            ...withPlatformUserRole(teachers, 'TEACHER'),
            ...withPlatformUserRole(students, 'STUDENT'),
            ...withPlatformUserRole(guests, 'GUEST'),
          ]);
          setExams(allExams);
          setRecentRows(
            dashboards
              .flat()
              .sort((left, right) => new Date(right.submittedAt || 0).getTime() - new Date(left.submittedAt || 0).getTime())
              .slice(0, 6),
          );
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(extractErrorMessage(err, 'Failed to load the admin overview.'));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadOverview();
    return () => controller.abort();
  }, []);

  const roleCounts = useMemo(() => ({
    students: users.filter((user) => getPlatformUserRole(user) === 'STUDENT').length,
    teachers: users.filter((user) => getPlatformUserRole(user) === 'TEACHER').length,
    admins: users.filter((user) => getPlatformUserRole(user) === 'ADMIN').length,
    guests: users.filter((user) => getPlatformUserRole(user) === 'GUEST').length,
  }), [users]);

  if (loading) {
    return <div style={{ padding: '24px' }}>Loading admin dashboard...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Admin Dashboard</h1>
      </div>

      {error && <div style={{ marginBottom: '16px', color: '#e53e3e' }}>{error}</div>}

      <div className="stat-grid" style={{ marginBottom: '28px' }}>
        <div className="stat-card"><div className="stat-card-value">{users.length}</div><div className="stat-card-label">Total Users</div></div>
        <div className="stat-card"><div className="stat-card-value">{exams.length}</div><div className="stat-card-label">Total Exams</div></div>
        <div className="stat-card"><div className="stat-card-value">{exams.filter((exam) => String(exam.status || '').toUpperCase() === 'PUBLISHED').length}</div><div className="stat-card-label">Published Exams</div></div>
        <div className="stat-card"><div className="stat-card-value">{recentRows.length}</div><div className="stat-card-label">Recent Result Rows</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px' }}>
        <div className="content-card">
          <div className="content-card-header">
            <h2>User Distribution</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/users')}>Manage Users</button>
          </div>
          <div className="content-card-body" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Students</td><td>{roleCounts.students}</td></tr>
                <tr><td>Teachers</td><td>{roleCounts.teachers}</td></tr>
                <tr><td>Admins</td><td>{roleCounts.admins}</td></tr>
                <tr><td>Guests</td><td>{roleCounts.guests}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="content-card">
          <div className="content-card-header">
            <h2>Recent Exam Activity</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/reports')}>View Reports</button>
          </div>
          <div className="content-card-body" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Question</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {recentRows.map((row, index) => (
                  <tr key={`${row.sessionId}-${row.questionId}-${index}`}>
                    <td>{row.studentName || row.studentId}</td>
                    <td>{row.questionPrompt || row.questionId}</td>
                    <td>{row.score ?? 0}/{row.maxScore ?? 0}</td>
                  </tr>
                ))}
                {recentRows.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
                      No recent result activity was returned yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="content-card" style={{ gridColumn: '1 / -1' }}>
          <div className="content-card-header">
            <h2>Course Exam Coverage</h2>
          </div>
          <div className="content-card-body" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Exam</th>
                  <th>Course</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={String(exam.id)}>
                    <td>{exam.title}</td>
                    <td>{getCourseName(exam.course, exam.courseId)}</td>
                    <td>{String(exam.status || 'N/A')}</td>
                  </tr>
                ))}
                {exams.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
                      No exams were returned from the course catalog.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHome;
