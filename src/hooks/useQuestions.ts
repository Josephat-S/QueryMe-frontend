import { useCallback } from 'react';
import { questionApi, type Question } from '../api';
import { useAsyncData } from './useAsyncData';

export const useQuestions = (examId?: string) => {
  const loader = useCallback(
    (signal: AbortSignal): Promise<Question[]> => {
      if (!examId) {
        return Promise.resolve([]);
      }

      return questionApi.getQuestions(examId, signal);
    },
    [examId],
  );

  return useAsyncData(loader, [loader], 'Failed to load questions.', {
    cacheKey: `questions:${examId || 'none'}`,
    cacheTtlMs: 30_000,
  });
};
