import React, { useEffect, useMemo, useState } from 'react';
import { userApi } from '../../api';
import { PageSkeleton } from '../../components/PageSkeleton';
import { useToast } from '../../components/ToastProvider';
import { extractErrorMessage } from '../../utils/errorUtils';
import { getPlatformUserRole, withPlatformUserRole } from '../../utils/queryme';
import type { PlatformUser } from '../../types/queryme';

const MANAGED_ROLES = ['TEACHER', 'STUDENT', 'GUEST'] as const;
type ManagedUserRole = typeof MANAGED_ROLES[number];

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: ManagedUserRole;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

const UserManagement: React.FC = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<ManagedUserRole[]>([...MANAGED_ROLES]);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<ManagedUserRole>('STUDENT');

  const loadUsers = async (signal?: AbortSignal) => {
    const [teachers, students, guests] = await Promise.all([
      userApi.getTeachers(signal).catch(() => [] as PlatformUser[]),
      userApi.getStudents(signal).catch(() => [] as PlatformUser[]),
      userApi.getGuests(signal).catch(() => [] as PlatformUser[]),
    ]);

    setUsers(
      [
        ...withPlatformUserRole(teachers, 'TEACHER'),
        ...withPlatformUserRole(students, 'STUDENT'),
        ...withPlatformUserRole(guests, 'GUEST'),
      ]
        .filter((user) => getPlatformUserRole(user) !== 'ADMIN')
        .map((user) => ({
          id: String(user.id),
          name: String(user.name || user.fullName || user.email.split('@')[0]),
          email: user.email,
          role: getPlatformUserRole(user) as ManagedUserRole,
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
      const matchesFilter = selectedRoles.includes(user.role);
      const matchesSearch = `${user.name} ${user.email}`.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    }),
    [searchQuery, selectedRoles, users],
  );

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(
    () => filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, filteredUsers, pageSize],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedRoles, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const toggleRole = (role: ManagedUserRole) => {
    setSelectedRoles((currentRoles) => (
      currentRoles.includes(role)
        ? currentRoles.filter((item) => item !== role)
        : [...currentRoles, role]
    ));
  };

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
    return <PageSkeleton title="User Management" rows={6} />;
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
        <div className="content-card-header" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {MANAGED_ROLES.map((value) => {
              const active = selectedRoles.includes(value);

              return (
                <button
                  key={value}
                  className={`btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => toggleRole(value)}
                  type="button"
                >
                  {value}
                </button>
              );
            })}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search users..."
              className="form-input"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              style={{ padding: '6px 14px', minWidth: '240px' }}
            />
            <select
              className="form-input"
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value) as typeof PAGE_SIZE_OPTIONS[number])}
              style={{ padding: '6px 14px', minWidth: '120px' }}
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} / page
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && <div style={{ padding: '12px 24px', color: '#e53e3e' }}>{error}</div>}
        <div className="content-card-body" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user) => (
                <tr key={`${user.role}-${user.id}`}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{user.name}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{user.email}</div>
                  </td>
                  <td><span className="badge badge-gray">{user.role}</span></td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(user)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
                    No users match the active filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', padding: '16px 24px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Showing {filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length}
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}
            >
              Previous
            </button>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#4a5568' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((previous) => Math.min(totalPages, previous + 1))}
            >
              Next
            </button>
          </div>
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
                  <select className="form-input" value={formRole} onChange={(event) => setFormRole(event.target.value as ManagedUserRole)} style={{ width: '100%' }}>
                    <option value="STUDENT">Student</option>
                    <option value="TEACHER">Teacher</option>
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

const createNewUser = async (role: ManagedUserRole, payload: { fullName: string; email: string; password: string }) => {
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
  role: ManagedUserRole,
  payload: { fullName?: string; email?: string; password?: string },
) => {
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
