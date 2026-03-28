import React, { useState } from 'react';

interface SystemUser {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'GUEST';
  status: 'active' | 'suspended' | 'pending';
  lastLogin: string;
  sessionDuration?: number; // hours
  sessionExpiresAt?: string; // string for mockup representation
}

const initialUsers: SystemUser[] = [
  { id: 1, name: 'Admin One', email: 'admin1@queryme.com', role: 'ADMIN', status: 'active', lastLogin: '2 mins ago' },
  { id: 2, name: 'Prof. Smith', email: 'smith@university.edu', role: 'TEACHER', status: 'active', lastLogin: '1 hour ago' },
  { id: 3, name: 'Dr. Johnson', email: 'johnson@university.edu', role: 'TEACHER', status: 'active', lastLogin: '2 days ago' },
  { id: 4, name: 'John Student', email: 'student@queryme.com', role: 'STUDENT', status: 'active', lastLogin: '15 mins ago' },
  { id: 5, name: 'Jane Doe', email: 'jane.d@queryme.com', role: 'STUDENT', status: 'suspended', lastLogin: '2 weeks ago' },
  { id: 6, name: 'Visitor User', email: 'visitor@company.com', role: 'GUEST', status: 'suspended', lastLogin: '2 days ago', sessionDuration: 48, sessionExpiresAt: 'Expired' },
  { id: 7, name: 'Future Guest', email: 'future@company.com', role: 'GUEST', status: 'pending', lastLogin: 'Never', sessionDuration: 12 },
];

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<SystemUser[]>(initialUsers);
  const [filter, setFilter] = useState<'ALL' | 'TEACHER' | 'STUDENT' | 'ADMIN' | 'GUEST' | 'PENDING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'reactivate'>('create');
  const [formData, setFormData] = useState<Partial<SystemUser>>({});

  const filtered = users.filter(u => {
    let matchesFilter = false;
    if (filter === 'ALL') matchesFilter = true;
    else if (filter === 'PENDING') matchesFilter = u.status === 'pending';
    else matchesFilter = u.role === filter;

    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'ADMIN': return 'badge-red';
      case 'TEACHER': return 'badge-blue';
      case 'STUDENT': return 'badge-purple';
      case 'GUEST': return 'badge-orange';
      default: return 'badge-gray';
    }
  };

  const handleToggleStatus = (id: number) => {
    setUsers(users.map(u => {
      if (u.id === id) {
        return { ...u, status: u.status === 'active' ? 'suspended' : 'active' };
      }
      return u;
    }));
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setFormData({ name: '', email: '', role: 'STUDENT', status: 'active', sessionDuration: 24 });
    setShowModal(true);
  };

  const handleOpenEdit = (user: SystemUser) => {
    setModalMode('edit');
    setFormData({ ...user });
    setShowModal(true);
  };

  const handleOpenReactivate = (user: SystemUser) => {
    setModalMode('reactivate');
    setFormData({ ...user, sessionDuration: 24 });
    setShowModal(true);
  };

  const handleApproveGuest = (id: number, duration: number = 24) => {
    setUsers(users.map(u => u.id === id ? { ...u, status: 'active', sessionDuration: duration, sessionExpiresAt: `In ${duration} Hours` } : u));
  };

  const handleRejectGuest = (id: number) => {
    setUsers(users.filter(u => u.id !== id));
  };

  const handleSaveUser = () => {
    if (!formData.name && modalMode !== 'reactivate') return;
    if (!formData.email && modalMode !== 'reactivate') return;

    if (modalMode === 'create') {
      const newUser: SystemUser = {
        id: users.length ? Math.max(...users.map(u => u.id)) + 1 : 1,
        name: formData.name!,
        email: formData.email!,
        role: formData.role as any,
        status: formData.status as any || 'active',
        lastLogin: 'Never',
        sessionDuration: formData.role === 'GUEST' ? formData.sessionDuration : undefined,
        sessionExpiresAt: formData.role === 'GUEST' ? `In ${formData.sessionDuration || 24} Hours` : undefined,
      };
      setUsers([...users, newUser]);
    } else if (modalMode === 'reactivate') {
      setUsers(users.map(u => u.id === formData.id ? { ...u, status: 'active', sessionDuration: formData.sessionDuration, sessionExpiresAt: `In ${formData.sessionDuration || 24} Hours` } as SystemUser : u));
    } else {
      setUsers(users.map(u => u.id === formData.id ? { ...u, ...formData } as SystemUser : u));
    }
    setShowModal(false);
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>User Management</h1>
          <p>Register, suspend, and organize platform users</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add New User
        </button>
      </div>

      <div className="content-card">
        <div className="content-card-header" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['ALL', 'ADMIN', 'TEACHER', 'STUDENT', 'GUEST', 'PENDING'] as const).map(f => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
             <input 
               type="text" 
               placeholder="Search users by name or email..." 
               className="form-input" 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               style={{ padding: '6px 14px', minWidth: '240px' }} 
             />
          </div>
        </div>
        <div className="content-card-body" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(user => (
                <tr key={user.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{user.name}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{user.email}</div>
                  </td>
                  <td>
                    <span className={`badge ${getRoleBadge(user.role)}`}>{user.role}</span>
                  </td>
                  <td>
                    {user.status === 'pending' ? (
                      <span className="badge badge-orange">PENDING APPROVAL</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <span className={`badge ${user.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{user.status}</span>
                        {user.role === 'GUEST' && user.sessionExpiresAt && (
                           <span style={{ fontSize: '10px', color: user.sessionExpiresAt === 'Expired' ? '#e53e3e' : '#888' }}>
                             {user.sessionExpiresAt === 'Expired' ? 'Session Expired' : `Expires: ${user.sessionExpiresAt}`}
                           </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: '12px', color: '#888' }}>
                    {user.lastLogin}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {user.status === 'pending' ? (
                        <>
                          <button className="btn btn-sm btn-primary" onClick={() => handleApproveGuest(user.id, user.sessionDuration)}>Approve</button>
                          <button className="btn btn-sm btn-secondary" onClick={() => handleRejectGuest(user.id)}>Reject</button>
                        </>
                      ) : user.role === 'GUEST' && user.sessionExpiresAt === 'Expired' ? (
                        <>
                          <button className="btn btn-sm btn-primary" onClick={() => handleOpenReactivate(user)}>Reactivate</button>
                          <button className="btn btn-sm btn-secondary" onClick={() => handleOpenEdit(user)}>Edit</button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(user)}>Edit</button>
                          <button 
                            className="btn btn-sm" 
                            onClick={() => handleToggleStatus(user.id)}
                            style={{ background: user.status === 'active' ? 'rgba(229,62,62,0.1)' : 'rgba(56, 161, 105, 0.1)', color: user.status === 'active' ? '#e53e3e' : '#38a169', border: 'none' }}
                          >
                            {user.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                    No users found matching "{searchQuery}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)'
        }}>
          <div className="exam-modal" style={{ borderRadius: '16px', padding: '32px', width: '400px', maxWidth: '90%', textAlign: 'left', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 700 }}>
              {modalMode === 'create' ? 'Add New User' : modalMode === 'edit' ? 'Edit User' : 'Reactivate Guest'}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {modalMode === 'reactivate' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '6px' }}>Renew Session Duration (Hours)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={formData.sessionDuration || ''} 
                    onChange={e => setFormData({ ...formData, sessionDuration: parseInt(e.target.value) })}
                    placeholder="e.g. 24"
                    style={{ width: '100%' }} 
                  />
                  <p style={{fontSize: '11px', color: '#888', marginTop: '6px'}}>Reactivating this guest will grant them immediate access for the specified duration before auto-suspending.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '6px' }}>Full Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={formData.name || ''} 
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      style={{ width: '100%' }} 
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '6px' }}>Email Address</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      value={formData.email || ''} 
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      style={{ width: '100%' }} 
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '6px' }}>Role</label>
                    <select 
                      className="form-input"
                      value={formData.role || 'STUDENT'}
                      onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                      style={{ width: '100%' }}
                    >
                      <option value="STUDENT">Student</option>
                      <option value="TEACHER">Teacher</option>
                      <option value="ADMIN">Admin</option>
                      <option value="GUEST">Guest</option>
                    </select>
                  </div>

                  {formData.role === 'GUEST' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '6px' }}>Session Duration (Hours)</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        value={formData.sessionDuration || 24} 
                        onChange={e => setFormData({ ...formData, sessionDuration: parseInt(e.target.value) })}
                        placeholder="e.g. 24"
                        style={{ width: '100%' }} 
                      />
                    </div>
                  )}

                  {modalMode === 'create' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '6px' }}>Temporary Password</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Auto-generated if left blank"
                        style={{ width: '100%' }} 
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveUser}>
                {modalMode === 'create' ? 'Create User' : modalMode === 'edit' ? 'Save Changes' : 'Reactivate Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
