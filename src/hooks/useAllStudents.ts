import { useQuery } from '@tanstack/react-query';
import { userApi } from '../api';

/**
 * Fetches ALL registered students regardless of course assignment.
 * Used by the teacher enrollment picker to show every student available to enroll.
 */
export const useAllStudents = () => {
  const {
    data = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['all-students'],
    queryFn: ({ signal }) => userApi.getAllStudents({ page: 1, pageSize: 1000, signal }),
    staleTime: 60_000,
  });

  return {
    data,
    loading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh: refetch,
  };
};
