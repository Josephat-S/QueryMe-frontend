import React from 'react';
import DashboardLayout from '../../layout/DashboardLayout';
import type { NavItem } from '../../layout/DashboardLayout';

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);

const guestNav: NavItem[] = [
  { label: 'Home', path: '/guest', icon: <HomeIcon /> },
  { label: 'Browse Exams', path: '/guest/browse', icon: <EyeIcon /> },
];

const GuestPage: React.FC = () => {
  return (
    <DashboardLayout navItems={guestNav} portalTitle="Guest View" accentColor="#718096">
      <div className="page-header">
        <h1>Welcome to QueryMe</h1>
        <p>You are viewing as a guest. Sign up for a student or teacher account to access full features.</p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(113, 128, 150, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#718096" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
          </div>
          <div className="stat-card-value">View-only</div>
          <div className="stat-card-label">Access Level</div>
        </div>
      </div>

      <div className="content-card">
        <div className="content-card-body">
          <div className="empty-state">
            <div className="empty-state-icon" style={{ background: 'rgba(113, 128, 150, 0.1)', color: '#718096' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
            </div>
            <h3>Guest Access</h3>
            <p>As a guest, you can browse available exams but cannot take them or submit queries.<br />Contact your instructor for a student account.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GuestPage;
