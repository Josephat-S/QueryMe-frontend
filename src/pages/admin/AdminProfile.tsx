import React from 'react';
import { useAuth } from '../../contexts';

const AdminProfile: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      <div className="page-header">
        <h1>Admin Profile</h1>
        <p>Manage your administrative credentials and personal details</p>
      </div>

      <div className="content-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="content-card-header">
          <h2>Personal Information</h2>
        </div>
        <div className="content-card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Full Name</label>
              <input 
                type="text" 
                className="form-input" 
                disabled 
                value={user?.name || ''} 
                style={{ width: '100%', opacity: 0.7, cursor: 'not-allowed' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                disabled 
                value={user?.email || ''} 
                style={{ width: '100%', opacity: 0.7, cursor: 'not-allowed' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>System Role</label>
              <div style={{ padding: '8px 14px', border: '1px solid #e53e3e', borderRadius: '8px', background: 'rgba(229, 62, 62, 0.1)', color: '#e53e3e', fontWeight: 700 }}>
                {user?.role || 'ADMIN'}
              </div>
            </div>

            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border, #e8e8ee)' }}>
               <button className="btn btn-secondary" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>Request Scope Change</button>
               <p style={{ fontSize: '11px', marginTop: '12px', opacity: 0.7 }}>Critical administration details are centrally sealed by the platform security module. Contact super-admin to modify root credentials.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
