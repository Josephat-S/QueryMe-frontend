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
      sessionApi.getSessionsByExam(examId!, { page: 1, pageSize: 2000, signal }),
    enabled: Boolean(examId),
    staleTime: 30_000,
    refetchInterval: 15_000, // Auto-poll every 15s to keep the monitor dashboard live
  });

  return {
    data,
    loading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh: refetch,
  };
};
