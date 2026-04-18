import { useQuery } from '@tanstack/react-query';
import { courseApi } from '../api';

export const useCourses = () => {
  const {
    data = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['courses'],
    queryFn: ({ signal }) => courseApi.getCourses({ page: 1, pageSize: 100, signal }),
    staleTime: 60_000,
  });

  return {
    data,
    loading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh: refetch,
    setData: () => {}, // Tanstack query handles mutations differently (useMutation/setQueryData), providing empty stub for backwards compatibility
  };
};
