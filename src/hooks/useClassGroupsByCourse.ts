import { useQuery } from '@tanstack/react-query';
import { courseApi } from '../api';

export const useClassGroupsByCourse = (courseId?: string) => {
  const {
    data = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['class-groups-by-course', courseId],
    queryFn: ({ signal }) =>
      courseApi.getClassGroupsByCourse(courseId!, { page: 1, pageSize: 100, signal }),
    enabled: Boolean(courseId),
    staleTime: 60_000,
  });

  return {
    data,
    loading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh: refetch,
  };
};
