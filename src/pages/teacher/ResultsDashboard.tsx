import React, { useEffect, useMemo, useState } from 'react';
import { courseApi, examApi, resultApi, type Exam, type TeacherResultRow } from '../../api';
import { useAuth } from '../../contexts';
import { extractErrorMessage } from '../../utils/errorUtils';
import { filterCoursesByTeacher, getCourseName, normalizeExamStatus } from '../../utils/queryme';
import './TeacherPages.css';

type ScoreBand = 'all' | 'high' | 'medium' | 'low';
type StudentStatusFilter = 'all' | 'correct' | 'reviewed';

interface StudentSummaryRow {
  studentId: string;
  studentName: string;
  sessionIds: string[];
  questionCount: number;
  totalScore: number;
  totalMaxScore: number;
  averagePercent: number;
  correctCount: number;
  status: 'Correct' | 'Reviewed';
  latestSubmittedAt: string | null;
  details: TeacherResultRow[];
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const getScoreBand = (averagePercent: number): Exclude<ScoreBand, 'all'> => {
  if (averagePercent >= 80) {
    return 'high';
  }

  if (averagePercent >= 50) {
    return 'medium';
  }

  return 'low';
};

const ResultsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [examOptions, setExamOptions] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [rows, setRows] = useState<TeacherResultRow[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StudentStatusFilter>('all');
  const [scoreBandFilter, setScoreBandFilter] = useState<ScoreBand>('all');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedStudentIds, setExpandedStudentIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadExams = async () => {
      if (!user) {
        setLoadingOptions(false);
        return;
      }

      setLoadingOptions(true);
      setError(null);

      try {
        const courses = await courseApi.getCourses(controller.signal);
        const accessibleCourses = filterCoursesByTeacher(courses, user.id);
        const examLists = await Promise.all(
          accessibleCourses.map((course) => examApi.getExamsByCourse(String(course.id), controller.signal).catch(() => [] as Exam[])),
        );

        const availableExams = examLists.flat().filter((exam) => normalizeExamStatus(exam.status) !== 'DRAFT');

        if (!controller.signal.aborted) {
          setExamOptions(availableExams);
          if (!selectedExamId && availableExams[0]) {
            setSelectedExamId(String(availableExams[0].id));
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(extractErrorMessage(err, 'Failed to load exam options.'));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingOptions(false);
        }
      }
    };

    void loadExams();
    return () => controller.abort();
  }, [selectedExamId, user]);

  useEffect(() => {
    if (!selectedExamId) {
      setRows([]);
      return;
    }

    const controller = new AbortController();
    setLoadingRows(true);
    setError(null);

    void resultApi.getExamDashboard(selectedExamId, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) {
          setRows(response);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(extractErrorMessage(err, 'Failed to load exam results.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingRows(false);
        }
      });

    return () => controller.abort();
  }, [selectedExamId]);

  const studentRows = useMemo<StudentSummaryRow[]>(() => {
    const grouped = new Map<string, StudentSummaryRow>();

    rows.forEach((row) => {
      const studentId = String(row.studentId || 'Unknown');
      const existing = grouped.get(studentId);

      if (!existing) {
        grouped.set(studentId, {
          studentId,
          studentName: row.studentName || studentId,
          sessionIds: row.sessionId ? [String(row.sessionId)] : [],
          questionCount: 1,
          totalScore: typeof row.score === 'number' ? row.score : 0,
          totalMaxScore: typeof row.maxScore === 'number' ? row.maxScore : 0,
          averagePercent: 0,
          correctCount: row.isCorrect ? 1 : 0,
          status: 'Reviewed',
          latestSubmittedAt: row.submittedAt || null,
          details: [row],
        });
        return;
      }

      existing.questionCount += 1;
      existing.totalScore += typeof row.score === 'number' ? row.score : 0;
      existing.totalMaxScore += typeof row.maxScore === 'number' ? row.maxScore : 0;
      existing.correctCount += row.isCorrect ? 1 : 0;
      existing.details.push(row);

      if (row.sessionId) {
        const sessionId = String(row.sessionId);
        if (!existing.sessionIds.includes(sessionId)) {
          existing.sessionIds.push(sessionId);
        }
      }

      if (row.submittedAt) {
        const latestTimestamp = existing.latestSubmittedAt ? new Date(existing.latestSubmittedAt).getTime() : 0;
        const rowTimestamp = new Date(row.submittedAt).getTime();
        if (!Number.isNaN(rowTimestamp) && rowTimestamp > latestTimestamp) {
          existing.latestSubmittedAt = row.submittedAt;
        }
      }
    });

    return Array.from(grouped.values())
      .map((student) => {
        const averagePercent = student.totalMaxScore > 0
          ? Math.round((student.totalScore / student.totalMaxScore) * 100)
          : 0;

        const status: StudentSummaryRow['status'] = student.questionCount > 0 && student.correctCount === student.questionCount
          ? 'Correct'
          : 'Reviewed';

        const details = [...student.details].sort((a, b) => {
          const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
          const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
          return timeB - timeA;
        });

        return {
          ...student,
          averagePercent,
          status,
          details,
        };
      })
      .sort((a, b) => {
        const timeA = a.latestSubmittedAt ? new Date(a.latestSubmittedAt).getTime() : 0;
        const timeB = b.latestSubmittedAt ? new Date(b.latestSubmittedAt).getTime() : 0;
        if (timeB !== timeA) {
          return timeB - timeA;
        }
        return a.studentName.localeCompare(b.studentName);
      });
  }, [rows]);

