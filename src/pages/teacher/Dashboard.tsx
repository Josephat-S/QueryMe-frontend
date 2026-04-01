import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '../../layout/DashboardLayout';
import ExamBuilder from './ExamBuilder';
import ResultsDashboard from './ResultsDashboard';
import ExamsList from './ExamsList';
import TeacherProfile from './TeacherProfile';
import ExamSessionsMonitor from './ExamSessionsMonitor';
import CourseEnrollments from './CourseEnrollments';
import type { NavItem } from '../../layout/DashboardLayout';
import './TeacherPages.css';

/* ── Icons ── */
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const ExamIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
  </svg>
);
const SessionsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const ResultsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const StudentsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

/* ── Nav ── */
const teacherNav: NavItem[] = [
  { label: 'Dashboard', path: '/teacher',          icon: <HomeIcon /> },
  { label: 'Exams',     path: '/teacher/exams',    icon: <ExamIcon /> },
  { label: 'Sessions',  path: '/teacher/sessions', icon: <SessionsIcon /> },
  { label: 'Results',   path: '/teacher/results',  icon: <ResultsIcon /> },
  { label: 'Students',  path: '/teacher/students', icon: <StudentsIcon /> },
];

/* ── Mock data (mirrors exam_sessions + exams tables) ── */
const recentSubmissions = [
  { id: 1, student: 'Alice Brown',   initials: 'AB', exam: 'SQL Midterm – DB 101',      score: 92, total: 100, submittedAt: '2 mins ago',  status: 'Pending Review' },
  { id: 2, student: 'Bob Wilson',    initials: 'BW', exam: 'SQL Midterm – DB 101',      score: 85, total: 100, submittedAt: '18 mins ago', status: 'Graded'         },
  { id: 3, student: 'Faith Osei',    initials: 'FO', exam: 'Joins & Aggregates Quiz',   score: 88, total: 100, submittedAt: '34 mins ago', status: 'Graded'         },
  { id: 4, student: 'George Kimani', initials: 'GK', exam: 'Joins & Aggregates Quiz',   score: 54, total: 100, submittedAt: '1 hr ago',    status: 'Pending Review' },
  { id: 5, student: 'Diana Prince',  initials: 'DP', exam: 'Data Engineering Quiz 1',   score: 95, total: 100, submittedAt: '2 hrs ago',   status: 'Graded'         },
];

const draftsAndUpcoming = [
  { id: 'd1', title: 'Advanced Joins Final',      course: 'Advanced SQL',                  status: 'draft',     scheduledFor: ''                   },
  { id: 'd2', title: 'Data Modeling Assessment',  course: 'Data Engineering Fundamentals', status: 'draft',     scheduledFor: ''                   },
  { id: 'd3', title: 'SQL Syntax Refresher',      course: 'Database Systems 101',          status: 'published', scheduledFor: 'Apr 12, 2026 10:00' },
  { id: 'd4', title: 'Normalisation Deep Dive',   course: 'Database Systems 101',          status: 'published', scheduledFor: 'Apr 18, 2026 14:00' },
];

const scoreColor = (s: number) => s >= 80 ? '#38a169' : s >= 60 ? '#dd6b20' : '#e53e3e';
const statusColor: Record<string, string> = {
  'Graded': '#38a169', 'Pending Review': '#dd6b20', 'Missed': '#e53e3e',
};

