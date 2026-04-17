import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '../../layout/DashboardLayout';
import { PageSkeleton } from '../../components/PageSkeleton';
import type { NavItem } from '../../layout/DashboardLayout';

const TeacherHome = lazy(() => import('./TeacherHome'));
const ExamBuilder = lazy(() => import('./ExamBuilder'));
const ResultsDashboard = lazy(() => import('./ResultsDashboard'));
const ExamsList = lazy(() => import('./ExamsList'));
const TeacherProfile = lazy(() => import('./TeacherProfile'));
const ExamSessionsMonitor = lazy(() => import('./ExamSessionsMonitor'));
const CourseEnrollments = lazy(() => import('./CourseEnrollments'));
const TeacherCourses = lazy(() => import('./TeacherCourses'));

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
const CourseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
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

const teacherNav: NavItem[] = [
  { label: 'Dashboard', path: '/teacher', icon: <HomeIcon /> },
  { label: 'Courses', path: '/teacher/courses', icon: <CourseIcon /> },
  { label: 'Exams', path: '/teacher/exams', icon: <ExamIcon /> },
  { label: 'Sessions', path: '/teacher/sessions', icon: <SessionsIcon /> },
  { label: 'Results', path: '/teacher/results', icon: <ResultsIcon /> },
  { label: 'Students', path: '/teacher/students', icon: <StudentsIcon /> },
];

const TeacherDashboard: React.FC = () => (
  <DashboardLayout navItems={teacherNav} portalTitle="Teacher Portal" accentColor="#38a169">
    <Suspense fallback={<PageSkeleton title="Teacher Portal" />}>
      <Routes>
        <Route index element={<TeacherHome />} />
        <Route path="courses" element={<TeacherCourses />} />
        <Route path="exams" element={<ExamsList />} />
        <Route path="exams/builder" element={<ExamBuilder />} />
        <Route path="exams/builder/:examId" element={<ExamBuilder />} />
        <Route path="sessions" element={<ExamSessionsMonitor />} />
        <Route path="results" element={<ResultsDashboard />} />
        <Route path="profile" element={<TeacherProfile />} />
        <Route path="students" element={<CourseEnrollments />} />
      </Routes>
    </Suspense>
  </DashboardLayout>
);

export default TeacherDashboard;
