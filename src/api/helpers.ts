import type { AxiosResponse } from 'axios';
import type { ApiResponse } from '../types/queryme';

export interface PaginationParams {
  page?: number;
  size?: number;
  pageSize?: number;
  sort?: string | string[];
  signal?: AbortSignal;
}

export interface PaginatedResponse<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

const createPageFallback = <T>(content: T[] = []): PaginatedResponse<T> => ({
  content,
  number: 0,
  size: content.length,
  totalElements: content.length,
  totalPages: content.length > 0 ? 1 : 0,
  first: true,
  last: true,
});

const isApiResponse = <T>(value: unknown): value is ApiResponse<T> => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'data' in value && ('success' in value || 'message' in value || 'timestamp' in value);
};

export const unwrapResponse = <T>(response: AxiosResponse<ApiResponse<T> | T>): T => {
  const payload = response.data;
  return isApiResponse<T>(payload) ? payload.data : (payload as T);
};

const isPaginatedResponse = <T>(value: unknown): value is PaginatedResponse<T> => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'content' in value && Array.isArray((value as PaginatedResponse<T>).content);
};

export const unwrapListResponse = <T>(response: AxiosResponse<ApiResponse<T[]> | PaginatedResponse<T> | T[]>): T[] => {
  const payload = unwrapResponse<T[] | PaginatedResponse<T>>(response as AxiosResponse<ApiResponse<T[] | PaginatedResponse<T>> | T[] | PaginatedResponse<T>>);

  if (Array.isArray(payload)) {
    return payload;
  }

  if (isPaginatedResponse<T>(payload)) {
    return payload.content;
  }

  return [];
};

export const unwrapPaginatedResponse = <T>(response: AxiosResponse<ApiResponse<PaginatedResponse<T> | T[]> | PaginatedResponse<T> | T[]>): PaginatedResponse<T> => {
  const payload = unwrapResponse<PaginatedResponse<T> | T[]>(response as AxiosResponse<ApiResponse<PaginatedResponse<T> | T[]> | PaginatedResponse<T> | T[]>);

  if (Array.isArray(payload)) {
    return createPageFallback(payload);
  }

  if (isPaginatedResponse<T>(payload)) {
    return {
      content: payload.content,
      number: typeof payload.number === 'number' ? payload.number : 0,
      size: typeof payload.size === 'number' ? payload.size : payload.content.length,
      totalElements: typeof payload.totalElements === 'number' ? payload.totalElements : payload.content.length,
      totalPages: typeof payload.totalPages === 'number' ? payload.totalPages : (payload.content.length > 0 ? 1 : 0),
      first: typeof payload.first === 'boolean' ? payload.first : true,
      last: typeof payload.last === 'boolean' ? payload.last : true,
    };
  }

  return createPageFallback<T>([]);
};

export const toBackendPaginationParams = (params?: PaginationParams): Record<string, unknown> => {
  const requestedPage = params?.page;
  const normalizedPage = typeof requestedPage === 'number'
    ? Math.max(0, requestedPage > 0 ? requestedPage - 1 : requestedPage)
    : undefined;

  const resolvedSize = params?.size ?? params?.pageSize;

  return {
    page: normalizedPage,
    size: resolvedSize,
    sort: params?.sort,
  };
};

type BackendUserPayload = {
  fullName?: string;
  name?: string;
};

export const toBackendUserPayload = <T extends BackendUserPayload>(payload: T): Record<string, unknown> => {
  const p = payload as T & Record<string, unknown>;
  const { name, fullName, registrationNumber, studentNumber: sn, student_number: sn2, ...rest } = p;
  const studentNumberValue = sn || sn2 || registrationNumber;

  const normalizedFullName = typeof fullName === 'string' && fullName.trim()
    ? fullName.trim()
    : typeof name === 'string' && name.trim()
      ? name.trim()
      : undefined;

  const result: Record<string, unknown> = { ...rest };
  
  if (normalizedFullName) {
    result.fullName = normalizedFullName;
  }
  
  // Map registrationNumber/studentNumber to all variations for backend compatibility
  if (typeof studentNumberValue === 'string' && studentNumberValue.trim()) {
    const value = studentNumberValue.trim();
    result.registrationNumber = value;
    result.studentNumber = value;
    result.student_number = value;
  }

  return result;
};
