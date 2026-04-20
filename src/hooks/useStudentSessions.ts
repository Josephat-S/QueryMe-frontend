import { useQuery } from '@tanstack/react-query';
import { sessionApi } from '../api';

export const useStudentSessions = (studentId?: string) => {
  const {
    data = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['student-sessions', studentId],
    queryFn: async ({ signal }) => {
      if (!studentId) return [];
      return sessionApi.getSessionsByStudent(studentId, { page: 1, pageSize: 200, signal });
    },
    enabled: !!studentId,
    staleTime: 30_000,
  });

  return {
    data,
    loading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh: refetch,
    setData: () => {},
  };
};
