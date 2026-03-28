import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../../layout/DashboardLayout';
import type { NavItem } from '../../layout/DashboardLayout';

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
const QuestionIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const ResultsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const StudentsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const teacherNav: NavItem[] = [
  { label: 'Dashboard', path: '/teacher', icon: <HomeIcon /> },
  { label: 'My Exams', path: '/teacher/exams', icon: <ExamIcon /> },
  { label: 'Questions', path: '/teacher/questions', icon: <QuestionIcon /> },
  { label: 'Results', path: '/teacher/results', icon: <ResultsIcon /> },
  { label: 'Students', path: '/teacher/students', icon: <StudentsIcon /> },
];

const TeacherDashboard: React.FC = () => {
  return (
    <DashboardLayout navItems={teacherNav} portalTitle="Teacher Portal" accentColor="#38a169">
      <Routes>
        <Route index element={
          <>
            <div className="page-header">
              <h1>Teacher Dashboard</h1>
              <p>Create exams, manage questions, and view student results</p>
            </div>
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-card-icon" style={{ background: 'rgba(56, 161, 105, 0.1)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38a169" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                </div>
                <div className="stat-card-value">6</div>
                <div className="stat-card-label">Active Exams</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-icon" style={{ background: 'rgba(49, 130, 206, 0.1)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3182ce" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /></svg>
                </div>
                <div className="stat-card-value">38</div>
                <div className="stat-card-label">Total Questions</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-icon" style={{ background: 'rgba(106, 60, 176, 0.1)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6a3cb0" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                </div>
                <div className="stat-card-value">45</div>
                <div className="stat-card-label">Students</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-icon" style={{ background: 'rgba(221, 107, 32, 0.1)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dd6b20" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                </div>
                <div className="stat-card-value">74%</div>
                <div className="stat-card-label">Avg. Class Score</div>
              </div>
            </div>
            <div className="content-card">
              <div className="content-card-body">
                <div className="empty-state">
                  <div className="empty-state-icon" style={{ background: 'rgba(56, 161, 105, 0.1)', color: '#38a169' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                  </div>
                  <h3>Teacher Portal Coming Soon</h3>
                  <p>Exam creation, question management, and results viewing will be built in a future sprint.<br />The shared layout and navigation are ready.</p>
                </div>
              </div>
            </div>
          </>
        } />
        <Route path="*" element={<Navigate to="/teacher" replace />} />
      </Routes>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
