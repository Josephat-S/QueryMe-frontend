import axiosInstance from './axiosInstance';
import { unwrapResponse } from './helpers';
import type { StudentExamResult, TeacherResultRow } from '../types/queryme';
import type { PaginationParams } from './userApi';

export const resultApi = {
  async getSessionResult(sessionId: string, signal?: AbortSignal): Promise<StudentExamResult> {
    const response = await axiosInstance.get<StudentExamResult>(`/results/session/${sessionId}`, { signal });
    return unwrapResponse(response);
  },

  async getExamDashboard(examId: string, params?: PaginationParams): Promise<TeacherResultRow[]> {
    const response = await axiosInstance.get<TeacherResultRow[]>(`/results/exam/${examId}/dashboard`, { 
      params: { page: params?.page, pageSize: params?.pageSize },
      signal: params?.signal 
    });
    return unwrapResponse(response);
  },

  async getResultsByTeacher(teacherId: string, params?: PaginationParams): Promise<TeacherResultRow[]> {
    const response = await axiosInstance.get<TeacherResultRow[]>(`/results/teacher/${teacherId}`, { 
      params: { page: params?.page, pageSize: params?.pageSize },
      signal: params?.signal 
    });
    return unwrapResponse(response);
  },
};
