// API Service for QueryMe Backend
// Base URL: http://localhost:8080

// Types
export interface User {
  id: string;
  email: string;
  name?: string;
  fullName?: string;
  role?: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'GUEST';
  roles?: string[];
}

export interface Course {
  id: string;
  name: string;
  description?: string;
  teacherId?: string;
}

export interface ClassGroup {
  id: string;
  name: string;
  courseId: string;
  teacherId?: string;
}

export interface Question {
  id: string;
  examId: string;
  prompt: string;
  marks: number;
  referenceQuery: string;  // Expected query (backend calls it referenceQuery)
  orderIndex?: number;     // Order of question in exam
  orderSensitive?: boolean;
  partialMarks?: boolean;
}

export interface Exam {
  id: string;
  title: string;
  courseId: string;
  course?: Course;
  description?: string;
  maxAttempts: number;
  timeLimit?: number; // in minutes (legacy field)
  timeLimitMins?: number;
  publishedAt?: string;
  startTime?: string;
  endTime?: string;
  status?: 'draft' | 'published' | 'active' | 'closed';
  teacherId?: string;
  teacher?: User;
  questions?: Question[];
  visibilityMode?: string;
  seedSql?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateExamInput {
  title: string;
  courseId: string;
  description?: string;
  maxAttempts?: number;
  timeLimitMins?: number;
  visibilityMode?: string;
  seedSql?: string;
  startTime?: string;
  endTime?: string;
  teacherId?: string;
}

export interface ExamSession {
  id: string;
  examId: string;
  studentId: string;
  status: 'started' | 'submitted' | 'timed_out';
  startedAt: string;
  submittedAt?: string;
  answers: Record<string, string>; // questionId -> query
  score?: number;
  totalMarks?: number;
}

export interface Result {
  sessionId: string;
  examId: string;
  studentId: string;
  student?: User;
  score: number;
  totalMarks: number;
  percentage: number;
  submittedAt: string;
  answers: Record<string, { query: string; correct: boolean; marks: number }>;
}

export interface QuerySubmission {
  query: string;
  examId: string;
  questionId: string;
}

export interface QueryResult {
  success: boolean;
  data?: any[];
  error?: string;
  executionTime?: number;
}

export interface Sandbox {
  examId: string;
  studentId: string;
  provisionedAt: string;
  expiresAt: string;
}

// API Base Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');
  const url = `${API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Use raw text if not JSON
        if (errorText) errorMessage = errorText;
      }
      throw new ApiError(response.status, errorMessage);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return {} as T;
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(0, error instanceof Error ? error.message : 'Network error');
  }
}

// Authentication APIs
export const authApi = {
  signin: async (email: string, password: string): Promise<{ token: string; user?: User }> => {
    const response = await apiRequest<{ 
      token: string; 
      user?: User;
      id?: string;
      name?: string;
      roles?: string[];
    }>('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Normalize response: backend may return flat structure or nested user object
    if (response.user) {
      return { token: response.token, user: response.user };
    } else if (response.id) {
      // Flatten response into user object
      return {
        token: response.token,
        user: {
          id: response.id,
          email,
          name: response.name,
          roles: response.roles,
        },
      };
    }
    return response;
  },

  signup: async (name: string, email: string, password: string, role: string): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
  },
};

// User Management APIs
export const userApi = {
  // Admin APIs
  registerAdmin: (adminData: Partial<User>) =>
    apiRequest<User>('/api/admins/register', {
      method: 'POST',
      body: JSON.stringify(adminData),
    }),

  updateAdmin: (id: string, adminData: Partial<User>) =>
    apiRequest<User>(`/api/admins/${id}`, {
      method: 'PUT',
      body: JSON.stringify(adminData),
    }),

  getAdmins: () => apiRequest<User[]>('/api/admins'),

  // Teacher APIs
  registerTeacher: (teacherData: Partial<User>) =>
    apiRequest<User>('/api/teachers/register', {
      method: 'POST',
      body: JSON.stringify(teacherData),
    }),

  updateTeacher: (id: string, teacherData: Partial<User>) =>
    apiRequest<User>(`/api/teachers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(teacherData),
    }),

  getTeachers: () => apiRequest<User[]>('/api/teachers'),

  // Student APIs
  registerStudent: (studentData: Partial<User>) =>
    apiRequest<User>('/api/students/register', {
      method: 'POST',
      body: JSON.stringify(studentData),
    }),

  updateStudent: (id: string, studentData: Partial<User>) =>
    apiRequest<User>(`/api/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(studentData),
    }),

  getStudents: () => apiRequest<User[]>('/api/students'),

  getStudent: (id: string) => apiRequest<User>(`/api/students/${id}`),

  // Guest APIs
  registerGuest: (guestData: Partial<User>) =>
    apiRequest<User>('/api/guests/register', {
      method: 'POST',
      body: JSON.stringify(guestData),
    }),

  updateGuest: (id: string, guestData: Partial<User>) =>
    apiRequest<User>(`/api/guests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(guestData),
    }),

  getGuests: () => apiRequest<User[]>('/api/guests'),
};

