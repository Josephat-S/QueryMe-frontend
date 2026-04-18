import React, { useCallback, useEffect, useRef, useState } from 'react';
import { userApi } from '../../api';
import { PageSkeleton } from '../../components/PageSkeleton';
import { useToast } from '../../components/ToastContext';
import { extractErrorMessage } from '../../utils/errorUtils';
import { getPlatformUserRole, withPlatformUserRole } from '../../utils/queryme';
import type { PlatformUser } from '../../types/queryme';

const MANAGED_ROLES = ['TEACHER', 'STUDENT'] as const;
type ManagedUserRole = typeof MANAGED_ROLES[number];

const ROLE_LABELS: Record<ManagedUserRole, string> = {
  TEACHER: 'Teacher',
  STUDENT: 'Student',
};

const ROLE_DESCRIPTIONS: Record<ManagedUserRole, string> = {
  TEACHER: 'Can build exams, manage courses, and monitor sessions.',
  STUDENT: 'Can take assigned exams and view personal results.',
};

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: ManagedUserRole;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;
const SEARCH_FETCH_PAGE_SIZE = 100;

const UserManagement: React.FC = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
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
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const loadUsers = useCallback(async (signal?: AbortSignal) => {
    if (selectedRoles.length === 0) {
      setUsers([]);
      setTotalItems(0);
      setTotalPages(1);
      return;
    }

    const toManagedUser = (user: Partial<PlatformUser> & { email: string }): ManagedUser => ({
      id: String(user.id),
      name: String(user.name || user.fullName || user.email.split('@')[0]),
      email: user.email,
      role: getPlatformUserRole(user) as ManagedUserRole,
    });

    const fetchAllRoleUsers = async (role: ManagedUserRole) => {
      const fetchPage = role === 'TEACHER' ? userApi.getTeachersPage : userApi.getStudentsPage;
      const withRole = role === 'TEACHER' ? withPlatformUserRole : withPlatformUserRole;

      const firstPage = await fetchPage({ page: 1, pageSize: SEARCH_FETCH_PAGE_SIZE, signal });
      const allItems = [...withRole(firstPage.content, role)];

      for (let page = 2; page <= Math.max(1, firstPage.totalPages); page += 1) {
        const nextPage = await fetchPage({ page, pageSize: SEARCH_FETCH_PAGE_SIZE, signal });
        allItems.push(...withRole(nextPage.content, role));
      }

      return allItems;
    };

    if (normalizedSearch) {
      const roleUsers = await Promise.all(selectedRoles.map((role) => fetchAllRoleUsers(role)));
      const merged = roleUsers
        .flat()
        .filter((user) => getPlatformUserRole(user) !== 'ADMIN')
        .map(toManagedUser)
        .filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(normalizedSearch));

      const computedTotalPages = Math.max(1, Math.ceil(merged.length / pageSize));
      const safePage = Math.min(currentPage, computedTotalPages);
      const startIndex = (safePage - 1) * pageSize;

      setTotalItems(merged.length);
      setTotalPages(computedTotalPages);
      setUsers(merged.slice(startIndex, startIndex + pageSize));
      return;
    }

    const sizePerRole = Math.max(1, Math.ceil(pageSize / selectedRoles.length));

    const rolePages = await Promise.all(
      selectedRoles.map((role) => {
        if (role === 'TEACHER') {
          return userApi.getTeachersPage({ page: currentPage, pageSize: sizePerRole, signal });
        }

        return userApi.getStudentsPage({ page: currentPage, pageSize: sizePerRole, signal });
      }),
    );

    const teachersPage = selectedRoles.includes('TEACHER')
      ? rolePages[selectedRoles.indexOf('TEACHER')]
      : null;
    const studentsPage = selectedRoles.includes('STUDENT')
      ? rolePages[selectedRoles.indexOf('STUDENT')]
      : null;

    const teachers = teachersPage ? withPlatformUserRole(teachersPage.content, 'TEACHER') : [];
    const students = studentsPage ? withPlatformUserRole(studentsPage.content, 'STUDENT') : [];

    const combinedTotal = (teachersPage?.totalElements || 0) + (studentsPage?.totalElements || 0);
    setTotalItems(combinedTotal);
    setTotalPages(Math.max(1, Math.ceil(combinedTotal / pageSize)));

    setUsers(
      [...teachers, ...students]
        .filter((user) => getPlatformUserRole(user) !== 'ADMIN')
        .map(toManagedUser),
    );
  }, [currentPage, normalizedSearch, pageSize, selectedRoles]);

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
  }, [loadUsers]);

  const safePage = Math.min(currentPage, totalPages);

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
              {users.map((user) => (
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
              {users.length === 0 && (
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
          {users.map((user) => (
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
          {users.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
              No users match the active filter.
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', padding: '16px 24px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Showing {totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1}-
            {Math.min((safePage - 1) * pageSize + users.length, totalItems)} of {totalItems}
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
                  : 'Create a new platform account for teacher or student access.'}
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
  await userApi.updateStudent(id, payload);
};

export default UserManagement;
