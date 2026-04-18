import { useQuery } from '@tanstack/react-query';
import { resultApi } from '../api';

export const useSessionResult = (sessionId?: string) => {
  const {
    data,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['session-result', sessionId],
    queryFn: async ({ signal }) => {
      if (!sessionId) return null;
      return resultApi.getSessionResult(sessionId, signal);
    },
    enabled: !!sessionId,
    staleTime: 60_000,
  });

  return {
    data: data || null,
    loading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh: refetch,
    setData: () => {},
  };
};