// Course & Class Management
export const courseApi = {
  createCourse: (courseData: Omit<Course, 'id'>) =>
    apiRequest<Course>('/api/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    }),

  getCourses: () => apiRequest<Course[]>('/api/courses'),

  createClassGroup: (classData: Omit<ClassGroup, 'id'>) =>
    apiRequest<ClassGroup>('/api/class-groups', {
      method: 'POST',
      body: JSON.stringify(classData),
    }),

  getClassGroups: () => apiRequest<ClassGroup[]>('/api/class-groups'),

  getClassGroupsByCourse: (courseId: string) =>
    apiRequest<ClassGroup[]>(`/api/class-groups/course/${courseId}`),
};

// Exam Management
export const examApi = {
  createExam: (examData: CreateExamInput) =>
    apiRequest<Exam>('/api/exams', {
      method: 'POST',
      body: JSON.stringify(examData),
    }),

  getExam: (examId: string) => apiRequest<Exam>(`/api/exams/${examId}`),

  getExamsByCourse: (courseId: string) =>
    apiRequest<Exam[]>(`/api/exams/course/${courseId}`),

  getPublishedExams: () => apiRequest<Exam[]>('/api/exams/published'),

  updateExam: (examId: string, examData: Partial<Exam>) =>
    apiRequest<Exam>(`/api/exams/${examId}`, {
      method: 'PUT',
      body: JSON.stringify(examData),
    }),

  deleteExam: (examId: string) =>
    apiRequest<void>(`/api/exams/${examId}`, {
      method: 'DELETE',
    }),

  publishExam: (examId: string) =>
    apiRequest<Exam>(`/api/exams/${examId}/publish`, {
      method: 'PATCH',
    }),

  unpublishExam: (examId: string) =>
    apiRequest<Exam>(`/api/exams/${examId}/unpublish`, {
      method: 'PATCH',
    }),

  closeExam: (examId: string) =>
    apiRequest<Exam>(`/api/exams/${examId}/close`, {
      method: 'PATCH',
    }),

  addQuestion: (examId: string, questionData: Omit<Question, 'id' | 'examId'>) =>
    apiRequest<Question>(`/api/exams/${examId}/questions`, {
      method: 'POST',
      body: JSON.stringify({
        prompt: questionData.prompt,
        referenceQuery: questionData.referenceQuery,
        marks: questionData.marks,
        orderIndex: questionData.orderIndex || 1,
        orderSensitive: questionData.orderSensitive || false,
        partialMarks: questionData.partialMarks || false,
      }),
    }),
};

// Question Management
export const questionApi = {
  addQuestion: (examId: string, questionData: Omit<Question, 'id' | 'examId'>) =>
    apiRequest<Question>(`/api/exams/${examId}/questions`, {
      method: 'POST',
      body: JSON.stringify({
        prompt: questionData.prompt,
        referenceQuery: questionData.referenceQuery,
        marks: questionData.marks,
        orderIndex: questionData.orderIndex || 1,
        orderSensitive: questionData.orderSensitive || false,
        partialMarks: questionData.partialMarks || false,
      }),
    }),

  getQuestions: (examId: string) =>
    apiRequest<Question[]>(`/api/exams/${examId}/questions`),
};

// Exam Sessions
export const sessionApi = {
  startSession: (examId: string, studentId?: string) =>{
    const body: { examId: string; studentId?: string } = { examId };
    if (studentId) {
      body.studentId = studentId;
    }
    return apiRequest<ExamSession>('/api/sessions/start', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  submitSession: (sessionId: string, answers: Record<string, string>) =>
    apiRequest<ExamSession>(`/api/sessions/${sessionId}/submit`, {
      method: 'PATCH',
      body: JSON.stringify({ answers }),
    }),

  getSession: (sessionId: string) =>
    apiRequest<ExamSession>(`/api/sessions/${sessionId}`),

  getSessionsByExam: (examId: string) =>
    apiRequest<ExamSession[]>(`/api/sessions/exam/${examId}`),

  getSessionsByStudent: (studentId: string) =>
    apiRequest<ExamSession[]>(`/api/sessions/student/${studentId}`),
};

// Query Execution
export const queryApi = {
  submitQuery: (submission: QuerySubmission) =>
    apiRequest<QueryResult>('/api/query/submit', {
      method: 'POST',
      body: JSON.stringify(submission),
    }),
};

// Results
export const resultApi = {
  getResult: (sessionId: string) =>
    apiRequest<Result>(`/api/results/session/${sessionId}`),

  getExamResults: (examId: string) =>
    apiRequest<Result[]>(`/api/results/exam/${examId}/dashboard`),
};

// Sandbox Management
export const sandboxApi = {
  provisionSandbox: (examId: string, studentId: string) =>
    apiRequest<Sandbox>('/api/sandboxes/provision', {
      method: 'POST',
      body: JSON.stringify({ examId, studentId }),
    }),

  getSandbox: (examId: string, studentId: string) =>
    apiRequest<Sandbox>(`/api/sandboxes/${examId}/students/${studentId}`),

  deleteSandbox: (examId: string, studentId: string) =>
    apiRequest<void>(`/api/sandboxes/${examId}/students/${studentId}`, {
      method: 'DELETE',
    }),
};

// Utility functions
export const apiUtils = {
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('queryme_user');
    return !!token && !!user;
  },
  getToken: () => localStorage.getItem('token'),
  clearAuth: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('queryme_user');
  },
};