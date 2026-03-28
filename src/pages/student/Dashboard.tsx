import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../../layout/DashboardLayout';
import type { NavItem } from '../../layout/DashboardLayout';
import StudentHome from './StudentHome';
import AvailableExams from './AvailableExams';
import ExamSession from './ExamSession';
import MyResults from './MyResults';
import StudentProfile from './StudentProfile';

// SVG icon components for nav
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const ExamIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
  </svg>
);
const CodeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
  </svg>
);
const ResultsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

const studentNav: NavItem[] = [
  { label: 'Dashboard', path: '/student', icon: <HomeIcon /> },
  { label: 'Available Exams', path: '/student/exams', icon: <ExamIcon /> },
  { label: 'SQL Editor', path: '/student/exam-session', icon: <CodeIcon /> },
  { label: 'My Results', path: '/student/results', icon: <ResultsIcon /> },
  { label: 'Profile', path: '/student/profile', icon: <ProfileIcon /> },
];

const StudentDashboard: React.FC = () => {
  return (
    <DashboardLayout navItems={studentNav} portalTitle="Student Portal" accentColor="#6a3cb0">
      <Routes>
        <Route index element={<StudentHome />} />
        <Route path="exams" element={<AvailableExams />} />
        <Route path="exam-session" element={<ExamSession />} />
        <Route path="exam-session/:examId" element={<ExamSession />} />
        <Route path="results" element={<MyResults />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="*" element={<Navigate to="/student" replace />} />
      </Routes>
    </DashboardLayout>
  );
};

export default StudentDashboard;
