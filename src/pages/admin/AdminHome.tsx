import React from 'react';
import { useNavigate } from 'react-router-dom';

const mockSystemHealth = [
  { service: 'Auth Module', status: 'Healthy', uptime: '99.99%', load: '12%' },
  { service: 'Database (QueryMe App)', status: 'Healthy', uptime: '99.98%', load: '45%' },
  { service: 'Sandbox DB (Student Exec)', status: 'Healthy', uptime: '99.95%', load: '78%' },
  { service: 'Query Engine Execution', status: 'Warning', uptime: '98.50%', load: '92%' },
];

const AdminHome: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div>
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Manage users, system health, and oversee all platform activities</p>
      </div>

      {/* Global Stats Matrix */}
      <div className="stat-grid" style={{ marginBottom: '28px' }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(229, 62, 62, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
          </div>
          <div className="stat-card-value">156</div>
          <div className="stat-card-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(56, 161, 105, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38a169" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div className="stat-card-value">42</div>
          <div className="stat-card-label">Active Exams</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(49, 130, 206, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3182ce" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
          </div>
          <div className="stat-card-value">8</div>
          <div className="stat-card-label">Active Sandboxes</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(221, 107, 32, 0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dd6b20" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
          </div>
          <div className="stat-card-value">1,247</div>
          <div className="stat-card-label">Total Submissions</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px' }}>
        {/* User Distribution */}
        <div className="content-card">
          <div className="content-card-header">
            <h2>👥 User Distribution</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/users')}>Manage Users</button>
          </div>
          <div className="content-card-body" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Count</th>
                  <th>Active Ratio</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <span className="badge badge-purple">Students</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>128</td>
                  <td style={{ color: '#888' }}>95% Active</td>
                </tr>
                <tr>
                  <td>
                    <span className="badge badge-blue">Teachers</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>24</td>
                  <td style={{ color: '#888' }}>100% Active</td>
                </tr>
                <tr>
                  <td>
                    <span className="badge badge-red">Admins</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>4</td>
                  <td style={{ color: '#888' }}>100% Active</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* System Health */}
        <div className="content-card">
          <div className="content-card-header">
            <h2>⚙️ System Health Dashboard</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/settings')}>View Nodes</button>
          </div>
          <div className="content-card-body" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Service Module</th>
                  <th>Status</th>
                  <th>Uptime / Load</th>
                </tr>
              </thead>
              <tbody>
                {mockSystemHealth.map((sys, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{sys.service}</td>
                    <td>
                      <span className={`badge ${sys.status === 'Healthy' ? 'badge-green' : 'badge-orange'}`}>
                        {sys.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '11px', color: '#666' }}>{sys.uptime} uptime</div>
                      <div style={{ fontSize: '11px', color: '#888' }}>{sys.load} load</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHome;
