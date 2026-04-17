import axiosInstance from './axiosInstance';
import { unwrapResponse } from './helpers';
import type { CreateExamPayload, Exam, UpdateExamPayload } from '../types/queryme';
import type { PaginationParams } from './userApi';

const EXAM_MUTATION_TIMEOUT_MS = 120000;

export const examApi = {
  async getExam(examId: string, signal?: AbortSignal): Promise<Exam> {
    const response = await axiosInstance.get<Exam>(`/exams/${examId}`, { signal });
    return unwrapResponse(response);
  },

  async getExamsByCourse(courseId: string, params?: PaginationParams): Promise<Exam[]> {
    const response = await axiosInstance.get<Exam[]>(`/exams/course/${courseId}`, { 
      params: { page: params?.page, pageSize: params?.pageSize },
      signal: params?.signal 
    });
    return unwrapResponse(response);
  },

  async getPublishedExams(params?: PaginationParams): Promise<Exam[]> {
    const response = await axiosInstance.get<Exam[]>('/exams/published', { 
      params: { page: params?.page, pageSize: params?.pageSize },
      signal: params?.signal 
    });
    return unwrapResponse(response);
  },

  async createExam(payload: CreateExamPayload, signal?: AbortSignal): Promise<Exam> {
    const response = await axiosInstance.post<Exam>('/exams', payload, {
      signal,
      timeout: EXAM_MUTATION_TIMEOUT_MS,
    });
    return unwrapResponse(response);
  },

  async updateExam(examId: string, payload: UpdateExamPayload, signal?: AbortSignal): Promise<Exam> {
    const response = await axiosInstance.put<Exam>(`/exams/${examId}`, payload, {
      signal,
      timeout: EXAM_MUTATION_TIMEOUT_MS,
    });
    return unwrapResponse(response);
  },

  async publishExam(examId: string, signal?: AbortSignal): Promise<Exam> {
    const response = await axiosInstance.patch<Exam>(`/exams/${examId}/publish`, undefined, {
      signal,
      timeout: EXAM_MUTATION_TIMEOUT_MS,
    });
    return unwrapResponse(response);
  },

  async unpublishExam(examId: string, signal?: AbortSignal): Promise<Exam> {
    const response = await axiosInstance.patch<Exam>(`/exams/${examId}/unpublish`, undefined, {
      signal,
      timeout: EXAM_MUTATION_TIMEOUT_MS,
    });
    return unwrapResponse(response);
  },

  async closeExam(examId: string, signal?: AbortSignal): Promise<Exam> {
    const response = await axiosInstance.patch<Exam>(`/exams/${examId}/close`, undefined, {
      signal,
      timeout: EXAM_MUTATION_TIMEOUT_MS,
    });
    return unwrapResponse(response);
  },

  async deleteExam(examId: string, signal?: AbortSignal): Promise<void> {
    const response = await axiosInstance.delete<void>(`/exams/${examId}`, {
      signal,
      timeout: EXAM_MUTATION_TIMEOUT_MS,
    });
    return unwrapResponse(response);
  },
};
