import React, { useEffect, useMemo, useState } from 'react';
import { courseApi, examApi, resultApi } from '../../api';
import { PageSkeleton } from '../../components/PageSkeleton';
import { extractErrorMessage } from '../../utils/errorUtils';
import type { Course, Exam, TeacherResultRow } from '../../api';

interface CourseMetrics {
  course: Course;
  exams: Exam[];
  resultRows: TeacherResultRow[];
  isLoaded: boolean;
}

const Reports: React.FC = () => {
  const [selectedCourseId, setSelectedCourseId] = useState('ALL');
  const [metrics, setMetrics] = useState<CourseMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const visibleMetrics = useMemo(
    () => (selectedCourseId === 'ALL'
      ? metrics
      : metrics.filter((metric) => String(metric.course.id) === selectedCourseId)),
    [metrics, selectedCourseId],
  );

  const selectedCourseName = useMemo(
    () => metrics.find((metric) => String(metric.course.id) === selectedCourseId)?.course.name,
    [metrics, selectedCourseId],
  );

  useEffect(() => {
    const controller = new AbortController();

    const loadReports = async () => {
      setLoading(true);
      setError(null);

      try {
        const courses = await courseApi.getCourses({ signal: controller.signal });
        
        // Initial state with just courses to show the table immediately
        const initialMetrics = courses.map(course => ({
          course,
          exams: [],
          resultRows: [],
          isLoaded: false,
        }));
        
        setMetrics(initialMetrics);
        setLoading(false); // Show table now

        // Now fetch metrics in background using controlled chunks to avoid overwhelming the browser
        const CHUNK_SIZE = 4;
        for (let i = 0; i < courses.length; i += CHUNK_SIZE) {
          const chunk = courses.slice(i, i + CHUNK_SIZE);
          
          if (controller.signal.aborted) break;

          const reportRows = await Promise.all(
            chunk.map(async (course) => {
              try {
                const exams = await examApi.getExamsByCourse(String(course.id), { signal: controller.signal }).catch(() => [] as Exam[]);
                const resultRows = await Promise.all(
                  exams.map((exam) => resultApi.getExamDashboard(String(exam.id), { signal: controller.signal }).catch(() => [] as TeacherResultRow[])),
                );

                return {
                  courseId: String(course.id),
                  exams,
                  resultRows: resultRows.flat(),
                  isLoaded: true,
                };
              } catch {
                return { courseId: String(course.id), exams: [], resultRows: [], isLoaded: true };
              }
            }),
          );

          if (!controller.signal.aborted) {
            setMetrics(prev => prev.map(m => {
              const data = reportRows.find(r => r.courseId === String(m.course.id));
              return data ? { ...m, exams: data.exams, resultRows: data.resultRows, isLoaded: true } : m;
            }));
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(extractErrorMessage(err, 'Failed to load platform reports.'));
          setLoading(false);
        }
      }
    };

    void loadReports();
    return () => controller.abort();
  }, []);

  const activeMetrics = useMemo(() => {
    const exams = visibleMetrics.flatMap((metric) => metric.exams);
    const resultRows = visibleMetrics.flatMap((metric) => metric.resultRows);
    const averageScore = resultRows.length
      ? Math.round(
          resultRows.reduce((sum, row) => sum + (((row.score || 0) / (row.maxScore || 1)) * 100), 0) / resultRows.length,
        )
      : 0;

    const correctRate = resultRows.length
      ? Math.round((resultRows.filter((row) => row.isCorrect).length / resultRows.length) * 100)
      : 0;

    return {
      exams: exams.length,
      averageScore,
      correctRate,
    };
  }, [visibleMetrics]);

  if (loading) {
    return <PageSkeleton title="Platform Reports" rows={5} />;
  }

  return (
    <div>
      <div className="page-header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1>Platform Reports</h1>
          <p>Course-by-course metrics derived from exams and latest result dashboard rows.</p>
        </div>
        <button className="btn btn-secondary btn-sm w-full sm:w-auto" onClick={() => setSelectedCourseId('ALL')}>
          Reset View
        </button>
      </div>

      <div style={{ marginBottom: '12px', fontSize: '12px', color: '#666' }}>
        Viewing: <strong>{selectedCourseId === 'ALL' ? 'All Courses' : selectedCourseName || 'Selected Course'}</strong>
      </div>

      {error && <div style={{ marginBottom: '16px', color: '#e53e3e' }}>{error}</div>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="content-card" style={{ gridColumn: '1 / -1' }}>
          <div className="content-card-header">
            <h2>Course Performance Overview</h2>
          </div>
          <div className="content-card-body hidden md:block" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="data-table min-w-[620px]">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Exams</th>
                  <th>Average Score</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleMetrics.map((metric) => {
                  const averageScore = metric.resultRows.length
                    ? Math.round(
                        metric.resultRows.reduce((sum, row) => sum + (((row.score || 0) / (row.maxScore || 1)) * 100), 0) / metric.resultRows.length,
                      )
                    : 0;

                  const isSelected = String(metric.course.id) === selectedCourseId;

                  return (
                    <tr key={String(metric.course.id)}>
                      <td style={{ fontWeight: 600 }}>{metric.course.name}</td>
                      <td>{metric.isLoaded ? metric.exams.length : '...'}</td>
                      <td>{metric.isLoaded ? `${averageScore}%` : '...'}</td>
                      <td>
                        <button
                          className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setSelectedCourseId(String(metric.course.id))}
                          disabled={isSelected || !metric.isLoaded}
                        >
                          {isSelected ? 'Selected' : metric.isLoaded ? 'Inspect' : 'Loading...'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {visibleMetrics.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
                      No courses match the current scope.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 p-4 md:hidden">
            {visibleMetrics.map((metric) => {
              const averageScore = metric.resultRows.length
                ? Math.round(
                    metric.resultRows.reduce((sum, row) => sum + (((row.score || 0) / (row.maxScore || 1)) * 100), 0) / metric.resultRows.length,
                  )
                : 0;

              const isSelected = String(metric.course.id) === selectedCourseId;

              return (
                <div key={`course-mobile-${String(metric.course.id)}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="font-semibold text-slate-800">{metric.course.name}</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div><strong>Exams:</strong> {metric.isLoaded ? metric.exams.length : '...'}</div>
                    <div><strong>Average:</strong> {metric.isLoaded ? `${averageScore}%` : '...'}</div>
                  </div>
                  <button
                    className={`btn btn-sm mt-3 w-full ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSelectedCourseId(String(metric.course.id))}
                    disabled={isSelected || !metric.isLoaded}
                  >
                    {isSelected ? 'Selected' : metric.isLoaded ? 'Inspect' : 'Loading...'}
                  </button>
                </div>
              );
            })}
            {visibleMetrics.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
                No courses match the current scope.
              </div>
            )}
          </div>
        </div>

        <div className="content-card" style={{ gridColumn: '1 / -1' }}>
          <div className="content-card-header">
            <h2>Key Indicators</h2>
          </div>
          <div className="content-card-body">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="metric-box"><div style={{ fontSize: '24px', fontWeight: 700 }}>{visibleMetrics.every(m => m.isLoaded) ? activeMetrics.exams : '...'}</div><div style={{ fontSize: '11px', opacity: 0.7 }}>Exams</div></div>
              <div className="metric-box"><div style={{ fontSize: '24px', fontWeight: 700 }}>{visibleMetrics.every(m => m.isLoaded) ? `${activeMetrics.averageScore}%` : '...'}</div><div style={{ fontSize: '11px', opacity: 0.7 }}>Average Score</div></div>
              <div className="metric-box"><div style={{ fontSize: '24px', fontWeight: 700 }}>{visibleMetrics.every(m => m.isLoaded) ? `${activeMetrics.correctRate}%` : '...'}</div><div style={{ fontSize: '11px', opacity: 0.7 }}>Correct Rate</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
