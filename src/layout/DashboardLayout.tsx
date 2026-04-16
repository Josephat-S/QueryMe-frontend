import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { sessionApi, type Session } from '../api';
import { useToast } from '../components/ToastContext';
import { useAuth } from '../contexts';
import { useTheme } from '../contexts';
import DarkModeToggle from '../components/DarkModeToggle';
import { extractErrorMessage } from '../utils/errorUtils';
import { isSessionComplete } from '../utils/queryme';
import logoImg from '../assets/logo.png';
import { DASHBOARD_LAYOUT_TW } from '../theme/twStyles';

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
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [isMobileView, setIsMobileView] = useState(() => window.innerWidth < 1024);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isProcessingLogout, setIsProcessingLogout] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const nextIsMobileView = window.innerWidth < 1024;

      setIsMobileView(nextIsMobileView);
      if (!nextIsMobileView) {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const showSidebarLabels = isMobileView ? mobileSidebarOpen : !sidebarCollapsed;
  const currentSidebarWidth = isMobileView
    ? (mobileSidebarOpen ? 288 : 80)
    : (sidebarCollapsed ? 80 : 256);
  const mainOffset = isMobileView ? 80 : (sidebarCollapsed ? 80 : 256);
  const sidebarToggleLabel = isMobileView
    ? (mobileSidebarOpen ? 'Collapse navigation menu' : 'Expand navigation menu')
    : (sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
  const onSidebarToggle = () => {
    if (isMobileView) {
      setMobileSidebarOpen((previous) => !previous);
      return;
    }

    setSidebarCollapsed((previous) => !previous);
  };

  return (
    <div className={`${DASHBOARD_LAYOUT_TW} ${theme === 'dark' ? 'dark' : ''} flex min-h-screen bg-slate-100 text-left text-slate-700`}>
      {isMobileView && mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-30 bg-slate-900/45 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`dash-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileSidebarOpen ? 'mobile-open' : ''} fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white shadow-xl transition-[width] duration-300 lg:shadow-sm`}
        style={{ '--accent': accentColor, width: `${currentSidebarWidth}px` } as React.CSSProperties}
      >
        <div className="dash-sidebar-header flex items-center justify-between border-b border-slate-100 px-3 pb-3 pt-4">
          <div className="dash-logo" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', flex: 1 }}>
            <img
              src={logoImg}
              alt="QueryMe Logo"
              style={{
                width: showSidebarLabels ? 240 : 60,
                height: 100,
                objectFit: 'contain',
                objectPosition: showSidebarLabels ? 'left center' : 'center',
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          </div>
          <button
            className="dash-sidebar-toggle hidden h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-emerald-400 hover:text-emerald-600 lg:grid"
            onClick={onSidebarToggle}
            id="sidebar-toggle"
            aria-label={sidebarToggleLabel}
            title={sidebarToggleLabel}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {!showSidebarLabels ? (
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
        {showSidebarLabels && (
          <div className="dash-portal-label px-4 pb-3 pt-4 text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: accentColor }}>
            {portalTitle}
          </div>
        )}

        {/* Navigation */}
        <nav className="dash-nav flex-1 space-y-1 px-2 py-3">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path.split('/').length <= 2}
              onClick={() => {
                if (isMobileView) {
                  setMobileSidebarOpen(false);
                }
              }}
              className={({ isActive }) => `dash-nav-item flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition ${showSidebarLabels ? 'justify-start gap-3' : 'justify-center'} ${isActive ? 'active bg-emerald-50 text-emerald-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
              title={!showSidebarLabels ? item.label : undefined}
            >
              <span className="dash-nav-icon">{item.icon}</span>
              {showSidebarLabels && <span className="dash-nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section at bottom */}
        <div className="dash-sidebar-footer border-t border-slate-100 p-3">
          <button
            className={`dash-logout-btn flex w-full items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-500 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 ${showSidebarLabels ? 'justify-center gap-2' : 'justify-center'}`}
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
            {showSidebarLabels && <span>{user ? 'Logout' : 'Sign In'}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className="dash-main flex min-h-screen flex-col transition-[margin,width] duration-300"
        style={{
          marginLeft: `${mainOffset}px`,
          width: `calc(100% - ${mainOffset}px)`,
          backgroundImage: 'radial-gradient(circle at top left, rgba(16,185,129,0.10), transparent 34%), linear-gradient(180deg, #edf2f7 0%, #dfe7f1 56%, #d6e0ee 100%)',
        }}
      >
        {/* Top Navbar */}
        <header className="dash-navbar sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur">
          <div className="dash-navbar-search flex w-full max-w-sm items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-slate-400" type="text" placeholder="Search..." />
          </div>
          <div className="dash-navbar-actions flex items-center gap-2">
            <DarkModeToggle />
            <div
              className="dash-navbar-profile cursor-pointer rounded-full p-0.5 transition hover:bg-slate-100"
              onClick={() => navigate(user ? `/${user.role.toLowerCase()}/profile` : '/auth')}
              title={user ? 'Go to Profile' : 'Sign In'}
            >
              <div className="dash-user-avatar grid h-9 w-9 place-items-center rounded-full text-xs font-bold text-white" style={{ background: getRoleBadge(user?.role || '') }}>
                {user ? getInitials(user.name) : 'GU'}
              </div>
            </div>
          </div>
        </header>

        <div className="dash-content flex-1 p-4 md:p-6 text-slate-700">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
