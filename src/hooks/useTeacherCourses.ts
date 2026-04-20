import { useQuery } from '@tanstack/react-query';
import { courseApi } from '../api';
import { filterCoursesByTeacher } from '../utils/queryme';

export const useTeacherCourses = (teacherId?: string) => {
  const {
    data = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['courses'],
    queryFn: ({ signal }) => courseApi.getCourses({ page: 1, pageSize: 100, signal }),
    staleTime: 60_000,
  });

  const teacherCourses = teacherId ? filterCoursesByTeacher(data, teacherId) : data;

  return {
    data: teacherCourses,
    loading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh: refetch,
  };
};
