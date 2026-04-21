import React, { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { examApi, resultApi, type StudentExamResult } from '../../api';
import { PageSkeleton } from '../../components/PageSkeleton';
import { useAuth } from '../../contexts';
import { formatDateTime } from '../../utils/queryme';
import { useStudentSessions } from '../../hooks/useStudentSessions';
import { useCourses } from '../../hooks/useCourses';

interface ResultRow {
  sessionId: string;
  examId: string;
  title: string;
  course: string;
  submittedAt: string;
  visible: boolean;
  totalScore: number;
  totalMaxScore: number;
  visibilityMode: string;
  questions: NonNullable<StudentExamResult['questions']>;
  teacherFeedback?: string;
}

const MyResults: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [activeResult, setActiveResult] = useState<ResultRow | null>(null);
  
  const autoSubmitMessage = location.state?.message as string | undefined;

  // \u2500\u2500 Cached sessions list (shared with StudentHome \u2014 no extra request if already cached) \u2500\u2500
  const { data: sessions, loading: sessionsLoading, error: sessionsError } = useStudentSessions(user?.id);
  const { data: allCourses } = useCourses();

  const courseMap = useMemo(() => {
    const map = new Map<string, string>();
    allCourses.forEach((c) => {
      if (c.id && c.name) map.set(String(c.id), c.name);
    });
    return map;
  }, [allCourses]);

  // Top 15 sessions sorted newest-first
  const sessionSlice = useMemo(() =>
    [...sessions]
      .sort((a, b) => new Date(b.submittedAt || b.startedAt || 0).getTime() - new Date(a.submittedAt || a.startedAt || 0).getTime())
      .slice(0, 15),
    [sessions],
  );

  // Fetch exam + result for every session in parallel — each entry is cached individually
  const detailQueries = useQueries({
    queries: sessionSlice.map((session) => ({
      queryKey: ['session-detail', String(session.id)],
      queryFn: async ({ signal }: { signal?: AbortSignal }) => {
        const [exam, result] = await Promise.all([
          examApi.getExam(String(session.examId), signal).catch(() => null),
          resultApi.getSessionResult(String(session.id), signal).catch(() => null as StudentExamResult | null),
        ]);
        return { session, exam, result };
      },
      staleTime: 60_000,
      enabled: Boolean(session.id),
    })),
  });

  const loading = sessionsLoading || detailQueries.some((q) => q.isLoading);
  const error = sessionsError;

  const results = useMemo<ResultRow[]>(() =>
    detailQueries
      .filter((q) => q.data)
      .map(({ data }) => {
        const { session, exam, result } = data!;
        const courseNameFromExam = exam?.courseName || exam?.course?.name?.trim();
        const courseNameFromMap = exam?.courseId ? courseMap.get(String(exam.courseId)) : undefined;
        return {
          sessionId: String(session.id),
          examId: String(session.examId),
          title: result?.examTitle || exam?.title || 'Exam',
          course: result?.courseName || courseNameFromExam || courseNameFromMap || (exam?.courseId ? `Course ${exam.courseId}` : 'Unknown Course'),
          submittedAt: session.submittedAt || session.startedAt || '',
          visible: result?.visible ?? false,
          totalScore: result?.totalScore ?? 0,
          totalMaxScore: result?.totalMaxScore ?? 0,
          visibilityMode: String(result?.visibilityMode || exam?.visibilityMode || 'N/A'),
          questions: result?.questions || [],
          teacherFeedback: result?.teacherFeedback || session.teacherFeedback || '',
        } satisfies ResultRow;
      })
      .sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()),
    [detailQueries, courseMap],
  );


  const visibleResults = useMemo(
    () => results.filter((result) => result.visible && result.totalMaxScore > 0),
    [results],
  );

  const averageScore = useMemo(() => {
    if (visibleResults.length === 0) {
      return 0;
    }

    return Math.round(
      visibleResults.reduce((sum, result) => sum + (result.totalScore / result.totalMaxScore) * 100, 0) / visibleResults.length,
    );
  }, [visibleResults]);

  const handleExport = async (result: ResultRow) => {
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
      const timestamp = formatDateTime(result.submittedAt);
      const studentName = user?.name || user?.email || 'Student';

      // Header
      doc.setFontSize(22);
      doc.setTextColor(40, 40, 40);
      doc.text('Exam Results Report', 14, 22);
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

      // Exam Info Card
      doc.setDrawColor(230, 230, 230);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 38, 182, 45, 3, 3, 'FD');

      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text('Exam Title:', 20, 48);
      doc.text('Student:', 20, 56);
      doc.text('Course:', 20, 64);
      doc.text('Date Submitted:', 20, 72);
      doc.text('Total Score:', 20, 80);

      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.text(result.title, 60, 48);
      doc.text(studentName, 60, 56);
      doc.text(result.course, 60, 64);
      doc.text(timestamp, 60, 72);
      doc.text(`${result.totalScore} / ${result.totalMaxScore}`, 60, 80);

      // Question Breakdown Table
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Question Breakdown', 14, 100);

      const tableData = result.questions.map((q, index) => [
        `Q${index + 1}`,
        q.prompt || 'N/A',
        q.submittedQuery?.trim() || 'No answer submitted.',
        `${q.score ?? 0} / ${q.maxScore ?? 0}`
      ]);

      autoTable(doc, {
        startY: 105,
        head: [['#', 'Question', 'Your Answer', 'Marks']],
        body: tableData,
        headStyles: { fillColor: [106, 60, 176], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 60 },
          2: { cellWidth: 80 },
          3: { cellWidth: 30, halign: 'center' }
        },
        styles: { fontSize: 9, cellPadding: 5, overflow: 'linebreak' },
        margin: { top: 105 }
      });

      // Footer
      const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`QueryMe Platform - Page ${i} of ${pageCount}`, (doc as unknown as { internal: { pageSize: { width: number } } }).internal.pageSize.width / 2, (doc as unknown as { internal: { pageSize: { height: number } } }).internal.pageSize.height - 10, { align: 'center' });
      }

      doc.save(`Result_${result.title.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Failed to generate PDF. Please try again later.');
    }
  };

  if (loading) {
    return <PageSkeleton title="My Results" rows={6} />;
  }

  if (error) {
    return (
      <div>
        <div className="page-header">
          <h1>My Results</h1>
          <p>View your exam scores and released feedback.</p>
        </div>
        <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>{error}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>My Results</h1>
        <p>Only the results the backend marks as visible are shown in detail.</p>
      </div>

      {autoSubmitMessage && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold">Lockdown Violation Detected</h3>
              <p className="mt-1 text-sm font-medium opacity-90">{autoSubmitMessage}</p>
            </div>
          </div>
        </div>
      )}

      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-card-value">{results.length}</div>
          <div className="stat-card-label">Total Sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{visibleResults.length}</div>
          <div className="stat-card-label">Visible Results</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{averageScore}%</div>
          <div className="stat-card-label">Average Visible Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{results.length - visibleResults.length}</div>
          <div className="stat-card-label">Awaiting Release</div>
        </div>
      </div>

      <div className="content-card">
        <div className="content-card-header">
          <h2>Session History</h2>
        </div>
        <div className="content-card-body hidden md:block" style={{ padding: 0 }}>
          <table className="data-table min-w-120">
            <thead>
              <tr>
                <th>Exam</th>
                <th>Submitted</th>
                <th>Visibility</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.sessionId}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1a1a2e' }}>{result.title}</div>
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{result.course}</div>
                    </td>
                    <td style={{ fontSize: '12px', color: '#666' }}>{formatDateTime(result.submittedAt)}</td>
                    <td>
                      <span className={`badge ${result.visible ? 'badge-green' : 'badge-gray'}`}>
                        {result.visible ? result.visibilityMode : 'Hidden'}
                      </span>
                    </td>
                    <td>
                      {result.visible ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            aria-label={`View score details for ${result.title}`}
                            onClick={() => setActiveResult(result)}
                            style={{
                              minWidth: '110px',
                              justifyContent: 'center',
                              padding: '6px 12px',
                              borderRadius: '999px',
                              border: '1px solid #c4b5fd',
                              background: '#f5f3ff',
                              color: '#6a3cb0',
                              fontWeight: 700,
                              textDecoration: 'underline',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            View {result.totalScore}/{result.totalMaxScore}
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                            onClick={() => void handleExport(result)}
                          >
                            Export PDF
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#888' }}>Awaiting release</span>
                      )}
                    </td>
                  </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
                    No exam sessions have been recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {results.map((result) => (
            <div key={`mobile-${result.sessionId}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="font-semibold text-slate-800">{result.title}</div>
              <div className="mt-1 text-xs text-slate-500">{result.course}</div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div><strong>Submitted:</strong> {formatDateTime(result.submittedAt)}</div>
                <div><strong>Visibility:</strong> {result.visible ? result.visibilityMode : 'Hidden'}</div>
              </div>
              <div className="mt-3">
                {result.visible ? (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      aria-label={`View score details for ${result.title}`}
                      onClick={() => setActiveResult(result)}
                      className="inline-flex w-full items-center justify-center rounded-full border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700 underline"
                    >
                      View {result.totalScore}/{result.totalMaxScore}
                    </button>
                    <button
                      type="button"
                      className="inline-flex w-full items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700"
                      onClick={() => void handleExport(result)}
                    >
                      Export PDF
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-slate-500">Awaiting release</span>
                )}
              </div>
            </div>
          ))}
          {results.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
              No exam sessions have been recorded yet.
            </div>
          )}
        </div>
      </div>

      {activeResult && (
        <div
          className="marks-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.52)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(3px)',
            padding: '20px',
          }}
          onClick={() => setActiveResult(null)}
          role="presentation"
        >
          <div
            className="content-card marks-modal"
            style={{ width: 'min(980px, 100%)', maxHeight: '85vh', overflow: 'hidden' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="content-card-header marks-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 className="marks-modal-title" style={{ marginBottom: '4px' }}>{activeResult.title}</h2>
                <div className="marks-modal-course" style={{ fontSize: '12px' }}>{activeResult.course}</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveResult(null)}>
                Close
              </button>
            </div>

            <div className="content-card-body" style={{ overflowY: 'auto', maxHeight: 'calc(85vh - 96px)' }}>
              <div className="marks-modal-score" style={{ marginBottom: '14px', fontSize: '13px' }}>
                Session score: <strong>{activeResult.totalScore}/{activeResult.totalMaxScore}</strong>
              </div>

              {activeResult.questions.length > 0 ? (
                <div className="marks-modal-questions" style={{ display: 'grid', gap: '12px' }}>
                  {activeResult.questions.map((question, index) => (
                    <div
                      key={String(question.questionId)}
                      className="marks-modal-question"
                    >
                      <div className="marks-modal-question-label">
                        Question {index + 1}
                      </div>
                      <div className="marks-modal-question-prompt">
                        {question.prompt}
                      </div>
                      <div className="marks-modal-question-answer">
                        <strong>Answered:</strong> {question.submittedQuery?.trim() || 'No answer submitted.'}
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="badge badge-gray">Scored: {question.score ?? 0}/{question.maxScore ?? 0}</span>
                        <span className={`badge ${question.isCorrect ? 'badge-green' : 'badge-red'}`}>
                          {question.isCorrect ? 'Correct' : 'Incorrect'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="marks-modal-empty">No question breakdown was returned for this session.</div>
              )}

              {activeResult.teacherFeedback && (
                <div className="marks-modal-feedback" style={{ marginTop: '24px', padding: '16px', borderRadius: '12px', background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0369a1', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Teacher Feedback
                  </h3>
                  <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#0c4a6e', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {activeResult.teacherFeedback}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyResults;
