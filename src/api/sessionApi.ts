import axiosInstance from './axiosInstance';
import { toBackendPaginationParams, unwrapPaginatedResponse, unwrapResponse } from './helpers';
import type { Session, StartSessionPayload } from '../types/queryme';
import type { PaginatedResponse, PaginationParams } from './userApi';

const attachLocalTime = <T extends Session | PaginatedResponse<Session> | Session[]>(res: T): T => {
  const localFetchTime = Date.now();
  if (Array.isArray(res)) {
    res.forEach(s => s && (s._localFetchTime = localFetchTime));
  } else if ('content' in res && Array.isArray(res.content)) {
    res.content.forEach(s => s && (s._localFetchTime = localFetchTime));
  } else if (res && typeof res === 'object') {
    (res as Session)._localFetchTime = localFetchTime;
  }
  return res;
};

export const sessionApi = {
  async startSession(payload: StartSessionPayload, signal?: AbortSignal): Promise<Session> {
    const response = await axiosInstance.post<Session>('/sessions/start', payload, { signal });
    return attachLocalTime(unwrapResponse(response));
  },

  async submitSession(sessionId: string, signal?: AbortSignal): Promise<Session> {
    const response = await axiosInstance.patch<Session>(`/sessions/${sessionId}/submit`, undefined, { signal });
    return attachLocalTime(unwrapResponse(response));
  },

  async getSession(sessionId: string, signal?: AbortSignal): Promise<Session> {
    const response = await axiosInstance.get<Session>(`/sessions/${sessionId}`, { signal });
    return attachLocalTime(unwrapResponse(response));
  },

  async getSessionsByStudentPage(studentId: string, params?: PaginationParams): Promise<PaginatedResponse<Session>> {
    const response = await axiosInstance.get(`/sessions/student/${studentId}`, {
      params: toBackendPaginationParams(params),
      signal: params?.signal,
    });
    return attachLocalTime(unwrapPaginatedResponse<Session>(response));
  },

  async getSessionsByStudent(studentId: string, params?: PaginationParams): Promise<Session[]> {
    const page = await this.getSessionsByStudentPage(studentId, params);
    return page.content;
  },

  async getSessionsByExamPage(examId: string, params?: PaginationParams): Promise<PaginatedResponse<Session>> {
    const response = await axiosInstance.get(`/sessions/exam/${examId}`, {
      params: toBackendPaginationParams(params),
      signal: params?.signal,
    });
    return unwrapPaginatedResponse<Session>(response);
  },

  async getSessionsByExam(examId: string, params?: PaginationParams): Promise<Session[]> {
    const page = await this.getSessionsByExamPage(examId, params);
    return page.content;
  },
  
  async sendHeartbeat(sessionId: string): Promise<void> {
    await axiosInstance.post(`/sessions/${sessionId}/heartbeat`);
  },

  async updateFeedback(sessionId: string, feedback: string): Promise<Session> {
    const response = await axiosInstance.patch<Session>(`/sessions/${sessionId}/feedback`, { feedback });
    return unwrapResponse(response);
  },

  async extendSession(sessionId: string): Promise<Session> {
    const response = await axiosInstance.post<Session>(`/sessions/${sessionId}/extend`);
    return unwrapResponse(response);
  },
};
