import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { courseApi, userApi } from '../../api';
import { PageSkeleton } from '../../components/PageSkeleton';
import { useAuth } from '../../contexts';
import { extractErrorMessage } from '../../utils/errorUtils';
import { filterCoursesByTeacher, getInitials } from '../../utils/queryme';

const TeacherProfile: React.FC = () => {
  const { user, updateCurrentUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: profileData, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['teacher-profile', user?.id],
    queryFn: async ({ signal }) => {
      if (!user) return null;
      const [teachers, allCourses] = await Promise.all([
        userApi.getTeachers({ signal }),
        courseApi.getCourses({ signal }),
      ]);
      const teacher = teachers.find((candidate) => String(candidate.id) === user.id || candidate.email === user.email);
      const ownedCourses = filterCoursesByTeacher(allCourses, user.id).map((course) => ({
        id: String(course.id),
        name: course.name,
      }));
      return { teacher, ownedCourses };
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profileData?.teacher) {
      if (!name) setName(String(profileData.teacher.name || profileData.teacher.fullName || user?.name || ''));
      if (!email) setEmail(String(profileData.teacher.email || user?.email || ''));
    }
  }, [profileData, user]);

  const courses = profileData?.ownedCourses || [];
  const error = fetchError instanceof Error ? fetchError.message : fetchError ? String(fetchError) : saveError;

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSuccess(null);

    try {
      await userApi.updateTeacher(user.id, {
        fullName: name,
        email,
        ...(password ? { password } : {}),
      });

      updateCurrentUser({ ...user, name, email });
      setPassword('');
      setSuccess('Your teacher profile has been updated.');
    } catch (err) {
      setSaveError(extractErrorMessage(err, 'Failed to update your teacher profile.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageSkeleton title="My Profile" rows={4} />;
  }

  return (
    <div>
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Manage your teacher account details and the courses linked to your profile.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
        <div className="content-card">
          <div className="profile-card-body">
            <div className="profile-avatar">{getInitials(name)}</div>
            <h3 className="profile-name">{name}</h3>
            <p className="profile-email">{email}</p>
            <span className="badge badge-green">{user?.role}</span>
            <div className="profile-meta-container">
              <div className="profile-meta-row">
                <span className="profile-meta-label">Courses</span>
                <strong className="profile-meta-value">{courses.length}</strong>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="content-card">
            <div className="content-card-header">
              <h2>Account Information</h2>
            </div>
            <div className="content-card-body">
              <form onSubmit={handleSave}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
                  <div>
                    <label className="profile-info-label">Full Name</label>
                    <input className="form-input" value={name} onChange={(event) => setName(event.target.value)} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label className="profile-info-label">Email</label>
                    <input className="form-input" value={email} onChange={(event) => setEmail(event.target.value)} style={{ width: '100%' }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="profile-info-label">New Password</label>
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

          <div className="content-card">
            <div className="content-card-header">
              <h2>Courses</h2>
            </div>
            <div className="content-card-body hidden md:block" style={{ padding: 0 }}>
              <table className="data-table min-w-60">
                <thead>
                  <tr>
                    <th>Course Name</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course.id}>
                      <td>{course.name}</td>
                    </tr>
                  ))}
                  {courses.length === 0 && (
                    <tr>
                      <td colSpan={1} style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
                        No linked courses were returned for your profile.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
              <div className="space-y-3 p-4 md:hidden">
                {courses.map((course) => (
                  <div key={course.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="font-semibold text-slate-800">{course.name}</div>
                  </div>
                ))}
                {courses.length === 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
                    No linked courses were returned for your profile.
                  </div>
                )}
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherProfile;
