import axiosInstance from './axiosInstance';
import { toBackendUserPayload, unwrapResponse } from './helpers';
import type { PlatformUser, UserRegistrationPayload, UserUpdatePayload } from '../types/queryme';

export const userApi = {
  async getAdmins(signal?: AbortSignal): Promise<PlatformUser[]> {
    const response = await axiosInstance.get<PlatformUser[]>('/admins', { signal });
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

  async getTeachers(signal?: AbortSignal): Promise<PlatformUser[]> {
    const response = await axiosInstance.get<PlatformUser[]>('/teachers', { signal });
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

  async getStudents(signal?: AbortSignal): Promise<PlatformUser[]> {
    const response = await axiosInstance.get<PlatformUser[]>('/students', { signal });
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

  async getGuests(signal?: AbortSignal): Promise<PlatformUser[]> {
    const response = await axiosInstance.get<PlatformUser[]>('/guests', { signal });
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
