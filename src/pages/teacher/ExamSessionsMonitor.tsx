/* eslint-disable react-x/set-state-in-effect */
import React, { useEffect, useMemo, useState } from 'react';
import { courseApi, examApi, sessionApi, userApi, type CourseEnrollment, type Exam, type PlatformUser, type Session } from '../../api';
import { InlineSkeleton, PageSkeleton } from '../../components/PageSkeleton';
import { useAuth } from '../../contexts';
import { extractErrorMessage } from '../../utils/errorUtils';
import { isSessionComplete } from '../../utils/queryme';

type SessionStatus = 'in_progress' | 'submitted' | 'expired';
type SessionFilter = 'all' | SessionStatus;

interface SessionRow {
  id: string;
  studentName: string;
  studentEmail: string;
  startedAt: string;
  submittedAt: string;
  expiresAt: string;
  hasWorkspace: boolean;
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
  const [now, setNow] = useState(() => Date.now());
  const [statusFilter, setStatusFilter] = useState<SessionFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
        hasWorkspace: Boolean(String(session.sandboxSchema || '').trim()),
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
        const [, students, exams] = await Promise.all([
          courseApi.getCourses({ page: 1, pageSize: 100, signal: controller.signal }),
          userApi.getStudents({ page: 1, pageSize: 100, signal: controller.signal }),
          examApi.getPublishedExams({ page: 1, pageSize: 100, signal: controller.signal }).catch(() => [] as Exam[]),
        ]);

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
      
      const [enrollments, sessions] = await Promise.all([
        selectedCourseId 
          ? courseApi.getEnrollmentsByCourse(selectedCourseId, { page: 1, pageSize: 100, signal: controller.signal }).catch(() => [] as CourseEnrollment[])
          : Promise.resolve([] as CourseEnrollment[]),
        sessionApi.getSessionsByExam(selectedExamId, { page: 1, pageSize: 100, signal: controller.signal }).catch(() => [] as Session[])
      ]);

      if (controller.signal.aborted) {
        return;
      }

      const enrollmentProfiles = buildEnrollmentProfiles(enrollments);
      setEnrollmentProfilesById(enrollmentProfiles);

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

