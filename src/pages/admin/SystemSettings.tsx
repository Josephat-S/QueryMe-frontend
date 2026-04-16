import React, { useEffect, useMemo, useState } from 'react';
import { courseApi, examApi, sandboxApi, userApi, type Exam, type PlatformUser } from '../../api';
import { PageSkeleton } from '../../components/PageSkeleton';
import { useToast } from '../../components/ToastProvider';
import { extractErrorMessage } from '../../utils/errorUtils';
import { getCourseName, getUserDisplayName, normalizeExamStatus } from '../../utils/queryme';

interface SearchOption {
  id: string;
  label: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getIdentifierCandidate = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
};

const resolveBackendIdentifier = (source: Partial<Exam> | Partial<PlatformUser>): string => {
  const record = source as Record<string, unknown>;
  const candidateKeys = ['uuid', 'examUuid', 'studentUuid', 'userUuid', 'publicId', 'sandboxUuid', 'sandboxId', 'id'];

  for (const key of candidateKeys) {
    const candidate = getIdentifierCandidate(record[key]);

    if (!candidate) {
      continue;
    }

    if (UUID_PATTERN.test(candidate)) {
      return candidate;
    }
  }

  for (const key of candidateKeys) {
    const candidate = getIdentifierCandidate(record[key]);

    if (candidate) {
      return candidate;
    }
  }

  return '';
};

