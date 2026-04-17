import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseApi, examApi, userApi, type Course, type Exam, type PlatformUser } from '../../api';
import { PageSkeleton } from '../../components/PageSkeleton';
import { extractErrorMessage } from '../../utils/errorUtils';
import { getPlatformUserRole, getUserDisplayName, normalizeExamStatus, withPlatformUserRole } from '../../utils/queryme';

interface AdminActivityRow {
  id: string;
  kind: 'PUBLISHED' | 'CLOSED';
  examTitle: string;
  courseName: string;
  actorName: string;
  occurredAt: string;
}

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' ? value as Record<string, unknown> : {}
);

const getRecordValue = (record: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
};

const getTextValue = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return undefined;
};

const getCourseTeacherName = (course: Course | undefined, usersById: Map<string, PlatformUser>): string => {
  if (!course) {
    return 'Teacher';
  }

  const courseRecord = asRecord(course);
  const nestedTeacher = asRecord(courseRecord.teacher);
  const teacherFromUsers = course.teacherId ? usersById.get(String(course.teacherId)) : undefined;

  const candidate =
    getTextValue(course.teacherName)
    || getTextValue(getRecordValue(courseRecord, ['teacherName', 'teacher_name', 'teacherFullName', 'teacher_full_name']))
    || getTextValue(getRecordValue(nestedTeacher, ['name', 'fullName', 'full_name']))
    || getTextValue(getRecordValue(nestedTeacher, ['teacherName', 'teacher_name']))
    || getUserDisplayName(teacherFromUsers)
    || getTextValue(getRecordValue(courseRecord, ['teacherEmail', 'teacher_email']));

  return candidate || 'Teacher';
};

