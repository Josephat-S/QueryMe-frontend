import { useCallback } from 'react';
import { sessionApi, type Session } from '../api';
import { useAsyncData } from './useAsyncData';

export const useStudentSessions = (studentId?: string) => {
  const loader = useCallback(
    (signal: AbortSignal): Promise<Session[]> => {
      if (!studentId) {
        return Promise.resolve([]);
      }

      return sessionApi.getSessionsByStudent(studentId, { signal });
    },
    [studentId],
  );

  return useAsyncData(loader, [loader], 'Failed to load exam sessions.', {
    cacheKey: `student-sessions:${studentId || 'anonymous'}`,
    cacheTtlMs: 30_000,
  });
};