  const selectedExamTitle = useMemo(() => {
    const selectedExam = examOptions.find((exam) => String(exam.id) === selectedExamId);
    return selectedExam?.title || '';
  }, [examOptions, selectedExamId]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      const matchesSearch = !normalizedQuery
        || row.studentName.toLowerCase().includes(normalizedQuery)
        || row.studentEmail.toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesSearch;
    });
  }, [rows, searchQuery, statusFilter]);

  const hasActionableRows = useMemo(
    () => filteredRows.some((row) => row.status === 'in_progress'),
    [filteredRows],
  );

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
    return <PageSkeleton title="Exam Sessions Monitor" rows={5} />;
  }

  return (
    <div className="teacher-page" style={{ overflowX: 'hidden' }}>
      <div className="builder-header">
        <div>
          <h1 className="builder-title" style={{ fontSize: '18px' }}>Exam Sessions Monitor</h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#666' }}>
            Track live progress, submitted attempts, and expired sessions for each exam.
          </p>
        </div>
      </div>

      <div style={{ padding: 'clamp(12px, 2.8vw, 24px)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            className="sess-stat-pill"
            onClick={() => setStatusFilter('all')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', border: statusFilter === 'all' ? '1px solid #10b981' : undefined, boxShadow: statusFilter === 'all' ? '0 0 0 2px rgba(16,185,129,0.12)' : undefined, cursor: 'pointer' }}
          >
            <span className="sess-stat-num sess-stat-all">{counts.all}</span>
            <span className="sess-stat-label">All Sessions</span>
          </button>
          <button
            type="button"
            className="sess-stat-pill"
            onClick={() => setStatusFilter('in_progress')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', border: statusFilter === 'in_progress' ? '1px solid #10b981' : undefined, boxShadow: statusFilter === 'in_progress' ? '0 0 0 2px rgba(16,185,129,0.12)' : undefined, cursor: 'pointer' }}
          >
            <span className="sess-stat-num sess-stat-in_progress">{counts.in_progress}</span>
            <span className="sess-stat-label">In Progress</span>
          </button>
          <button
            type="button"
            className="sess-stat-pill"
            onClick={() => setStatusFilter('submitted')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', border: statusFilter === 'submitted' ? '1px solid #10b981' : undefined, boxShadow: statusFilter === 'submitted' ? '0 0 0 2px rgba(16,185,129,0.12)' : undefined, cursor: 'pointer' }}
          >
            <span className="sess-stat-num sess-stat-submitted">{counts.submitted}</span>
            <span className="sess-stat-label">Submitted</span>
          </button>
          <button
            type="button"
            className="sess-stat-pill"
            onClick={() => setStatusFilter('expired')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', border: statusFilter === 'expired' ? '1px solid #10b981' : undefined, boxShadow: statusFilter === 'expired' ? '0 0 0 2px rgba(16,185,129,0.12)' : undefined, cursor: 'pointer' }}
          >
            <span className="sess-stat-num sess-stat-expired">{counts.expired}</span>
            <span className="sess-stat-label">Expired</span>
          </button>
        </div>

        <div className="builder-card" style={{ display: 'grid', gap: '10px' }}>
          <div>
            <h2 className="students-card-title" style={{ margin: 0 }}>Exam Filter</h2>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#64748b' }}>
              Select an exam to review student session activity.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
            <select className="form-input" value={selectedExamId} onChange={(event) => setSelectedExamId(event.target.value)}>
              <option value="">Select exam</option>
              {examOptions.map((exam) => (
                <option key={String(exam.id)} value={String(exam.id)}>
                  {exam.title}
                </option>
              ))}
            </select>
            <input
              className="form-input"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search student name or email"
              aria-label="Search students"
            />
          </div>

          {selectedExamTitle && (
            <div style={{ fontSize: '12px', color: '#475569' }}>
              Viewing sessions for: <strong>{selectedExamTitle}</strong>
            </div>
          )}
        </div>

        {error && (
          <div className="enroll-alert enroll-alert-error" style={{ margin: 0 }}>
            {error}
          </div>
        )}

        <div className="builder-card" style={{ padding: 0, overflow: 'hidden' }}>
          {loadingSessions ? (
            <InlineSkeleton rows={5} className="p-6" />
          ) : filteredRows.length === 0 ? (
            <div className="students-empty" style={{ padding: '60px 20px' }}>
              <p>
                {rows.length === 0
                  ? 'Select an exam to inspect its session lifecycle.'
                  : 'No sessions match your current status filter and search.'}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="sess-table min-w-245">
                <thead>
                  <tr>
                    <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Student</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Status</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Started</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Submitted</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Time Remaining</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Workspace</th>
                    {hasActionableRows && <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ width: '28px', height: '28px', borderRadius: '999px', background: '#dcfce7', color: '#166534', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                            {row.studentName[0] || '?'}
                          </span>
                          <div style={{ display: 'grid', gap: '2px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{row.studentName}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>{row.studentEmail}</div>
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
                          ? (
                            <span style={{ fontWeight: 600, color: '#0369a1' }}>
                              {formatRemaining(Math.max(0, new Date(row.expiresAt).getTime() - now))}
                            </span>
                            )
                          : row.status === 'expired'
                            ? 'Expired'
                            : '—'}
                      </td>
                      <td>
                        <span className="badge badge-gray">
                          {row.hasWorkspace ? 'Provisioned' : 'Pending'}
                        </span>
                      </td>
                      {hasActionableRows && (
                        <td>
                          {row.status === 'in_progress' && (
                            <button className="sess-force-btn" onClick={() => void forceSubmit(row.id)}>
                              Force Submit
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>

              <div className="space-y-3 p-4 md:hidden">
                {filteredRows.map((row) => (
                  <div key={`mobile-${row.id}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-800">{row.studentName}</div>
                        <div className="mt-1 text-xs text-slate-500">{row.studentEmail}</div>
                      </div>
                      <span className={`sess-status-chip ${row.status === 'in_progress' ? 'sess-status-active' : row.status === 'submitted' ? 'sess-status-submitted' : 'sess-status-expired'}`}>
                        {row.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div><strong>Started:</strong> {row.startedAt ? new Date(row.startedAt).toLocaleString() : 'N/A'}</div>
                      <div><strong>Submitted:</strong> {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : '—'}</div>
                      <div>
                        <strong>Remaining:</strong>{' '}
                        {row.status === 'in_progress' && row.expiresAt
                          ? formatRemaining(Math.max(0, new Date(row.expiresAt).getTime() - now))
                          : row.status === 'expired' ? 'Expired' : '—'}
                      </div>
                      <div><strong>Workspace:</strong> {row.hasWorkspace ? 'Provisioned' : 'Pending'}</div>
                    </div>

                    {row.status === 'in_progress' && (
                      <button className="sess-force-btn mt-3 w-full" onClick={() => void forceSubmit(row.id)}>
                        Force Submit
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
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
