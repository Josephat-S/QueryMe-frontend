import { useQuery } from '@tanstack/react-query';
import { sessionApi } from '../api';

export const useSessionsByExam = (examId?: string) => {
  const {
    data = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['sessions-by-exam', examId],
    queryFn: ({ signal }) =>
      sessionApi.getSessionsByExam(examId!, { page: 1, pageSize: 100, signal }),
    enabled: Boolean(examId),
    staleTime: 15_000,
  });

  return {
    data,
    loading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh: refetch,
  };
};
