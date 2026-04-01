import React from 'react';
import { Link } from 'react-router-dom';

const GuestHome: React.FC = () => {
  return (
    <div className="guest-home">
      <div className="page-header">
        <h1>Welcome to QueryMe</h1>
        <p>Explore our SQL assessment platform as a guest.</p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(113, 128, 150, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#718096" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
          </div>
          <div className="stat-card-value">View-only</div>
          <div className="stat-card-label">Access Level</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(106, 60, 176, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6a3cb0" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
          </div>
          <div className="stat-card-value">50+</div>
          <div className="stat-card-label">Available Exams</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(56, 161, 105, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38a169" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
          </div>
          <div className="stat-card-value">12</div>
          <div className="stat-card-label">SQL Topics</div>
        </div>
      </div>

      <div className="guest-home-footer" style={{ marginTop: '24px' }}>
        <div className="content-card">
          <div className="content-card-header">
            <h2>Guest Experience</h2>
          </div>
          <div className="content-card-body">
            <div className="empty-state" style={{ padding: '20px' }}>
              <div className="empty-state-icon" style={{ background: 'rgba(113, 128, 150, 0.1)', color: '#718096' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              </div>
              <h3>View-Only Access</h3>
              <p style={{ marginBottom: '20px' }}>As a guest, you can now browse exam titles, <strong>view results from past sessions</strong>, and see the questions prepared by teachers.</p>
              <Link to="/guest/browse" className="btn btn-secondary">
                Browse Exams
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestHome;
