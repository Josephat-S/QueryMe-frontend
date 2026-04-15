import { useCallback } from 'react';
import { examApi, type Exam } from '../api';
import { useAsyncData } from './useAsyncData';

export const usePublishedExams = () => {
  const loader = useCallback((signal: AbortSignal): Promise<Exam[]> => examApi.getPublishedExams(signal), []);
  return useAsyncData(loader, [loader], 'Failed to load exams.', {
    cacheKey: 'published-exams',
    cacheTtlMs: 45_000,
  });
};
