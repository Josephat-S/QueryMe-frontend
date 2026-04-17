import axiosInstance from './axiosInstance';
import { unwrapResponse } from './helpers';
import type {
  ClassGroup,
  Course,
  CourseEnrollment,
  CourseEnrollmentPayload,
  CreateClassGroupPayload,
  CreateCoursePayload,
  Identifier,
} from '../types/queryme';
import type { PaginationParams } from './userApi';

const normalizeIdentifier = (value: Identifier): string | number => {
  if (typeof value === 'number') {
    return value;
  }

  const trimmed = String(value).trim();
  return /^-?\d+$/.test(trimmed) ? Number(trimmed) : trimmed;
};

const toEnrollmentRequest = (payload: CourseEnrollmentPayload) => ({
  courseId: normalizeIdentifier(payload.courseId),
  studentId: normalizeIdentifier(payload.studentId),
});

export const courseApi = {
  async getCourses(params?: PaginationParams): Promise<Course[]> {
    const response = await axiosInstance.get<Course[]>('/courses', { 
      params: { page: params?.page, pageSize: params?.pageSize },
      signal: params?.signal 
    });
    return unwrapResponse(response);
  },

  async createCourse(payload: CreateCoursePayload, signal?: AbortSignal): Promise<Course> {
    const response = await axiosInstance.post<Course>('/courses', payload, { signal });
    return unwrapResponse(response);
  },

  async getClassGroups(params?: PaginationParams): Promise<ClassGroup[]> {
    const response = await axiosInstance.get<ClassGroup[]>('/class-groups', { 
      params: { page: params?.page, pageSize: params?.pageSize },
      signal: params?.signal 
    });
    return unwrapResponse(response);
  },

  async getClassGroupsByCourse(courseId: string, params?: PaginationParams): Promise<ClassGroup[]> {
    const response = await axiosInstance.get<ClassGroup[]>(`/class-groups/course/${courseId}`, { 
      params: { page: params?.page, pageSize: params?.pageSize },
      signal: params?.signal 
    });
    return unwrapResponse(response);
  },

  async createClassGroup(payload: CreateClassGroupPayload, signal?: AbortSignal): Promise<ClassGroup> {
    const response = await axiosInstance.post<ClassGroup>('/class-groups', payload, { signal });
    return unwrapResponse(response);
  },

  async getEnrollments(params?: PaginationParams): Promise<CourseEnrollment[]> {
    const response = await axiosInstance.get<CourseEnrollment[]>('/course-enrollments', { 
      params: { page: params?.page, pageSize: params?.pageSize },
      signal: params?.signal 
    });
    return unwrapResponse(response);
  },

  async getEnrollmentsByCourse(courseId: string, params?: PaginationParams): Promise<CourseEnrollment[]> {
    const response = await axiosInstance.get<CourseEnrollment[]>(`/course-enrollments/course/${courseId}`, { 
      params: { page: params?.page, pageSize: params?.pageSize },
      signal: params?.signal 
    });
    return unwrapResponse(response);
  },

  async getEnrollmentsByStudent(studentId: string, params?: PaginationParams): Promise<CourseEnrollment[]> {
    const response = await axiosInstance.get<CourseEnrollment[]>(`/course-enrollments/student/${studentId}`, { 
      params: { page: params?.page, pageSize: params?.pageSize },
      signal: params?.signal 
    });
    return unwrapResponse(response);
  },

  async createEnrollment(payload: CourseEnrollmentPayload, signal?: AbortSignal): Promise<CourseEnrollment> {
    const request = toEnrollmentRequest(payload);
    const response = await axiosInstance.post<CourseEnrollment>('/course-enrollments', request, {
      signal,
      params: request,
    });
    return unwrapResponse(response);
  },

  async deleteEnrollment(payload: CourseEnrollmentPayload, signal?: AbortSignal): Promise<void> {
    const request = toEnrollmentRequest(payload);
    const response = await axiosInstance.delete<void>('/course-enrollments', {
      data: request,
      signal,
      params: request,
    });
    return unwrapResponse(response);
  },
};
