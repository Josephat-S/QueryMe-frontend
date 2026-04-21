import { useQueries } from '@tanstack/react-query';
import { examApi } from '../api';

/**
 * Hook to fetch additional attempts for multiple exams for a specific student.
 * Uses useQueries to fetch data in parallel and caches the results.
 */
export const useAdditionalAttempts = (studentId: string | undefined, examIds: string[]) => {
  const queries = useQueries({
    queries: examIds.map((examId) => ({
      queryKey: ['additional-attempts', examId, studentId],
      queryFn: ({ signal }: { signal?: AbortSignal }) => 
        studentId 
          ? examApi.getAdditionalAttempts(examId, studentId, signal).catch(() => 0)
          : Promise.resolve(0),
      staleTime: 60_000,
      enabled: Boolean(studentId && examId),
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const data = examIds.reduce<Record<string, number>>((acc, examId, index) => {
    acc[examId] = queries[index]?.data ?? 0;
    return acc;
  }, {});

  return {
    data,
    isLoading,
    refetch: () => queries.forEach((q) => q.refetch()),
  };
};
