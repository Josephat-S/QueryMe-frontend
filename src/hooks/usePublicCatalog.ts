import { useCallback } from 'react';
import { courseApi, type ClassGroup, type Course } from '../api';
import { useAsyncData } from './useAsyncData';

export interface PublicCatalogData {
  courses: Course[];
  classGroups: ClassGroup[];
}

export const usePublicCatalog = () => {
  const loader = useCallback(async (signal: AbortSignal): Promise<PublicCatalogData> => {
    const [courses, classGroups] = await Promise.all([
      courseApi.getCourses(signal),
      courseApi.getClassGroups(signal),
    ]);

    return { courses, classGroups };
  }, []);

  return useAsyncData(loader, [loader], 'Failed to load the public course catalog.', {
    cacheKey: 'public-catalog',
    cacheTtlMs: 60_000,
  });
};
