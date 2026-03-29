import React from 'react';
import { useAuth } from '../../contexts';

const TeacherProfile: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Manage your account settings and preferences</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        {/* Profile Card */}
        <div className="content-card">
          <div className="profile-card-body">
            <div className="profile-avatar">
              {user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <h3 className="profile-name">{user?.name}</h3>
            <p className="profile-email">{user?.email}</p>
            <span className="badge badge-purple">{user?.role}</span>

            <div className="profile-meta-container">
              <div className="profile-meta-row">
                <span className="profile-meta-label">Teacher ID</span>
                <strong className="profile-meta-value">TCH-{user?.id?.toString().padStart(4, '0') || '0002'}</strong>
              </div>
              <div className="profile-meta-row">
                <span className="profile-meta-label">Department</span>
                <strong className="profile-meta-value">Computer Science</strong>
              </div>
              <div className="profile-meta-row">
                <span className="profile-meta-label">Joined</span>
                <strong className="profile-meta-value">Aug 20, 2023</strong>
              </div>
              <div className="profile-meta-row">
                <span className="profile-meta-label">Status</span>
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
                  <label className="profile-info-label">Full Name</label>
                  <div className="profile-info-value">{user?.name}</div>
                </div>
                <div>
                  <label className="profile-info-label">Email</label>
                  <div className="profile-info-value">{user?.email}</div>
                </div>
                <div>
                  <label className="profile-info-label">Role</label>
                  <div className="profile-info-value">TEACHER</div>
                </div>
                <div>
                  <label className="profile-info-label">Password</label>
                  <div className="profile-info-value">••••••••</div>
                </div>
              </div>
            </div>
          </div>

          <div className="content-card">
            <div className="content-card-header">
              <h2>Courses Taught</h2>
            </div>
            <div className="content-card-body" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="data-table" style={{ minWidth: '400px' }}>
                <colgroup>
                  <col style={{ width: '50%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '25%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Course Name</th>
                    <th>Students</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="profile-meta-value">Database Systems 101</td>
                    <td className="profile-meta-label">32 Enrolled</td>
                    <td><span className="badge badge-green">Active</span></td>
                  </tr>
                  <tr>
                    <td className="profile-meta-value">Data Management 201</td>
                    <td className="profile-meta-label">18 Enrolled</td>
                    <td><span className="badge badge-gray">Draft</span></td>
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

export default TeacherProfile;
