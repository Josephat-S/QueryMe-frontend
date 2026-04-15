import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts';
import AuthPage from './pages/auth/AuthPage';
import { Dashboard as AdminDashboard } from './pages/admin';
import { Dashboard as TeacherDashboard } from './pages/teacher';
import { Dashboard as StudentDashboard } from './pages/student';
import { GuestPage } from './pages/guest';
import ProtectedRoute from './components/ProtectedRoute';
import ToastProvider from './components/ToastProvider';
import { APP_SHELL_TW } from './theme/twStyles';
import { ThemeProvider } from './contexts';
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
            </div>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
