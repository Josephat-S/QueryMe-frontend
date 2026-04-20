/* eslint-disable react-x/set-state-in-effect */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { sessionApi, type CourseEnrollment, type PlatformUser, type Session } from '../../api';
import { InlineSkeleton, PageSkeleton } from '../../components/PageSkeleton';
import { useAuth } from '../../contexts';
import { extractErrorMessage } from '../../utils/errorUtils';
import { isSessionComplete } from '../../utils/queryme';
import { usePublishedExams } from '../../hooks/usePublishedExams';
import { useStudents } from '../../hooks/useStudents';
import { useEnrollmentsByCourse } from '../../hooks/useEnrollmentsByCourse';
import { useSessionsByExam } from '../../hooks/useSessionsByExam';

// ── Isolated countdown cell — owns its own 1-second tick ─────────────────────
const CountdownCell: React.FC<{ expiresAt: string }> = ({ expiresAt }) => {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(expiresAt).getTime() - Date.now()));

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [expiresAt]);

  const totalSeconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return <span style={{ fontWeight: 600, color: '#0369a1' }}>{minutes}m {seconds.toString().padStart(2, '0')}s</span>;
};

// ── Types ─────────────────────────────────────────────────────────────────────
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

interface StudentProfile { name: string; email: string; }

// ── Helpers ───────────────────────────────────────────────────────────────────
const asRecord = (value: unknown): Record<string, unknown> =>
  (value && typeof value === 'object' ? value as Record<string, unknown> : {});

const getRecordValue = (record: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    const v = record[key];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
};

const getStudentPrimaryId = (student?: Partial<PlatformUser> | null): string => {
  if (!student) return '';
  const r = asRecord(student);
  const v = getRecordValue(r, ['id', 'studentId', 'student_id']);
  return v !== undefined ? String(v) : '';
};

const getStudentUserId = (student?: Partial<PlatformUser> | null): string => {
  if (!student) return '';
  const r = asRecord(student);
  const nr = asRecord(r.user);
  const v = getRecordValue(r, ['userId', 'user_id']) ?? getRecordValue(nr, ['id', 'userId', 'user_id']);
  return v !== undefined ? String(v) : '';
};

const extractStudentIdFromSandboxSchema = (schema?: string | null): string => {
  if (!schema || typeof schema !== 'string') return '';
  const marker = '_student_';
  const idx = schema.lastIndexOf(marker);
  return idx < 0 ? '' : schema.slice(idx + marker.length).trim();
};

const getEnrollmentStudentId = (enrollment: CourseEnrollment): string => {
  const er = asRecord(enrollment);
  const sr = asRecord(er.student);
  const v = getRecordValue(er, ['studentId', 'student_id']) ?? getRecordValue(sr, ['id', 'studentId', 'student_id']);
  return v !== undefined ? String(v) : '';
};

const getEnrollmentStudentUserId = (enrollment: CourseEnrollment): string => {
  const er = asRecord(enrollment);
  const sr = asRecord(er.student);
  const sur = asRecord(sr.user);
  const v = getRecordValue(er, ['studentUserId', 'student_user_id', 'userId', 'user_id'])
    ?? getRecordValue(sr, ['userId', 'user_id'])
    ?? getRecordValue(sur, ['id', 'userId', 'user_id']);
  return v !== undefined ? String(v) : '';
};

const getEnrollmentStudentName = (enrollment: CourseEnrollment): string => {
  const er = asRecord(enrollment);
  const sr = asRecord(er.student);
  const sur = asRecord(sr.user);
  const v = getRecordValue(er, ['studentName', 'student_name'])
    ?? getRecordValue(sr, ['name', 'fullName', 'full_name'])
    ?? getRecordValue(sur, ['name', 'fullName', 'full_name']);
  return typeof v === 'string' ? v.trim() : '';
};

