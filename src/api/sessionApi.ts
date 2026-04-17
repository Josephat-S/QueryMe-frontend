import axiosInstance from './axiosInstance';
import { unwrapResponse } from './helpers';
import type { Session, StartSessionPayload } from '../types/queryme';
import type { PaginationParams } from './userApi';

export const sessionApi = {
  async startSession(payload: StartSessionPayload, signal?: AbortSignal): Promise<Session> {
    const response = await axiosInstance.post<Session>('/sessions/start', payload, { signal });
    return unwrapResponse(response);
  },

  async submitSession(sessionId: string, signal?: AbortSignal): Promise<Session> {
    const response = await axiosInstance.patch<Session>(`/sessions/${sessionId}/submit`, undefined, { signal });
    return unwrapResponse(response);
  },

  async getSession(sessionId: string, signal?: AbortSignal): Promise<Session> {
    const response = await axiosInstance.get<Session>(`/sessions/${sessionId}`, { signal });
    return unwrapResponse(response);
  },

  async getSessionsByStudent(studentId: string, params?: PaginationParams): Promise<Session[]> {
    const response = await axiosInstance.get<Session[]>(`/sessions/student/${studentId}`, { 
      params: { page: params?.page, pageSize: params?.pageSize },
      signal: params?.signal 
    });
    return unwrapResponse(response);
  },

  async getSessionsByExam(examId: string, params?: PaginationParams): Promise<Session[]> {
    const response = await axiosInstance.get<Session[]>(`/sessions/exam/${examId}`, { 
      params: { page: params?.page, pageSize: params?.pageSize },
      signal: params?.signal 
    });
    return unwrapResponse(response);
  },
};
