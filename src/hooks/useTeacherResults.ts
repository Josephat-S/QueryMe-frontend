import { useQuery } from '@tanstack/react-query';
import { resultApi } from '../api';

export const useTeacherResults = (teacherId?: string) => {
  const {
    data = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['teacher-results', teacherId],
    queryFn: ({ signal }) =>
      resultApi.getResultsByTeacher(teacherId!, { page: 1, pageSize: 2000, signal })
        .catch(() => [] as Awaited<ReturnType<typeof resultApi.getResultsByTeacher>>),
    enabled: Boolean(teacherId),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false, // don't retry on 4xx/5xx — surface the empty state immediately
  });

  return {
    data,
    loading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh: refetch,
  };
};