const getEnrollmentStudentEmail = (enrollment: CourseEnrollment): string => {
  const er = asRecord(enrollment);
  const sr = asRecord(er.student);
  const sur = asRecord(sr.user);
  const v = getRecordValue(er, ['studentEmail', 'student_email', 'email'])
    ?? getRecordValue(sr, ['email'])
    ?? getRecordValue(sur, ['email']);
  return typeof v === 'string' ? v.trim() : '';
};

const buildEnrollmentProfiles = (enrollments: CourseEnrollment[]): Record<string, StudentProfile> => {
  const profiles: Record<string, StudentProfile> = {};
  enrollments.forEach((enrollment) => {
    const studentId = getEnrollmentStudentId(enrollment);
    const studentUserId = getEnrollmentStudentUserId(enrollment);
    const name = getEnrollmentStudentName(enrollment);
    const email = getEnrollmentStudentEmail(enrollment);
    if ((!studentId && !studentUserId) || !name) return;
    const profile: StudentProfile = { name, email: email || 'No email' };
    if (studentId) profiles[studentId] = profile;
    if (studentUserId) profiles[studentUserId] = profile;
  });
  return profiles;
};

const getStudentName = (student?: Partial<PlatformUser> | null): string => {
  if (!student) return '';
  if (typeof student.name === 'string' && student.name.trim()) return student.name.trim();
  if (typeof student.fullName === 'string' && student.fullName.trim()) return student.fullName.trim();
  const r = asRecord(student);
  const nr = asRecord(r.user);
  const v = getRecordValue(r, ['full_name']) ?? getRecordValue(nr, ['name', 'fullName', 'full_name']);
  return typeof v === 'string' && v.trim() ? v.trim() : '';
};

const getStudentEmail = (student?: Partial<PlatformUser> | null): string => {
  if (!student) return '';
  if (typeof student.email === 'string' && student.email.trim()) return student.email.trim();
  const r = asRecord(student);
  const nr = asRecord(r.user);
  const v = getRecordValue(r, ['studentEmail', 'student_email']) ?? getRecordValue(nr, ['email']);
  return typeof v === 'string' && v.trim() ? v.trim() : '';
};

const getSessionLinkedStudent = (session: Session): Partial<PlatformUser> | null => {
  const r = session as Record<string, unknown>;
  return (r.student && typeof r.student === 'object') ? r.student as Partial<PlatformUser> : null;
};

const getSessionStatus = (session: Session): SessionStatus => {
  if (session.isExpired || (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now() && !isSessionComplete(session))) return 'expired';
  if (isSessionComplete(session)) return 'submitted';
  return 'in_progress';
};

