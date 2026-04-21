/* eslint-disable react-x/set-state-in-effect */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { courseApi, userApi, type Course, type CourseEnrollment, type Identifier, type PlatformUser } from '../../api';
import { InlineSkeleton, PageSkeleton } from '../../components/PageSkeleton';
import { useAuth, useTheme } from '../../contexts';
import { useToast } from '../../components/ToastContext';
import { extractErrorMessage } from '../../utils/errorUtils';
import { getUserDisplayName } from '../../utils/queryme';
import {
  buildStudentRegistrationPayload,
  parseStudentImportFile,
  STUDENT_IMPORT_ACCEPT,
  STUDENT_IMPORT_TEMPLATE,
  type StudentImportRow,
} from '../../utils/studentImport';
import { useTeacherCourses } from '../../hooks/useTeacherCourses';
import { useStudents } from '../../hooks/useStudents';
import { useAllStudents } from '../../hooks/useAllStudents';
import { useEnrollments } from '../../hooks/useEnrollments';
import { useEnrollmentsByCourse } from '../../hooks/useEnrollmentsByCourse';
import { useClassGroupsByCourse } from '../../hooks/useClassGroupsByCourse';

type MembershipSource = 'ENROLLMENT' | 'DIRECT' | 'BOTH';
const ROWS_PER_PAGE = 10;

interface CourseMemberRow {
  courseId: string;
  courseName: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  enrolledAt?: string;
  source: MembershipSource;
}

interface SingleStudentFormState {
  fullName: string;
  email: string;
  password: string;
  assignToCourse: boolean;
  classGroupId: string;
  registrationNumber: string;
}

const getRecordValue = (record: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
};

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' ? value as Record<string, unknown> : {}
);

const getEnrollmentStudentId = (enrollment: CourseEnrollment): string => {
  const enrollmentRecord = asRecord(enrollment);
  const studentRecord = asRecord(enrollmentRecord.student);

  const value = getRecordValue(enrollmentRecord, ['studentId', 'student_id'])
    ?? getRecordValue(studentRecord, ['id', 'studentId', 'student_id']);

  return value !== undefined ? String(value) : '';
};

const getEnrollmentCourseId = (enrollment: CourseEnrollment): string => {
  const enrollmentRecord = asRecord(enrollment);
  const courseRecord = asRecord(enrollmentRecord.course);

  const value = getRecordValue(enrollmentRecord, ['courseId', 'course_id'])
    ?? getRecordValue(courseRecord, ['id', 'courseId', 'course_id']);

  return value !== undefined ? String(value) : '';
};

const getEnrollmentEnrolledAt = (enrollment: CourseEnrollment): string | undefined => {
  const enrollmentRecord = asRecord(enrollment);
  const value = getRecordValue(enrollmentRecord, ['enrolledAt', 'enrolled_at', 'createdAt', 'created_at']);
  return typeof value === 'string' && value.trim() ? value : undefined;
};