const AdminHome: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingExams, setLoadingExams] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadOverview = async () => {
      setLoading(true);
      setError(null);

      try {
        const [admins, teachers, students, guests, initialCourses] = await Promise.all([
          userApi.getAdmins({ page: 1, pageSize: 5, signal: controller.signal }).catch(() => [] as PlatformUser[]),
          userApi.getTeachers({ page: 1, pageSize: 5, signal: controller.signal }).catch(() => [] as PlatformUser[]),
          userApi.getStudents({ page: 1, pageSize: 5, signal: controller.signal }).catch(() => [] as PlatformUser[]),
          userApi.getGuests({ page: 1, pageSize: 5, signal: controller.signal }).catch(() => [] as PlatformUser[]),
          courseApi.getCourses({ page: 1, pageSize: 5, signal: controller.signal }),
        ]);

        if (!controller.signal.aborted) {
          setUsers([
            ...withPlatformUserRole(admins, 'ADMIN'),
            ...withPlatformUserRole(teachers, 'TEACHER'),
            ...withPlatformUserRole(students, 'STUDENT'),
            ...withPlatformUserRole(guests, 'GUEST'),
          ]);
          setCourses(initialCourses);
          setLoading(false); // Show overview content immediately
        }

        // Now fetch exams for the first 3 courses in the background
        setLoadingExams(initialCourses.length > 0);
        const coursesToFetchExams = initialCourses.slice(0, 3);
        const examLists = await Promise.all(
          coursesToFetchExams.map((course) => examApi.getExamsByCourse(String(course.id), { signal: controller.signal }).catch(() => [] as Exam[])),
        );

        if (!controller.signal.aborted) {
          setExams(examLists.flat());
          setLoadingExams(false);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(extractErrorMessage(err, 'Failed to load the admin overview.'));
          setLoading(false);
          setLoadingExams(false);
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

  const recentActivities = useMemo<AdminActivityRow[]>(() => {
    const items: AdminActivityRow[] = [];
    const courseById = new Map(courses.map((course) => [String(course.id), course]));
    const userById = new Map(users.map((user) => [String(user.id), user]));

    exams.forEach((exam) => {
      const course = courseById.get(String(exam.courseId));
      const courseName = getTextValue(course?.name) || getTextValue(asRecord(exam.course).name) || 'Unknown course';
      const actorName = getCourseTeacherName(course, userById)
        || getUserDisplayName(exam.teacher)
        || 'Teacher';
      const publishedStatus = normalizeExamStatus(exam.status);

      if (publishedStatus === 'PUBLISHED' || publishedStatus === 'ACTIVE') {
        items.push({
          id: `publish-${String(exam.id)}`,
          kind: 'PUBLISHED',
          examTitle: exam.title,
          courseName,
          actorName,
          occurredAt: exam.publishedAt || exam.updatedAt || exam.createdAt || '',
        });
      }

      if (publishedStatus === 'CLOSED') {
        items.push({
          id: `close-${String(exam.id)}`,
          kind: 'CLOSED',
          examTitle: exam.title,
          courseName,
          actorName,
          occurredAt: exam.updatedAt || exam.endTime || exam.publishedAt || '',
        });
      }
    });

    return items
      .filter((item) => item.occurredAt)
      .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
      .slice(0, 6);
  }, [courses, exams, users]);

  if (loading) {
    return <PageSkeleton title="Admin Dashboard" rows={5} />;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Admin Dashboard</h1>
      </div>

      {error && <div style={{ marginBottom: '16px', color: '#e53e3e' }}>{error}</div>}

      <div className="stat-grid" style={{ marginBottom: '28px' }}>
        <div className="stat-card"><div className="stat-card-value">{users.length}</div><div className="stat-card-label">Total Users</div></div>
        <div className="stat-card"><div className="stat-card-value">{loadingExams ? '...' : exams.length}</div><div className="stat-card-label">Total Exams</div></div>
        <div className="stat-card"><div className="stat-card-value">{loadingExams ? '...' : exams.filter((exam) => String(exam.status || '').toUpperCase() === 'PUBLISHED').length}</div><div className="stat-card-label">Published Exams</div></div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="content-card">
          <div className="content-card-header">
            <h2>User Distribution</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/users')}>Manage Users</button>
          </div>
          <div className="content-card-body hidden md:block" style={{ padding: 0 }}>
            <table className="data-table min-w-80">
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
          <div className="space-y-3 p-4 md:hidden">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Students</div><div className="mt-1 text-2xl font-bold text-slate-900">{roleCounts.students}</div></div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Teachers</div><div className="mt-1 text-2xl font-bold text-slate-900">{roleCounts.teachers}</div></div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admins</div><div className="mt-1 text-2xl font-bold text-slate-900">{roleCounts.admins}</div></div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Guests</div><div className="mt-1 text-2xl font-bold text-slate-900">{roleCounts.guests}</div></div>
          </div>
        </div>

        <div className="content-card">
          <div className="content-card-header">
            <h2>Recent Activities</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/reports')}>View Reports</button>
          </div>
          <div className="content-card-body hidden md:block" style={{ padding: 0 }}>
            <table className="data-table min-w-110">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Exam</th>
                  <th>Course</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {loadingExams ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
                      Loading recent activities...
                    </td>
                  </tr>
                ) : (
                  <>
                    {recentActivities.map((activity) => (
                      <tr key={activity.id}>
                        <td>
                          <span className={`badge ${activity.kind === 'CLOSED' ? 'badge-red' : 'badge-green'}`}>
                            {activity.kind === 'CLOSED' ? 'Closed' : 'Published'}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{activity.examTitle}</div>
                          <div style={{ fontSize: '12px', color: '#888' }}>By {activity.actorName}</div>
                        </td>
                        <td>{activity.courseName}</td>
                        <td>{new Date(activity.occurredAt).toLocaleString()}</td>
                      </tr>
                    ))}
                    {recentActivities.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
                          No recent exam publish or close activity was returned yet.
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 p-4 md:hidden">
            {loadingExams ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
                Loading recent activities...
              </div>
            ) : (
              <>
                {recentActivities.map((activity) => (
                  <div key={`mobile-${activity.id}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <span className={`badge ${activity.kind === 'CLOSED' ? 'badge-red' : 'badge-green'}`}>
                      {activity.kind === 'CLOSED' ? 'Closed' : 'Published'}
                    </span>
                    <div className="mt-2 font-semibold text-slate-800">{activity.examTitle}</div>
                    <div className="mt-1 text-xs text-slate-500">By {activity.actorName}</div>
                    <div className="mt-1 text-xs text-slate-500">{activity.courseName}</div>
                    <div className="mt-2 text-xs text-slate-500">{new Date(activity.occurredAt).toLocaleString()}</div>
                  </div>
                ))}
                {recentActivities.length === 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
                    No recent exam publish or close activity was returned yet.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHome;
