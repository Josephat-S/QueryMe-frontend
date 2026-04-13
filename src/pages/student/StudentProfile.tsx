import React, { useEffect, useState } from 'react';
import { userApi } from '../../api';
import { useAuth } from '../../contexts';
import { extractErrorMessage } from '../../utils/errorUtils';
import { getInitials } from '../../utils/queryme';

const StudentProfile: React.FC = () => {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const profile = await userApi.getStudent(user.id, controller.signal);
        if (!controller.signal.aborted) {
          setName(String(profile.name || profile.fullName || user.name));
          setEmail(String(profile.email || user.email));
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(extractErrorMessage(err, 'Unable to load your student profile.'));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => controller.abort();
  }, [user]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError('Your new password confirmation does not match.');
      return;
    }

    if (!newPassword.trim()) {
      setError('Enter a new password to update your account.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await userApi.updateStudent(user.id, {
        password: newPassword,
      });

      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Your password has been updated.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update your profile.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1>My Profile</h1>
          <p>Loading your student profile.</p>
        </div>
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading profile...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Review your account details and update your password.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
        <div className="content-card">
          <div className="content-card-body" style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6a3cb0, #512da8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 28,
                fontWeight: 700,
                margin: '0 auto 16px',
              }}
            >
              {getInitials(name)}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{name}</div>
            <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 10 }}>{email}</div>
            <span className="badge badge-purple">{user?.role}</span>

            <div style={{ marginTop: 22, borderTop: '1px solid var(--border,#f0f0f5)', paddingTop: 16, textAlign: 'left', fontSize: 13, opacity: 0.72, lineHeight: 1.6 }}>
              Your identity and enrollment details are managed by your teacher or administrator.
            </div>
          </div>
        </div>

        <div className="content-card">
          <div className="content-card-header">
            <h2>Account Details</h2>
          </div>
          <div className="content-card-body">
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="profile-info-label">Full Name</label>
                  <input className="form-input" value={name} disabled style={{ width: '100%', opacity: 0.7, cursor: 'not-allowed' }} />
                </div>
                <div>
                  <label className="profile-info-label">Email</label>
                  <input className="form-input" value={email} disabled style={{ width: '100%', opacity: 0.7, cursor: 'not-allowed' }} />
                </div>
                <div>
                  <label className="profile-info-label">New Password</label>
                  <input type="password" className="form-input" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <label className="profile-info-label">Confirm Password</label>
                  <input type="password" className="form-input" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} style={{ width: '100%' }} />
                </div>
              </div>

              {error && (
                <div style={{ marginTop: '16px', fontSize: '12px', color: '#e53e3e' }}>
                  {error}
                </div>
              )}

              {success && (
                <div style={{ marginTop: '16px', fontSize: '12px', color: '#38a169' }}>
                  {success}
                </div>
              )}

              <div style={{ marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
