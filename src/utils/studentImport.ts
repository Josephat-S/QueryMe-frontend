import * as XLSX from 'xlsx';
import type { Identifier, UserRegistrationPayload } from '../types/queryme';

type StudentImportField = 'fullName' | 'email' | 'password' | 'courseId' | 'classGroupId';

const STUDENT_IMPORT_HEADERS: Record<StudentImportField, string[]> = {
  fullName: ['full_name', 'fullname', 'name', 'student_name', 'student'],
  email: ['email', 'email_address', 'student_email'],
  password: ['password', 'temporary_password', 'temp_password', 'passcode', 'pass'],
  courseId: ['course_id', 'courseid', 'course'],
  classGroupId: ['class_group_id', 'classgroupid', 'class_group', 'classgroup', 'group_id'],
};

const REQUIRED_STUDENT_IMPORT_FIELDS: StudentImportField[] = ['fullName', 'email', 'password'];

export interface StudentImportRow {
  id: string;
  rowNumber: number;
  fullName: string;
  email: string;
  password: string;
  courseId: string;
  classGroupId: string;
  errors: string[];
}

export const STUDENT_IMPORT_ACCEPT = '.csv,.xlsx,.xls';

export const STUDENT_IMPORT_TEMPLATE = [
  'fullName,email,password,courseId,classGroupId',
  'Jane Doe,jane@example.com,Welcome123!,,',
  'John Smith,john@example.com,Welcome123!,,',
].join('\n');

const normalizeText = (value: unknown): string => String(value ?? '').trim();

const normalizeHeader = (value: unknown): string => normalizeText(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const getHeaderMap = (headerRow: unknown[]): Partial<Record<StudentImportField, number>> => {
  const headerMap: Partial<Record<StudentImportField, number>> = {};

  headerRow.forEach((headerValue, index) => {
    const normalizedHeader = normalizeHeader(headerValue);

    (Object.keys(STUDENT_IMPORT_HEADERS) as StudentImportField[]).forEach((field) => {
      if (headerMap[field] !== undefined) {
        return;
      }

      if (STUDENT_IMPORT_HEADERS[field].includes(normalizedHeader)) {
        headerMap[field] = index;
      }
    });
  });

  return headerMap;
};

const getRowValue = (
  row: unknown[],
  headerMap: Partial<Record<StudentImportField, number>>,
  field: StudentImportField,
): string => {
  const index = headerMap[field];
  return typeof index === 'number' ? normalizeText(row[index]) : '';
};

const validateStudentImportRow = (row: StudentImportRow): string[] => {
  const errors: string[] = [];

  if (!row.fullName) {
    errors.push('Full name is required.');
  }

  if (!row.email) {
    errors.push('Email is required.');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    errors.push('Email format looks invalid.');
  }

  if (!row.password) {
    errors.push('Password is required.');
  }

  return errors;
};

export const parseStudentImportFile = async (file: File): Promise<StudentImportRow[]> => {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.pdf')) {
    throw new Error('PDF import is not supported yet. Please export the list to CSV or Excel first.');
  }

  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: 'array',
    raw: false,
  });

  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error('The selected file does not contain any worksheets.');
  }

  const firstSheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
    header: 1,
    defval: '',
    blankrows: false,
    raw: false,
  });

  const nonEmptyRows = rows.filter((row) => Array.isArray(row) && row.some((cell) => normalizeText(cell)));

  if (nonEmptyRows.length < 2) {
    throw new Error('Upload a file with a header row and at least one student entry.');
  }

  const headerMap = getHeaderMap(nonEmptyRows[0]);
  const missingRequiredHeaders = REQUIRED_STUDENT_IMPORT_FIELDS.filter((field) => headerMap[field] === undefined);

  if (missingRequiredHeaders.length > 0) {
    throw new Error(`Missing required columns: ${missingRequiredHeaders.join(', ')}.`);
  }

  const parsedRows = nonEmptyRows.slice(1).map((row, index) => {
    const studentRow: StudentImportRow = {
      id: `${file.name}-${index}`,
      rowNumber: index + 2,
      fullName: getRowValue(row, headerMap, 'fullName'),
      email: getRowValue(row, headerMap, 'email').toLowerCase(),
      password: getRowValue(row, headerMap, 'password'),
      courseId: getRowValue(row, headerMap, 'courseId'),
      classGroupId: getRowValue(row, headerMap, 'classGroupId'),
      errors: [],
    };

    studentRow.errors = validateStudentImportRow(studentRow);
    return studentRow;
  });

  const emailCounts = new Map<string, number>();
  parsedRows.forEach((row) => {
    if (row.email) {
      emailCounts.set(row.email, (emailCounts.get(row.email) || 0) + 1);
    }
  });

  return parsedRows.map((row) => ({
    ...row,
    errors: [
      ...row.errors,
      ...(row.email && (emailCounts.get(row.email) || 0) > 1 ? ['Duplicate email in import file.'] : []),
    ],
  }));
};

export const buildStudentRegistrationPayload = (
  row: Pick<StudentImportRow, 'fullName' | 'email' | 'password' | 'courseId' | 'classGroupId'>,
  overrides?: {
    courseId?: Identifier | '' | null;
    classGroupId?: Identifier | '' | null;
  },
): UserRegistrationPayload => {
  const courseId = overrides?.courseId ?? row.courseId;
  const classGroupId = overrides?.classGroupId ?? row.classGroupId;

  return {
    fullName: row.fullName.trim(),
    email: row.email.trim().toLowerCase(),
    password: row.password.trim(),
    ...(courseId ? { courseId } : {}),
    ...(classGroupId ? { classGroupId } : {}),
  };
};
