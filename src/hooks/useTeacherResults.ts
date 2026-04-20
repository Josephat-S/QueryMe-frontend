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
      resultApi.getResultsByTeacher(teacherId!, { page: 1, pageSize: 20, signal }),
    enabled: Boolean(teacherId),
    staleTime: 60_000,
  });

  return {
    data,
    loading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh: refetch,
  };
};
