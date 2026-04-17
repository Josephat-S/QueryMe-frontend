import axiosInstance from './axiosInstance';
import { toBackendUserPayload, unwrapResponse } from './helpers';
import type { PlatformUser, UserRegistrationPayload, UserUpdatePayload } from '../types/queryme';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

export const userApi = {
  async getAdmins(params?: PaginationParams): Promise<PlatformUser[]> {
    const response = await axiosInstance.get<PlatformUser[]>('/admins', { 
      params: { page: params?.page, pageSize: params?.pageSize },
      signal: params?.signal 
    });
    return unwrapResponse(response);
  },

  async registerAdmin(payload: UserRegistrationPayload, signal?: AbortSignal): Promise<PlatformUser> {
    const response = await axiosInstance.post<PlatformUser>('/admins/register', toBackendUserPayload(payload), { signal });
    return unwrapResponse(response);
  },

  async updateAdmin(id: string, payload: UserUpdatePayload, signal?: AbortSignal): Promise<PlatformUser> {
    const response = await axiosInstance.put<PlatformUser>(`/admins/${id}`, toBackendUserPayload(payload), { signal });
    return unwrapResponse(response);
  },

  async getTeachers(params?: PaginationParams): Promise<PlatformUser[]> {
    const response = await axiosInstance.get<PlatformUser[]>('/teachers', { 
      params: { page: params?.page, pageSize: params?.pageSize },
      signal: params?.signal 
    });
    return unwrapResponse(response);
  },

  async registerTeacher(payload: UserRegistrationPayload, signal?: AbortSignal): Promise<PlatformUser> {
    const response = await axiosInstance.post<PlatformUser>('/teachers/register', toBackendUserPayload(payload), { signal });
    return unwrapResponse(response);
  },

  async updateTeacher(id: string, payload: UserUpdatePayload, signal?: AbortSignal): Promise<PlatformUser> {
    const response = await axiosInstance.put<PlatformUser>(`/teachers/${id}`, toBackendUserPayload(payload), { signal });
    return unwrapResponse(response);
  },

  async getStudents(params?: PaginationParams): Promise<PlatformUser[]> {
    const response = await axiosInstance.get<PlatformUser[]>('/students', { 
      params: { page: params?.page, pageSize: params?.pageSize },
      signal: params?.signal 
    });
    return unwrapResponse(response);
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

  async getGuests(params?: PaginationParams): Promise<PlatformUser[]> {
    const response = await axiosInstance.get<PlatformUser[]>('/guests', { 
      params: { page: params?.page, pageSize: params?.pageSize },
      signal: params?.signal 
    });
    return unwrapResponse(response);
  },

  async registerGuest(payload: UserRegistrationPayload, signal?: AbortSignal): Promise<PlatformUser> {
    const response = await axiosInstance.post<PlatformUser>('/guests/register', toBackendUserPayload(payload), { signal });
    return unwrapResponse(response);
  },

  async updateGuest(id: string, payload: UserUpdatePayload, signal?: AbortSignal): Promise<PlatformUser> {
    const response = await axiosInstance.put<PlatformUser>(`/guests/${id}`, toBackendUserPayload(payload), { signal });
    return unwrapResponse(response);
  },
};
