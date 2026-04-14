import React, { useEffect, useMemo, useState } from 'react';
import { courseApi, examApi, sessionApi, userApi, type CourseEnrollment, type Exam, type PlatformUser, type Session } from '../../api';
import { useAuth } from '../../contexts';
import { extractErrorMessage } from '../../utils/errorUtils';
import { filterCoursesByTeacher, isSessionComplete } from '../../utils/queryme';
import './TeacherPages.css';

type SessionStatus = 'in_progress' | 'submitted' | 'expired';

interface SessionRow {
  id: string;
  studentName: string;
  studentEmail: string;
  startedAt: string;
  submittedAt: string;
  expiresAt: string;
  sandboxSchema: string;
  status: SessionStatus;
}

interface StudentProfile {
  name: string;
  email: string;
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

const getStudentPrimaryId = (student?: Partial<PlatformUser> | null): string => {
  if (!student) {
    return '';
  }

  const record = asRecord(student);
  const value = getRecordValue(record, ['id', 'studentId', 'student_id']);
  return value !== undefined ? String(value) : '';
};

const getStudentUserId = (student?: Partial<PlatformUser> | null): string => {
  if (!student) {
    return '';
  }

  const record = asRecord(student);
  const nestedUserRecord = asRecord(record.user);
  const value = getRecordValue(record, ['userId', 'user_id'])
    ?? getRecordValue(nestedUserRecord, ['id', 'userId', 'user_id']);

  return value !== undefined ? String(value) : '';
};

const extractStudentIdFromSandboxSchema = (schema?: string | null): string => {
  if (!schema || typeof schema !== 'string') {
    return '';
  }

  const marker = '_student_';
  const markerIndex = schema.lastIndexOf(marker);
  if (markerIndex < 0) {
    return '';
  }

  const token = schema.slice(markerIndex + marker.length).trim();
  return token;
};

const getEnrollmentStudentId = (enrollment: CourseEnrollment): string => {
  const enrollmentRecord = asRecord(enrollment);
  const studentRecord = asRecord(enrollmentRecord.student);
  const value = getRecordValue(enrollmentRecord, ['studentId', 'student_id'])
    ?? getRecordValue(studentRecord, ['id', 'studentId', 'student_id']);

  return value !== undefined ? String(value) : '';
};

const getEnrollmentStudentUserId = (enrollment: CourseEnrollment): string => {
  const enrollmentRecord = asRecord(enrollment);
  const studentRecord = asRecord(enrollmentRecord.student);
  const studentUserRecord = asRecord(studentRecord.user);
  const value = getRecordValue(enrollmentRecord, ['studentUserId', 'student_user_id', 'userId', 'user_id'])
    ?? getRecordValue(studentRecord, ['userId', 'user_id'])
    ?? getRecordValue(studentUserRecord, ['id', 'userId', 'user_id']);

  return value !== undefined ? String(value) : '';
};

const getEnrollmentStudentName = (enrollment: CourseEnrollment): string => {
  const enrollmentRecord = asRecord(enrollment);
  const studentRecord = asRecord(enrollmentRecord.student);
  const studentUserRecord = asRecord(studentRecord.user);
  const value = getRecordValue(enrollmentRecord, ['studentName', 'student_name'])
    ?? getRecordValue(studentRecord, ['name', 'fullName', 'full_name'])
    ?? getRecordValue(studentUserRecord, ['name', 'fullName', 'full_name']);

  return typeof value === 'string' ? value.trim() : '';
};

const getEnrollmentStudentEmail = (enrollment: CourseEnrollment): string => {
  const enrollmentRecord = asRecord(enrollment);
  const studentRecord = asRecord(enrollmentRecord.student);
  const studentUserRecord = asRecord(studentRecord.user);
  const value = getRecordValue(enrollmentRecord, ['studentEmail', 'student_email', 'email'])
    ?? getRecordValue(studentRecord, ['email'])
    ?? getRecordValue(studentUserRecord, ['email']);

  return typeof value === 'string' ? value.trim() : '';
};

const buildEnrollmentProfiles = (enrollments: CourseEnrollment[]): Record<string, StudentProfile> => {
  const profiles: Record<string, StudentProfile> = {};

  enrollments.forEach((enrollment) => {
    const studentId = getEnrollmentStudentId(enrollment);
    const studentUserId = getEnrollmentStudentUserId(enrollment);
    const name = getEnrollmentStudentName(enrollment);
    const email = getEnrollmentStudentEmail(enrollment);

    if ((!studentId && !studentUserId) || !name) {
      return;
    }

    const profile: StudentProfile = {
      name,
      email: email || 'No email',
    };

    if (studentId) {
      profiles[studentId] = profile;
    }

    if (studentUserId) {
      profiles[studentUserId] = profile;
    }
  });

  return profiles;
};

const getStudentName = (student?: Partial<PlatformUser> | null): string => {
  if (!student) {
    return '';
  }

  if (typeof student.name === 'string' && student.name.trim()) {
    return student.name.trim();
  }

  if (typeof student.fullName === 'string' && student.fullName.trim()) {
    return student.fullName.trim();
  }

  const record = asRecord(student);
  const nestedUserRecord = asRecord(record.user);
  const value = getRecordValue(record, ['full_name'])
    ?? getRecordValue(nestedUserRecord, ['name', 'fullName', 'full_name']);

  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return '';
};

const getStudentEmail = (student?: Partial<PlatformUser> | null): string => {
  if (!student) {
    return '';
  }

  if (typeof student.email === 'string' && student.email.trim()) {
    return student.email.trim();
  }

  const record = asRecord(student);
  const nestedUserRecord = asRecord(record.user);
  const value = getRecordValue(record, ['studentEmail', 'student_email'])
    ?? getRecordValue(nestedUserRecord, ['email']);

  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return '';
};

const getSessionLinkedStudent = (session: Session): Partial<PlatformUser> | null => {
  const record = session as Record<string, unknown>;
  const value = record.student;

  if (value && typeof value === 'object') {
    return value as Partial<PlatformUser>;
  }

  return null;
};

const ExamSessionsMonitor: React.FC = () => {
  const { user } = useAuth();
  const [examOptions, setExamOptions] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [studentsById, setStudentsById] = useState<Record<string, PlatformUser>>({});
  const [enrollmentProfilesById, setEnrollmentProfilesById] = useState<Record<string, StudentProfile>>({});
  const [loading, setLoading] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const mapSessionsToRows = (
    sessions: Session[],
    studentsLookup: Record<string, PlatformUser>,
    enrollmentProfiles: Record<string, StudentProfile>,
  ): SessionRow[] => (
    sessions.map((session) => {
      const sessionStudentId = String(session.studentId || '');
      const schemaStudentId = extractStudentIdFromSandboxSchema(String(session.sandboxSchema || ''));
      const lookupKey = sessionStudentId || schemaStudentId;
      const enrollmentProfile = enrollmentProfiles[lookupKey];
      const resolvedStudent = studentsLookup[lookupKey];
      const linkedStudent = getSessionLinkedStudent(session);
      const studentName = enrollmentProfile?.name || getStudentName(resolvedStudent) || getStudentName(linkedStudent) || 'Student';
      const studentEmail = enrollmentProfile?.email || getStudentEmail(resolvedStudent) || getStudentEmail(linkedStudent) || 'No email';

      return {
        id: String(session.id),
        studentName,
        studentEmail,
        startedAt: session.startedAt || '',
        submittedAt: session.submittedAt || '',
        expiresAt: session.expiresAt || '',
        sandboxSchema: String(session.sandboxSchema || 'N/A'),
        status: getSessionStatus(session),
      };
    })
  );

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadOptions = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [courses, students] = await Promise.all([
          courseApi.getCourses(controller.signal),
          userApi.getStudents(controller.signal),
        ]);

        const accessibleCourses = filterCoursesByTeacher(courses, user.id);
        const examLists = await Promise.all(
          accessibleCourses.map((course) => examApi.getExamsByCourse(String(course.id), controller.signal).catch(() => [] as Exam[])),
        );

        if (!controller.signal.aborted) {
          const byId = students.reduce<Record<string, PlatformUser>>((acc, student) => {
            const primaryId = getStudentPrimaryId(student);
            const userId = getStudentUserId(student);

            if (primaryId) {
              acc[primaryId] = student;
            }

            if (userId) {
              acc[userId] = student;
            }

            return acc;
          }, {});
          const exams = examLists.flat();
          setStudentsById(byId);
          setExamOptions(exams);
          if (exams[0]) {
            setSelectedExamId((previous) => previous || String(exams[0].id));
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(extractErrorMessage(err, 'Failed to load available exams or students.'));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadOptions();
    return () => controller.abort();
  }, [user]);

  useEffect(() => {
    if (!selectedExamId) {
      setRows([]);
      return;
    }

    const controller = new AbortController();
    setLoadingSessions(true);
    setError(null);

    void (async () => {
      const selectedExam = examOptions.find((exam) => String(exam.id) === selectedExamId);
      const selectedCourseId = selectedExam?.courseId ? String(selectedExam.courseId) : '';
      const enrollmentProfiles = selectedCourseId
        ? await courseApi.getEnrollmentsByCourse(selectedCourseId, controller.signal)
          .then((enrollments) => buildEnrollmentProfiles(enrollments))
          .catch(() => ({} as Record<string, StudentProfile>))
        : {};

      if (!controller.signal.aborted) {
        setEnrollmentProfilesById(enrollmentProfiles);
      }

      const sessions = await sessionApi.getSessionsByExam(selectedExamId, controller.signal);

      if (controller.signal.aborted) {
        return;
      }

      const nextRows = mapSessionsToRows(sessions, studentsById, enrollmentProfiles);
      if (!controller.signal.aborted) {
        setRows(nextRows);
      }
    })()
      .catch((err) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(extractErrorMessage(err, 'Failed to load exam sessions.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingSessions(false);
        }
      });

    return () => controller.abort();
  }, [selectedExamId, studentsById, examOptions]);

  const counts = useMemo(() => ({
    all: rows.length,
    in_progress: rows.filter((row) => row.status === 'in_progress').length,
    submitted: rows.filter((row) => row.status === 'submitted').length,
    expired: rows.filter((row) => row.status === 'expired').length,
  }), [rows]);

  const forceSubmit = async (sessionId: string) => {
    setError(null);

    try {
      await sessionApi.submitSession(sessionId);
      const refreshed = await sessionApi.getSessionsByExam(selectedExamId);
      const nextRows = mapSessionsToRows(refreshed, studentsById, enrollmentProfilesById);
      setRows(nextRows);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to submit that active session.'));
    }
  };

  if (loading) {
    return <div className="teacher-page" style={{ padding: '24px' }}>Loading sessions monitor...</div>;
  }

  return (
    <div className="teacher-page" style={{ overflow: 'hidden' }}>
      <div className="builder-header">
        <div>
          <h1 className="builder-title" style={{ fontSize: '18px' }}>Exam Sessions Monitor</h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#666' }}>
            Track active, submitted, and expired sessions returned by the session module.
          </p>
        </div>
      </div>

      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="sess-stat-bar">
          <span className="sess-stat-pill active"><span className="sess-stat-num sess-stat-all">{counts.all}</span><span className="sess-stat-label">All Sessions</span></span>
          <span className="sess-stat-pill"><span className="sess-stat-num sess-stat-in_progress">{counts.in_progress}</span><span className="sess-stat-label">In Progress</span></span>
          <span className="sess-stat-pill"><span className="sess-stat-num sess-stat-submitted">{counts.submitted}</span><span className="sess-stat-label">Submitted</span></span>
          <span className="sess-stat-pill"><span className="sess-stat-num sess-stat-expired">{counts.expired}</span><span className="sess-stat-label">Expired</span></span>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select className="form-input" value={selectedExamId} onChange={(event) => setSelectedExamId(event.target.value)}>
            <option value="">Select exam</option>
            {examOptions.map((exam) => (
              <option key={String(exam.id)} value={String(exam.id)}>
                {exam.title}
              </option>
            ))}
          </select>
        </div>

        {error && <div style={{ color: '#e53e3e' }}>{error}</div>}

        <div className="builder-card" style={{ padding: 0, overflow: 'hidden' }}>
          {loadingSessions ? (
            <div style={{ padding: '24px' }}>Loading sessions...</div>
          ) : rows.length === 0 ? (
            <div className="students-empty" style={{ padding: '60px 20px' }}>
              <p>Select an exam to inspect its session lifecycle.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="sess-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Started</th>
                    <th>Submitted</th>
                    <th>Time Remaining</th>
                    <th>Sandbox</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="sess-student-cell">
                          <span className="sess-avatar">{row.studentName[0] || '?'}</span>
                          <div>
                            <div className="sess-student-name">{row.studentName}</div>
                            <div className="sess-student-email">{row.studentEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`sess-status-chip ${row.status === 'in_progress' ? 'sess-status-active' : row.status === 'submitted' ? 'sess-status-submitted' : 'sess-status-expired'}`}>
                          {row.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>{row.startedAt ? new Date(row.startedAt).toLocaleString() : 'N/A'}</td>
                      <td>{row.submittedAt ? new Date(row.submittedAt).toLocaleString() : '—'}</td>
                      <td>
                        {row.status === 'in_progress' && row.expiresAt
                          ? formatRemaining(Math.max(0, new Date(row.expiresAt).getTime() - now))
                          : row.status === 'expired'
                            ? 'Expired'
                            : '—'}
                      </td>
                      <td><span className="sess-sandbox-badge">{row.sandboxSchema}</span></td>
                      <td>
                        {row.status === 'in_progress' && (
                          <button className="sess-force-btn" onClick={() => void forceSubmit(row.id)}>
                            Force Submit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const getSessionStatus = (session: Session): SessionStatus => {
  if (session.isExpired || (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now() && !isSessionComplete(session))) {
    return 'expired';
  }
  if (isSessionComplete(session)) {
    return 'submitted';
  }
  return 'in_progress';
};

const formatRemaining = (remainingMs: number): string => {
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
};

export default ExamSessionsMonitor;
