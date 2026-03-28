import React from 'react';
import { useAuth } from '../../contexts';

const StudentProfile: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Manage your account settings and preferences</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '18px' }}>
        {/* Profile Card */}
        <div className="content-card">
          <div className="content-card-body" style={{ textAlign: 'center', padding: '36px 22px' }}>
            <div style={{
              width: 80, height: 80, borderRadius: 20,
              background: 'linear-gradient(135deg, #6a3cb0, #512da8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 28, fontWeight: 700,
              margin: '0 auto 16px',
              boxShadow: '0 6px 20px rgba(106, 60, 176, 0.3)',
            }}>
              {user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', margin: '0 0 4px' }}>{user?.name}</h3>
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>{user?.email}</p>
            <span className="badge badge-purple">{user?.role}</span>

            <div style={{ marginTop: 24, borderTop: '1px solid #f0f0f5', paddingTop: 18, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13, color: '#666' }}>
                <span>Student ID</span>
                <strong style={{ color: '#1a1a2e' }}>STU-{user?.id?.toString().padStart(4, '0')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13, color: '#666' }}>
                <span>Course</span>
                <strong style={{ color: '#1a1a2e' }}>Database Systems 101</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13, color: '#666' }}>
                <span>Enrolled</span>
                <strong style={{ color: '#1a1a2e' }}>Jan 15, 2026</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#666' }}>
                <span>Status</span>
                <span className="badge badge-green">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="content-card">
            <div className="content-card-header">
              <h2>Account Information</h2>
              <button className="btn btn-secondary btn-sm">Edit</button>
            </div>
            <div className="content-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Full Name</label>
                  <div style={{ padding: '10px 14px', background: '#f5f5fa', borderRadius: 8, fontSize: 13, color: '#333' }}>{user?.name}</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Email</label>
                  <div style={{ padding: '10px 14px', background: '#f5f5fa', borderRadius: 8, fontSize: 13, color: '#333' }}>{user?.email}</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Role</label>
                  <div style={{ padding: '10px 14px', background: '#f5f5fa', borderRadius: 8, fontSize: 13, color: '#333' }}>{user?.role}</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Password</label>
                  <div style={{ padding: '10px 14px', background: '#f5f5fa', borderRadius: 8, fontSize: 13, color: '#333' }}>••••••••</div>
                </div>
              </div>
            </div>
          </div>

          <div className="content-card">
            <div className="content-card-header">
              <h2>Enrolled Courses</h2>
            </div>
            <div className="content-card-body" style={{ padding: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Teacher</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600, color: '#1a1a2e' }}>Database Systems 101</td>
                    <td style={{ fontSize: 12, color: '#666' }}>Prof. Smith</td>
                    <td><span className="badge badge-green">Active</span></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, color: '#1a1a2e' }}>Data Management</td>
                    <td style={{ fontSize: 12, color: '#666' }}>Dr. Johnson</td>
                    <td><span className="badge badge-green">Active</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
