import { useQuery } from '@tanstack/react-query';
import { userApi } from '../api';

export const useStudents = () => {
  const {
    data = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['students'],
    queryFn: ({ signal }) => userApi.getStudents({ page: 1, pageSize: 100, signal }),
    staleTime: 60_000,
  });

  return {
    data,
    loading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh: refetch,
  };
};
