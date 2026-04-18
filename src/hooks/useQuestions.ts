import { useQuery } from '@tanstack/react-query';
import { questionApi } from '../api';

export const useQuestions = (examId?: string) => {
  const {
    data = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['questions', examId],
    queryFn: async ({ signal }) => {
      if (!examId) return [];
      return questionApi.getQuestions(examId, signal);
    },
    enabled: !!examId,
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
