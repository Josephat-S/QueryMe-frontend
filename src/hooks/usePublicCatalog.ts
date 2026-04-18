import { useQuery } from '@tanstack/react-query';
import { courseApi, type ClassGroup, type Course } from '../api';

export interface PublicCatalogData {
  courses: Course[];
  classGroups: ClassGroup[];
}

export const usePublicCatalog = () => {
  const {
    data,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['public-catalog'],
    queryFn: async ({ signal }): Promise<PublicCatalogData> => {
      const [courses, classGroups] = await Promise.all([
        courseApi.getCourses({ page: 1, pageSize: 100, signal }),
        courseApi.getClassGroups({ page: 1, pageSize: 100, signal }),
      ]);
      return { courses, classGroups };
    },
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
