import { useQuery } from '@tanstack/react-query';
import { examApi } from '../api';

export const useExamsByCourse = (courseId?: string) => {
  const {
    data = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['exams-by-course', courseId],
    queryFn: ({ signal }) =>
      examApi.getExamsByCourse(courseId!, { signal }),
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
