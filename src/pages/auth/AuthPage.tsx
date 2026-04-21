import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts';
import logoImg from '../../assets/logo.png';
import { clearRememberedEmail, getRememberedEmail, setRememberedEmail } from '../../utils/authStorage';
import { extractErrorMessage } from '../../utils/errorUtils';

const ROLE_REDIRECTS: Record<string, string> = {
  ADMIN: '/admin',
  TEACHER: '/teacher',
  STUDENT: '/student',
  GUEST: '/guest',
};

const inputBase = 'h-11 w-full rounded-lg border border-[#ddd8ec] bg-white px-4 text-sm font-medium text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#7c10b8]/35 focus:ring-2 focus:ring-[#7c10b8]/10';
const rememberedEmail = getRememberedEmail();

const Field: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`${inputBase} ${props.className ?? ''}`}
  />
);

const AuthPage: React.FC = () => {
  const { isAuthenticated, user, login } = useAuth();

  // Login form state
  const [loginEmail, setLoginEmail] = useState(() => rememberedEmail || '');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => Boolean(rememberedEmail));
  const [loginError, setLoginError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupRegNo, setSignupRegNo] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Reset form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const { resetPassword, logout, signUp } = useAuth();

  if (isAuthenticated && user && !user.mustResetPassword) {
    const dest = ROLE_REDIRECTS[user.role] || '/student';
    return <Navigate to={dest} replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSigningIn) return;
    setLoginError('');
    setIsSigningIn(true);
    try {
      await login(loginEmail, loginPassword, rememberMe);
      if (rememberMe) {
        setRememberedEmail(loginEmail);
      } else {
        clearRememberedEmail();
      }
    } catch (error) {
      setLoginError(extractErrorMessage(error, 'Invalid email or password.'));
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSigningUp) return;
    setSignupError('');

    if (signupPassword !== signupConfirmPassword) {
      setSignupError('Passwords do not match.');
      return;
    }

    if (!signupRegNo.trim()) {
      setSignupError('Registration number is required.');
      return;
    }

    setIsSigningUp(true);
    try {
      await signUp(signupName, signupEmail, signupRegNo, signupPassword);
      setSignupSuccess(true);
    } catch (error) {
      setSignupError(extractErrorMessage(error, 'Failed to submit registration request.'));
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters.');
      return;
    }
    setIsResetting(true);
    setResetError('');
    try {
      await resetPassword(newPassword);
    } catch (error) {
      setResetError(extractErrorMessage(error, 'Failed to reset password.'));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="auth-page min-h-screen bg-[linear-gradient(180deg,#e8e5f2_0%,#d8d8ea_100%)] px-3 py-3 text-left sm:px-6 sm:py-6 lg:px-8">
      <div className="auth-shell mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-310 items-center justify-center sm:min-h-[calc(100vh-3rem)]">
        <div className="auth-card relative w-full min-h-[calc(100vh-1.5rem)] overflow-hidden rounded-2xl shadow-[0_28px_90px_rgba(92,70,140,0.28)] ring-1 ring-white/70 sm:rounded-[26px] xl:min-h-172.5">
          <div className="auth-grid grid min-h-[calc(100vh-1.5rem)] grid-cols-1 xl:min-h-172.5 xl:grid-cols-2">
            <section className="auth-panel relative flex min-h-full items-center justify-center overflow-hidden px-5 py-7 sm:px-8 sm:py-9 lg:px-16 xl:min-h-172.5 bg-white col-span-1 xl:col-span-1">
              <div className="flex w-full max-w-90 flex-col items-center text-center">
                {user?.mustResetPassword ? (
                  <form onSubmit={handleResetPassword} className="flex w-full max-w-90 flex-col items-center text-center">
                    <img src={logoImg} alt="QueryMe Logo" className="mb-6 h-12 w-auto object-contain sm:mb-9 sm:h-16" />
                    <h1 className="mb-6 text-[1.75rem] font-semibold leading-none tracking-tight text-[#30313a] sm:mb-7">Change Password</h1>
                    <p className="mb-6 text-sm text-slate-500">You must change your password before continuing. Use the temporary password sent to your email to log in initially, then set a new secure one here.</p>
                    
                    <div className="w-full space-y-2.5">
                      <Field
                        type="password"
                        placeholder="New Password"
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setResetError(''); }}
                        disabled={isResetting}
                      />
                      <Field
                        type="password"
                        placeholder="Confirm New Password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setResetError(''); }}
                        disabled={isResetting}
                      />
                    </div>

                    {resetError && <span className="mt-2 self-stretch text-sm font-medium text-rose-600">{resetError}</span>}

                    <div className="mt-7 flex w-full gap-3">
                      <button
                        type="button"
                        onClick={() => logout()}
                        className="flex-1 h-11 rounded-md border border-slate-200 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                        disabled={isResetting}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-[2] h-11 inline-flex items-center justify-center rounded-md bg-[#7c10b8] text-xs font-semibold tracking-[0.24em] text-white shadow-[0_10px_24px_rgba(124,16,184,0.35)] transition duration-500 hover:-translate-y-0.5 hover:bg-[#6d0fa2]"
                        disabled={isResetting}
                      >
                        {isResetting ? 'UPDATING...' : 'UPDATE PASSWORD'}
                      </button>
                    </div>
                  </form>
                ) : isLogin ? (
                  <form onSubmit={handleLogin} className="flex w-full max-w-90 flex-col items-center text-center">
                    <img src={logoImg} alt="QueryMe Logo" className="mb-6 h-12 w-auto object-contain sm:mb-9 sm:h-16" />
                    <h1 className="mb-6 text-[2rem] font-semibold leading-none tracking-tight text-[#30313a] sm:mb-7 sm:text-[2.25rem]">Sign In</h1>

                    <div className="w-full space-y-2.5">
                      <Field type="email" placeholder="Email Address" value={loginEmail} onChange={(e) => { setLoginEmail(e.target.value); setLoginError(''); }} id="signin-email-input" autoComplete="email" disabled={isSigningIn} />
                      <Field type="password" placeholder="Password" value={loginPassword} onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }} id="signin-password-input" autoComplete="current-password" disabled={isSigningIn} />
                    </div>

                    {loginError && <span className="mt-2 self-stretch text-sm font-medium text-rose-600">{loginError}</span>}

                    <div className="mt-3 flex w-full items-center justify-between gap-4 text-sm text-slate-500">
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} id="remember-me-checkbox" disabled={isSigningIn} className="h-4 w-4 rounded border-slate-300 text-[#7c10b8] focus:ring-[#7c10b8]/30" />
                        <span>Remember Me</span>
                      </label>
                      <a href="#" className="text-slate-500 transition hover:text-slate-700" id="forgot-password-link">Forget Your Password?</a>
                    </div>

                    <button type="submit" className="mt-7 inline-flex h-11 w-full items-center justify-center rounded-md bg-[#7c10b8] px-5 text-xs font-semibold tracking-[0.24em] text-white shadow-[0_10px_24px_rgba(124,16,184,0.35)] transition duration-500 hover:-translate-y-0.5 hover:bg-[#6d0fa2] disabled:cursor-not-allowed disabled:opacity-70 sm:w-40" id="signin-submit-btn" disabled={isSigningIn}>
                      {isSigningIn ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                          SIGNING IN...
                        </span>
                      ) : 'SIGN IN'}
                    </button>

                    <p className="mt-8 text-sm text-slate-500">
                      Don't have an account?{' '}
                      <button type="button" onClick={() => setIsLogin(false)} className="font-semibold text-[#7c10b8] hover:underline">
                        Create one
                      </button>
                    </p>
                  </form>
                ) : signupSuccess ? (
                  <div className="flex w-full max-w-90 flex-col items-center text-center">
                    <img src={logoImg} alt="QueryMe Logo" className="mb-6 h-12 w-auto object-contain sm:mb-9 sm:h-16" />
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h1 className="mb-4 text-[1.75rem] font-semibold leading-tight text-[#30313a]">Request Submitted</h1>
                    <p className="mb-8 text-slate-500">
                      Your registration request has been sent to the administrator. 
                      You will be able to log in once your account is approved.
                    </p>
                    <button 
                      onClick={() => { setIsLogin(true); setSignupSuccess(false); }} 
                      className="inline-flex h-11 items-center justify-center rounded-md bg-[#7c10b8] px-8 text-xs font-semibold tracking-[0.24em] text-white shadow-[0_10px_24px_rgba(124,16,184,0.35)] transition duration-500 hover:-translate-y-0.5 hover:bg-[#6d0fa2]"
                    >
                      BACK TO LOGIN
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSignup} className="flex w-full max-w-90 flex-col items-center text-center">
                    <img src={logoImg} alt="QueryMe Logo" className="mb-6 h-12 w-auto object-contain sm:mb-9 sm:h-16" />
                    <h1 className="mb-6 text-[2rem] font-semibold leading-none tracking-tight text-[#30313a] sm:mb-7 sm:text-[2.25rem]">Sign Up</h1>

                    <div className="w-full space-y-2.5 text-left">
                      <Field type="text" placeholder="Full Name" value={signupName} onChange={(e) => { setSignupName(e.target.value); setSignupError(''); }} required disabled={isSigningUp} />
                      <Field type="email" placeholder="Email Address" value={signupEmail} onChange={(e) => { setSignupEmail(e.target.value); setSignupError(''); }} required disabled={isSigningUp} />
                      <Field type="text" placeholder="Registration Number" value={signupRegNo} onChange={(e) => { setSignupRegNo(e.target.value); setSignupError(''); }} required disabled={isSigningUp} />
                      <Field type="password" placeholder="Password" value={signupPassword} onChange={(e) => { setSignupPassword(e.target.value); setSignupError(''); }} required disabled={isSigningUp} />
                      <Field type="password" placeholder="Confirm Password" value={signupConfirmPassword} onChange={(e) => { setSignupConfirmPassword(e.target.value); setSignupError(''); }} required disabled={isSigningUp} />
                    </div>

                    {signupError && <span className="mt-2 self-stretch text-sm font-medium text-rose-600">{signupError}</span>}

                    <button type="submit" className="mt-7 inline-flex h-11 w-full items-center justify-center rounded-md bg-[#7c10b8] px-5 text-xs font-semibold tracking-[0.24em] text-white shadow-[0_10px_24px_rgba(124,16,184,0.35)] transition duration-500 hover:-translate-y-0.5 hover:bg-[#6d0fa2] disabled:cursor-not-allowed disabled:opacity-70 sm:w-48" disabled={isSigningUp}>
                      {isSigningUp ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                          SUBMITTING...
                        </span>
                      ) : 'CREATE ACCOUNT'}
                    </button>

                    <p className="mt-8 text-sm text-slate-500">
                      Already have an account?{' '}
                      <button type="button" onClick={() => setIsLogin(true)} className="font-semibold text-[#7c10b8] hover:underline">
                        Sign In
                      </button>
                    </p>
                  </form>
                )}
              </div>
            </section>

            <section className="auth-panel relative hidden items-center justify-center overflow-hidden px-5 py-7 sm:px-8 sm:py-9 lg:px-16 xl:flex xl:min-h-172.5 bg-[linear-gradient(135deg,#8e09c6_0%,#7607b0_45%,#5a0b92_100%)]">
              <div className="flex max-w-95 flex-col items-center text-center text-white">
                <h2 className="mb-4 text-[2.35rem] font-semibold leading-none tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.12)]">QueryMe</h2>
                <p className="max-w-sm text-sm leading-6 text-white/70">
                  A high-performance SQL examination platform. All user accounts are managed by institutional administrators. 
                  If you don't have an account, please contact your department head.
                </p>
                <div className="mt-8 h-1 w-20 rounded-full bg-white/30" />
              </div>
            </section>
          </div>

          <div className="pointer-events-none absolute inset-0 rounded-[26px] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]" />
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
