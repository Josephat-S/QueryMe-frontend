import React, { useEffect, useMemo, useState } from 'react';
import { userApi } from '../../api';
import { useToast } from '../../components/ToastProvider';
import { extractErrorMessage } from '../../utils/errorUtils';
import { getPlatformUserRole, withPlatformUserRole } from '../../utils/queryme';
import type { PlatformUser, UserRole } from '../../types/queryme';

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

const UserManagement: React.FC = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [filter, setFilter] = useState<'ALL' | UserRole>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('STUDENT');

  const loadUsers = async (signal?: AbortSignal) => {
    const [admins, teachers, students, guests] = await Promise.all([
      userApi.getAdmins(signal).catch(() => [] as PlatformUser[]),
      userApi.getTeachers(signal).catch(() => [] as PlatformUser[]),
      userApi.getStudents(signal).catch(() => [] as PlatformUser[]),
      userApi.getGuests(signal).catch(() => [] as PlatformUser[]),
    ]);

    setUsers(
      [
        ...withPlatformUserRole(admins, 'ADMIN'),
        ...withPlatformUserRole(teachers, 'TEACHER'),
        ...withPlatformUserRole(students, 'STUDENT'),
        ...withPlatformUserRole(guests, 'GUEST'),
      ].map((user) => ({
        id: String(user.id),
        name: String(user.name || user.fullName || user.email.split('@')[0]),
        email: user.email,
        role: getPlatformUserRole(user),
      })),
    );
  };

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    void loadUsers(controller.signal)
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(extractErrorMessage(err, 'Failed to load platform users.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  const filteredUsers = useMemo(
    () => users.filter((user) => {
      const matchesFilter = filter === 'ALL' || user.role === filter;
      const matchesSearch = `${user.name} ${user.email}`.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    }),
    [filter, searchQuery, users],
  );

  const openCreateModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('STUDENT');
    setShowModal(true);
  };

  const openEditModal = (user: ManagedUser) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword('');
    setFormRole(user.role);
    setShowModal(true);
  };

  const saveUser = async () => {
    if (!formName.trim() || !formEmail.trim()) {
      setError('Name and email are required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingUser) {
        await updateExistingUser(editingUser.id, editingUser.role, {
          fullName: formName.trim(),
          email: formEmail.trim(),
          ...(formPassword ? { password: formPassword } : {}),
        });
      } else {
        await createNewUser(formRole, {
          fullName: formName.trim(),
          email: formEmail.trim(),
          password: formPassword.trim(),
        });
      }

      await loadUsers();
      setShowModal(false);
      showToast('success', editingUser ? 'User updated' : 'User created', editingUser ? 'The selected account was updated successfully.' : 'A new account was created successfully.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to save the user.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px' }}>Loading users...</div>;
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>User Management</h1>
          <p>Create and update platform identities using the real admin-facing endpoints.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          Add User
        </button>
      </div>

      <div className="content-card">
        <div className="content-card-header" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['ALL', 'ADMIN', 'TEACHER', 'STUDENT', 'GUEST'] as const).map((value) => (
            <button key={value} className={`btn btn-sm ${filter === value ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(value)}>
              {value}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Search users..."
              className="form-input"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              style={{ padding: '6px 14px', minWidth: '240px' }}
            />
          </div>
        </div>
        {error && <div style={{ padding: '12px 24px', color: '#e53e3e' }}>{error}</div>}
        <div className="content-card-body" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Role</th>
                <th>User ID</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={`${user.role}-${user.id}`}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{user.name}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{user.email}</div>
                  </td>
                  <td><span className="badge badge-gray">{user.role}</span></td>
                  <td>{user.id}</td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(user)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
                    No users match the active filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(3px)',
        }}>
          <div className="exam-modal" style={{ borderRadius: '16px', padding: '32px', width: '420px', maxWidth: '90%', textAlign: 'left' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 700 }}>
              {editingUser ? 'Edit User' : 'Create User'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '6px' }}>Full Name</label>
                <input className="form-input" value={formName} onChange={(event) => setFormName(event.target.value)} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '6px' }}>Email Address</label>
                <input className="form-input" value={formEmail} onChange={(event) => setFormEmail(event.target.value)} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '6px' }}>
                  {editingUser ? 'New Password (Optional)' : 'Password'}
                </label>
                <input type="password" className="form-input" value={formPassword} onChange={(event) => setFormPassword(event.target.value)} style={{ width: '100%' }} />
              </div>
              {!editingUser && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '6px' }}>Role</label>
                  <select className="form-input" value={formRole} onChange={(event) => setFormRole(event.target.value as UserRole)} style={{ width: '100%' }}>
                    <option value="STUDENT">Student</option>
                    <option value="TEACHER">Teacher</option>
                    <option value="ADMIN">Admin</option>
                    <option value="GUEST">Guest</option>
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => void saveUser()} disabled={saving}>
                {saving ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const createNewUser = async (role: UserRole, payload: { fullName: string; email: string; password: string }) => {
  if (role === 'ADMIN') {
    await userApi.registerAdmin(payload);
    return;
  }
  if (role === 'TEACHER') {
    await userApi.registerTeacher(payload);
    return;
  }
  if (role === 'GUEST') {
    await userApi.registerGuest(payload);
    return;
  }
  await userApi.registerStudent(payload);
};

const updateExistingUser = async (
  id: string,
  role: UserRole,
  payload: { fullName?: string; email?: string; password?: string },
) => {
  if (role === 'ADMIN') {
    await userApi.updateAdmin(id, payload);
    return;
  }
  if (role === 'TEACHER') {
    await userApi.updateTeacher(id, payload);
    return;
  }
  if (role === 'GUEST') {
    await userApi.updateGuest(id, payload);
    return;
  }
  await userApi.updateStudent(id, payload);
};

export default UserManagement;
