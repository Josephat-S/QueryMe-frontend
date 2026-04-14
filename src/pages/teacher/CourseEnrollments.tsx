import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { courseApi, userApi, type ClassGroup, type Course, type CourseEnrollment, type PlatformUser } from '../../api';
import { useAuth } from '../../contexts';
import { useToast } from '../../components/ToastProvider';
import { extractErrorMessage } from '../../utils/errorUtils';
import { filterCoursesByTeacher, getUserDisplayName } from '../../utils/queryme';
import {
  buildStudentRegistrationPayload,
  parseStudentImportFile,
  STUDENT_IMPORT_ACCEPT,
  STUDENT_IMPORT_TEMPLATE,
  type StudentImportRow,
} from '../../utils/studentImport';
import './TeacherPages.css';

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
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<PlatformUser[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [allEnrollments, setAllEnrollments] = useState<CourseEnrollment[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [singleForm, setSingleForm] = useState<SingleStudentFormState>({
    fullName: '',
    email: '',
    password: '',
    assignToCourse: false,
    classGroupId: '',
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
  const [bulkSaving, setBulkSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const requestedCourseId = searchParams.get('courseId') || '';

  const loadBaseData = useCallback(async (signal?: AbortSignal) => {
    if (!user) {
      setCourses([]);
      setStudents([]);
      setClassGroups([]);
      setAllEnrollments([]);
      setEnrollments([]);
      setSelectedCourseId('');
      return;
    }

    const [allCourses, allStudents, enrollmentRows] = await Promise.all([
      courseApi.getCourses(signal),
      userApi.getStudents(signal),
      courseApi.getEnrollments(signal).catch(() => [] as CourseEnrollment[]),
    ]);

    const teacherCourses = filterCoursesByTeacher(allCourses, user.id);
    const teacherCourseIds = new Set(teacherCourses.map((course) => String(course.id)));

    setCourses(teacherCourses);
    setStudents(allStudents);
    setAllEnrollments(enrollmentRows.filter((row) => teacherCourseIds.has(getEnrollmentCourseId(row))));
    setSelectedCourseId((previous) => {
      if (previous && teacherCourses.some((course) => String(course.id) === previous)) {
        return previous;
      }

      if (requestedCourseId && teacherCourses.some((course) => String(course.id) === requestedCourseId)) {
        return requestedCourseId;
      }

      return teacherCourses[0] ? String(teacherCourses[0].id) : '';
    });
  }, [requestedCourseId, user]);

  const loadCourseContext = useCallback(async (courseId: string, signal?: AbortSignal) => {
    if (!courseId) {
      setEnrollments([]);
      setClassGroups([]);
      return;
    }

    const [courseEnrollments, courseClassGroups] = await Promise.all([
      courseApi.getEnrollmentsByCourse(courseId, signal).catch(() => [] as CourseEnrollment[]),
      courseApi.getClassGroupsByCourse(courseId, signal).catch(() => [] as ClassGroup[]),
    ]);

    setEnrollments(courseEnrollments);
    setClassGroups(courseClassGroups);
  }, []);

  const refreshMembershipState = useCallback(async (courseId: string, signal?: AbortSignal) => {
    const [allStudents, everyEnrollment, courseEnrollments, courseClassGroups] = await Promise.all([
      userApi.getStudents(signal),
      courseApi.getEnrollments(signal).catch(() => [] as CourseEnrollment[]),
      courseId ? courseApi.getEnrollmentsByCourse(courseId, signal).catch(() => [] as CourseEnrollment[]) : Promise.resolve([] as CourseEnrollment[]),
      courseId ? courseApi.getClassGroupsByCourse(courseId, signal).catch(() => [] as ClassGroup[]) : Promise.resolve([] as ClassGroup[]),
    ]);
    const teacherCourseIds = new Set(courses.map((course) => String(course.id)));

    setStudents(allStudents);
    setAllEnrollments(everyEnrollment.filter((row) => teacherCourseIds.has(getEnrollmentCourseId(row))));
    setEnrollments(courseEnrollments);
    setClassGroups(courseClassGroups);
  }, [courses]);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    void loadBaseData(controller.signal)
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(extractErrorMessage(err, 'Failed to load courses or students.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [loadBaseData]);

  useEffect(() => {
    const controller = new AbortController();

    if (!selectedCourseId) {
      setEnrollments([]);
      setClassGroups([]);
      setSelectedStudentId('');
      return () => controller.abort();
    }

    setRefreshing(true);
    setError(null);

    void loadCourseContext(selectedCourseId, controller.signal)
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(extractErrorMessage(err, 'Failed to load the selected course context.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setRefreshing(false);
        }
      });

    return () => controller.abort();
  }, [loadCourseContext, selectedCourseId]);

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

  const memberRows = useMemo(() => {
    if (!selectedCourseId) {
      return [];
    }

    return buildCourseMemberRows(courses, students, enrollments, selectedCourseId);
  }, [courses, enrollments, selectedCourseId, students]);

  const tableRows = useMemo(() => {
    const baseRows = selectedCourseId
      ? buildCourseMemberRows(courses, students, allEnrollments, selectedCourseId)
      : buildCourseMemberRows(courses, students, allEnrollments);

    return baseRows.filter((member) => {
      const haystack = `${member.courseName} ${member.studentName} ${member.studentEmail} ${getMembershipSourceLabel(member.source)}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [allEnrollments, courses, search, selectedCourseId, students]);

  const enrolledStudentIds = useMemo(
    () => new Set(memberRows.map((row) => row.studentId)),
    [memberRows],
  );

  const availableStudents = useMemo(
    () => [...students]
      .filter((student) => !enrolledStudentIds.has(String(student.id)))
      .sort((left, right) => getStudentEnrollmentLabel(left).localeCompare(getStudentEnrollmentLabel(right))),
    [enrolledStudentIds, students],
  );

  const validBulkRows = useMemo(
    () => bulkRows.filter((row) => row.errors.length === 0),
    [bulkRows],
  );

  const totalTablePages = Math.max(1, Math.ceil(tableRows.length / ROWS_PER_PAGE));
  const paginatedTableRows = useMemo(
    () => tableRows.slice((tablePage - 1) * ROWS_PER_PAGE, tablePage * ROWS_PER_PAGE),
    [tablePage, tableRows],
  );

  useEffect(() => {
    setTablePage(1);
  }, [search, selectedCourseId]);

  useEffect(() => {
    if (tablePage > totalTablePages) {
      setTablePage(totalTablePages);
    }
  }, [tablePage, totalTablePages]);

  const currentBulkCourseId = bulkAssignToCourse ? selectedCourseId : '';

  const getCourseLabel = (courseId: string): string => {
    if (!courseId) {
      return 'No direct course assignment';
    }

    return courses.find((course) => String(course.id) === courseId)?.name || `Course ${courseId}`;
  };

  const getClassGroupLabel = (classGroupId: string): string => {
    if (!classGroupId) {
      return '';
    }

    return classGroups.find((group) => String(group.id) === classGroupId)?.name || `Group ${classGroupId}`;
  };

  const handleEnroll = async () => {
    if (!selectedCourseId || !selectedStudentId) {
      return;
    }

    setEnrollmentSaving(true);
    setError(null);

    try {
      await courseApi.createEnrollment({ courseId: selectedCourseId, studentId: selectedStudentId });
      await refreshMembershipState(selectedCourseId);
      setSelectedStudentId('');
      showToast('success', 'Student enrolled', 'The selected student was added to the course.');
    } catch (err) {
      if (isNullParseEnrollmentError(err)) {
        try {
          await userApi.updateStudent(selectedStudentId, { courseId: selectedCourseId });
          await refreshMembershipState(selectedCourseId);
          setSelectedStudentId('');
          showToast('success', 'Student assigned', 'The enrollment endpoint rejected the request, so the student was linked through the student profile API instead.');
        } catch (fallbackErr) {
          setError(extractErrorMessage(fallbackErr, 'Failed to assign the selected student to the course.'));
        }
      } else {
        setError(extractErrorMessage(err, 'Failed to enroll the selected student.'));
      }
    } finally {
      setEnrollmentSaving(false);
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

      await refreshMembershipState(selectedCourseId || targetCourseId);
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
        password: singleForm.password,
        courseId: singleForm.assignToCourse ? selectedCourseId : '',
        classGroupId: singleForm.assignToCourse ? singleForm.classGroupId : '',
      });

      const createdStudent = await userApi.registerStudent(payload);
      await refreshMembershipState(selectedCourseId);
      setSingleForm((previous) => ({
        ...previous,
        fullName: '',
        email: '',
        password: '',
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
    setImportError(null);

    try {
      const payloads = validBulkRows.map((row) => buildStudentRegistrationPayload(row, {
        courseId: currentBulkCourseId || row.courseId,
        classGroupId: currentBulkCourseId ? bulkClassGroupId || row.classGroupId : row.classGroupId,
      }));

      const createdStudents = await userApi.registerStudentsBulk(payloads);
      await refreshMembershipState(selectedCourseId);
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

  if (loading) {
    return <div className="teacher-page" style={{ padding: '24px' }}>Loading course enrollments...</div>;
  }

  return (
    <div className="teacher-page" style={{ overflow: 'hidden', padding: '24px' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept={STUDENT_IMPORT_ACCEPT}
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      <div className="page-header">
        <h1>Students</h1>
        <p>Register student accounts, bulk-import rosters, and attach them directly to your courses using the documented backend endpoints.</p>
      </div>

      <div className="stat-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card"><div className="stat-card-value">{courses.length}</div><div className="stat-card-label">Managed Courses</div></div>
        <div className="stat-card"><div className="stat-card-value">{students.length}</div><div className="stat-card-label">Registered Students</div></div>
        <div className="stat-card"><div className="stat-card-value">{tableRows.length}</div><div className="stat-card-label">Visible Enrollment Rows</div></div>
        <div className="stat-card"><div className="stat-card-value">{bulkRows.length}</div><div className="stat-card-label">Rows In Bulk Queue</div></div>
      </div>

      {error && <div className="enroll-alert enroll-alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px', marginBottom: '18px' }}>
        <div className="content-card">
          <div className="content-card-header">
            <h2>Course Context</h2>
            <span className="enroll-badge-count">{selectedCourse ? selectedCourse.name : 'No course selected'}</span>
          </div>
          <div className="content-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

            <div className="course-helper-box">
              Choose a course once and reuse it for manual registration, bulk imports, and existing-student enrollments.
            </div>

            <div className="course-form-field">
              <label className="course-form-label" htmlFor="teacher-existing-student">Enroll Existing Student</label>
              <select
                id="teacher-existing-student"
                className="form-input"
                value={selectedStudentId}
                onChange={(event) => setSelectedStudentId(event.target.value)}
                disabled={!selectedCourseId}
              >
                <option value="">{selectedCourseId ? 'Select student to enroll' : 'Pick a course first'}</option>
                {availableStudents.map((student) => (
                  <option key={String(student.id)} value={String(student.id)}>
                    {getStudentEnrollmentLabel(student)}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="btn btn-primary"
              type="button"
              onClick={() => void handleEnroll()}
              disabled={!selectedCourseId || !selectedStudentId || enrollmentSaving}
            >
              {enrollmentSaving ? 'Saving...' : 'Enroll Existing Student'}
            </button>
          </div>
        </div>

        <div className="content-card">
          <div className="content-card-header">
            <h2>Register One Student</h2>
          </div>
          <div className="content-card-body">
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
                    classGroupId: '',
                  }))}
                >
                  Clear
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className={`content-card students-card ${dragActive ? 'students-drag-active' : ''}`} style={{ marginBottom: '18px' }}>
        <div className="content-card-header" style={{ alignItems: 'center' }}>
          <div>
            <h2 className="students-card-title">Bulk Registration</h2>
            <p className="students-card-sub">CSV, XLSX, and XLS files are supported. PDF import is not automatic yet because roster tables vary too much for reliable parsing.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" type="button" onClick={downloadTemplate}>
              Download Template
            </button>
            <button className="btn-import-excel" type="button" onClick={() => fileInputRef.current?.click()}>
              Choose File
            </button>
          </div>
        </div>

        <div className="content-card-body">
          <div
            className={`student-dropzone ${dragActive ? 'dragover' : ''}`}
            onClick={() => fileInputRef.current?.click()}
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
          >
            <div className="student-dropzone-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="student-dropzone-label">Drop a student roster here or click to browse</p>
            <p className="student-dropzone-hint">Required columns: `fullName`, `email`, `password`. Optional: `courseId`, `classGroupId`.</p>
            {bulkFileName && <p className="student-dropzone-hint" style={{ marginTop: '8px', color: '#4c1d95' }}>Loaded file: {bulkFileName}</p>}
          </div>

          {importError && <div className="student-alert student-alert-error">{importError}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#4a5568' }}>
              <input
                type="checkbox"
                checked={bulkAssignToCourse}
                disabled={!selectedCourseId}
                onChange={(event) => setBulkAssignToCourse(event.target.checked)}
              />
              Assign imported students to the selected course
            </label>

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

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: bulkRows.length > 0 ? '16px' : 0 }}>
            <button className="btn btn-primary" type="button" onClick={() => void handleBulkSubmit()} disabled={bulkSaving || bulkRows.length === 0}>
              {bulkSaving ? 'Registering Batch...' : `Register ${validBulkRows.length || 0} Students`}
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
            <div className="students-table-wrap">
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
                          <div style={{ fontWeight: 600, fontSize: '12px', color: '#1f2937' }}>{getCourseLabel(targetCourseId)}</div>
                          {targetClassGroupId && (
                            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
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
      </div>

      <div className="content-card">
        <div className="content-card-header">
          <div>
            <h2>Course Enrollments Table</h2>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#666' }}>
              {selectedCourse
                ? `Showing enrolled students for ${selectedCourse.name}.`
                : 'Showing enrolled students across all of your courses.'}
            </p>
          </div>
          <span className="enroll-badge-count">{tableRows.length} total rows</span>
        </div>

        <div className="content-card-body" style={{ paddingTop: 0 }}>
          <div style={{ marginBottom: '16px' }}>
            <input
              className="res-search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, or source..."
            />
          </div>

          <div className="students-table-wrap">
            {refreshing && tableRows.length === 0 ? (
              <div style={{ padding: '24px' }}>Loading course enrollments...</div>
            ) : tableRows.length === 0 ? (
              <div className="students-empty" style={{ padding: '40px 20px' }}>
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
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTableRows.map((member) => (
                    <tr key={`${member.courseId}-${member.studentId}`}>
                      <td>
                        <div className="students-table-name">{member.courseName}</div>
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
                      <td>{member.enrolledAt ? new Date(member.enrolledAt).toLocaleString() : 'N/A'}</td>
                      <td>
                        <button className="enroll-remove-btn" type="button" onClick={() => void handleRemove(member)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {tableRows.length > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              marginTop: '16px',
              flexWrap: 'wrap',
            }}>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Showing {Math.min((tablePage - 1) * ROWS_PER_PAGE + 1, tableRows.length)}-
                {Math.min(tablePage * ROWS_PER_PAGE, tableRows.length)} of {tableRows.length}
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
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#4a5568' }}>
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
