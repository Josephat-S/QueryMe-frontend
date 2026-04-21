import axiosInstance from './axiosInstance';
import {
  toBackendPaginationParams,
  toBackendUserPayload,
  unwrapPaginatedResponse,
  unwrapResponse,
  type PaginatedResponse,
  type PaginationParams,
} from './helpers';
import type { PlatformUser, RegistrationRequest, UserRegistrationPayload, UserUpdatePayload } from '../types/queryme';

export type { PaginatedResponse, PaginationParams };

export const userApi = {
  async getAdminsPage(params?: PaginationParams): Promise<PaginatedResponse<PlatformUser>> {
    const response = await axiosInstance.get('/admins', {
      params: toBackendPaginationParams(params),
      signal: params?.signal,
    });
    return unwrapPaginatedResponse<PlatformUser>(response);
  },

  async getAdmins(params?: PaginationParams): Promise<PlatformUser[]> {
    const page = await this.getAdminsPage(params);
    return page.content;
  },

  async registerAdmin(payload: UserRegistrationPayload, signal?: AbortSignal): Promise<PlatformUser> {
    const response = await axiosInstance.post<PlatformUser>('/admins/register', toBackendUserPayload(payload), { signal });
    return unwrapResponse(response);
  },

  async updateAdmin(id: string, payload: UserUpdatePayload, signal?: AbortSignal): Promise<PlatformUser> {
    const response = await axiosInstance.put<PlatformUser>(`/admins/${id}`, toBackendUserPayload(payload), { signal });
    return unwrapResponse(response);
  },

  async getTeachersPage(params?: PaginationParams): Promise<PaginatedResponse<PlatformUser>> {
    const response = await axiosInstance.get('/teachers', {
      params: toBackendPaginationParams(params),
      signal: params?.signal,
    });
    return unwrapPaginatedResponse<PlatformUser>(response);
  },

  async getTeachers(params?: PaginationParams): Promise<PlatformUser[]> {
    const page = await this.getTeachersPage(params);
    return page.content;
  },

  async registerTeacher(payload: UserRegistrationPayload, signal?: AbortSignal): Promise<PlatformUser> {
    const response = await axiosInstance.post<PlatformUser>('/teachers/register', toBackendUserPayload(payload), { signal });
    return unwrapResponse(response);
  },

  async updateTeacher(id: string, payload: UserUpdatePayload, signal?: AbortSignal): Promise<PlatformUser> {
    const response = await axiosInstance.put<PlatformUser>(`/teachers/${id}`, toBackendUserPayload(payload), { signal });
    return unwrapResponse(response);
  },

  async getStudentsPage(params?: PaginationParams): Promise<PaginatedResponse<PlatformUser>> {
    const response = await axiosInstance.get('/students', {
      params: toBackendPaginationParams(params),
      signal: params?.signal,
    });
    return unwrapPaginatedResponse<PlatformUser>(response);
  },

  async getStudents(params?: PaginationParams): Promise<PlatformUser[]> {
    const page = await this.getStudentsPage(params);
    return page.content;
  },

  async getStudent(id: string, signal?: AbortSignal): Promise<PlatformUser> {
    const response = await axiosInstance.get<PlatformUser>(`/students/${id}`, { signal });
    return unwrapResponse(response);
  },

  async registerStudent(payload: UserRegistrationPayload, signal?: AbortSignal): Promise<PlatformUser> {
    const response = await axiosInstance.post<PlatformUser>('/students/register', toBackendUserPayload(payload), { signal });
    return unwrapResponse(response);
  },

  async registerStudentsBulk(payload: UserRegistrationPayload[], signal?: AbortSignal): Promise<PlatformUser[]> {
    const response = await axiosInstance.post<PlatformUser[]>('/students/register/bulk', payload.map((item) => toBackendUserPayload(item)), { signal });
    return unwrapResponse(response);
  },

  async updateStudent(id: string, payload: UserUpdatePayload, signal?: AbortSignal): Promise<PlatformUser> {
    const response = await axiosInstance.put<PlatformUser>(`/students/${id}`, toBackendUserPayload(payload), { signal });
    return unwrapResponse(response);
  },

  async deleteStudent(id: string, signal?: AbortSignal): Promise<void> {
    await axiosInstance.delete(`/students/${id}`, { signal });
  },
  async deleteTeacher(id: string, signal?: AbortSignal): Promise<void> {
    await axiosInstance.delete(`/teachers/${id}`, { signal });
  },
  async deleteAdmin(id: string, signal?: AbortSignal): Promise<void> {
    await axiosInstance.delete(`/admins/${id}`, { signal });
  },
  async getRegistrationRequests(signal?: AbortSignal): Promise<RegistrationRequest[]> {
    const response = await axiosInstance.get('/admins/registration-requests', { signal });
    return unwrapResponse(response);
  },
  async approveRegistrationRequest(id: string, signal?: AbortSignal): Promise<void> {
    await axiosInstance.post(`/admins/registration-requests/${id}/approve`, {}, { signal });
  },
  async rejectRegistrationRequest(id: string, reason: string, signal?: AbortSignal): Promise<void> {
    await axiosInstance.post(`/admins/registration-requests/${id}/reject`, { reason }, { signal });
  },
};
