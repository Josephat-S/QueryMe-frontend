import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts';
import AuthPage from './pages/auth/AuthPage';
import { Dashboard as AdminDashboard } from './pages/admin';
import { Dashboard as TeacherDashboard } from './pages/teacher';
import { Dashboard as StudentDashboard } from './pages/student';
import { GuestPage } from './pages/guest';
import './theme/dark-mode.css';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/admin/*" element={<AdminDashboard />} />
            <Route path="/teacher/*" element={<TeacherDashboard />} />
            <Route path="/student/*" element={<StudentDashboard />} />
            <Route path="/guest/*" element={<GuestPage />} />
            <Route path="/" element={<Navigate to="/auth" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
