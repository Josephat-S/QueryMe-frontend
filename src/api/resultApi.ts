import axiosInstance from './axiosInstance';
import { toBackendPaginationParams, unwrapPaginatedResponse, unwrapResponse } from './helpers';
import type { StudentExamResult, TeacherResultRow } from '../types/queryme';
import type { PaginatedResponse, PaginationParams } from './userApi';

export const resultApi = {
  async getSessionResult(sessionId: string, signal?: AbortSignal): Promise<StudentExamResult> {
    const response = await axiosInstance.get<StudentExamResult>(`/results/session/${sessionId}`, { signal });
    return unwrapResponse(response);
  },

  async getExamDashboardPage(examId: string, params?: PaginationParams): Promise<PaginatedResponse<TeacherResultRow>> {
    const response = await axiosInstance.get(`/results/exam/${examId}/dashboard`, {
      params: toBackendPaginationParams(params),
      signal: params?.signal,
    });
    return unwrapPaginatedResponse<TeacherResultRow>(response);
  },

  async getExamDashboard(examId: string, params?: PaginationParams): Promise<TeacherResultRow[]> {
    const page = await this.getExamDashboardPage(examId, params);
    return page.content;
  },

  async getResultsByTeacherPage(teacherId: string, params?: PaginationParams): Promise<PaginatedResponse<TeacherResultRow>> {
    const response = await axiosInstance.get(`/results/teacher/${teacherId}`, {
      params: toBackendPaginationParams(params),
      signal: params?.signal,
    });
    return unwrapPaginatedResponse<TeacherResultRow>(response);
  },

  async getResultsByTeacher(teacherId: string, params?: PaginationParams): Promise<TeacherResultRow[]> {
    const page = await this.getResultsByTeacherPage(teacherId, params);
    return page.content;
  },
};
