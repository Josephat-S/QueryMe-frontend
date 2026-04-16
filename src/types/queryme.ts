export type Identifier = string | number;

export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'GUEST';

export type VisibilityMode = 'IMMEDIATE' | 'END_OF_EXAM' | 'NEVER' | string;

export interface ApiResponse<T> {
  success?: boolean;
  data: T;
  message?: string;
  timestamp?: string;
}

export interface PlatformUser {
  id: Identifier;
  email: string;
  name?: string;
  fullName?: string;
  studentNumber?: string;
  student_number?: string;
  role?: UserRole | string;
  roles?: string[];
  courseId?: Identifier | null;
  classGroupId?: Identifier | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface AuthSessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user?: PlatformUser;
  id?: Identifier;
  email?: string;
  name?: string;
  fullName?: string;
  role?: UserRole | string;
  roles?: string[];
}

export interface SignupPayload {
  fullName: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface Course {
  id: Identifier;
  name: string;
  description?: string;
  teacherId?: Identifier | null;
  teacherName?: string;
  [key: string]: unknown;
}

export interface CreateCoursePayload {
  name: string;
  description?: string;
}

export interface ClassGroup {
  id: Identifier;
  name: string;
  courseId: Identifier;
  teacherId?: Identifier | null;
  [key: string]: unknown;
}

export interface CreateClassGroupPayload {
  name: string;
  courseId: Identifier;
}

export interface CourseEnrollment {
  id?: Identifier;
  courseId: Identifier;
  studentId: Identifier;
  enrolledAt?: string;
  course?: Course;
  student?: PlatformUser;
  studentName?: string;
  studentEmail?: string;
  [key: string]: unknown;
}

export interface CourseEnrollmentPayload {
  courseId: Identifier;
  studentId: Identifier;
}

export interface Exam {
  id: Identifier;
  courseId: Identifier;
  title: string;
  description?: string;
  maxAttempts?: number;
  timeLimit?: number;
  timeLimitMins?: number;
  visibilityMode?: VisibilityMode;
  seedSql?: string;
  status?: string;
  publishedAt?: string;
  startTime?: string;
  endTime?: string;
  createdAt?: string;
  updatedAt?: string;
  course?: Course;
  teacher?: PlatformUser;
  questions?: Question[];
  [key: string]: unknown;
}

export interface CreateExamPayload {
  courseId: Identifier;
  title: string;
  description?: string;
  visibilityMode?: VisibilityMode;
  timeLimitMins?: number;
  maxAttempts?: number;
  seedSql?: string;
  startTime?: string;
  endTime?: string;
}

export type UpdateExamPayload = Partial<CreateExamPayload>;

export interface Question {
  id: Identifier;
  examId?: Identifier;
  prompt: string;
  referenceQuery?: string;
  marks: number;
  orderIndex?: number;
  orderSensitive?: boolean;
  partialMarks?: boolean;
  [key: string]: unknown;
}

export interface QuestionPayload {
  prompt: string;
  referenceQuery: string;
  marks: number;
  orderIndex?: number;
  orderSensitive?: boolean;
  partialMarks?: boolean;
}

export interface Session {
  id: Identifier;
  examId: Identifier;
  studentId: Identifier;
  startedAt?: string;
  submittedAt?: string | null;
  expiresAt?: string;
  sandboxSchema?: string;
  isSubmitted?: boolean;
  isExpired?: boolean;
  status?: string;
  [key: string]: unknown;
}

export interface StartSessionPayload {
  examId: Identifier;
  studentId?: Identifier;
}

export interface QuerySubmissionPayload {
  sessionId?: Identifier;
  examId: Identifier;
  questionId: Identifier;
  studentId?: Identifier;
  query: string;
}

export interface QuerySubmissionResponse {
  submissionId?: Identifier;
  sessionId?: Identifier;
  isCorrect?: boolean;
  score?: number;
  executionError?: string | null;
  resultsVisible?: boolean;
  resultColumns?: string[];
  resultRows?: unknown[][];
  [key: string]: unknown;
}

export interface StudentExamQuestionResult {
  questionId: Identifier;
  prompt: string;
  submittedQuery?: string | null;
  score?: number;
  maxScore?: number;
  isCorrect?: boolean;
  submittedAt?: string | null;
  resultColumns?: string[];
  resultRows?: unknown[][];
}

export interface StudentExamResult {
  sessionId: Identifier;
  examId: Identifier;
  studentId: Identifier;
  visibilityMode?: VisibilityMode;
  visible?: boolean;
  totalScore?: number;
  totalMaxScore?: number;
  questions?: StudentExamQuestionResult[];
  [key: string]: unknown;
}

export interface TeacherResultRow {
  studentId: Identifier;
  studentName?: string;
  sessionId: Identifier;
  questionId: Identifier;
  questionPrompt?: string;
  score?: number;
  maxScore?: number;
  isCorrect?: boolean;
  submittedQuery?: string;
  submittedAt?: string;
  [key: string]: unknown;
}

export interface SandboxInfo {
  examId: Identifier;
  studentId: Identifier;
  schemaName?: string;
  sandboxSchema?: string;
  provisionedAt?: string;
  expiresAt?: string;
  jdbcUrl?: string;
  username?: string;
  [key: string]: unknown;
}

export interface UserRegistrationPayload {
  fullName: string;
  email: string;
  password?: string;
  studentNumber?: string;
  student_number?: string;
  courseId?: Identifier | null;
  classGroupId?: Identifier | null;
}

export interface UserUpdatePayload {
  fullName?: string;
  email?: string;
  password?: string;
  studentNumber?: string | null;
  student_number?: string | null;
  courseId?: Identifier | null;
  classGroupId?: Identifier | null;
}
