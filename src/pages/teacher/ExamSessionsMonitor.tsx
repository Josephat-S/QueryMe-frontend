/* eslint-disable react-x/set-state-in-effect */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { sessionApi, examApi, type CourseEnrollment, type PlatformUser, type Session } from '../../api';
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
  studentId: string;
  studentName: string;
  studentEmail: string;
  startedAt: string;
  submittedAt: string;
  expiresAt: string;
  hasWorkspace: boolean;
  status: SessionStatus;
  feedback?: string;
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
  const [success, setSuccess] = useState<string | null>(null);

  // Feedback Modal State
  const [feedbackSessionId, setFeedbackSessionId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);

  // Grant Attempt Modal State
  const [grantModalStudent, setGrantModalStudent] = useState<{ id: string; name: string } | null>(null);
  const [isGrantingAttempt, setIsGrantingAttempt] = useState(false);

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
        studentId: lookupKey,
        studentName: enrollmentProfile?.name || getStudentName(resolvedStudent) || getStudentName(linkedStudent) || 'Student',
        studentEmail: enrollmentProfile?.email || getStudentEmail(resolvedStudent) || getStudentEmail(linkedStudent) || 'No email',
        startedAt: session.startedAt || '',
        submittedAt: session.submittedAt || '',
        expiresAt: session.expiresAt || '',
        hasWorkspace: Boolean(String(session.sandboxSchema || '').trim()),
        status: getSessionStatus(session),
        feedback: session.feedback,
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


  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 10,
  });

  const forceSubmit = async (sessionId: string) => {
    setError(null);
    setSuccess(null);
    try {
      await sessionApi.submitSession(sessionId);
      await queryClient.invalidateQueries({ queryKey: ['sessions-by-exam', selectedExamId] });
      setSuccess('Session forced to submit.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to submit that active session.'));
    }
  };

  const extendSession = async (sessionId: string) => {
    setError(null);
    setSuccess(null);
    try {
      await sessionApi.extendSession(sessionId);
      await queryClient.invalidateQueries({ queryKey: ['sessions-by-exam', selectedExamId] });
      setSuccess('Session duration extended by 15 minutes.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to extend the session.'));
    }
  };

  const openGrantModal = (studentName: string, studentId: string) => {
    setGrantModalStudent({ id: studentId, name: studentName });
    setError(null);
    setSuccess(null);
  };

  const closeGrantModal = () => {
    setGrantModalStudent(null);
  };

  const handleGrantAttempt = async () => {
    if (!selectedExamId || !grantModalStudent) return;

    setIsGrantingAttempt(true);
    setError(null);
    try {
      await examApi.grantAdditionalAttempt(selectedExamId, grantModalStudent.id, 1);
      setSuccess(`Additional attempt granted successfully to ${grantModalStudent.name}.`);
      await queryClient.invalidateQueries({ queryKey: ['sessions-by-exam', selectedExamId] });
      closeGrantModal();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to grant additional attempt.'));
    } finally {
      setIsGrantingAttempt(false);
    }
  };

  const openFeedbackModal = (sessionId: string, initialFeedback?: string) => {
    setFeedbackSessionId(sessionId);
    setFeedbackText(initialFeedback || '');
    setError(null);
    setSuccess(null);
  };

  const closeFeedbackModal = () => {
    setFeedbackSessionId(null);
    setFeedbackText('');
  };

  const saveFeedback = async () => {
    if (!feedbackSessionId) return;
    setIsSavingFeedback(true);
    setError(null);
    try {
      await sessionApi.updateFeedback(feedbackSessionId, feedbackText);
      await queryClient.invalidateQueries({ queryKey: ['sessions-by-exam', selectedExamId] });
      closeFeedbackModal();
      setSuccess('Teacher feedback updated.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update feedback.'));
    } finally {
      setIsSavingFeedback(false);
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
        {success && <div className="enroll-alert enroll-alert-success" style={{ margin: 0, background: '#ecfdf5', color: '#047857', border: '1px solid #10b981' }}>{success}</div>}

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
                <div role="table" className="sess-table min-w-245 w-full">
                  <div role="rowgroup" className="sticky top-0 z-10" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <div role="row" className="flex items-center" style={{ minWidth: '960px' }}>
                      <div role="columnheader" className="px-4 py-3 text-left font-bold text-slate-800" style={{ flex: '0 0 22%' }}>Student</div>
                      <div role="columnheader" className="px-3 py-3 text-left font-bold text-slate-800" style={{ flex: '0 0 10%' }}>Status</div>
                      <div role="columnheader" className="px-3 py-3 text-left font-bold text-slate-800" style={{ flex: '0 0 16%' }}>Started</div>
                      <div role="columnheader" className="px-3 py-3 text-left font-bold text-slate-800" style={{ flex: '0 0 16%' }}>Submitted</div>
                      <div role="columnheader" className="px-3 py-3 text-left font-bold text-slate-800" style={{ flex: '0 0 12%' }}>Time Remaining</div>
                      <div role="columnheader" className="px-3 py-3 text-left font-bold text-slate-800" style={{ flex: '0 0 10%' }}>Workspace</div>
                      <div role="columnheader" className="px-4 py-3 text-right font-bold text-slate-800" style={{ flex: '1 0 14%' }}>Actions</div>
                    </div>
                  </div>
                  <div role="rowgroup" style={{ display: 'block', height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const row = filteredRows[virtualRow.index];
                      return (
                          <div
                            role="row"
                            key={row.id}
                            className="flex items-center border-b border-slate-100 hover:bg-slate-50 transition-colors"
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              minWidth: '960px',
                              height: `${virtualRow.size}px`,
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                          >
                            <div role="cell" className="px-4 py-2.5 flex items-center overflow-hidden" style={{ flex: '0 0 22%' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0, border: '1px solid #e2e8f0' }}>{row.studentName[0] || '?'}</span>
                                <div style={{ display: 'grid', gap: '1px', minWidth: 0 }}>
                                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.studentName}</div>
                                  <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.studentEmail}</div>
                                </div>
                              </div>
                            </div>
                            <div role="cell" className="px-3 py-2.5 flex items-center" style={{ flex: '0 0 10%' }}>
                              <span className={`sess-status-chip ${row.status === 'in_progress' ? 'sess-status-active' : row.status === 'submitted' ? 'sess-status-submitted' : 'sess-status-expired'}`}>{row.status.replace('_', ' ')}</span>
                            </div>
                            <div role="cell" className="px-3 py-2.5 flex items-center text-slate-600 font-medium" style={{ flex: '0 0 16%', fontSize: '12px' }}>{row.startedAt ? new Date(row.startedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}</div>
                            <div role="cell" className="px-3 py-2.5 flex items-center text-slate-600 font-medium" style={{ flex: '0 0 16%', fontSize: '12px' }}>{row.submittedAt ? new Date(row.submittedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}</div>
                            <div role="cell" className="px-3 py-2.5 flex items-center" style={{ flex: '0 0 12%' }}>
                              {row.status === 'in_progress' && row.expiresAt
                                ? <CountdownCell expiresAt={row.expiresAt} />
                                : row.status === 'expired' ? <span style={{ color: '#ef4444', fontWeight: 600 }}>Expired</span> : <span style={{ color: '#94a3b8' }}>—</span>}
                            </div>
                            <div role="cell" className="px-3 py-2.5 flex items-center" style={{ flex: '0 0 10%' }}>
                              <span className={`badge ${row.hasWorkspace ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '10px' }}>{row.hasWorkspace ? 'Ready' : 'Pending'}</span>
                            </div>
                            <div role="cell" className="px-4 py-2.5 flex items-center justify-end gap-1.5" style={{ flex: '1 0 14%' }}>
                              {row.status === 'in_progress' && (
                                <>
                                  <button className="sess-force-btn" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }} onClick={() => void extendSession(row.id)} title="Extend session by 15 minutes">Extend</button>
                                  <button className="sess-force-btn" style={{ background: '#6366f1', color: 'white' }} onClick={() => void forceSubmit(row.id)}>Submit</button>
                                </>
                              )}
                              {(row.status === 'submitted' || row.status === 'expired') && (
                                <button className="sess-force-btn" style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }} onClick={() => openGrantModal(row.studentName, row.studentId)} title="Allow student to take the exam again">Grant Attempt</button>
                              )}
                              <button className="sess-force-btn" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }} onClick={() => openFeedbackModal(row.id, row.feedback)} title="Write feedback for this student">
                                {row.feedback ? 'Edit Feedback' : 'Feedback'}
                              </button>
                            </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-4 md:hidden">
                {filteredRows.map((row) => (
                  <div key={`mobile-${row.id}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-slate-400" />
                        <div>
                          <div className="font-bold text-slate-900">{row.studentName}</div>
                          <div className="text-xs text-slate-500">{row.studentEmail}</div>
                        </div>
                      </div>
                      <span className={`sess-status-chip ${row.status === 'in_progress' ? 'sess-status-active' : row.status === 'submitted' ? 'sess-status-submitted' : 'sess-status-expired'}`}>{row.status.replace('_', ' ')}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-slate-600">
                      <div><strong>Started:</strong> {row.startedAt ? new Date(row.startedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}</div>
                      <div><strong>Submitted:</strong> {row.submittedAt ? new Date(row.submittedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}</div>
                      <div><strong>Remaining:</strong>{' '}{row.status === 'in_progress' && row.expiresAt ? <CountdownCell expiresAt={row.expiresAt} /> : row.status === 'expired' ? 'Expired' : '—'}</div>
                      <div><strong>Workspace:</strong> {row.hasWorkspace ? 'Provisioned' : 'Pending'}</div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {row.status === 'in_progress' && (
                        <>
                          <button className="sess-force-btn flex-1" onClick={() => void extendSession(row.id)}>Extend</button>
                          <button className="sess-force-btn flex-1" style={{ background: '#6366f1' }} onClick={() => void forceSubmit(row.id)}>Force Submit</button>
                        </>
                      )}
                      {(row.status === 'submitted' || row.status === 'expired') && (
                        <button className="sess-force-btn flex-1" style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }} onClick={() => openGrantModal(row.studentName, row.studentId)}>Grant Attempt</button>
                      )}
                      <button className="sess-force-btn flex-1" style={{ background: '#64748b' }} onClick={() => openFeedbackModal(row.id, row.feedback)}>
                        {row.feedback ? 'Edit Feedback' : 'Feedback'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {feedbackSessionId && (
        <div className="um-modal-overlay" onClick={closeFeedbackModal}>
          <div className="exam-modal um-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="um-modal-header">
              <h3>Student Feedback</h3>
              <p>Provide specific guidance or comments for this student's exam attempt.</p>
            </div>
            <div className="um-modal-grid">
              <div className="um-form-field um-field-wide">
                <label className="um-form-label">Feedback Notes</label>
                <textarea
                  className="form-input"
                  rows={5}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Enter your feedback here..."
                  style={{ resize: 'vertical', minHeight: '120px' }}
                />
              </div>
            </div>
            <div className="um-modal-footer">
              <button className="btn btn-secondary" onClick={closeFeedbackModal} disabled={isSavingFeedback}>Cancel</button>
              <button className="btn btn-primary" onClick={() => void saveFeedback()} disabled={isSavingFeedback}>
                {isSavingFeedback ? 'Saving...' : 'Save Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}

      {grantModalStudent && (
        <div className="um-modal-overlay" onClick={closeGrantModal}>
          <div className="exam-modal um-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="um-modal-header">
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: '#d97706' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              </div>
              <h3>Grant Additional Attempt</h3>
              <p style={{ marginTop: '8px' }}>
                Are you sure you want to grant <strong>{grantModalStudent.name}</strong> another attempt for this exam?
              </p>
            </div>
            <div className="um-modal-grid" style={{ marginTop: '4px' }}>
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                This action will allow the student to start a fresh session. Their previous results will be preserved in the system.
              </div>
            </div>
            <div className="um-modal-footer">
              <button className="btn btn-secondary" onClick={closeGrantModal} disabled={isGrantingAttempt}>Nevermind</button>
              <button className="btn btn-primary" style={{ background: '#d97706', border: 'none' }} onClick={() => void handleGrantAttempt()} disabled={isGrantingAttempt}>
                {isGrantingAttempt ? 'Granting...' : 'Yes, Grant Attempt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamSessionsMonitor;
