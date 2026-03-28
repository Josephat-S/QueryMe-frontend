import React, { useState } from 'react';
import { useAuth } from '../../contexts';
import { useToast } from '../../components/ToastProvider';

const TeacherProfile: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('+1 (555) 987-6543');
  const [department, setDepartment] = useState('Computer Science');
  const [bio, setBio] = useState('Lecturer in database systems and advanced SQL. 8 years of academic teaching experience.');
  const [editMode, setEditMode] = useState(false);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState('');

  const [notifSubmissions, setNotifSubmissions] = useState(true);
  const [notifLowScores, setNotifLowScores] = useState(true);
  const [notifExamClosed, setNotifExamClosed] = useState(false);
  const [notifGuestJoins, setNotifGuestJoins] = useState(false);

  const getInitials = (n: string) => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const handleSave = () => {
    setEditMode(false);
    showToast('success', 'Profile Updated', 'Your profile information has been saved.');
  };

  const handlePwd = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    if (!currentPwd) { setPwdError('Current password is required.'); return; }
    if (newPwd.length < 8) { setPwdError('New password must be at least 8 characters.'); return; }
    if (newPwd !== confirmPwd) { setPwdError('Passwords do not match.'); return; }
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    showToast('success', 'Password Changed', 'Your password has been updated successfully.');
  };

  const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer',
        background: checked ? '#38a169' : '#cbd5e1', position: 'relative',
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
        <h1>Teacher Profile</h1>
        <p>Manage your account information and notification settings</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px' }}>

        {/* ── Avatar Banner ── */}
        <div className="content-card" style={{ gridColumn: '1 / -1' }}>
          <div className="content-card-body" style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '24px' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #276749, #38a169)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', fontWeight: 700, color: '#fff', flexShrink: 0,
              boxShadow: '0 6px 20px rgba(56,161,105,0.35)',
            }}>
              {getInitials(name)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '22px', fontWeight: 700 }}>{name}</div>
              <div style={{ fontSize: '13px', opacity: 0.6, marginTop: '4px' }}>{email}</div>
              <div style={{ marginTop: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, background: 'rgba(56,161,105,0.12)', color: '#38a169', padding: '3px 10px', borderRadius: '20px' }}>
                  {user?.role || 'TEACHER'}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {editMode && <button className="btn btn-secondary" onClick={() => setEditMode(false)}>Cancel</button>}
              <button className={editMode ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => editMode ? handleSave() : setEditMode(true)}>
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
                { label: 'Department', value: department, set: setDepartment, type: 'text' },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, opacity: 0.6, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>{f.label}</label>
                  <input type={f.type} className="form-input" value={f.value} disabled={!editMode} onChange={e => f.set(e.target.value)} style={{ width: '100%', opacity: editMode ? 1 : 0.75 }} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, opacity: 0.6, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Professional Bio</label>
                <textarea className="form-input" value={bio} disabled={!editMode} onChange={e => setBio(e.target.value)} rows={3} style={{ width: '100%', resize: 'vertical', opacity: editMode ? 1 : 0.75 }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Change Password ── */}
        <div className="content-card">
          <div className="content-card-header"><h2>🔐 Security &amp; Password</h2></div>
          <div className="content-card-body">
            <form onSubmit={handlePwd}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { label: 'Current Password', val: currentPwd, set: setCurrentPwd, ph: 'Enter current password' },
                  { label: 'New Password', val: newPwd, set: setNewPwd, ph: 'Min. 8 characters' },
                  { label: 'Confirm New Password', val: confirmPwd, set: setConfirmPwd, ph: 'Repeat new password' },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, opacity: 0.6, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>{f.label}</label>
                    <input type="password" className="form-input" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} style={{ width: '100%' }} />
                  </div>
                ))}
                {newPwd && (
                  <div>
                    <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px' }}>
                      Strength: {newPwd.length < 8 ? '⚠ Weak' : newPwd.length < 12 ? '🟡 Fair' : '✅ Strong'}
                    </div>
                    <div className="progress-bg">
                      <div style={{ width: `${Math.min(100, (newPwd.length / 16) * 100)}%`, height: '100%', background: newPwd.length < 8 ? '#e53e3e' : newPwd.length < 12 ? '#dd6b20' : '#38a169', borderRadius: '4px', transition: 'width 0.3s' }} />
                    </div>
                  </div>
                )}
                {pwdError && <div style={{ fontSize: '12px', color: '#e53e3e', background: 'rgba(229,62,62,0.1)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #e53e3e' }}>{pwdError}</div>}
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
              { label: 'Student Submissions', desc: 'Alert me each time a student submits an answer to my exam.', val: notifSubmissions, set: setNotifSubmissions },
              { label: 'Low Score Alerts', desc: 'Notify me when a student scores below 50% on any exam.', val: notifLowScores, set: setNotifLowScores },
              { label: 'Exam Auto-Close', desc: 'Notify me when an exam is automatically closed by the system.', val: notifExamClosed, set: setNotifExamClosed },
              { label: 'Guest Student Joins', desc: 'Alert me when a guest user joins one of my exams.', val: notifGuestJoins, set: setNotifGuestJoins },
            ].map((pref, idx, arr) => (
              <div key={pref.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0', borderBottom: idx < arr.length - 1 ? '1px solid var(--border, #e8e8ee)' : 'none', gap: '24px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{pref.label}</div>
                  <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '4px' }}>{pref.desc}</div>
                </div>
                <Toggle checked={pref.val} onChange={(v) => { pref.set(v); showToast('info', 'Preference saved', `${pref.label} turned ${v ? 'on' : 'off'}.`); }} />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default TeacherProfile;