const getEnrollmentStudentName = (enrollment: CourseEnrollment): string | undefined => {
  const enrollmentRecord = asRecord(enrollment);
  const studentRecord = asRecord(enrollmentRecord.student);
  const studentUserRecord = asRecord(studentRecord.user);

  const value = getRecordValue(enrollmentRecord, ['studentName', 'student_name'])
    ?? getRecordValue(studentRecord, ['name', 'fullName', 'full_name'])
    ?? getRecordValue(studentUserRecord, ['name', 'fullName', 'full_name']);

  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const getEnrollmentStudentEmail = (enrollment: CourseEnrollment): string | undefined => {
  const enrollmentRecord = asRecord(enrollment);
  const studentRecord = asRecord(enrollmentRecord.student);
  const studentUserRecord = asRecord(studentRecord.user);

  const value = getRecordValue(enrollmentRecord, ['studentEmail', 'student_email', 'email'])
    ?? getRecordValue(studentRecord, ['email'])
    ?? getRecordValue(studentUserRecord, ['email']);

  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const getStudentEmail = (student: Partial<PlatformUser> | null | undefined): string | undefined => {
  const studentRecord = asRecord(student);
  const studentUserRecord = asRecord(studentRecord.user);

  const value = getRecordValue(studentRecord, ['email'])
    ?? getRecordValue(studentUserRecord, ['email']);

  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const getStudentEnrollmentLabel = (student: PlatformUser): string => {
  const displayName = getUserDisplayName(student);
  const email = getStudentEmail(student);

  return email ? `${displayName} (${email})` : displayName;
};

const isNullParseEnrollmentError = (error: unknown): boolean => extractErrorMessage(error).toLowerCase().includes('cannot parse null string');

const getMembershipSourceLabel = (source: MembershipSource): string => {
  if (source === 'DIRECT') {
    return 'Profile assignment';
  }

  if (source === 'BOTH') {
    return 'Enrollment + profile';
  }

  return 'Enrollment record';
};

const downloadTemplate = () => {
  const blob = new Blob([STUDENT_IMPORT_TEMPLATE], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = 'queryme-student-import-template.csv';
  anchor.click();
  URL.revokeObjectURL(url);
};

const buildCourseMemberRows = (
  courses: Course[],
  students: PlatformUser[],
  enrollments: CourseEnrollment[],
  selectedCourseId?: string,
): CourseMemberRow[] => {
  const courseNames = new Map(courses.map((course) => [String(course.id), course.name]));
  const rowsByMembershipKey = new Map<string, CourseMemberRow>();

  enrollments.forEach((enrollment) => {
    const studentId = getEnrollmentStudentId(enrollment);
    const courseId = getEnrollmentCourseId(enrollment);

    if (!studentId || !courseId) {
      return;
    }

    if (selectedCourseId && courseId !== selectedCourseId) {
      return;
    }

    if (!courseNames.has(courseId)) {
      return;
    }

    const student = students.find((candidate) => String(candidate.id) === studentId);
    const fallbackStudentName = getEnrollmentStudentName(enrollment);
    const fallbackStudentEmail = getEnrollmentStudentEmail(enrollment);
    const key = `${courseId}-${studentId}`;

    rowsByMembershipKey.set(key, {
      courseId,
      courseName: courseNames.get(courseId) || 'Unknown course',
      studentId,
      studentName: String(student?.name || student?.fullName || enrollment.studentName || fallbackStudentName || student?.email || fallbackStudentEmail || 'Unnamed student'),
      studentEmail: String(student?.email || enrollment.studentEmail || fallbackStudentEmail || 'N/A'),
      enrolledAt: getEnrollmentEnrolledAt(enrollment),
      source: 'ENROLLMENT',
    });
  });

  students.forEach((student) => {
    const courseId = String(student.courseId ?? '');

    if (!courseId) {
      return;
    }

    if (selectedCourseId && courseId !== selectedCourseId) {
      return;
    }

    if (!courseNames.has(courseId)) {
      return;
    }

    const studentId = String(student.id);
    const key = `${courseId}-${studentId}`;
    const existing = rowsByMembershipKey.get(key);
    const studentRecord = asRecord(student);
    const studentUserRecord = asRecord(studentRecord.user);
    const nestedStudentName = getRecordValue(studentUserRecord, ['name', 'fullName', 'full_name']);
    const nestedStudentEmail = getRecordValue(studentUserRecord, ['email']);
    const studentName = String(student.name || student.fullName || nestedStudentName || student.email || nestedStudentEmail || 'Unnamed student');
    const studentEmail = String(student.email || nestedStudentEmail || 'N/A');
    const enrolledAt = student.updatedAt || student.createdAt || existing?.enrolledAt;

    rowsByMembershipKey.set(key, {
      courseId,
      courseName: courseNames.get(courseId) || 'Unknown course',
      studentId,
      studentName,
      studentEmail,
      enrolledAt,
      source: existing ? 'BOTH' : 'DIRECT',
    });
  });

  return [...rowsByMembershipKey.values()].sort((left, right) => (
    left.courseName.localeCompare(right.courseName) || left.studentName.localeCompare(right.studentName)
  ));
};

const CourseEnrollments: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── Cached data via hooks ────────────────────────────────────────────────
  const { data: courses } = useTeacherCourses(user?.id);
  const { data: students, loading: studentsLoading } = useStudents();
  // All registered students — used by the enrollment picker regardless of course assignment
  const { data: allStudents, loading: allStudentsLoading } = useAllStudents();
  const { data: allEnrollments } = useEnrollments();

  const [selectedCourseId, setSelectedCourseId] = useState('');
  // Multi-select enrollment: set of student IDs selected for enrollment
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(() => new Set());
  // Search filter for the enrollment picker
  const [enrollSearch, setEnrollSearch] = useState('');
  const [singleForm, setSingleForm] = useState<SingleStudentFormState>({
    fullName: '',
    email: '',
    password: '',
    assignToCourse: false,
    classGroupId: '',
    registrationNumber: '',
  });
  const [bulkRows, setBulkRows] = useState<StudentImportRow[]>([]);
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkAssignToCourse, setBulkAssignToCourse] = useState(false);
  const [bulkClassGroupId, setBulkClassGroupId] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [enrollmentSaving, setEnrollmentSaving] = useState(false);
  const [enrollProgress, setEnrollProgress] = useState<{ current: number; total: number } | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tableCourseFilter, setTableCourseFilter] = useState('ALL');
  const [tablePage, setTablePage] = useState(1);
  const requestedCourseId = searchParams.get('courseId') || '';

  // Per-course data (changes when selected course changes)
  const { loading: enrollmentsLoading } = useEnrollmentsByCourse(selectedCourseId || undefined);
  const { data: classGroups } = useClassGroupsByCourse(selectedCourseId || undefined);

  // Initialise selected course once courses arrive
  useEffect(() => {
    if (!user || courses.length === 0) return;
    setSelectedCourseId((previous) => {
      if (previous && courses.some((c) => String(c.id) === previous)) return previous;
      if (requestedCourseId && courses.some((c) => String(c.id) === requestedCourseId)) return requestedCourseId;
      return courses[0] ? String(courses[0].id) : '';
    });
    setLoading(false);
  }, [courses, requestedCourseId, user]);

  // Track per-course loading state for the refreshing indicator
  useEffect(() => {
    setRefreshing(enrollmentsLoading);
  }, [enrollmentsLoading]);

  // Override loading to false once students are available
  useEffect(() => {
    if (!studentsLoading && !allStudentsLoading) setLoading(false);
  }, [studentsLoading, allStudentsLoading]);

  const refreshMembershipState = useCallback(async () => {
    // Invalidate caches so React Query refetches the changed data
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['students'] }),
      queryClient.invalidateQueries({ queryKey: ['all-students'] }),
      queryClient.invalidateQueries({ queryKey: ['enrollments'] }),
      queryClient.invalidateQueries({ queryKey: ['enrollments-by-course', selectedCourseId] }),
      queryClient.invalidateQueries({ queryKey: ['class-groups-by-course', selectedCourseId] }),
    ]);
  }, [queryClient, selectedCourseId]);

  useEffect(() => {
    if (!selectedCourseId) {
      setSingleForm((previous) => ({
        ...previous,
        assignToCourse: false,
        classGroupId: '',
      }));
      setBulkAssignToCourse(false);
      setBulkClassGroupId('');
      return;
    }

    setSingleForm((previous) => ({
      ...previous,
      assignToCourse: true,
    }));
    setBulkAssignToCourse(true);
  }, [selectedCourseId]);

  useEffect(() => {
    const validClassGroupIds = new Set(classGroups.map((group) => String(group.id)));

    setSingleForm((previous) => (
      previous.classGroupId && !validClassGroupIds.has(previous.classGroupId)
        ? { ...previous, classGroupId: '' }
        : previous
    ));

    setBulkClassGroupId((previous) => (
      previous && !validClassGroupIds.has(previous) ? '' : previous
    ));
  }, [classGroups]);

  const selectedCourse = useMemo(
    () => courses.find((course) => String(course.id) === selectedCourseId) || null,
    [courses, selectedCourseId],
  );

  // Compute tableRows once from allEnrollments — covers all courses or just the selected one
  const tableRows = useMemo(() => {
    const baseRows = selectedCourseId
      ? buildCourseMemberRows(courses, students, allEnrollments, selectedCourseId)
      : buildCourseMemberRows(courses, students, allEnrollments);

    return baseRows.filter((member) => {
      const haystack = `${member.courseName} ${member.studentName} ${member.studentEmail} ${getMembershipSourceLabel(member.source)}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [allEnrollments, courses, search, selectedCourseId, students]);

  // memberRows re-uses tableRows (already filtered to selectedCourseId) instead of calling buildCourseMemberRows again
  const memberRows = useMemo(
    () => (selectedCourseId ? tableRows.filter((r) => r.courseId === selectedCourseId) : []),
    [selectedCourseId, tableRows],
  );

  const enrolledStudentIds = useMemo(
    () => new Set(memberRows.map((row) => row.studentId)),
    [memberRows],
  );

  const availableStudents = useMemo(
    () => [...allStudents]
      .filter((student) => !enrolledStudentIds.has(String(student.id)))
      .sort((left, right) => getStudentEnrollmentLabel(left).localeCompare(getStudentEnrollmentLabel(right))),
    [enrolledStudentIds, allStudents],
  );

  const filteredAvailableStudents = useMemo(() => {
    const q = enrollSearch.toLowerCase();
    if (!q) return availableStudents;
    return availableStudents.filter((s) => getStudentEnrollmentLabel(s).toLowerCase().includes(q));
  }, [availableStudents, enrollSearch]);

  const validBulkRows = useMemo(
    () => bulkRows.filter((row) => row.errors.length === 0),
    [bulkRows],
  );

  const bulkPreviewRows = useMemo(
    () => bulkRows.slice(0, 3),
    [bulkRows],
  );

  const currentBulkCourseId = bulkAssignToCourse ? selectedCourseId : '';

  const bulkReadyCount = validBulkRows.length;
  const bulkInvalidCount = bulkRows.length - bulkReadyCount;
  const bulkAssignedCount = bulkRows.filter((row) => Boolean(currentBulkCourseId || row.courseId)).length;

  const filteredTableRows = useMemo(() => {
    const normalizedSearch = search.toLowerCase();

    return tableRows.filter((member) => {
      const matchesCourse = tableCourseFilter === 'ALL' || member.courseId === tableCourseFilter;
      const matchesSearch = `${member.courseName} ${member.studentName} ${member.studentEmail} ${getMembershipSourceLabel(member.source)}`
        .toLowerCase()
        .includes(normalizedSearch);

      return matchesCourse && matchesSearch;
    });
  }, [search, tableCourseFilter, tableRows]);

  const totalTablePages = Math.max(1, Math.ceil(filteredTableRows.length / ROWS_PER_PAGE));
  const paginatedTableRows = useMemo(
    () => filteredTableRows.slice((tablePage - 1) * ROWS_PER_PAGE, tablePage * ROWS_PER_PAGE),
    [filteredTableRows, tablePage],
  );

  useEffect(() => {
    setTablePage(1);
  }, [search, selectedCourseId, tableCourseFilter]);

  useEffect(() => {
    if (tablePage > totalTablePages) {
      setTablePage(totalTablePages);
    }
  }, [tablePage, totalTablePages]);

  const getCourseLabel = (courseId: string | Identifier | null | undefined): string => {
    if (!courseId) {
      return 'No direct course assignment';
    }

    return courses.find((course) => String(course.id) === courseId)?.name || 'Course';
  };

  const getClassGroupLabel = (classGroupId: string): string => {
    if (!classGroupId) {
      return '';
    }

    return classGroups.find((group) => String(group.id) === classGroupId)?.name || 'Class group';
  };

  const handleEnroll = async () => {
    if (!selectedCourseId || selectedStudentIds.size === 0) return;

    setEnrollmentSaving(true);
    setEnrollProgress({ current: 0, total: selectedStudentIds.size });
    setError(null);

    const ids = [...selectedStudentIds];
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < ids.length; i++) {
      const studentId = ids[i];
      try {
        await courseApi.createEnrollment({ courseId: selectedCourseId, studentId });
        succeeded++;
      } catch (err) {
        if (isNullParseEnrollmentError(err)) {
          try {
            await userApi.updateStudent(studentId, { courseId: selectedCourseId });
            succeeded++;
          } catch {
            failed++;
          }
        } else {
          failed++;
        }
      }
      setEnrollProgress({ current: i + 1, total: ids.length });
    }

    await refreshMembershipState();
    setSelectedStudentIds(new Set());
    setEnrollSearch('');
    setEnrollProgress(null);
    setEnrollmentSaving(false);

    if (failed === 0) {
      showToast('success', `${succeeded} student${succeeded !== 1 ? 's' : ''} enrolled`, `Successfully enrolled into ${selectedCourse?.name ?? 'the course'}.`);
    } else {
      showToast('warning', 'Partial enrollment', `${succeeded} enrolled, ${failed} failed. Check the error log for details.`);
    }
  };

  const handleRemove = async (member: CourseMemberRow) => {
    const targetCourseId = member.courseId;

    if (!targetCourseId) {
      return;
    }

    setEnrollmentSaving(true);
    setError(null);

    try {
      let changed = false;

      if (member.source === 'ENROLLMENT' || member.source === 'BOTH') {
        try {
          await courseApi.deleteEnrollment({ courseId: targetCourseId, studentId: member.studentId });
          changed = true;
        } catch (err) {
          if (!isNullParseEnrollmentError(err) && member.source === 'ENROLLMENT') {
            throw err;
          }
        }
      }

      if (member.source === 'DIRECT' || member.source === 'BOTH') {
        await userApi.updateStudent(member.studentId, { courseId: null, classGroupId: null });
        changed = true;
      }

      if (!changed) {
        throw new Error('The backend did not accept the membership removal request.');
      }

      await refreshMembershipState();
      showToast('success', 'Membership removed', 'The student was removed from this course.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to remove the selected enrollment.'));
    } finally {
      setEnrollmentSaving(false);
    }
  };

  const handleRegisterStudent = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!singleForm.fullName.trim() || !singleForm.email.trim() || !singleForm.password.trim()) {
      setError('Full name, email, and password are required for student registration.');
      return;
    }

    setRegistering(true);
    setError(null);

    try {
      const payload = buildStudentRegistrationPayload({
        fullName: singleForm.fullName,
        email: singleForm.email,
        registrationNumber: singleForm.registrationNumber,
      }, {
        courseId: singleForm.assignToCourse ? selectedCourseId : '',
        classGroupId: singleForm.assignToCourse ? singleForm.classGroupId : '',
      });

      const createdStudent = await userApi.registerStudent(payload);
      await refreshMembershipState();
      setSingleForm((previous) => ({
        ...previous,
        fullName: '',
        email: '',
        registrationNumber: '',
      }));
      showToast(
        'success',
        singleForm.assignToCourse && selectedCourse
          ? 'Student created and assigned'
          : 'Student created',
        singleForm.assignToCourse && selectedCourse
          ? `${getUserDisplayName(createdStudent)} is now linked to ${selectedCourse.name}.`
          : `${getUserDisplayName(createdStudent)} can now sign in as a student.`,
      );
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to register the student.'));
    } finally {
      setRegistering(false);
    }
  };

  const handleImportFile = async (file: File) => {
    setImportError(null);

    try {
      const rows = await parseStudentImportFile(file);
      setBulkRows(rows);
      setBulkFileName(file.name);
      showToast('success', 'Import ready', `${rows.length} student rows were parsed from ${file.name}.`);
    } catch (err) {
      setBulkRows([]);
      setBulkFileName('');
      setImportError(extractErrorMessage(err, 'Failed to read the selected file.'));
    }
  };

  const handleBulkSubmit = async () => {
    if (bulkRows.length === 0) {
      setImportError('Upload a CSV or Excel file before starting bulk registration.');
      return;
    }

    if (validBulkRows.length !== bulkRows.length) {
      setImportError('Fix or remove the invalid rows before submitting the batch.');
      return;
    }

    setBulkSaving(true);
    setImportProgress(null);
    setImportError(null);
 
    try {
      const total = validBulkRows.length;
      setImportProgress({ current: 0, total });

      const payloads = validBulkRows.map((row) => buildStudentRegistrationPayload(row, {
        courseId: currentBulkCourseId,
        classGroupId: currentBulkCourseId ? bulkClassGroupId : '',
      }));
 
      // Register in chunks of 20 to show progress
      const CHUNK_SIZE = 20;
      const createdStudents: PlatformUser[] = [];

      for (let index = 0; index < payloads.length; index += CHUNK_SIZE) {
        const chunk = payloads.slice(index, index + CHUNK_SIZE);
        const chunkResults = await userApi.registerStudentsBulk(chunk);
        createdStudents.push(...chunkResults);
        setImportProgress({ current: Math.min(index + CHUNK_SIZE, total), total });
      }

      await refreshMembershipState();
      setBulkRows([]);
      setBulkFileName('');
      showToast(
        'success',
        'Bulk registration complete',
        currentBulkCourseId && selectedCourse
          ? `${createdStudents.length} students were created and linked to ${selectedCourse.name}.`
          : `${createdStudents.length} students were created successfully.`,
      );
    } catch (err) {
      setImportError(extractErrorMessage(err, 'Failed to register the uploaded students.'));
    } finally {
      setBulkSaving(false);
      setImportProgress(null);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      void handleImportFile(file);
    }

    event.target.value = '';
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      void handleImportFile(file);
    }
  };

  const openBulkFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleDropzoneKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openBulkFilePicker();
    }
  };

  if (loading) {
    return <PageSkeleton title="Students" rows={7} />;
  }

  return (
    <div className="teacher-page" style={{ overflowX: 'hidden', padding: 'clamp(12px, 2.8vw, 24px)' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept={STUDENT_IMPORT_ACCEPT}
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      <section
        className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm"
        style={{ marginBottom: '18px' }}
      >
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(16,185,129,0.12), transparent 32%), radial-gradient(circle at bottom left, rgba(59,130,246,0.10), transparent 30%)' }}
        />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="m-0 text-3xl font-semibold tracking-tight text-slate-900">Students</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
              Current course: {selectedCourse?.name || 'No course selected'}
            </span>
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm">
              {bulkRows.length} queued for bulk import
            </span>
          </div>
        </div>
      </section>

      <div className="stat-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card"><div className="stat-card-value">{courses.length}</div><div className="stat-card-label">Managed Courses</div></div>
        <div className="stat-card"><div className="stat-card-value">{students.length}</div><div className="stat-card-label">Registered Students</div></div>
        <div className="stat-card"><div className="stat-card-value">{filteredTableRows.length}</div><div className="stat-card-label">Visible Enrollment Rows</div></div>
        <div className="stat-card"><div className="stat-card-value">{bulkRows.length}</div><div className="stat-card-label">Rows In Bulk Queue</div></div>
      </div>

      {error && <div className="enroll-alert enroll-alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '18px', marginBottom: '18px' }}>
        <div className="content-card" style={{ background: isDarkMode ? 'linear-gradient(180deg, #0b1220 0%, #0f172a 100%)' : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', boxShadow: isDarkMode ? '0 18px 36px rgba(2, 6, 23, 0.45)' : '0 12px 30px rgba(15, 23, 42, 0.06)' }}>
          <div className="content-card-header" style={{ marginBottom: '14px', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0 }}>Course Context</h2>
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b' }}>Select one course to enroll existing students or assign a fresh registration.</p>
            </div>
            <span className="enroll-badge-count">{selectedCourse ? selectedCourse.name : 'No course selected'}</span>
          </div>
          <div className="content-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: 0 }}>
            <div className="course-form-field">
              <label className="course-form-label" htmlFor="teacher-student-course">Selected Course</label>
              <select
                id="teacher-student-course"
                className="form-input"
                value={selectedCourseId}
                onChange={(event) => setSelectedCourseId(event.target.value)}
              >
                <option value="">No direct course assignment</option>
                {courses.map((course) => (
                  <option key={String(course.id)} value={String(course.id)}>{course.name}</option>
                ))}
              </select>
            </div>

            <div className="course-helper-box" style={{ background: isDarkMode ? '#0b1f38' : '#eff6ff', borderColor: isDarkMode ? '#1d4ed8' : '#bfdbfe', color: isDarkMode ? '#bfdbfe' : '#334155' }}>
              Choose a course once and reuse it for manual registration, bulk imports, and existing-student enrollments.
            </div>

            <div className="course-form-field">
              <label className="course-form-label">Enroll Existing Students</label>

              {/* Search filter for the picker */}
              <input
                id="teacher-enroll-search"
                type="text"
                className="form-input"
                placeholder={selectedCourseId ? `Search ${availableStudents.length} available students...` : 'Pick a course first'}
                value={enrollSearch}
                onChange={(e) => setEnrollSearch(e.target.value)}
                disabled={!selectedCourseId || enrollmentSaving}
                style={{ marginBottom: '8px' }}
              />

              {/* Multi-select checklist */}
              {selectedCourseId && (
                <div
                  style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                    borderRadius: '10px',
                    background: isDarkMode ? '#0f172a' : '#f9fafb',
                  }}
                >
                  {filteredAvailableStudents.length === 0 ? (
                    <div style={{ padding: '16px', fontSize: '13px', color: isDarkMode ? '#64748b' : '#94a3b8', textAlign: 'center' }}>
                      {availableStudents.length === 0
                        ? 'All registered students are already enrolled in this course.'
                        : 'No students match your search.'}
                    </div>
                  ) : (
                    filteredAvailableStudents.map((student) => {
                      const sid = String(student.id);
                      const checked = selectedStudentIds.has(sid);
                      return (
                        <label
                          key={sid}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '9px 14px',
                            cursor: enrollmentSaving ? 'not-allowed' : 'pointer',
                            borderBottom: isDarkMode ? '1px solid #1e293b' : '1px solid #f1f5f9',
                            background: checked ? (isDarkMode ? 'rgba(16,185,129,0.12)' : '#ecfdf5') : 'transparent',
                            transition: 'background 0.15s',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={enrollmentSaving}
                            onChange={() => {
                              setSelectedStudentIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(sid)) next.delete(sid); else next.add(sid);
                                return next;
                              });
                            }}
                            style={{ accentColor: '#10b981', width: '16px', height: '16px', flexShrink: 0 }}
                          />
                          <span style={{ fontSize: '13px', color: isDarkMode ? '#e2e8f0' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {getStudentEnrollmentLabel(student)}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              )}

              {/* Select / deselect all toggle */}
              {selectedCourseId && filteredAvailableStudents.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <span style={{ fontSize: '12px', color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                    {selectedStudentIds.size} selected
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '3px 10px' }}
                    disabled={enrollmentSaving}
                    onClick={() => {
                      const allIds = new Set(filteredAvailableStudents.map((s) => String(s.id)));
                      const allSelected = filteredAvailableStudents.every((s) => selectedStudentIds.has(String(s.id)));
                      setSelectedStudentIds((prev) => {
                        const next = new Set(prev);
                        if (allSelected) {
                          allIds.forEach((id) => next.delete(id));
                        } else {
                          allIds.forEach((id) => next.add(id));
                        }
                        return next;
                      });
                    }}
                  >
                    {filteredAvailableStudents.every((s) => selectedStudentIds.has(String(s.id))) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              )}
            </div>

            {/* Enroll button — available to both TEACHER and ADMIN */}
            {enrollProgress && (
              <div style={{ fontSize: '12px', color: isDarkMode ? '#94a3b8' : '#64748b', textAlign: 'center' }}>
                Enrolling {enrollProgress.current} / {enrollProgress.total}...
              </div>
            )}
            <button
              className="btn btn-primary"
              type="button"
              id="teacher-enroll-btn"
              onClick={() => void handleEnroll()}
              disabled={!selectedCourseId || selectedStudentIds.size === 0 || enrollmentSaving}
              style={{ width: '100%' }}
            >
              {enrollmentSaving
                ? `Enrolling ${enrollProgress ? `${enrollProgress.current}/${enrollProgress.total}` : '...'}` 
                : selectedStudentIds.size > 1
                ? `Enroll ${selectedStudentIds.size} Students`
                : 'Enroll Student'}
            </button>
          </div>
        </div>

        {user?.role === 'ADMIN' && (
          <div className="content-card" style={{ background: isDarkMode ? 'linear-gradient(180deg, #0b1220 0%, #0f172a 100%)' : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', boxShadow: isDarkMode ? '0 18px 36px rgba(2, 6, 23, 0.45)' : '0 12px 30px rgba(15, 23, 42, 0.06)' }}>
            <div className="content-card-header" style={{ marginBottom: '14px' }}>
              <div>
                <h2 style={{ margin: 0 }}>Register One Student</h2>
                <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b' }}>Create a student account and optionally assign it to the selected course immediately.</p>
              </div>
            </div>
            <div className="content-card-body" style={{ paddingTop: 0 }}>
              <form onSubmit={(event) => void handleRegisterStudent(event)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div className="course-form-field">
                    <label className="course-form-label" htmlFor="single-student-name">Full Name</label>
                    <input
                      id="single-student-name"
                      className="form-input"
                      value={singleForm.fullName}
                      onChange={(event) => setSingleForm((previous) => ({ ...previous, fullName: event.target.value }))}
                      placeholder="Jane Doe"
                    />
                  </div>

                  <div className="course-form-field">
                    <label className="course-form-label" htmlFor="single-student-email">Email</label>
                    <input
                      id="single-student-email"
                      type="email"
                      className="form-input"
                      value={singleForm.email}
                      onChange={(event) => setSingleForm((previous) => ({ ...previous, email: event.target.value }))}
                      placeholder="jane@example.com"
                    />
                  </div>

                  <div className="course-form-field">
                    <label className="course-form-label" htmlFor="single-student-reg">Registration Number</label>
                    <input
                      id="single-student-reg"
                      className="form-input"
                      value={singleForm.registrationNumber}
                      onChange={(event) => setSingleForm((previous) => ({ ...previous, registrationNumber: event.target.value }))}
                      placeholder="REG-001"
                    />
                  </div>

                  <div className="course-form-field">
                    <label className="course-form-label" htmlFor="single-student-password">Password</label>
                    <input
                      id="single-student-password"
                      type="password"
                      className="form-input"
                      value={singleForm.password}
                      onChange={(event) => setSingleForm((previous) => ({ ...previous, password: event.target.value }))}
                      placeholder="Temporary password"
                    />
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#4a5568' }}>
                  <input
                    type="checkbox"
                    checked={singleForm.assignToCourse}
                    disabled={!selectedCourseId}
                    onChange={(event) => setSingleForm((previous) => ({ ...previous, assignToCourse: event.target.checked }))}
                  />
                  Assign the new student directly to the selected course
                </label>

                {singleForm.assignToCourse && selectedCourseId && classGroups.length > 0 && (
                  <div className="course-form-field">
                    <label className="course-form-label" htmlFor="single-student-group">Class Group</label>
                    <select
                      id="single-student-group"
                      className="form-input"
                      value={singleForm.classGroupId}
                      onChange={(event) => setSingleForm((previous) => ({ ...previous, classGroupId: event.target.value }))}
                    >
                      <option value="">No class group</option>
                      {classGroups.map((group) => (
                        <option key={String(group.id)} value={String(group.id)}>{group.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" type="submit" disabled={registering}>
                    {registering ? 'Creating...' : singleForm.assignToCourse && selectedCourse ? 'Create And Assign' : 'Create Student'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    disabled={registering}
                    onClick={() => setSingleForm((previous) => ({
                      ...previous,
                      fullName: '',
                      email: '',
                      password: '',
                      registrationNumber: '',
                      classGroupId: '',
                    }))}
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {user?.role === 'ADMIN' && (
        <div className={`content-card students-card ${dragActive ? 'students-drag-active' : ''}`} style={{ marginBottom: '18px', background: isDarkMode ? 'linear-gradient(180deg, #0b1220 0%, #0f172a 100%)' : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', boxShadow: isDarkMode ? '0 18px 36px rgba(2, 6, 23, 0.45)' : '0 12px 30px rgba(15, 23, 42, 0.06)' }}>
          {/* ... bulk import content ... */}
          <div className="content-card-header" style={{ alignItems: 'center', gap: '12px' }}>
            <div>
              <h2 className="students-card-title">Bulk Registration</h2>
              <p className="students-card-sub">CSV, XLSX, and XLS files are supported. PDF import is not automatic yet because roster tables vary too much for reliable parsing.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" type="button" onClick={downloadTemplate}>
                Download Template
              </button>
              <button className="btn-import-excel" type="button" onClick={() => fileInputRef.current?.click()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Choose File</span>
              </button>
            </div>
          </div>

          <div className="content-card-body" style={{ paddingTop: 0 }}>
            <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
              <div style={{ display: 'grid', gap: '16px', alignContent: 'start' }}>
                <div
                  className={`student-dropzone ${dragActive ? 'dragover' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload student roster file"
                  onClick={openBulkFilePicker}
                  onKeyDown={handleDropzoneKeyDown}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setDragActive(false);
                  }}
                  onDrop={handleDrop}
                  style={{
                    borderStyle: 'solid',
                    borderColor: dragActive ? (isDarkMode ? '#7dd3fc' : '#6366f1') : (isDarkMode ? '#475569' : '#c7d2fe'),
                    background: dragActive
                      ? (isDarkMode ? 'linear-gradient(180deg, #14233d 0%, #0f172a 100%)' : 'linear-gradient(180deg, #dde4ff 0%, #ffffff 100%)')
                      : (isDarkMode ? 'linear-gradient(180deg, #132036 0%, #111827 100%)' : 'linear-gradient(180deg, #e8ecf7 0%, #f8fafc 100%)'),
                    minHeight: '220px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: dragActive
                      ? (isDarkMode ? '0 0 0 4px rgba(125,211,252,0.22), 0 24px 50px rgba(2, 6, 23, 0.55)' : '0 0 0 4px rgba(99,102,241,0.18), 0 24px 50px rgba(15, 23, 42, 0.10)')
                      : (isDarkMode ? '0 18px 36px rgba(2, 6, 23, 0.28)' : '0 14px 32px rgba(99, 102, 241, 0.08)'),
                    transform: dragActive ? 'translateY(-1px)' : 'translateY(0)',
                    transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background 180ms ease',
                  }}
                >
                  <div style={{ display: 'grid', gap: '14px', justifyItems: 'center', maxWidth: '540px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '999px', border: `1px solid ${isDarkMode ? '#334155' : '#c7d2fe'}`, background: isDarkMode ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255,255,255,0.9)', color: isDarkMode ? '#cbd5e1' : '#4f46e5', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      <span style={{ height: '8px', width: '8px', borderRadius: '999px', background: dragActive ? '#22c55e' : '#6366f1', boxShadow: dragActive ? '0 0 0 4px rgba(34, 197, 94, 0.14)' : '0 0 0 4px rgba(99, 102, 241, 0.12)' }} />
                      Clickable upload area
                    </div>
                    <div className="student-dropzone-icon" style={{ color: dragActive ? '#6366f1' : '#4f46e5', marginBottom: 0, padding: '14px', borderRadius: '24px', background: isDarkMode ? 'rgba(30, 41, 59, 0.92)' : 'rgba(255,255,255,0.9)', border: `1px solid ${isDarkMode ? '#334155' : '#c7d2fe'}`, boxShadow: '0 10px 24px rgba(79, 70, 229, 0.14)' }}>
                      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <div>
                      <p className="student-dropzone-label" style={{ marginBottom: '4px', fontSize: '18px', fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#0f172a' }}>Drop a student roster here</p>
                      <p className="student-dropzone-hint" style={{ margin: 0, color: isDarkMode ? '#cbd5e1' : '#64748b', fontSize: '14px' }}>or click anywhere in this box to browse files</p>
                      <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '999px', padding: '8px 14px', background: isDarkMode ? '#2563eb' : '#4f46e5', color: '#ffffff', fontSize: '13px', fontWeight: 700, boxShadow: isDarkMode ? '0 12px 24px rgba(37, 99, 235, 0.28)' : '0 12px 24px rgba(79, 70, 229, 0.22)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 5v14" />
                          <path d="M5 12h14" />
                        </svg>
                        Click to browse files
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                      <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">CSV</span>
                      <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">XLSX</span>
                      <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">XLS</span>
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600" style={isDarkMode ? { borderColor: '#334155', background: '#0f172a', color: '#94a3b8' } : undefined}>PDF preview only</span>
                    </div>
                    {bulkFileName ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Loaded file: {bulkFileName}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-500" style={isDarkMode ? { borderColor: '#334155', background: 'rgba(15, 23, 42, 0.72)', color: '#94a3b8' } : undefined}>
                        No file loaded yet. Start with the template or drag a roster file into this area.
                      </div>
                    )}
                  </div>
                </div>

                {importError && <div className="student-alert student-alert-error">{importError}</div>}

                <div style={{ border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`, borderRadius: '18px', background: isDarkMode ? '#0f172a' : '#ffffff', padding: '16px', display: 'grid', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: isDarkMode ? '#cbd5e1' : '#334155', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={bulkAssignToCourse}
                        disabled={!selectedCourseId}
                        onChange={(event) => setBulkAssignToCourse(event.target.checked)}
                      />
                      Assign imported students to the selected course
                    </label>
                    <span className="badge badge-gray">{bulkAssignToCourse ? 'Auto-assign enabled' : 'Import only'}</span>
                  </div>

                  {bulkAssignToCourse && selectedCourseId && classGroups.length > 0 && (
                    <select
                      className="form-input"
                      value={bulkClassGroupId}
                      onChange={(event) => setBulkClassGroupId(event.target.value)}
                    >
                      <option value="">No class group for the batch</option>
                      {classGroups.map((group) => (
                        <option key={String(group.id)} value={String(group.id)}>{group.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => void handleBulkSubmit()}
                    disabled={bulkSaving || bulkRows.length === 0}
                    style={{ width: '100%' }}
                  >
                    {bulkSaving ? (
                      <span>
                        {importProgress 
                          ? `Registering ${importProgress.current} of ${importProgress.total}...` 
                          : 'Registering Students...'}
                      </span>
                    ) : (
                      `Register ${bulkReadyCount} Valid Student${bulkReadyCount === 1 ? '' : 's'}`
                    )}
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    disabled={bulkSaving || bulkRows.length === 0}
                    onClick={() => {
                      setBulkRows([]);
                      setBulkFileName('');
                      setImportError(null);
                    }}
                  >
                    Clear Batch
                  </button>
                </div>

                {bulkRows.length > 0 && (
                  <div className="students-table-wrap" style={{ borderRadius: '16px' }}>
                    <table className="students-table">
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Student</th>
                          <th>Assignment</th>
                          <th>Status</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkRows.map((row) => {
                          const targetCourseId = currentBulkCourseId || row.courseId;
                          const targetClassGroupId = currentBulkCourseId ? bulkClassGroupId || row.classGroupId : row.classGroupId;

                          return (
                            <tr key={row.id}>
                              <td className="students-table-num">{row.rowNumber}</td>
                              <td>
                                <div className="students-table-avatar">
                                  <div className="students-avatar-letter">{row.fullName.trim().charAt(0).toUpperCase() || '?'}</div>
                                  <div>
                                    <div className="students-table-name">{row.fullName || 'Missing name'}</div>
                                    <div className="students-table-email">{row.email || 'Missing email'}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600, fontSize: '12px', color: isDarkMode ? '#e2e8f0' : '#1f2937' }}>{getCourseLabel(targetCourseId)}</div>
                                {targetClassGroupId && (
                                  <div style={{ fontSize: '11px', color: isDarkMode ? '#94a3b8' : '#6b7280', marginTop: '4px' }}>
                                    {getClassGroupLabel(targetClassGroupId)}
                                  </div>
                                )}
                              </td>
                              <td>
                                <span className={`badge ${row.errors.length === 0 ? 'badge-green' : 'badge-red'}`}>
                                  {row.errors.length === 0 ? 'Ready' : row.errors[0]}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="students-remove-btn"
                                  type="button"
                                  onClick={() => setBulkRows((previous) => previous.filter((candidate) => candidate.id !== row.id))}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <aside style={{ border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`, borderRadius: '18px', background: isDarkMode ? 'linear-gradient(180deg, #0f172a 0%, #0b1220 100%)' : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', padding: '18px', display: 'grid', gap: '14px', alignSelf: 'stretch', boxShadow: isDarkMode ? '0 16px 32px rgba(2, 6, 23, 0.45)' : '0 10px 24px rgba(15, 23, 42, 0.04)' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: isDarkMode ? '#e2e8f0' : '#1e293b' }}>Bulk Summary</h3>
                  <p style={{ margin: '6px 0 0', fontSize: '12px', color: isDarkMode ? '#94a3b8' : '#64748b' }}>Review the queue before you submit the batch.</p>
                </div>

                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`, borderRadius: '14px', padding: '12px 14px', background: isDarkMode ? '#0b1220' : '#f8fafc' }}>
                    <span style={{ fontSize: '12px', color: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 600 }}>Ready rows</span>
                    <strong style={{ fontSize: '16px', color: isDarkMode ? '#e2e8f0' : '#0f172a' }}>{bulkReadyCount}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`, borderRadius: '14px', padding: '12px 14px', background: isDarkMode ? '#0b1220' : '#f8fafc' }}>
                    <span style={{ fontSize: '12px', color: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 600 }}>Invalid rows</span>
                    <strong style={{ fontSize: '16px', color: isDarkMode ? '#e2e8f0' : '#0f172a' }}>{bulkInvalidCount}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`, borderRadius: '14px', padding: '12px 14px', background: isDarkMode ? '#0b1220' : '#f8fafc' }}>
                    <span style={{ fontSize: '12px', color: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 600 }}>Course-linked rows</span>
                    <strong style={{ fontSize: '16px', color: isDarkMode ? '#e2e8f0' : '#0f172a' }}>{bulkAssignedCount}</strong>
                  </div>
                </div>

                <div style={{ border: `1px solid ${isDarkMode ? '#1d4ed8' : '#dbeafe'}`, borderRadius: '16px', padding: '14px', background: isDarkMode ? '#0b1f38' : '#eff6ff', color: isDarkMode ? '#bfdbfe' : '#1e3a8a' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Tip</div>
                  <p style={{ margin: '6px 0 0', fontSize: '12px', lineHeight: 1.6 }}>
                    Keep the first rows clean and complete. The preview below shows exactly what will be created before you submit.
                  </p>
                </div>

                <div style={{ borderTop: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`, paddingTop: '14px' }}>
                  <div style={{ marginBottom: '10px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: isDarkMode ? '#94a3b8' : '#64748b' }}>Preview</div>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {bulkPreviewRows.length === 0 ? (
                      <div style={{ fontSize: '12px', color: isDarkMode ? '#64748b' : '#94a3b8' }}>Upload a file to see the first few rows here.</div>
                    ) : bulkPreviewRows.map((row) => (
                      <div key={row.id} style={{ border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`, borderRadius: '14px', padding: '12px 14px', background: isDarkMode ? '#0b1220' : '#fcfcfd' }}>
                        <div style={{ fontWeight: 700, color: isDarkMode ? '#e2e8f0' : '#1e293b', fontSize: '13px' }}>{row.fullName || 'Missing name'}</div>
                        <div style={{ fontSize: '12px', color: isDarkMode ? '#94a3b8' : '#64748b', marginTop: '2px' }}>{row.email || 'Missing email'}</div>
                        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '11px', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                          <span>Row {row.rowNumber}</span>
                          <span className={`badge ${row.errors.length === 0 ? 'badge-green' : 'badge-red'}`} style={{ padding: '3px 8px' }}>
                            {row.errors.length === 0 ? 'Ready' : 'Needs attention'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}

      <div className="content-card" style={{ background: isDarkMode ? 'linear-gradient(180deg, #0b1220 0%, #0f172a 100%)' : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', boxShadow: isDarkMode ? '0 18px 36px rgba(2, 6, 23, 0.45)' : '0 12px 30px rgba(15, 23, 42, 0.06)' }}>
        <div className="content-card-header" style={{ alignItems: 'center', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0 }}>Course Enrollments Table</h2>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b' }}>
              {selectedCourse
                ? `Showing enrolled students for ${selectedCourse.name}.`
                : 'Showing enrolled students across all of your courses.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="enroll-badge-count">{filteredTableRows.length} total rows</span>
            {user?.role !== 'ADMIN' && (
              <span className="badge badge-gray" title="You can only view enrollments. Contact an admin to add or remove students.">View Only</span>
            )}
          </div>
        </div>

        <div className="content-card-body" style={{ paddingTop: 0 }}>
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <input
              className="res-search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, or source..."
            />
            <select
              className="form-input"
              value={tableCourseFilter}
              onChange={(event) => setTableCourseFilter(event.target.value)}
            >
              <option value="ALL">All courses</option>
              {courses.map((course) => (
                <option key={String(course.id)} value={String(course.id)}>{course.name}</option>
              ))}
            </select>
          </div>

          <div className="students-table-wrap hidden md:block" style={{ borderRadius: '16px', overflow: 'hidden' }}>
            {refreshing && filteredTableRows.length === 0 ? (
              <InlineSkeleton rows={5} className="p-6" />
            ) : filteredTableRows.length === 0 ? (
              <div className="students-empty" style={{ padding: '44px 20px' }}>
                <p>{selectedCourseId ? 'No students are linked to this course yet.' : 'No enrolled students were found for your courses yet.'}</p>
              </div>
            ) : (
              <table className="students-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Student</th>
                    <th>Source</th>
                    <th>Enrolled At</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTableRows.map((member) => (
                    <tr key={`${member.courseId}-${member.studentId}`}>
                      <td>
                        <div style={{ display: 'grid', gap: '4px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: isDarkMode ? '#e2e8f0' : '#0f172a' }}>{member.courseName}</div>
                          <div style={{ fontSize: '12px', color: isDarkMode ? '#94a3b8' : '#64748b' }}>Course enrollment</div>
                        </div>
                      </td>
                      <td>
                        <div className="students-table-avatar">
                          <div className="students-avatar-letter">{member.studentName.charAt(0).toUpperCase() || '?'}</div>
                          <div>
                            <div className="students-table-name">{member.studentName}</div>
                            <div className="students-table-email">{member.studentEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-gray">{getMembershipSourceLabel(member.source)}</span>
                      </td>
                      <td>
                        <div style={{ display: 'grid', gap: '2px' }}>
                          <div style={{ fontSize: '12px', color: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 600 }}>Enrolled At</div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: isDarkMode ? '#cbd5e1' : '#334155' }}>{member.enrolledAt ? new Date(member.enrolledAt).toLocaleString() : 'N/A'}</div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {user?.role === 'ADMIN' && (
                          <button
                            className="enroll-remove-btn"
                            type="button"
                            onClick={() => void handleRemove(member)}
                          >
                            Remove
                          </button>
                        )}
                        {user?.role !== 'ADMIN' && <span style={{ fontSize: '11px', color: '#888' }}>No Actions</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="space-y-3 md:hidden">
            {refreshing && filteredTableRows.length === 0 ? (
              <InlineSkeleton rows={4} className="p-4" />
            ) : filteredTableRows.length === 0 ? (
              <div className="students-empty rounded-xl border border-slate-200 bg-white p-4 text-center">
                <p>{selectedCourseId ? 'No students are linked to this course yet.' : 'No enrolled students were found for your courses yet.'}</p>
              </div>
            ) : (
              paginatedTableRows.map((member) => (
                <div key={`mobile-${member.courseId}-${member.studentId}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div style={{ display: 'grid', gap: '4px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: isDarkMode ? '#e2e8f0' : '#0f172a' }}>{member.courseName}</div>
                    <div style={{ fontSize: '12px', color: isDarkMode ? '#94a3b8' : '#64748b' }}>Course enrollment</div>
                  </div>

                  <div className="mt-3 students-table-avatar">
                    <div className="students-avatar-letter">{member.studentName.charAt(0).toUpperCase() || '?'}</div>
                    <div>
                      <div className="students-table-name">{member.studentName}</div>
                      <div className="students-table-email">{member.studentEmail}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="badge badge-gray">{getMembershipSourceLabel(member.source)}</span>
                    <div style={{ fontSize: '12px', color: isDarkMode ? '#94a3b8' : '#64748b' }}>{member.enrolledAt ? new Date(member.enrolledAt).toLocaleString() : 'N/A'}</div>
                  </div>

                  <button
                    className="enroll-remove-btn mt-3 w-full"
                    type="button"
                    onClick={() => void handleRemove(member)}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>

          {filteredTableRows.length > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              marginTop: '16px',
              flexWrap: 'wrap',
            }}>
              <div style={{ fontSize: '12px', color: isDarkMode ? '#94a3b8' : '#666' }}>
                Showing {Math.min((tablePage - 1) * ROWS_PER_PAGE + 1, filteredTableRows.length)}-
                {Math.min(tablePage * ROWS_PER_PAGE, filteredTableRows.length)} of {filteredTableRows.length}
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  type="button"
                  disabled={tablePage <= 1}
                  onClick={() => setTablePage((previous) => Math.max(1, previous - 1))}
                >
                  Previous
                </button>
                <span style={{ fontSize: '12px', fontWeight: 700, color: isDarkMode ? '#cbd5e1' : '#4a5568' }}>
                  Page {tablePage} of {totalTablePages}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  type="button"
                  disabled={tablePage >= totalTablePages}
                  onClick={() => setTablePage((previous) => Math.min(totalTablePages, previous + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseEnrollments;