// ── Component ─────────────────────────────────────────────────────────────────
const ExamSessionsMonitor: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedExamId, setSelectedExamId] = useState('');
  const [statusFilter, setStatusFilter] = useState<SessionFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: examOptions, loading: loadingExams } = usePublishedExams();
  const { data: students, loading: loadingStudents } = useStudents();

  // Derive courseId from selected exam to fetch enrollments
  const selectedExam = useMemo(
    () => examOptions.find((e) => String(e.id) === selectedExamId) || null,
    [examOptions, selectedExamId],
  );
  const selectedCourseId = selectedExam?.courseId ? String(selectedExam.courseId) : undefined;

  const { data: enrollments } = useEnrollmentsByCourse(selectedCourseId);
  const { data: sessions, loading: loadingSessions } = useSessionsByExam(selectedExamId || undefined);

  const loading = loadingExams || loadingStudents;

  // Auto-select first exam
  useEffect(() => {
    if (!user || selectedExamId) return;
    if (examOptions.length > 0) setSelectedExamId(String(examOptions[0].id));
  }, [examOptions, selectedExamId, user]);

  // Build lookup maps from cached data
  const studentsById = useMemo<Record<string, PlatformUser>>(() => (
    students.reduce<Record<string, PlatformUser>>((acc, student) => {
      const primaryId = getStudentPrimaryId(student);
      const userId = getStudentUserId(student);
      if (primaryId) acc[primaryId] = student;
      if (userId) acc[userId] = student;
      return acc;
    }, {})
  ), [students]);

  const enrollmentProfilesById = useMemo(
    () => buildEnrollmentProfiles(enrollments),
    [enrollments],
  );

  const rows = useMemo<SessionRow[]>(() => (
    sessions.map((session) => {
      const sessionStudentId = String(session.studentId || '');
      const schemaStudentId = extractStudentIdFromSandboxSchema(String(session.sandboxSchema || ''));
      const lookupKey = sessionStudentId || schemaStudentId;
      const enrollmentProfile = enrollmentProfilesById[lookupKey];
      const resolvedStudent = studentsById[lookupKey];
      const linkedStudent = getSessionLinkedStudent(session);
      return {
        id: String(session.id),
        studentName: enrollmentProfile?.name || getStudentName(resolvedStudent) || getStudentName(linkedStudent) || 'Student',
        studentEmail: enrollmentProfile?.email || getStudentEmail(resolvedStudent) || getStudentEmail(linkedStudent) || 'No email',
        startedAt: session.startedAt || '',
        submittedAt: session.submittedAt || '',
        expiresAt: session.expiresAt || '',
        hasWorkspace: Boolean(String(session.sandboxSchema || '').trim()),
        status: getSessionStatus(session),
      };
    })
  ), [sessions, enrollmentProfilesById, studentsById]);

  const counts = useMemo(() => ({
    all: rows.length,
    in_progress: rows.filter((r) => r.status === 'in_progress').length,
    submitted: rows.filter((r) => r.status === 'submitted').length,
    expired: rows.filter((r) => r.status === 'expired').length,
  }), [rows]);

  const selectedExamTitle = useMemo(
    () => examOptions.find((e) => String(e.id) === selectedExamId)?.title || '',
    [examOptions, selectedExamId],
  );

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      const matchesSearch = !q || row.studentName.toLowerCase().includes(q) || row.studentEmail.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [rows, searchQuery, statusFilter]);

  const hasActionableRows = useMemo(() => filteredRows.some((r) => r.status === 'in_progress'), [filteredRows]);

  const parentRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: filteredRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 10,
  });

  const forceSubmit = async (sessionId: string) => {
    setError(null);
    try {
      await sessionApi.submitSession(sessionId);
      // Invalidate cached sessions so the list refreshes
      await queryClient.invalidateQueries({ queryKey: ['sessions-by-exam', selectedExamId] });
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to submit that active session.'));
    }
  };

  if (loading) return <PageSkeleton title="Exam Sessions Monitor" rows={5} />;

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
          {(['all', 'in_progress', 'submitted', 'expired'] as const).map((filter) => (
            <button key={filter} type="button" className="sess-stat-pill"
              onClick={() => setStatusFilter(filter)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', cursor: 'pointer',
                border: statusFilter === filter ? '1px solid #10b981' : undefined,
                boxShadow: statusFilter === filter ? '0 0 0 2px rgba(16,185,129,0.12)' : undefined }}>
              <span className={`sess-stat-num sess-stat-${filter}`}>{counts[filter]}</span>
              <span className="sess-stat-label">{filter === 'all' ? 'All Sessions' : filter.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</span>
            </button>
          ))}
        </div>

        <div className="builder-card" style={{ display: 'grid', gap: '10px' }}>
          <div>
            <h2 className="students-card-title" style={{ margin: 0 }}>Exam Filter</h2>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#64748b' }}>Select an exam to review student session activity.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
            <select className="form-input" value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)}>
              <option value="">Select exam</option>
              {examOptions.map((exam) => (
                <option key={String(exam.id)} value={String(exam.id)}>{exam.title}</option>
              ))}
            </select>
            <input className="form-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search student name or email" aria-label="Search students" />
          </div>
          {selectedExamTitle && <div style={{ fontSize: '12px', color: '#475569' }}>Viewing sessions for: <strong>{selectedExamTitle}</strong></div>}
        </div>

        {error && <div className="enroll-alert enroll-alert-error" style={{ margin: 0 }}>{error}</div>}

        <div className="builder-card" style={{ padding: 0, overflow: 'hidden' }}>
          {loadingSessions ? (
            <InlineSkeleton rows={5} className="p-6" />
          ) : filteredRows.length === 0 ? (
            <div className="students-empty" style={{ padding: '60px 20px' }}>
              <p>{rows.length === 0 ? 'Select an exam to inspect its session lifecycle.' : 'No sessions match your current status filter and search.'}</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block" ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
                <table className="sess-table min-w-245 w-full table-fixed">
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', top: 0, zIndex: 3, background: '#f8fafc', width: '25%' }}>Student</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 3, background: '#f8fafc', width: '15%' }}>Status</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 3, background: '#f8fafc', width: '15%' }}>Started</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 3, background: '#f8fafc', width: '15%' }}>Submitted</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 3, background: '#f8fafc', width: '15%' }}>Time Remaining</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 3, background: '#f8fafc', width: '15%' }}>Workspace</th>
                      {hasActionableRows && <th style={{ position: 'sticky', top: 0, zIndex: 3, background: '#f8fafc', width: '10%' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody style={{ display: 'block', height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const row = filteredRows[virtualRow.index];
                      return (
                        <tr key={row.id} style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)`, display: 'flex' }}>
                          <td style={{ width: '25%', display: 'flex', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ width: '28px', height: '28px', borderRadius: '999px', background: '#dcfce7', color: '#166534', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>{row.studentName[0] || '?'}</span>
                              <div style={{ display: 'grid', gap: '2px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{row.studentName}</div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>{row.studentEmail}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ width: '15%', display: 'flex', alignItems: 'center' }}>
                            <span className={`sess-status-chip ${row.status === 'in_progress' ? 'sess-status-active' : row.status === 'submitted' ? 'sess-status-submitted' : 'sess-status-expired'}`}>{row.status.replace('_', ' ')}</span>
                          </td>
                          <td style={{ width: '15%', display: 'flex', alignItems: 'center' }}>{row.startedAt ? new Date(row.startedAt).toLocaleString() : 'N/A'}</td>
                          <td style={{ width: '15%', display: 'flex', alignItems: 'center' }}>{row.submittedAt ? new Date(row.submittedAt).toLocaleString() : '—'}</td>
                          <td style={{ width: '15%', display: 'flex', alignItems: 'center' }}>
                            {/* CountdownCell owns its own interval — no parent re-renders */}
                            {row.status === 'in_progress' && row.expiresAt
                              ? <CountdownCell expiresAt={row.expiresAt} />
                              : row.status === 'expired' ? 'Expired' : '—'}
                          </td>
                          <td style={{ width: '15%', display: 'flex', alignItems: 'center' }}>
                            <span className="badge badge-gray">{row.hasWorkspace ? 'Provisioned' : 'Pending'}</span>
                          </td>
                          {hasActionableRows && (
                            <td style={{ width: '10%', display: 'flex', alignItems: 'center' }}>
                              {row.status === 'in_progress' && (
                                <button className="sess-force-btn" onClick={() => void forceSubmit(row.id)}>Force Submit</button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
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
                      <span className={`sess-status-chip ${row.status === 'in_progress' ? 'sess-status-active' : row.status === 'submitted' ? 'sess-status-submitted' : 'sess-status-expired'}`}>{row.status.replace('_', ' ')}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div><strong>Started:</strong> {row.startedAt ? new Date(row.startedAt).toLocaleString() : 'N/A'}</div>
                      <div><strong>Submitted:</strong> {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : '—'}</div>
                      <div><strong>Remaining:</strong>{' '}{row.status === 'in_progress' && row.expiresAt ? <CountdownCell expiresAt={row.expiresAt} /> : row.status === 'expired' ? 'Expired' : '—'}</div>
                      <div><strong>Workspace:</strong> {row.hasWorkspace ? 'Provisioned' : 'Pending'}</div>
                    </div>
                    {row.status === 'in_progress' && (
                      <button className="sess-force-btn mt-3 w-full" onClick={() => void forceSubmit(row.id)}>Force Submit</button>
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

export default ExamSessionsMonitor;
