import { useQuery } from '@tanstack/react-query';
import { courseApi } from '../api';

export const useEnrollments = () => {
  const {
    data = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['enrollments'],
    queryFn: ({ signal }) => courseApi.getEnrollments({ page: 1, pageSize: 100, signal }),
    staleTime: 30_000,
  });

  return {
    data,
    loading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh: refetch,
  };
};
