import React, { useState } from 'react';
import { useAuth } from '../../contexts';

const StudentProfile: React.FC = () => {
  const { user } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('+1 (555) 123-4567');
  const [editMode, setEditMode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);

  const [notifExamStart, setNotifExamStart] = useState(true);
  const [notifResults, setNotifResults] = useState(true);
  const [notifReminders, setNotifReminders] = useState(false);
  const [notifAnnounce, setNotifAnnounce] = useState(true);

  const getInitials = (n: string) => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const handleSave = () => {
    setEditMode(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handlePwd = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(''); setPwdSuccess(false);
    if (!currentPwd) { setPwdError('Current password is required.'); return; }
    if (newPwd.length < 8) { setPwdError('New password must be at least 8 characters.'); return; }
    if (newPwd !== confirmPwd) { setPwdError('Passwords do not match.'); return; }
    setPwdSuccess(true);
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    setTimeout(() => setPwdSuccess(false), 3000);
  };

  const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer',
        background: checked ? '#6a3cb0' : '#cbd5e1', position: 'relative', transition: 'background 0.3s', flexShrink: 0,
      }}
    >
      <div style={{
        width: '20px', height: '20px', background: '#fff', borderRadius: '50%',
        position: 'absolute', top: '2px', left: checked ? '22px' : '2px', transition: 'left 0.3s',
      }} />
    </div>
  );

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1>My Profile</h1>
          <p>Manage your account settings and preferences</p>
        </div>
        {saveSuccess && (
          <span style={{ fontSize: '13px', color: '#38a169', background: 'rgba(56,161,105,0.12)', padding: '6px 14px', borderRadius: '8px', fontWeight: 600 }}>
            ✓ Profile saved successfully
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>

        {/* ── Left: Identity Card ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="content-card">
            <div className="content-card-body" style={{ textAlign: 'center', padding: '32px 20px' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6a3cb0, #512da8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 28, fontWeight: 700,
                margin: '0 auto 16px',
                boxShadow: '0 6px 20px rgba(106,60,176,0.3)',
              }}>
                {getInitials(name)}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{name}</div>
              <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 10 }}>{email}</div>
              <span className="badge badge-purple">{user?.role}</span>

              <div style={{ marginTop: 22, borderTop: '1px solid var(--border,#f0f0f5)', paddingTop: 16, textAlign: 'left' }}>
                {[
                  { label: 'Student ID', value: `STU-${(user?.id || 0).toString().padStart(4, '0')}` },
                  { label: 'Enrolled', value: 'Jan 15, 2026' },
                  { label: 'Status', badge: true, badgeClass: 'badge-green', value: 'Active' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, fontSize: 13 }}>
                    <span style={{ opacity: 0.6 }}>{row.label}</span>
                    {row.badge ? <span className={`badge ${row.badgeClass}`}>{row.value}</span> : <strong>{row.value}</strong>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Enrolled Courses */}
          <div className="content-card">
            <div className="content-card-header"><h2>📚 Enrolled Courses</h2></div>
            <div className="content-card-body" style={{ padding: 0 }}>
              <table className="data-table">
                <thead><tr><th>Course</th><th>Teacher</th><th>Status</th></tr></thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Database Systems 101</td>
                    <td style={{ fontSize: 12, opacity: 0.7 }}>Prof. Smith</td>
                    <td><span className="badge badge-green">Active</span></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Data Management</td>
                    <td style={{ fontSize: 12, opacity: 0.7 }}>Dr. Johnson</td>
                    <td><span className="badge badge-green">Active</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Right: Editable Panels ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Account Information */}
          <div className="content-card">
            <div className="content-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Account Information</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                {editMode && <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(false)}>Cancel</button>}
                <button
                  className={editMode ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                  onClick={() => editMode ? handleSave() : setEditMode(true)}
                >
                  {editMode ? '💾 Save' : '✏️ Edit'}
                </button>
              </div>
            </div>
            <div className="content-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  { label: 'Full Name', value: name, set: setName, type: 'text' },
                  { label: 'Email Address', value: email, set: setEmail, type: 'email' },
                  { label: 'Phone Number', value: phone, set: setPhone, type: 'tel' },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, opacity: 0.6, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>{f.label}</label>
                    {editMode
                      ? <input type={f.type} className="form-input" value={f.value} onChange={e => f.set(e.target.value)} style={{ width: '100%' }} />
                      : <div className="form-input" style={{ opacity: 0.75 }}>{f.value}</div>}
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, opacity: 0.6, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Role</label>
                  <div className="form-input" style={{ opacity: 0.75 }}>{user?.role}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="content-card">
            <div className="content-card-header"><h2>🔐 Security &amp; Password</h2></div>
            <div className="content-card-body">
              <form onSubmit={handlePwd}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  {[
                    { label: 'Current Password', val: currentPwd, set: setCurrentPwd, placeholder: 'Current password' },
                    { label: 'New Password', val: newPwd, set: setNewPwd, placeholder: 'Min. 8 characters' },
                    { label: 'Confirm Password', val: confirmPwd, set: setConfirmPwd, placeholder: 'Repeat new password' },
                  ].map(f => (
                    <div key={f.label}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, opacity: 0.6, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>{f.label}</label>
                      <input type="password" className="form-input" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} style={{ width: '100%' }} />
                    </div>
                  ))}
                </div>
                {newPwd && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px' }}>
                      Strength: {newPwd.length < 8 ? '⚠ Weak' : newPwd.length < 12 ? '🟡 Fair' : '✅ Strong'}
                    </div>
                    <div className="progress-bg">
                      <div style={{ width: `${Math.min(100, (newPwd.length / 16) * 100)}%`, height: '100%', background: newPwd.length < 8 ? '#e53e3e' : newPwd.length < 12 ? '#dd6b20' : '#38a169', borderRadius: '4px', transition: 'width 0.3s' }} />
                    </div>
                  </div>
                )}
                {pwdError && <div style={{ fontSize: '12px', color: '#e53e3e', background: 'rgba(229,62,62,0.1)', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px' }}>{pwdError}</div>}
                {pwdSuccess && <div style={{ fontSize: '12px', color: '#38a169', background: 'rgba(56,161,105,0.1)', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px' }}>✓ Password changed successfully.</div>}
                <button type="submit" className="btn btn-primary btn-sm">Update Password</button>
              </form>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="content-card">
            <div className="content-card-header"><h2>🔔 Notification Preferences</h2></div>
            <div className="content-card-body" style={{ padding: '0 24px' }}>
              {[
                { label: 'Exam Start Alerts', desc: 'Notify me when a registered exam becomes available.', val: notifExamStart, set: setNotifExamStart },
                { label: 'Results Published', desc: 'Alert me when my exam results have been released.', val: notifResults, set: setNotifResults },
                { label: 'Deadline Reminders', desc: 'Send reminders 30 minutes before an exam closes.', val: notifReminders, set: setNotifReminders },
                { label: 'Course Announcements', desc: 'Notify me of new announcements from my teachers.', val: notifAnnounce, set: setNotifAnnounce },
              ].map((pref, idx, arr) => (
                <div key={pref.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0', borderBottom: idx < arr.length - 1 ? '1px solid var(--border, #e8e8ee)' : 'none', gap: '24px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{pref.label}</div>
                    <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '4px' }}>{pref.desc}</div>
                  </div>
                  <Toggle checked={pref.val} onChange={pref.set} />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
