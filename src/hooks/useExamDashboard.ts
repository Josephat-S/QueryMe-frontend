import { useQuery } from '@tanstack/react-query';
import { resultApi } from '../api';

export const useExamDashboard = (examId?: string) => {
  const {
    data = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['exam-dashboard', examId],
    queryFn: ({ signal }) => resultApi.getExamDashboard(examId!, { page: 1, pageSize: 2000, signal }),
    enabled: Boolean(examId),
    staleTime: 30_000,
  });

  return {
    data,
    loading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh: refetch,
  };
};
