import React, { useEffect, useMemo, useRef, useState } from 'react';
import { userApi } from '../../api';
import { PageSkeleton } from '../../components/PageSkeleton';
import { useToast } from '../../components/ToastContext';
import { extractErrorMessage } from '../../utils/errorUtils';
import { getPlatformUserRole, withPlatformUserRole } from '../../utils/queryme';
import type { PlatformUser } from '../../types/queryme';

const MANAGED_ROLES = ['TEACHER', 'STUDENT', 'GUEST'] as const;
type ManagedUserRole = typeof MANAGED_ROLES[number];

const ROLE_LABELS: Record<ManagedUserRole, string> = {
  TEACHER: 'Teacher',
  STUDENT: 'Student',
  GUEST: 'Guest',
};

const ROLE_DESCRIPTIONS: Record<ManagedUserRole, string> = {
  TEACHER: 'Can build exams, manage courses, and monitor sessions.',
  STUDENT: 'Can take assigned exams and view personal results.',
  GUEST: 'Can explore public catalog and limited platform features.',
};

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
  const modalRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

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
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = useMemo(
    () => filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredUsers, pageSize, safePage],
  );

  const toggleRole = (role: ManagedUserRole) => {
    setSelectedRoles((currentRoles) => (
      currentRoles.includes(role)
        ? currentRoles.filter((item) => item !== role)
        : [...currentRoles, role]
    ));
    setCurrentPage(1);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('STUDENT');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setError(null);
  };

  const openEditModal = (user: ManagedUser) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword('');
    setFormRole(user.role);
    setShowModal(true);
  };

  useEffect(() => {
    if (!showModal) {
      return;
    }

    previouslyFocusedElementRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const modalElement = modalRef.current;
    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const firstFocusableSelector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const focusableElements = modalElement
      ? Array.from(modalElement.querySelectorAll<HTMLElement>(firstFocusableSelector))
          .filter((element) => !element.hasAttribute('hidden') && !element.getAttribute('aria-hidden'))
      : [];

    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    const handleModalKeys = (event: KeyboardEvent) => {
      if (!showModal) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key !== 'Tab' || !modalElement) {
        return;
      }

      const tabbableElements = Array.from(modalElement.querySelectorAll<HTMLElement>(firstFocusableSelector))
        .filter((element) => !element.hasAttribute('hidden') && !element.getAttribute('aria-hidden'));

      if (tabbableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = tabbableElements[0];
      const lastElement = tabbableElements[tabbableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleModalKeys);

    return () => {
      document.removeEventListener('keydown', handleModalKeys);
      document.body.style.overflow = originalBodyOverflow;
      previouslyFocusedElementRef.current?.focus();
    };
  }, [showModal]);

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
      closeModal();
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
      <div className="page-header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1>User Management</h1>
          <p>Create and update platform identities using the real admin-facing endpoints.</p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={openCreateModal}>
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
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', width: '100%' }} className="sm:w-auto">
            <input
              type="text"
              placeholder="Search users..."
              className="form-input"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setCurrentPage(1);
              }}
              style={{ padding: '6px 14px', minWidth: '240px', width: '100%' }}
            />
            <select
              className="form-input"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value) as typeof PAGE_SIZE_OPTIONS[number]);
                setCurrentPage(1);
              }}
              style={{ padding: '6px 14px', minWidth: '120px', width: '100%' }}
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
        <div className="content-card-body hidden md:block" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="data-table min-w-140">
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
        <div className="space-y-3 p-4 md:hidden">
          {paginatedUsers.map((user) => (
            <div key={`card-${user.role}-${user.id}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="font-semibold text-slate-800">{user.name}</div>
              <div className="mt-1 text-xs text-slate-500">{user.email}</div>
              <div className="mt-3 flex items-center justify-between">
                <span className="badge badge-gray">{user.role}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(user)}>
                  Edit
                </button>
              </div>
            </div>
          ))}
          {paginatedUsers.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
              No users match the active filter.
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', padding: '16px 24px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Showing {filteredUsers.length === 0 ? 0 : (safePage - 1) * pageSize + 1}-
            {Math.min(safePage * pageSize, filteredUsers.length)} of {filteredUsers.length}
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}
            >
              Previous
            </button>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#4a5568' }}>
              Page {safePage} of {totalPages}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((previous) => Math.min(totalPages, previous + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="um-modal-overlay" onClick={closeModal}>
          <div
            className="exam-modal um-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="um-modal-title"
            aria-label={editingUser ? 'Edit User' : 'Create User'}
            ref={modalRef}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="um-modal-header">
              <h3 id="um-modal-title">{editingUser ? 'Edit User' : 'Create User'}</h3>
              <p>
                {editingUser
                  ? 'Update account details. Leave password empty to keep current access.'
                  : 'Create a new platform account for teacher, student, or guest access.'}
              </p>
            </div>

            {error && <div className="um-modal-error">{error}</div>}

            <div className="um-modal-grid">
              <div className="um-form-field um-field-wide">
                <label className="um-form-label" htmlFor="user-full-name">Full Name <span>*</span></label>
                <input
                  id="user-full-name"
                  className="form-input"
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  placeholder="Enter full name"
                  autoComplete="name"
                />
              </div>

              <div className="um-form-field um-field-wide">
                <label className="um-form-label" htmlFor="user-email">Email Address <span>*</span></label>
                <input
                  id="user-email"
                  type="email"
                  className="form-input"
                  value={formEmail}
                  onChange={(event) => setFormEmail(event.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                />
              </div>

              <div className="um-form-field um-field-wide">
                <label className="um-form-label" htmlFor="user-password">
                  {editingUser ? 'New Password (Optional)' : 'Password'} {!editingUser && <span>*</span>}
                </label>
                <input
                  id="user-password"
                  type="password"
                  className="form-input"
                  value={formPassword}
                  onChange={(event) => setFormPassword(event.target.value)}
                  placeholder={editingUser ? 'Enter a new password only if needed' : 'Create temporary password'}
                  autoComplete={editingUser ? 'new-password' : 'off'}
                />
              </div>

              {!editingUser && (
                <div className="um-form-field um-field-wide">
                  <label className="um-form-label">Role</label>
                  <div className="um-role-grid">
                    {MANAGED_ROLES.map((role) => {
                      const isActive = formRole === role;

                      return (
                        <button
                          key={role}
                          type="button"
                          className={`um-role-option ${isActive ? 'active' : ''}`}
                          onClick={() => setFormRole(role)}
                        >
                          <strong>{ROLE_LABELS[role]}</strong>
                          <span>{ROLE_DESCRIPTIONS[role]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="um-modal-actions">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
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
