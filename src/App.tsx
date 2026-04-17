import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts';
import AuthPage from './pages/auth/AuthPage';

const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const TeacherDashboard = lazy(() => import('./pages/teacher/Dashboard'));
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
const GuestPage = lazy(() => import('./pages/guest/GuestPage'));

import ProtectedRoute from './components/ProtectedRoute';
import ToastProvider from './components/ToastProvider';
import { APP_SHELL_TW } from './theme/twStyles';
import { ThemeProvider } from './contexts';
import { PageSkeleton } from './components/PageSkeleton';
import './theme/dark-mode.css';

const HomeRedirect = () => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth" replace />;
  }

  return <Navigate to={`/${user.role.toLowerCase()}`} replace />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <div className={APP_SHELL_TW}>
              <Suspense fallback={<PageSkeleton />}>
                <Routes>
                  <Route path="/auth" element={<AuthPage />} />
                  <Route
                    path="/admin/*"
                    element={(
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    )}
                  />
                  <Route
                    path="/teacher/*"
                    element={(
                      <ProtectedRoute allowedRoles={['TEACHER']}>
                        <TeacherDashboard />
                      </ProtectedRoute>
                    )}
                  />
                  <Route
                    path="/student/*"
                    element={(
                      <ProtectedRoute allowedRoles={['STUDENT']}>
                        <StudentDashboard />
                      </ProtectedRoute>
                    )}
                  />
                  <Route path="/guest/*" element={<GuestPage />} />
                  <Route path="/" element={<HomeRedirect />} />
                  <Route path="*" element={<HomeRedirect />} />
                </Routes>
              </Suspense>
            </div>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
