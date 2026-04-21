import React, { useCallback, useEffect, useRef, useState } from 'react';
import { authApi, userApi } from '../../api';
import { PageSkeleton } from '../../components/PageSkeleton';
import { useToast } from '../../components/ToastContext';
import { useAuth } from '../../contexts';
import { extractErrorMessage } from '../../utils/errorUtils';
import { getPlatformUserRole, withPlatformUserRole } from '../../utils/queryme';
import type { PlatformUser, RegistrationRequest } from '../../types/queryme';
import {
  buildStudentRegistrationPayload,
  parseStudentImportFile,
  STUDENT_IMPORT_ACCEPT,
  STUDENT_IMPORT_TEMPLATE,
} from '../../utils/studentImport';

const MANAGED_ROLES = ['ADMIN', 'TEACHER', 'STUDENT'] as const;
type ManagedUserRole = typeof MANAGED_ROLES[number];

const ROLE_LABELS: Record<ManagedUserRole, string> = {
  ADMIN: 'Admin',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
};

const ROLE_DESCRIPTIONS: Record<ManagedUserRole, string> = {
  ADMIN: 'Has full system access, including managing other admins.',
  TEACHER: 'Can build exams, manage courses, and monitor sessions.',
  STUDENT: 'Can take assigned exams and view personal results.',
};

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: ManagedUserRole;
  registrationNumber?: string;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;
const SEARCH_FETCH_PAGE_SIZE = 100;

