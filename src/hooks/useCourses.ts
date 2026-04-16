import { useCallback } from 'react';
import { courseApi, type Course } from '../api';
import { useAsyncData } from './useAsyncData';

export const useCourses = () => {
  const loader = useCallback((signal: AbortSignal): Promise<Course[]> => courseApi.getCourses(signal), []);
  return useAsyncData(loader, [loader], 'Failed to load courses.', {
    cacheKey: 'courses',
    cacheTtlMs: 60_000,
  });
};