/* ── Dashboard Home ── */
const TeacherDashboardHome: React.FC = () => (
  <div>
    {/* Header */}
    <div className="page-header" style={{ marginBottom: '20px' }}>
      <h1>Teacher Dashboard</h1>
      <p>Good morning, Prof. Smith — here's what's happening today.</p>
    </div>

    {/* Quick Actions */}
    <div className="td-quick-actions">
      <a href="/teacher/exams/builder" className="td-qa-btn td-qa-primary">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
        Create New Exam
      </a>
      <a href="/teacher/sessions" className="td-qa-btn td-qa-secondary">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        Live Sessions
      </a>
      <a href="/teacher/results" className="td-qa-btn td-qa-secondary">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
        Review Results
      </a>
      <a href="/teacher/students" className="td-qa-btn td-qa-secondary">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        </svg>
        Manage Students
      </a>
    </div>

    {/* Stat cards */}
    <div className="stat-grid" style={{ marginBottom: '24px' }}>
      <div className="stat-card">
        <div className="stat-card-icon" style={{ background: 'rgba(56,161,105,0.1)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38a169" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <div className="stat-card-value">6</div>
        <div className="stat-card-label">Active Exams</div>
      </div>
      <div className="stat-card">
        <div className="stat-card-icon" style={{ background: 'rgba(49,130,206,0.1)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3182ce" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          </svg>
        </div>
        <div className="stat-card-value">38</div>
        <div className="stat-card-label">Total Questions</div>
      </div>
      <div className="stat-card">
        <div className="stat-card-icon" style={{ background: 'rgba(106,60,176,0.1)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6a3cb0" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          </svg>
        </div>
        <div className="stat-card-value">45</div>
        <div className="stat-card-label">Students</div>
      </div>
      <div className="stat-card">
        <div className="stat-card-icon" style={{ background: 'rgba(221,107,32,0.1)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dd6b20" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </div>
        <div className="stat-card-value">74%</div>
        <div className="stat-card-label">Avg. Class Score</div>
      </div>
    </div>

    {/* Two-column lower section */}
    <div className="td-lower-grid">

      {/* ── Recent Submissions ── */}
      <div className="content-card">
        <div className="content-card-header">
          <h2>Recent Submissions</h2>
          <a href="/teacher/results" className="td-see-all">See all →</a>
        </div>
        <div>
          {recentSubmissions.map(s => (
            <div key={s.id} className="td-activity-row">
              <div className="td-activity-avatar">{s.initials}</div>
              <div className="td-activity-info">
                <span className="td-activity-name">{s.student}</span>
                <span className="td-activity-exam">{s.exam}</span>
              </div>
              <div className="td-activity-meta">
                <span className="td-activity-score" style={{ color: scoreColor(s.score) }}>
                  {s.score}/{s.total}
                </span>
                <span className="td-activity-status" style={{ color: statusColor[s.status] }}>
                  ● {s.status}
                </span>
                <span className="td-activity-time">{s.submittedAt}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Drafts & Upcoming Exams ── */}
      <div className="content-card">
        <div className="content-card-header">
          <h2>Drafts &amp; Upcoming</h2>
          <a href="/teacher/exams" className="td-see-all">Manage →</a>
        </div>
        <div style={{ padding: '8px 0' }}>
          {draftsAndUpcoming.map(e => (
            <div key={e.id} className="td-draft-row">
              <div className="td-draft-icon">
                {e.status === 'draft' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                )}
              </div>
              <div className="td-draft-info">
                <span className="td-draft-title">{e.title}</span>
                <span className="td-draft-course">{e.course}</span>
              </div>
              <div className="td-draft-right">
                <span className={`td-draft-badge ${e.status === 'draft' ? 'td-badge-draft' : 'td-badge-upcoming'}`}>
                  {e.status === 'draft' ? 'Draft' : 'Upcoming'}
                </span>
                {e.scheduledFor && (
                  <span className="td-draft-date">{e.scheduledFor}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  </div>
);

/* ── Router ── */
const TeacherDashboard: React.FC = () => (
  <DashboardLayout navItems={teacherNav} portalTitle="Teacher Portal" accentColor="#38a169">
    <Routes>
      <Route path="/"              element={<TeacherDashboardHome />} />
      <Route path="/exams"         element={<ExamsList />} />
      <Route path="/exams/builder" element={<ExamBuilder />} />
      <Route path="/sessions"      element={<ExamSessionsMonitor />} />
      <Route path="/results"       element={<ResultsDashboard />} />
      <Route path="/profile"       element={<TeacherProfile />} />
      <Route path="/students"      element={<CourseEnrollments />} />
    </Routes>
  </DashboardLayout>
);

export default TeacherDashboard;