const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
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
  const [view, setView] = useState<'users' | 'requests'>('users');
  const [pendingRequests, setPendingRequests] = useState<RegistrationRequest[]>([]);
  const [isProcessingRequest, setIsProcessingRequest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<ManagedUserRole>('STUDENT');
  const [formRegNo, setFormRegNo] = useState('');
  const [adminAuthPassword, setAdminAuthPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
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
      registrationNumber: user.registrationNumber || user.studentNumber || user.student_number,
    });

    const fetchAllRoleUsers = async (role: ManagedUserRole) => {
      const fetchPage = (() => {
        if (role === 'ADMIN') return userApi.getAdminsPage;
        if (role === 'TEACHER') return userApi.getTeachersPage;
        return userApi.getStudentsPage;
      })();
      
      const withRole = withPlatformUserRole;

      const firstPage = await fetchPage({ page: 1, pageSize: SEARCH_FETCH_PAGE_SIZE, signal });
      const allItems = [...withRole(firstPage.content, role)];

      const pagePromises = [];
      for (let page = 2; page <= Math.max(1, firstPage.totalPages); page += 1) {
        pagePromises.push(fetchPage({ page, pageSize: SEARCH_FETCH_PAGE_SIZE, signal }));
      }
      
      const nextPages = await Promise.all(pagePromises);
      for (const nextPage of nextPages) {
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

  const loadRequests = useCallback(async (signal?: AbortSignal) => {
    const requests = await userApi.getRegistrationRequests(signal);
    setPendingRequests(requests);
  }, []);

  const handleApprove = async (id: string) => {
    if (!window.confirm('Are you sure you want to approve this student?')) return;
    setIsProcessingRequest(true);
    try {
      await userApi.approveRegistrationRequest(id);
      showToast('success', 'Request Approved', 'The student can now log in to the platform.');
      await loadRequests();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to approve request.'));
    } finally {
      setIsProcessingRequest(false);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (reason === null) return;
    setIsProcessingRequest(true);
    try {
      await userApi.rejectRegistrationRequest(id, reason);
      showToast('success', 'Request Rejected', 'The registration request was rejected.');
      await loadRequests();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to reject request.'));
    } finally {
      setIsProcessingRequest(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (view === 'users') {
          await loadUsers(controller.signal);
        } else {
          await loadRequests(controller.signal);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(extractErrorMessage(err, `Failed to load ${view}.`));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => controller.abort();
  }, [loadUsers, loadRequests, view]);

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
    setFormRole('STUDENT');
    setFormRegNo('');
    setAdminAuthPassword('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setAdminAuthPassword('');
    setError(null);
  };

  const openEditModal = (user: ManagedUser) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormRegNo(user.registrationNumber || '');
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

    if (formRole === 'STUDENT' && !formRegNo.trim()) {
      setError('Registration number is required for students.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (formRole === 'ADMIN' && !editingUser) {
        if (!adminAuthPassword) {
          setError('Please enter your administrator password to confirm adding another admin.');
          setSaving(false);
          return;
        }

        try {
          // Re-authenticate current user to confirm sensitive action
          await authApi.signIn(currentUser?.email || '', adminAuthPassword);
        } catch {
          setError('Authorization failed. Please verify your administrator password.');
          setSaving(false);
          return;
        }
      }

      if (editingUser) {
        await updateExistingUser(editingUser.id, editingUser.role, {
          fullName: formName.trim(),
          email: formEmail.trim(),
          registrationNumber: formRegNo.trim(),
        });
      } else {
        await createNewUser(formRole, {
          fullName: formName.trim(),
          email: formEmail.trim(),
          registrationNumber: formRegNo.trim(),
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

  const deleteUser = async (user: ManagedUser) => {
    if (!window.confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) return;
    
    setIsDeleting(true);
    setError(null);
    try {
      if (user.role === 'ADMIN') {
        await userApi.deleteAdmin(user.id);
      } else if (user.role === 'TEACHER') {
        await userApi.deleteTeacher(user.id);
      } else {
        await userApi.deleteStudent(user.id);
      }
      await loadUsers();
      showToast('success', 'User deleted', 'The account has been removed.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to delete user.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress(null);
    setError(null);
    
    try {
      const rows = await parseStudentImportFile(file);
      if (rows.length === 0) {
        throw new Error('No valid student records found in the file.');
      }

      const total = rows.length;
      setImportProgress({ current: 0, total });

      const payloads = rows.map((row) => buildStudentRegistrationPayload(row));
      
      // Register in chunks of 20 to show progress without sacrificing too much performance
      const CHUNK_SIZE = 20;
      const results: PlatformUser[] = [];

      for (let index = 0; index < payloads.length; index += CHUNK_SIZE) {
        const chunk = payloads.slice(index, index + CHUNK_SIZE);
        const chunkResults = await userApi.registerStudentsBulk(chunk);
        results.push(...chunkResults);
        setImportProgress({ current: Math.min(index + CHUNK_SIZE, total), total });
      }

      await loadUsers();
      showToast('success', 'Import Successful', `Successfully registered ${results.length} students.`);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to import students.'));
    } finally {
      setIsImporting(false);
      setImportProgress(null);
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
    }
  };

  const triggerImport = () => {
    importInputRef.current?.click();
  };

  const downloadTemplate = () => {
    const blob = new Blob([STUDENT_IMPORT_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'student_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button 
            className={`btn ${view === 'users' ? 'btn-primary' : 'btn-secondary'} w-full sm:w-auto`}
            onClick={() => setView('users')}
          >
            Platform Users
          </button>
          <button 
            className={`btn ${view === 'requests' ? 'btn-primary' : 'btn-secondary'} w-full sm:w-auto`}
            onClick={() => setView('requests')}
          >
            Registration Requests
            {pendingRequests.length > 0 && (
              <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                {pendingRequests.length}
              </span>
            )}
          </button>
          {view === 'users' && (
            <>
              <button className="btn btn-secondary w-full sm:w-auto" onClick={downloadTemplate}>
                Download Template
              </button>
              <button className="btn btn-secondary w-full sm:w-auto" onClick={triggerImport} disabled={isImporting}>
                {isImporting ? (
                  <span>
                    {importProgress 
                      ? `Registering ${importProgress.current} of ${importProgress.total}...` 
                      : 'Importing...'}
                  </span>
                ) : 'Bulk Import Students'}
              </button>
              <button className="btn btn-primary w-full sm:w-auto" onClick={openCreateModal}>
                Add User
              </button>
            </>
          )}
        </div>
        <input
          type="file"
          ref={importInputRef}
          onChange={handleBulkImport}
          accept={STUDENT_IMPORT_ACCEPT}
          style={{ display: 'none' }}
        />
      </div>

      <div className="content-card">
        {view === 'users' ? (
          <>
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
                    <th>Reg No.</th>
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
                      <td>
                        <div style={{ fontSize: '13px', color: '#4a5568' }}>{user.registrationNumber || 'N/A'}</div>
                      </td>
                      <td><span className="badge badge-gray">{user.role}</span></td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(user)}>
                            Edit
                          </button>
                          <button className="btn btn-secondary btn-sm text-rose-600 hover:bg-rose-50" onClick={() => deleteUser(user)} disabled={isDeleting}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
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
                  {user.registrationNumber && (
                    <div className="mt-1 text-xs font-medium text-slate-700">Reg No: {user.registrationNumber}</div>
                  )}
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
          </>
        ) : (
          <div className="content-card-body" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="data-table min-w-140">
              <thead>
                <tr>
                  <th>Student Details</th>
                  <th>Reg No.</th>
                  <th>Requested At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{request.fullName}</div>
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{request.email}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', color: '#4a5568' }}>{request.registrationNumber}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', color: '#718096' }}>
                        {new Date(request.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button 
                          className="btn btn-primary btn-sm" 
                          onClick={() => handleApprove(request.id)}
                          disabled={isProcessingRequest}
                        >
                          Approve
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm text-rose-600 hover:bg-rose-50" 
                          onClick={() => handleReject(request.id)}
                          disabled={isProcessingRequest}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pendingRequests.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '48px', color: '#666' }}>
                      <div className="flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="font-medium text-slate-500">No pending registration requests.</p>
                        <p className="text-xs text-slate-400">All student sign-ups have been processed.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
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
                  ? 'Update profile details for this platform account.'
                  : 'A temporary password will be generated and sent to the user via email.'}
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

              {formRole === 'STUDENT' && (
                <div className="um-form-field um-field-wide">
                  <label className="um-form-label" htmlFor="user-reg-no">Registration Number <span>*</span></label>
                  <input
                    id="user-reg-no"
                    className="form-input"
                    value={formRegNo}
                    onChange={(event) => setFormRegNo(event.target.value)}
                    placeholder="Enter registration number"
                  />
                </div>
              )}

              {formRole === 'ADMIN' && !editingUser && (
                <div className="um-form-field um-field-wide um-confirmation-field" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '4px' }}>
                  <label className="um-form-label" htmlFor="admin-confirm-pass">Confirm Your Admin Password <span>*</span></label>
                  <input
                    id="admin-confirm-pass"
                    type="password"
                    className="form-input"
                    value={adminAuthPassword}
                    onChange={(event) => setAdminAuthPassword(event.target.value)}
                    placeholder="Authorize this action with your password"
                    autoComplete="current-password"
                  />
                  <p style={{ fontSize: '11px', color: '#718096', marginTop: '6px', fontStyle: 'italic' }}>
                    Creating a new administrator account is a sensitive action that requires your password for confirmation.
                  </p>
                </div>
              )}

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

const createNewUser = async (role: ManagedUserRole, payload: { fullName: string; email: string; registrationNumber?: string }) => {
  if (role === 'ADMIN') {
    await userApi.registerAdmin(payload);
    return;
  }
  if (role === 'TEACHER') {
    await userApi.registerTeacher(payload);
    return;
  }
  await userApi.registerStudent(payload);
};

const updateExistingUser = async (
  id: string,
  role: ManagedUserRole,
  payload: { fullName?: string; email?: string; registrationNumber?: string },
) => {
  if (role === 'ADMIN') {
    await userApi.updateAdmin(id, payload);
    return;
  }
  if (role === 'TEACHER') {
    await userApi.updateTeacher(id, payload);
    return;
  }
  await userApi.updateStudent(id, payload);
};

export default UserManagement;
