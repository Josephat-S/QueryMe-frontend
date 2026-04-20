import React, { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { type Exam, type TeacherResultRow } from '../../api';
import { InlineSkeleton, PageSkeleton } from '../../components/PageSkeleton';
import { useAuth } from '../../contexts';
import { getCourseName } from '../../utils/queryme';
import { usePublishedExams } from '../../hooks/usePublishedExams';
import { useExamDashboard } from '../../hooks/useExamDashboard';

type ScoreBand = 'all' | 'high' | 'medium' | 'low';
type StudentStatusFilter = 'all' | 'correct' | 'reviewed';

interface StudentSummaryRow {
  studentId: string;
  studentName: string;
  questionCount: number;
  totalScore: number;
  totalMaxScore: number;
  averagePercent: number;
  correctCount: number;
  status: 'Correct' | 'Reviewed';
  latestSubmittedAt: string | null;
  details: TeacherResultRow[];
  /** Pre-computed for fast search filtering */
  searchHaystack: string;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const getScoreBand = (averagePercent: number): Exclude<ScoreBand, 'all'> => {
  if (averagePercent >= 80) return 'high';
  if (averagePercent >= 50) return 'medium';
  return 'low';
};

const ResultsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedExamId, setSelectedExamId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StudentStatusFilter>('all');
  const [scoreBandFilter, setScoreBandFilter] = useState<ScoreBand>('all');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<StudentSummaryRow | null>(null);

  // ── Cached data fetching ──────────────────────────────────────────────────
  // Derive the active exam — use the user selection if set, otherwise fall back to the first option.
  // This avoids a setState-in-useEffect cascade.
  const { data: examOptions, loading: loadingOptions, error: examsError } = usePublishedExams();
  const effectiveExamId = selectedExamId || (user && examOptions.length > 0 ? String(examOptions[0].id) : '');
  const { data: rows, loading: loadingRows, error: rowsError } = useExamDashboard(effectiveExamId || undefined);

  const error = examsError || rowsError;

  const selectedExam = useMemo(
    () => (examOptions as Exam[]).find((e) => String(e.id) === effectiveExamId) || null,
    [examOptions, effectiveExamId],
  );

  const selectedExamLabel = useMemo(() => {
    if (!selectedExam) return 'Selected exam';
    return `${selectedExam.title} - ${getCourseName(selectedExam.course, selectedExam.courseId)}`;
  }, [selectedExam]);

  // ── Aggregate rows by student, pre-computing the search haystack ──────────
  const studentRows = useMemo<StudentSummaryRow[]>(() => {
    const grouped = new Map<string, StudentSummaryRow>();

    (rows as TeacherResultRow[]).forEach((row) => {
      const studentId = String(row.studentId || 'Unknown');
      const existing = grouped.get(studentId);

      if (!existing) {
        grouped.set(studentId, {
          studentId,
          studentName: row.studentName || studentId,
          questionCount: 1,
          totalScore: typeof row.score === 'number' ? row.score : 0,
          totalMaxScore: typeof row.maxScore === 'number' ? row.maxScore : 0,
          averagePercent: 0,
          correctCount: row.isCorrect ? 1 : 0,
          status: 'Reviewed',
          latestSubmittedAt: row.submittedAt || null,
          details: [row],
          searchHaystack: '',
        });
        return;
      }

      existing.questionCount += 1;
      existing.totalScore += typeof row.score === 'number' ? row.score : 0;
      existing.totalMaxScore += typeof row.maxScore === 'number' ? row.maxScore : 0;
      existing.correctCount += row.isCorrect ? 1 : 0;
      existing.details.push(row);

      if (row.submittedAt) {
        const latestTs = existing.latestSubmittedAt ? new Date(existing.latestSubmittedAt).getTime() : 0;
        const rowTs = new Date(row.submittedAt).getTime();
        if (!Number.isNaN(rowTs) && rowTs > latestTs) existing.latestSubmittedAt = row.submittedAt;
      }
    });

    return Array.from(grouped.values())
      .map((student) => {
        const averagePercent = student.totalMaxScore > 0
          ? Math.round((student.totalScore / student.totalMaxScore) * 100)
          : 0;
        const status: StudentSummaryRow['status'] =
          student.questionCount > 0 && student.correctCount === student.questionCount ? 'Correct' : 'Reviewed';
        const details = [...student.details].sort((a, b) => {
          const tA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
          const tB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
          return tB - tA;
        });
        // Pre-compute haystack once — not re-done per keystroke
        const detailText = details
          .map((d) => `${d.questionPrompt || ''} ${d.submittedQuery || ''}`)
          .join(' ')
          .toLowerCase();
        const searchHaystack = `${student.studentName} ${detailText}`.toLowerCase();

        return { ...student, averagePercent, status, details, searchHaystack };
      })
      .sort((a, b) => {
        const tA = a.latestSubmittedAt ? new Date(a.latestSubmittedAt).getTime() : 0;
        const tB = b.latestSubmittedAt ? new Date(b.latestSubmittedAt).getTime() : 0;
        return tB !== tA ? tB - tA : a.studentName.localeCompare(b.studentName);
      });
  }, [rows]);

  const filteredRows = useMemo(
    () => studentRows.filter((student) => {
      const lowerSearch = searchQuery.trim().toLowerCase();
      const matchesSearch = lowerSearch.length === 0 || student.searchHaystack.includes(lowerSearch);
      const matchesStatus = statusFilter === 'all' || student.status.toLowerCase() === statusFilter;
      const matchesScoreBand = scoreBandFilter === 'all' || getScoreBand(student.averagePercent) === scoreBandFilter;
      return matchesSearch && matchesStatus && matchesScoreBand;
    }),
    [studentRows, searchQuery, statusFilter, scoreBandFilter],
  );

  // Reset page + clear modal via event handlers (not useEffect) to avoid cascading renders.

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedStudent(null); };
    if (selectedStudent) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', onKeyDown);
    }
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKeyDown); };
  }, [selectedStudent]);

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
      (acc, row) => { acc.totalScore += row.totalScore; acc.totalMaxScore += row.totalMaxScore; return acc; },
      { totalScore: 0, totalMaxScore: 0 },
    );
    return totals.totalMaxScore <= 0 ? 0 : Math.round((totals.totalScore / totals.totalMaxScore) * 100);
  }, [filteredRows]);

  const buildExportRows = () => filteredRows.map((s) => ({
    Student: s.studentName || 'Student',
    'Total Score': s.totalScore,
    'Max Score': s.totalMaxScore,
    Percentage: `${s.averagePercent}%`,
    Questions: s.questionCount,
    Status: s.status,
    'Last Submitted': s.latestSubmittedAt ? new Date(s.latestSubmittedAt).toLocaleString() : 'N/A',
  }));

  const buildDetailExportRows = () => filteredRows.flatMap((s) =>
    s.details.map((d, i) => ({
      Student: s.studentName || 'Student',
      Question: d.questionPrompt || `Question ${i + 1}`,
      'Score Earned': d.score ?? 0,
      'Max Score': d.maxScore ?? 0,
      'Submitted At': d.submittedAt ? new Date(d.submittedAt).toLocaleString() : 'N/A',
      Correct: d.isCorrect ? 'Yes' : 'No',
    })),
  );

  const getExportFileBase = () => {
    const examPart = selectedExam?.title || 'results';
    const normalized = examPart.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return `${normalized || 'results'}-${new Date().toISOString().slice(0, 10)}`;
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = fileName;
    document.body.appendChild(link); link.click(); link.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const ws = XLSX.utils.json_to_sheet(buildExportRows());
    downloadBlob(new Blob([XLSX.utils.sheet_to_csv(ws)], { type: 'text/csv;charset=utf-8;' }), `${getExportFileBase()}.csv`);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildExportRows()), 'Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildDetailExportRows()), 'Details');
    XLSX.writeFile(wb, `${getExportFileBase()}.xlsx`);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    doc.setFontSize(18); doc.text('Exam Results Report', 40, 44);
    doc.setFontSize(11); doc.text(`Exam: ${selectedExamLabel}`, 40, 64);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 80);
    autoTable(doc, {
      startY: 98,
      head: [['Student', 'Total Score', 'Max Score', 'Percentage', 'Questions', 'Status', 'Last Submitted']],
      body: buildExportRows().map((r) => [r.Student, r['Total Score'], r['Max Score'], r.Percentage, r.Questions, r.Status, r['Last Submitted']]),
      styles: { fontSize: 9, cellPadding: 5, textColor: [30, 41, 59] },
      headStyles: { fillColor: [244, 244, 245], textColor: [109, 40, 217], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 251] },
      margin: { left: 40, right: 40 },
    });
    doc.save(`${getExportFileBase()}.pdf`);
  };

  if (loadingOptions) return <PageSkeleton title="Results Dashboard" rows={6} />;

  return (
    <div className="teacher-page space-y-5 p-4 text-slate-700 sm:p-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-6 text-slate-800 shadow-sm">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(16,185,129,0.14), transparent 34%), radial-gradient(circle at bottom left, rgba(59,130,246,0.12), transparent 34%)' }} />
        <div className="relative">
          <h1 className="m-0 text-3xl font-semibold tracking-tight text-slate-900">Results Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Review total marks per student. Click View to open question-level marks.</p>
        </div>
      </section>

      <div className="results-controls-grid rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input className="res-search-input" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); setSelectedStudent(null); }} placeholder="Search students, prompts, or SQL..." />
        <select className="form-input" value={effectiveExamId} onChange={(e) => { setSelectedExamId(e.target.value); setCurrentPage(1); setSelectedStudent(null); }}>
          <option value="">Select exam</option>
          {(examOptions as Exam[]).map((exam) => (
            <option key={String(exam.id)} value={String(exam.id)}>
              {exam.title} - {getCourseName(exam.course, exam.courseId)}
            </option>
          ))}
        </select>
        <select className="form-input" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as StudentStatusFilter); setCurrentPage(1); setSelectedStudent(null); }}>
          <option value="all">All statuses</option>
          <option value="correct">Correct only</option>
          <option value="reviewed">Reviewed only</option>
        </select>
        <select className="form-input" value={scoreBandFilter} onChange={(e) => { setScoreBandFilter(e.target.value as ScoreBand); setCurrentPage(1); setSelectedStudent(null); }}>
          <option value="all">All score bands</option>
          <option value="high">High (80-100%)</option>
          <option value="medium">Medium (50-79%)</option>
          <option value="low">Low (0-49%)</option>
        </select>
        <select className="form-input" value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
          {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={String(s)}>{s} rows per page</option>)}
        </select>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Average Score</span>
          <strong className="mt-1 block text-2xl font-semibold text-slate-900">{averageScore}%</strong>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <strong className="block text-sm text-slate-900">Export results</strong>
          <span className="text-xs text-slate-500">Download the currently filtered students report for {selectedExamLabel}.</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700" onClick={handleExportCsv} disabled={filteredRows.length === 0}>Export CSV</button>
          <button type="button" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700" onClick={handleExportExcel} disabled={filteredRows.length === 0}>Export Excel</button>
          <button type="button" className="inline-flex items-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60" onClick={handleExportPdf} disabled={filteredRows.length === 0}>Export PDF</button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="results-table-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loadingRows ? (
          <InlineSkeleton rows={6} className="p-6" />
        ) : filteredRows.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No students match the current filters for this exam.</div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-215 text-sm">
                <thead>
                  <tr>
                    <th className="bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-violet-700">Student</th>
                    <th className="bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-violet-700">Total Score</th>
                    <th className="bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-violet-700">Questions</th>
                    <th className="bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-violet-700">Status</th>
                    <th className="bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-violet-700">Last Submitted</th>
                    <th className="bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-violet-700">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((student) => (
                    <tr className="results-student-row" key={student.studentId}>
                      <td className="border-t border-slate-100 px-4 py-3">
                        <div className="font-semibold text-slate-800">{student.studentName || 'Student'}</div>
                        <div className="mt-1 text-xs text-slate-500">{student.questionCount} question{student.questionCount === 1 ? '' : 's'} attempted</div>
                      </td>
                      <td className="border-t border-slate-100 px-4 py-3 text-slate-700">{student.totalScore}/{student.totalMaxScore} ({student.averagePercent}%)</td>
                      <td className="border-t border-slate-100 px-4 py-3 text-slate-700">{student.questionCount}</td>
                      <td className="border-t border-slate-100 px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${student.status === 'Correct' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{student.status}</span>
                      </td>
                      <td className="border-t border-slate-100 px-4 py-3 text-slate-700">{student.latestSubmittedAt ? new Date(student.latestSubmittedAt).toLocaleString() : 'N/A'}</td>
                      <td className="border-t border-slate-100 px-4 py-3">
                        <button type="button" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700" onClick={(e) => { e.stopPropagation(); setSelectedStudent(student); }}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {paginatedRows.map((student) => (
                <div key={`mobile-${student.studentId}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="font-semibold text-slate-800">{student.studentName || 'Student'}</div>
                  <div className="mt-1 text-xs text-slate-500">{student.questionCount} question{student.questionCount === 1 ? '' : 's'} attempted</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div><strong>Score:</strong> {student.totalScore}/{student.totalMaxScore}</div>
                    <div><strong>Average:</strong> {student.averagePercent}%</div>
                    <div><strong>Status:</strong> {student.status}</div>
                    <div><strong>Questions:</strong> {student.questionCount}</div>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{student.latestSubmittedAt ? new Date(student.latestSubmittedAt).toLocaleString() : 'N/A'}</div>
                  <button type="button" className="mt-3 inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700" onClick={() => setSelectedStudent(student)}>View details</button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
              <div className="text-xs font-medium text-slate-500">Showing {pageStart}-{pageEnd} of {filteredRows.length} students</div>
              <div className="flex items-center gap-2">
                <button type="button" className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={boundedPage === 1}>Previous</button>
                <span className="text-xs font-medium text-slate-500">Page {boundedPage} of {totalPages}</span>
                <button type="button" className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={boundedPage === totalPages}>Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedStudent && (
        <div className="results-modal-overlay" onClick={() => setSelectedStudent(null)} role="presentation">
          <div className="results-modal w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label={`${selectedStudent.studentName} question marks`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
              <div>
                <h2 className="m-0 text-xl font-semibold text-slate-900">{selectedStudent.studentName}</h2>
                <p className="mt-1 text-sm text-slate-500">Question-by-question marks breakdown</p>
              </div>
              <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-rose-300 hover:text-rose-600" onClick={() => setSelectedStudent(null)} aria-label="Close details">x</button>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Total Score</span><strong className="mt-1 block text-xl text-slate-900">{selectedStudent.totalScore}/{selectedStudent.totalMaxScore}</strong></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Average</span><strong className="mt-1 block text-xl text-slate-900">{selectedStudent.averagePercent}%</strong></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Questions</span><strong className="mt-1 block text-xl text-slate-900">{selectedStudent.questionCount}</strong></div>
            </div>
            <div className="mx-5 mb-5 overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-105 text-sm">
                  <thead><tr>
                    <th className="bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-violet-700">Question No.</th>
                    <th className="bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-violet-700">Marks Scored</th>
                    <th className="bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-violet-700">Max Marks</th>
                  </tr></thead>
                  <tbody>
                    {[...selectedStudent.details]
                      .sort((a, b) => Number(a.questionId) - Number(b.questionId))
                      .map((detail, index) => (
                        <tr key={`${selectedStudent.studentId}-${String(detail.sessionId)}-${String(detail.questionId || index + 1)}`}>
                          <td className="border-t border-slate-100 px-4 py-3">Question {index + 1}</td>
                          <td className="border-t border-slate-100 px-4 py-3">{detail.score ?? 0}</td>
                          <td className="border-t border-slate-100 px-4 py-3">{detail.maxScore ?? 0}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsDashboard;
