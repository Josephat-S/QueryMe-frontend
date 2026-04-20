import { useQuery } from '@tanstack/react-query';
import { courseApi } from '../api';

export const useEnrollmentsByCourse = (courseId?: string) => {
  const {
    data = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['enrollments-by-course', courseId],
    queryFn: ({ signal }) =>
      courseApi.getEnrollmentsByCourse(courseId!, { page: 1, pageSize: 100, signal }),
    enabled: Boolean(courseId),
    staleTime: 30_000,
  });

  return {
    data,
    loading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh: refetch,
  };
};
