import React, { useState } from 'react';
import { useAuth } from '../../contexts';
import { useToast } from '../../components/ToastProvider';

const AdminProfile: React.FC = () => {
  const { user } = useAuth();
  const { showToast, confirm } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('+1 (555) 000-1234');
  const [institution, setInstitution] = useState('QueryMe University');
  const [bio, setBio] = useState('Platform administrator responsible for user management, system health, and exam oversight.');
  const [editMode, setEditMode] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState('');

  const [notifGuestRequests, setNotifGuestRequests] = useState(true);
  const [notifSystemErrors, setNotifSystemErrors] = useState(true);
  const [notifNewUsers, setNotifNewUsers] = useState(false);
  const [notifExamActivity, setNotifExamActivity] = useState(false);

  const getInitials = (n: string) => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const handleSaveProfile = () => {
    setEditMode(false);
    showToast('success', 'Profile Updated', 'Your profile information has been saved.');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    if (!currentPassword) { setPwdError('Current password is required.'); return; }
    if (newPassword.length < 8) { setPwdError('New password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setPwdError('Passwords do not match.'); return; }
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    showToast('success', 'Password Changed', 'Your password has been updated successfully.');
  };

  const handleTerminateSessions = async () => {
    const ok = await confirm({
      title: 'Terminate All Sessions',
      message: 'This will force-logout every user currently active on the platform. Ongoing exam sessions will be interrupted. Are you sure?',
      confirmLabel: 'Terminate All',
      danger: true,
    });
    if (ok) showToast('warning', 'Sessions Terminated', 'All active user sessions have been ended.');
  };

  const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer',
        background: checked ? '#6a3cb0' : '#cbd5e1', position: 'relative',
        transition: 'background 0.3s', flexShrink: 0,
      }}
    >
      <div style={{
        width: '20px', height: '20px', background: '#fff', borderRadius: '50%',
        position: 'absolute', top: '2px', left: checked ? '22px' : '2px', transition: 'left 0.3s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }} />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1>Admin Profile</h1>
        <p>Manage your personal details, security, and notification preferences</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px' }}>

        {/* ── Avatar Banner ── */}
        <div className="content-card" style={{ gridColumn: '1 / -1' }}>
          <div className="content-card-body" style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '24px' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #9b2c2c, #e53e3e)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', fontWeight: 700, color: '#fff', flexShrink: 0,
              boxShadow: '0 6px 20px rgba(229,62,62,0.35)',
            }}>
              {getInitials(name)}
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: '22px', fontWeight: 700 }}>{name}</div>
              <div style={{ fontSize: '13px', opacity: 0.6, marginTop: '4px' }}>{email}</div>
              <div style={{ marginTop: '8px' }}>
                <span style={{
                  fontSize: '12px', fontWeight: 700,
                  background: 'rgba(229,62,62,0.12)', color: '#e53e3e',
                  padding: '3px 10px', borderRadius: '20px',
                }}>
                  {user?.role || 'ADMIN'}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {editMode && (
                <button className="btn btn-secondary" onClick={() => setEditMode(false)}>Cancel</button>
              )}
              <button
                className={editMode ? 'btn btn-primary' : 'btn btn-secondary'}
                onClick={() => editMode ? handleSaveProfile() : setEditMode(true)}
              >
                {editMode ? '💾 Save Profile' : '✏️ Edit Profile'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Personal Information ── */}
        <div className="content-card">
          <div className="content-card-header"><h2>Personal Information</h2></div>
          <div className="content-card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { label: 'Full Name', value: name, set: setName, type: 'text' },
                { label: 'Email Address', value: email, set: setEmail, type: 'email' },
                { label: 'Phone Number', value: phone, set: setPhone, type: 'tel' },
                { label: 'Institution / Organisation', value: institution, set: setInstitution, type: 'text' },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, opacity: 0.6, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>{f.label}</label>
                  <input
                    type={f.type} className="form-input"
                    value={f.value} disabled={!editMode}
                    onChange={e => f.set(e.target.value)}
                    style={{ width: '100%', opacity: editMode ? 1 : 0.75 }}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, opacity: 0.6, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Bio</label>
                <textarea
                  className="form-input" value={bio} disabled={!editMode}
                  onChange={e => setBio(e.target.value)} rows={3}
                  style={{ width: '100%', resize: 'vertical', opacity: editMode ? 1 : 0.75 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Change Password ── */}
        <div className="content-card">
          <div className="content-card-header"><h2>🔐 Security &amp; Password</h2></div>
          <div className="content-card-body">
            <form onSubmit={handleChangePassword}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { label: 'Current Password', val: currentPassword, set: setCurrentPassword, ph: 'Enter current password' },
                  { label: 'New Password', val: newPassword, set: setNewPassword, ph: 'Min. 8 characters' },
                  { label: 'Confirm New Password', val: confirmPassword, set: setConfirmPassword, ph: 'Repeat new password' },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, opacity: 0.6, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>{f.label}</label>
                    <input type="password" className="form-input" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} style={{ width: '100%' }} />
                  </div>
                ))}

                {newPassword && (
                  <div>
                    <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px' }}>
                      Strength: {newPassword.length < 8 ? '⚠ Weak' : newPassword.length < 12 ? '🟡 Fair' : '✅ Strong'}
                    </div>
                    <div className="progress-bg">
                      <div style={{
                        width: `${Math.min(100, (newPassword.length / 16) * 100)}%`, height: '100%',
                        background: newPassword.length < 8 ? '#e53e3e' : newPassword.length < 12 ? '#dd6b20' : '#38a169',
                        borderRadius: '4px', transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                )}

                {pwdError && (
                  <div style={{ fontSize: '12px', color: '#e53e3e', background: 'rgba(229,62,62,0.1)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #e53e3e' }}>
                    {pwdError}
                  </div>
                )}

                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Update Password</button>
              </div>
            </form>
          </div>
        </div>

        {/* ── Notification Preferences ── */}
        <div className="content-card" style={{ gridColumn: '1 / -1' }}>
          <div className="content-card-header"><h2>🔔 Notification Preferences</h2></div>
          <div className="content-card-body">
            {[
              { label: 'Guest Access Requests', desc: 'Notify when a new user requests guest access approval.', val: notifGuestRequests, set: setNotifGuestRequests },
              { label: 'System Error Alerts', desc: 'Push an alert for every ERROR-level log entry in real-time.', val: notifSystemErrors, set: setNotifSystemErrors },
              { label: 'New User Registrations', desc: 'Receive notifications when new accounts are created on the platform.', val: notifNewUsers, set: setNotifNewUsers },
              { label: 'Exam Activity', desc: 'Notify when exams are published, opened, or closed by any teacher.', val: notifExamActivity, set: setNotifExamActivity },
            ].map((pref, idx, arr) => (
              <div
                key={pref.label}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: '24px', padding: '18px 0',
                  borderBottom: idx < arr.length - 1 ? '1px solid var(--border, #e8e8ee)' : 'none',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{pref.label}</div>
                  <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '4px' }}>{pref.desc}</div>
                </div>
                <Toggle checked={pref.val} onChange={(v) => { pref.set(v); showToast('info', 'Preference saved', `${pref.label} turned ${v ? 'on' : 'off'}.`); }} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Danger Zone ── */}
        <div className="content-card" style={{ gridColumn: '1 / -1', border: '1px solid rgba(229,62,62,0.3)' }}>
          <div className="content-card-header" style={{ borderBottom: '1px solid rgba(229,62,62,0.2)' }}>
            <h2 style={{ color: '#e53e3e' }}>⚠️ Danger Zone</h2>
          </div>
          <div className="content-card-body">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Terminate All Active Sessions</div>
                <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '4px' }}>Force-logout every user currently active on the platform.</div>
              </div>
              <button
                className="btn btn-sm"
                style={{ background: 'rgba(229,62,62,0.1)', color: '#e53e3e', border: '1px solid rgba(229,62,62,0.3)', fontWeight: 700 }}
                onClick={handleTerminateSessions}
              >
                Terminate Sessions
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminProfile;