const SystemSettings: React.FC = () => {
  const { showToast } = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [coursesById, setCoursesById] = useState<Record<string, string>>({});
  const [students, setStudents] = useState<PlatformUser[]>([]);
  const [sandboxExamId, setSandboxExamId] = useState('');
  const [sandboxStudentId, setSandboxStudentId] = useState('');
  const [sandboxExamSearch, setSandboxExamSearch] = useState('');
  const [sandboxStudentSearch, setSandboxStudentSearch] = useState('');
  const [sandboxInfo, setSandboxInfo] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const [examActionError, setExamActionError] = useState<string | null>(null);

  const loadControls = async (signal?: AbortSignal) => {
    const courses = await courseApi.getCourses(signal);
    setCoursesById(
      courses.reduce<Record<string, string>>((accumulator, course) => {
        accumulator[String(course.id)] = course.name;
        return accumulator;
      }, {}),
    );

    const examLists = await Promise.all(
      courses.map((course) => examApi.getExamsByCourse(String(course.id), signal).catch(() => [] as Exam[])),
    );
    setExams(examLists.flat());
    setStudents(await userApi.getStudents(signal).catch(() => [] as PlatformUser[]));
  };

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setLoadError(null);

    void loadControls(controller.signal)
      .catch((err) => {
        if (!controller.signal.aborted) {
          setLoadError(extractErrorMessage(err, 'Unable to load system controls right now.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  const runExamAction = async (examId: string, action: 'publish' | 'unpublish' | 'close' | 'delete') => {
    setExamActionError(null);

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

      await loadControls();
      showToast('success', 'Administrative action complete', `Exam action "${action}" completed successfully.`);
    } catch (err) {
      setExamActionError(extractErrorMessage(err, `Could not ${action} this exam. Please try again.`));
    }
  };

  const examOptions = useMemo<SearchOption[]>(() => (
    exams.map((exam) => ({
      id: resolveBackendIdentifier(exam),
      label: `${exam.title} · ${coursesById[String(exam.courseId)] || getCourseName(exam.course) || 'Course'}`,
    }))
      .filter((option) => Boolean(option.id))
  ), [coursesById, exams]);

  const studentOptions = useMemo<SearchOption[]>(() => (
    students.map((student) => ({
      id: resolveBackendIdentifier(student),
      label: (() => {
        const email = typeof student.email === 'string' ? student.email.trim() : '';
        const displayName = getUserDisplayName(student);

        if (email && displayName && displayName !== 'Unknown User') {
          return `${email} · ${displayName}`;
        }

        if (email) {
          return email;
        }

        if (displayName && displayName !== 'Unknown User') {
          return displayName;
        }

        return 'Student';
      })(),
    }))
      .filter((option) => Boolean(option.id))
  ), [students]);

  const filteredExamOptions = useMemo(
    () => examOptions.filter((option) => option.label.toLowerCase().includes(sandboxExamSearch.toLowerCase())),
    [examOptions, sandboxExamSearch],
  );

  const filteredStudentOptions = useMemo(
    () => studentOptions.filter((option) => option.label.toLowerCase().includes(sandboxStudentSearch.toLowerCase())),
    [sandboxStudentSearch, studentOptions],
  );

  const selectExam = (option: SearchOption) => {
    setSandboxExamSearch(option.label);
    setSandboxExamId(option.id);
  };

  const selectStudent = (option: SearchOption) => {
    setSandboxStudentSearch(option.label);
    setSandboxStudentId(option.id);
  };

  const selectedExamLabel = examOptions.find((option) => option.id === sandboxExamId)?.label || '';
  const selectedStudentLabel = studentOptions.find((option) => option.id === sandboxStudentId)?.label || '';

  const inspectSandbox = async () => {
    if (!sandboxExamId || !sandboxStudentId) {
      setSandboxError('Please select both exam and student before inspecting sandbox details.');
      return;
    }

    setSandboxError(null);
    setSandboxInfo('');

    try {
      const sandbox = await sandboxApi.getSandbox(sandboxExamId, sandboxStudentId);
      setSandboxInfo(JSON.stringify(sandbox, null, 2));
    } catch (err) {
      setSandboxError(extractErrorMessage(err, 'Unable to load sandbox details for this selection.'));
    }
  };

  const destroySandbox = async () => {
    if (!sandboxExamId || !sandboxStudentId) {
      setSandboxError('Please select both exam and student before deleting sandbox.');
      return;
    }

    setSandboxError(null);

    try {
      await sandboxApi.deleteSandbox(sandboxExamId, sandboxStudentId);
      setSandboxInfo('Sandbox deleted successfully.');
      showToast('success', 'Sandbox deleted', 'The selected sandbox was removed.');
    } catch (err) {
      setSandboxError(extractErrorMessage(err, 'Unable to delete sandbox for this selection.'));
    }
  };

  if (loading) {
    return <PageSkeleton title="System Settings & Controls" rows={5} />;
  }

  return (
    <div>
      <div className="page-header">
        <h1>System Settings & Controls</h1>
        <p>Administrative controls backed by real exam and sandbox management endpoints.</p>
      </div>

      {loadError && (
        <div className="ss-inline-alert ss-inline-alert-page" role="alert" aria-live="assertive">
          <strong>Unable to load controls.</strong>
          <span>{loadError}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '22px' }}>
        <div className="content-card" style={{ gridColumn: '1 / -1' }}>
          <div className="content-card-header">
            <h2>Sandbox Inspector</h2>
          </div>
          <div className="content-card-body">
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <input
                  className="form-input"
                  value={sandboxExamSearch}
                  onChange={(event) => {
                    setSandboxExamSearch(event.target.value);
                    setSandboxExamId('');
                  }}
                  placeholder="Search exam by name"
                />
                <select
                  className="form-input"
                  style={{ marginTop: '8px' }}
                  value={sandboxExamId}
                  onChange={(event) => {
                    const selected = filteredExamOptions.find((option) => option.id === event.target.value);
                    if (selected) {
                      selectExam(selected);
                    } else {
                      setSandboxExamId('');
                    }
                  }}
                >
                  <option value="">Select exam</option>
                  {filteredExamOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Selected exam: {selectedExamLabel || 'None'}
                </div>
              </div>
              <div>
                <input
                  className="form-input"
                  value={sandboxStudentSearch}
                  onChange={(event) => {
                    setSandboxStudentSearch(event.target.value);
                    setSandboxStudentId('');
                  }}
                  placeholder="Search student by email"
                />
                <select
                  className="form-input"
                  style={{ marginTop: '8px' }}
                  value={sandboxStudentId}
                  onChange={(event) => {
                    const selected = filteredStudentOptions.find((option) => option.id === event.target.value);
                    if (selected) {
                      selectStudent(selected);
                    } else {
                      setSandboxStudentId('');
                    }
                  }}
                >
                  <option value="">Select student</option>
                  {filteredStudentOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Selected student: {selectedStudentLabel || 'None'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary w-full sm:w-auto" onClick={() => void inspectSandbox()} disabled={!sandboxExamId || !sandboxStudentId}>Inspect</button>
                <button className="btn btn-secondary w-full sm:w-auto" onClick={() => void destroySandbox()} disabled={!sandboxExamId || !sandboxStudentId}>Delete Sandbox</button>
              </div>
              {sandboxError && (
                <div className="ss-inline-alert" role="alert" aria-live="assertive">
                  <strong>Sandbox action failed.</strong>
                  <span>{sandboxError}</span>
                </div>
              )}
              <textarea className="form-input" value={sandboxInfo} readOnly style={{ minHeight: '220px', fontFamily: 'monospace' }} />
            </div>
          </div>
        </div>


        <div className="content-card" style={{ gridColumn: '1 / -1' }}>
          <div className="content-card-header">
            <h2>Global Exam Administration</h2>
          </div>
          {examActionError && (
            <div className="ss-inline-alert ss-inline-alert-card" role="alert" aria-live="assertive">
              <strong>Exam action failed.</strong>
              <span>{examActionError}</span>
            </div>
          )}
          <div className="content-card-body hidden md:block" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="data-table min-w-175">
              <thead>
                <tr>
                  <th>Exam</th>
                  <th>Course</th>
                  <th>Status</th>
                  <th>Visibility</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={String(exam.id)}>
                    <td>{exam.title?.trim() || 'Untitled Exam'}</td>
                    <td>{coursesById[String(exam.courseId)] || getCourseName(exam.course) || 'Unknown Course'}</td>
                    <td>{normalizeExamStatus(exam.status) || 'N/A'}</td>
                    <td>{String(exam.visibilityMode || 'N/A')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {normalizeExamStatus(exam.status) === 'DRAFT' && (
                          <>
                            <button className="btn btn-sm btn-primary" onClick={() => void runExamAction(String(exam.id), 'publish')}>Publish</button>
                            <button className="btn btn-sm btn-secondary" onClick={() => void runExamAction(String(exam.id), 'delete')}>Delete</button>
                          </>
                        )}
                        {normalizeExamStatus(exam.status) === 'PUBLISHED' && (
                          <>
                            <button className="btn btn-sm btn-secondary" onClick={() => void runExamAction(String(exam.id), 'unpublish')}>Unpublish</button>
                            <button className="btn btn-sm btn-secondary" onClick={() => void runExamAction(String(exam.id), 'close')}>Close</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {exams.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
                      No exams are available for administrative control.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 p-4 md:hidden">
            {exams.map((exam) => (
              <div key={`mobile-${String(exam.id)}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="font-semibold text-slate-800">{exam.title?.trim() || 'Untitled Exam'}</div>
                <div className="mt-1 text-xs text-slate-500">{coursesById[String(exam.courseId)] || getCourseName(exam.course) || 'Unknown Course'}</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div><strong>Status:</strong> {normalizeExamStatus(exam.status) || 'N/A'}</div>
                  <div><strong>Visibility:</strong> {String(exam.visibilityMode || 'N/A')}</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {normalizeExamStatus(exam.status) === 'DRAFT' && (
                    <>
                      <button className="btn btn-sm btn-primary" onClick={() => void runExamAction(String(exam.id), 'publish')}>Publish</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => void runExamAction(String(exam.id), 'delete')}>Delete</button>
                    </>
                  )}
                  {normalizeExamStatus(exam.status) === 'PUBLISHED' && (
                    <>
                      <button className="btn btn-sm btn-secondary" onClick={() => void runExamAction(String(exam.id), 'unpublish')}>Unpublish</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => void runExamAction(String(exam.id), 'close')}>Close</button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {exams.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
                No exams are available for administrative control.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