  const filteredRows = useMemo(
    () => studentRows.filter((student) => {
      const lowerSearch = searchQuery.trim().toLowerCase();
      const detailHaystack = student.details
        .map((detail) => `${detail.questionPrompt || ''} ${detail.submittedQuery || ''}`)
        .join(' ')
        .toLowerCase();
      const studentHaystack = `${student.studentName} ${student.studentId} ${detailHaystack}`.toLowerCase();
      const matchesSearch = lowerSearch.length === 0 || studentHaystack.includes(lowerSearch);
      const matchesStatus = statusFilter === 'all' || student.status.toLowerCase() === statusFilter;
      const matchesScoreBand = scoreBandFilter === 'all' || getScoreBand(student.averagePercent) === scoreBandFilter;

      return matchesSearch && matchesStatus && matchesScoreBand;
    }),
    [studentRows, searchQuery, statusFilter, scoreBandFilter],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedExamId, searchQuery, statusFilter, scoreBandFilter, pageSize]);

  useEffect(() => {
    setExpandedStudentIds([]);
  }, [selectedExamId, searchQuery, statusFilter, scoreBandFilter, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const boundedPage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (boundedPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [boundedPage, filteredRows, pageSize]);

  const pageStart = filteredRows.length === 0 ? 0 : (boundedPage - 1) * pageSize + 1;
  const pageEnd = Math.min(boundedPage * pageSize, filteredRows.length);

  const averageScore = useMemo(() => {
    const totals = filteredRows.reduce(
      (acc, row) => {
        acc.totalScore += row.totalScore;
        acc.totalMaxScore += row.totalMaxScore;
        return acc;
      },
      { totalScore: 0, totalMaxScore: 0 },
    );

    if (totals.totalMaxScore <= 0) {
      return 0;
    }

    return Math.round((totals.totalScore / totals.totalMaxScore) * 100);
  }, [filteredRows]);

  const toggleStudentDetails = (studentId: string) => {
    setExpandedStudentIds((previous) => {
      if (previous.includes(studentId)) {
        return previous.filter((id) => id !== studentId);
      }
      return [...previous, studentId];
    });
  };

  if (loadingOptions) {
    return <div className="teacher-page" style={{ padding: '24px' }}>Loading results dashboard...</div>;
  }

  return (
    <div className="teacher-page" style={{ padding: '24px', overflow: 'hidden' }}>
      <div className="builder-header">
        <div>
          <h1 className="builder-title" style={{ fontSize: '18px' }}>Results Dashboard</h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#666' }}>
            Review total marks per student. Click a student row to expand question-level details.
          </p>
        </div>
      </div>

      <div className="results-controls-grid">
        <input
          className="res-search-input"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search students, prompts, or SQL..."
        />
        <select className="form-input" value={selectedExamId} onChange={(event) => setSelectedExamId(event.target.value)}>
          <option value="">Select exam</option>
          {examOptions.map((exam) => (
            <option key={String(exam.id)} value={String(exam.id)}>
              {exam.title} · {getCourseName(exam.course, exam.courseId)}
            </option>
          ))}
        </select>

        <select className="form-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StudentStatusFilter)}>
          <option value="all">All statuses</option>
          <option value="correct">Correct only</option>
          <option value="reviewed">Reviewed only</option>
        </select>

        <select className="form-input" value={scoreBandFilter} onChange={(event) => setScoreBandFilter(event.target.value as ScoreBand)}>
          <option value="all">All score bands</option>
          <option value="high">High (80-100%)</option>
          <option value="medium">Medium (50-79%)</option>
          <option value="low">Low (0-49%)</option>
        </select>

        <select className="form-input" value={String(pageSize)} onChange={(event) => setPageSize(Number(event.target.value))}>
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={String(size)}>
              {size} rows per page
            </option>
          ))}
        </select>

        <div className="content-card results-average-card">
          <span style={{ fontSize: '12px', color: '#666' }}>Average Score</span>
          <strong>{averageScore}%</strong>
        </div>
      </div>

      {error && <div style={{ color: '#e53e3e', marginBottom: '12px' }}>{error}</div>}

      <div className="results-table-card">
        {loadingRows ? (
          <div style={{ padding: '24px' }}>Loading exam results...</div>
        ) : filteredRows.length === 0 ? (
          <div style={{ padding: '24px', color: '#666' }}>
            No students match the current filters for this exam.
          </div>
        ) : (
          <>
            <table className="results-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Total Score</th>
                  <th>Questions</th>
                  <th>Status</th>
                  <th>Last Submitted</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((student) => {
                  const isExpanded = expandedStudentIds.includes(student.studentId);
                  return (
                    <React.Fragment key={student.studentId}>
                      <tr
                        className={`results-student-row ${isExpanded ? 'is-expanded' : ''}`}
                        onClick={() => toggleStudentDetails(student.studentId)}
                      >
                        <td>
                          <div className="sess-student-name">{student.studentName || student.studentId}</div>
                          <div className="sess-student-email">
                            {student.sessionIds.length > 0 ? `Sessions ${student.sessionIds.join(', ')}` : 'No session id'}
                          </div>
                        </td>
                        <td>{student.totalScore}/{student.totalMaxScore} ({student.averagePercent}%)</td>
                        <td>{student.questionCount}</td>
                        <td>
                          <span className={`badge ${student.status === 'Correct' ? 'badge-green' : 'badge-gray'}`}>
                            {student.status}
                          </span>
                        </td>
                        <td>{student.latestSubmittedAt ? new Date(student.latestSubmittedAt).toLocaleString() : 'N/A'}</td>
                        <td>
                          <button
                            type="button"
                            className="results-expand-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleStudentDetails(student.studentId);
                            }}
                          >
                            {isExpanded ? 'Hide' : 'View'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="results-student-details-row">
                          <td colSpan={6}>
                            <div className="results-details-wrap">
                              <table className="results-subtable">
                                <thead>
                                  <tr>
                                    <th>Question</th>
                                    <th>Score</th>
                                    <th>Status</th>
                                    <th>Submitted</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {student.details.map((detail, index) => (
                                    <tr key={`${student.studentId}-${String(detail.questionId)}-${index}`}>
                                      <td>{detail.questionPrompt || String(detail.questionId)}</td>
                                      <td>{detail.score ?? 0}/{detail.maxScore ?? 0}</td>
                                      <td>
                                        <span className={`badge ${detail.isCorrect ? 'badge-green' : 'badge-gray'}`}>
                                          {detail.isCorrect ? 'Correct' : 'Reviewed'}
                                        </span>
                                      </td>
                                      <td>{detail.submittedAt ? new Date(detail.submittedAt).toLocaleString() : 'N/A'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            <div className="results-pagination">
              <div className="results-pagination-meta">
                Showing {pageStart}-{pageEnd} of {filteredRows.length} students
              </div>
              <div className="results-pagination-actions">
                <button
                  type="button"
                  className="results-pagination-button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={boundedPage === 1}
                >
                  Previous
                </button>
                <span className="results-pagination-current">Page {boundedPage} of {totalPages}</span>
                <button
                  type="button"
                  className="results-pagination-button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={boundedPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResultsDashboard;
