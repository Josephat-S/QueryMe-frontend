import { useQuery } from '@tanstack/react-query';
import { examApi } from '../api';

export const usePublishedExams = () => {
  const {
    data = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['published-exams'],
    queryFn: ({ signal }) => examApi.getPublishedExams({ signal }),
    staleTime: 45_000,
  });

  return {
    data,
    loading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh: refetch,
    setData: () => {},
  };
};
