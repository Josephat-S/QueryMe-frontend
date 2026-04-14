import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { sessionApi, type Session } from '../api';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../contexts';
import { extractErrorMessage } from '../utils/errorUtils';
import { isSessionComplete } from '../utils/queryme';
import logoImg from '../assets/logo.png';
import './DashboardLayout.css';

export interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  portalTitle: string;
  accentColor?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, navItems, portalTitle, accentColor = '#6a3cb0' }) => {
  const { user, logout } = useAuth();
  const { confirm, showToast } = useToast();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isProcessingLogout, setIsProcessingLogout] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  React.useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const submitActiveSessions = async (activeSessions: Session[]): Promise<boolean> => {
    if (activeSessions.length === 0) {
      return true;
    }

    const submissions = await Promise.allSettled(
      activeSessions.map((activeSession) => sessionApi.submitSession(String(activeSession.id))),
    );

    const failedSubmissions = submissions.filter((result) => result.status === 'rejected').length;

    if (failedSubmissions > 0) {
      showToast(
        'error',
        'Could not logout safely',
        'We could not auto-submit your active exam session. Please return to the exam and submit before logging out.',
      );
      return false;
    }

    showToast(
      'warning',
      'Exam submitted',
      'Your active exam session was automatically submitted before logout.',
    );
    return true;
  };

  const handleAuthAction = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (isProcessingLogout) {
      return;
    }

    let activeStudentSessions: Session[] = [];
    let logoutMessage = 'Are you sure you want to logout from QueryMe?';

    if (user.role === 'STUDENT') {
      try {
        const studentSessions = await sessionApi.getSessionsByStudent(user.id);
        activeStudentSessions = studentSessions.filter((candidate) => !isSessionComplete(candidate));
      } catch (err) {
        showToast('error', 'Logout check failed', extractErrorMessage(err, 'Failed to verify active exam sessions.'));
        return;
      }

      if (activeStudentSessions.length > 0) {
        logoutMessage = 'You are currently attempting an exam. If you continue, your session will terminate and be submitted automatically.';
      }
    }

    const shouldLogout = await confirm({
      title: 'Confirm Logout',
      message: logoutMessage,
      confirmLabel: 'Yes, Logout',
      danger: true,
    });

    if (!shouldLogout) {
      return;
    }

    setIsProcessingLogout(true);

    try {
      if (activeStudentSessions.length > 0) {
        const autoSubmitComplete = await submitActiveSessions(activeStudentSessions);
        if (!autoSubmitComplete) {
          return;
        }
      }

      logout();
      navigate('/auth');
    } finally {
      setIsProcessingLogout(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      ADMIN: '#e53e3e',
      TEACHER: '#38a169',
      STUDENT: '#6a3cb0',
      GUEST: '#718096',
    };
    return colors[role] || '#6a3cb0';
  };

  return (
    <div className="dash-layout">
      {/* Sidebar */}
      <aside className={`dash-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`} style={{ '--accent': accentColor } as React.CSSProperties}>
        <div className="dash-sidebar-header">
          <div className="dash-logo" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', flex: 1 }}>
            <img
              src={logoImg}
              alt="QueryMe Logo"
              style={{
                width: sidebarCollapsed ? 60 : 240,
                height: 100,
                objectFit: 'contain',
                objectPosition: sidebarCollapsed ? 'center' : 'left center',
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          </div>
          <button className="dash-sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} id="sidebar-toggle">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {sidebarCollapsed ? (
                <>
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              ) : (
                <>
                  <polyline points="11 17 6 12 11 7" />
                  <line x1="6" y1="12" x2="18" y2="12" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Portal label */}
        {!sidebarCollapsed && (
          <div className="dash-portal-label" style={{ color: accentColor }}>
            {portalTitle}
          </div>
        )}

        {/* Navigation */}
        <nav className="dash-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path.split('/').length <= 2}
              className={({ isActive }) => `dash-nav-item ${isActive ? 'active' : ''}`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span className="dash-nav-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="dash-nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section at bottom */}
        <div className="dash-sidebar-footer">
          <button
            className="dash-logout-btn"
            onClick={() => void handleAuthAction()}
            title={user ? 'Logout' : 'Sign In'}
            id="logout-btn"
            disabled={isProcessingLogout}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {!sidebarCollapsed && <span>{user ? 'Logout' : 'Sign In'}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dash-main">
        {/* Top Navbar */}
        <header className="dash-navbar">
          <div className="dash-navbar-search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" placeholder="Search..." />
          </div>
          <div className="dash-navbar-actions">
            <button className="dash-navbar-btn" aria-label="Toggle Dark Mode" onClick={() => setIsDarkMode(!isDarkMode)}>
              {isDarkMode ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>
            <button className="dash-navbar-btn" aria-label="Notifications">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="dash-navbar-badge"></span>
            </button>
            <div
              className="dash-navbar-profile"
              onClick={() => navigate(user ? `/${user.role.toLowerCase()}/profile` : '/auth')}
              title={user ? 'Go to Profile' : 'Sign In'}
            >
              <div className="dash-user-avatar" style={{ background: getRoleBadge(user?.role || '') }}>
                {user ? getInitials(user.name) : 'GU'}
              </div>
            </div>
          </div>
        </header>

        <div className="dash-content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
