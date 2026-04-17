import React, { useEffect, useState } from 'react';
import { userApi } from '../../api';
import { PageSkeleton } from '../../components/PageSkeleton';
import { useAuth } from '../../contexts';
import { extractErrorMessage } from '../../utils/errorUtils';
import { getInitials } from '../../utils/queryme';

const AdminProfile: React.FC = () => {
  const { user, updateCurrentUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
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
        const admins = await userApi.getAdmins({ signal: controller.signal });
        const admin = admins.find((candidate) => String(candidate.id) === user.id || candidate.email === user.email);

        if (!controller.signal.aborted) {
          setName(String(admin?.name || admin?.fullName || user.name));
          setEmail(String(admin?.email || user.email));
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(extractErrorMessage(err, 'Unable to load your admin profile.'));
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

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await userApi.updateAdmin(user.id, {
        fullName: name,
        email,
        ...(password ? { password } : {}),
      });

      updateCurrentUser({ ...user, name, email });
      setPassword('');
      setSuccess('Your admin profile has been updated.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update your admin profile.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageSkeleton title="Admin Profile" rows={4} />;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Admin Profile</h1>
        <p>Manage the account identity used for administrative actions.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
        <div className="content-card">
          <div className="content-card-body" style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #9b2c2c, #e53e3e)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                fontWeight: 700,
                color: '#fff',
                margin: '0 auto 16px',
              }}
            >
              {getInitials(name)}
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700 }}>{name}</div>
            <div style={{ fontSize: '13px', opacity: 0.6, marginTop: '4px' }}>{email}</div>
            <div style={{ marginTop: '10px' }}>
              <span className="badge badge-red">{user?.role || 'ADMIN'}</span>
            </div>
          </div>
        </div>

        <div className="content-card">
          <div className="content-card-header">
            <h2>Account Information</h2>
          </div>
          <div className="content-card-body">
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, opacity: 0.6, marginBottom: '6px' }}>Full Name</label>
                  <input className="form-input" value={name} onChange={(event) => setName(event.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, opacity: 0.6, marginBottom: '6px' }}>Email Address</label>
                  <input className="form-input" value={email} onChange={(event) => setEmail(event.target.value)} style={{ width: '100%' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, opacity: 0.6, marginBottom: '6px' }}>New Password</label>
                  <input type="password" className="form-input" value={password} onChange={(event) => setPassword(event.target.value)} style={{ width: '100%' }} />
                </div>
              </div>

              {error && <div style={{ marginTop: '14px', color: '#e53e3e', fontSize: '12px' }}>{error}</div>}
              {success && <div style={{ marginTop: '14px', color: '#38a169', fontSize: '12px' }}>{success}</div>}

              <div style={{ marginTop: '18px' }}>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
