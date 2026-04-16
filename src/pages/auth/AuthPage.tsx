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

const panelButtonBase = 'inline-flex items-center justify-center rounded-full border border-white/70 bg-white/10 px-8 py-2.5 text-xs font-semibold tracking-[0.24em] text-white backdrop-blur-sm transition duration-500 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60';

const inputBase = 'h-11 w-full rounded-lg border border-[#ddd8ec] bg-white px-4 text-sm font-medium text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#7c10b8]/35 focus:ring-2 focus:ring-[#7c10b8]/10';
const formMotion = 'transition-[opacity,transform] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]';
const rememberedEmail = getRememberedEmail();

const Field: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`${inputBase} ${props.className ?? ''}`}
  />
);

const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <div className="relative">
    <select
      {...props}
      className={`${inputBase} appearance-none pr-10 ${props.className ?? ''}`}
    >
      {props.children}
    </select>
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
    >
      <path d="M5.25 7.5 10 12.25 14.75 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  </div>
);

const AuthPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const { isAuthenticated, user, login, signup } = useAuth();

  // Login form state
  const [loginEmail, setLoginEmail] = useState(() => rememberedEmail || '');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => Boolean(rememberedEmail));
  const [loginError, setLoginError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupError, setSignupError] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  if (isAuthenticated && user) {
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
    setIsSigningUp(true);

    try {
      await signup(signupName, signupEmail, signupPassword);
    } catch (error) {
      setSignupError(extractErrorMessage(error, 'Signup failed. Please try again.'));
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <div className="auth-page min-h-screen bg-[linear-gradient(180deg,#e8e5f2_0%,#d8d8ea_100%)] px-3 py-3 text-left sm:px-6 sm:py-6 lg:px-8">
      <div className="auth-shell mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-310 items-center justify-center sm:min-h-[calc(100vh-3rem)]">
        <div className="auth-card relative w-full min-h-[calc(100vh-1.5rem)] overflow-hidden rounded-2xl shadow-[0_28px_90px_rgba(92,70,140,0.28)] ring-1 ring-white/70 sm:rounded-[26px] xl:min-h-172.5">
          <div className="auth-grid grid min-h-[calc(100vh-1.5rem)] grid-cols-1 xl:min-h-172.5 xl:grid-cols-2">
            <section className={`${isSignUp ? 'hidden xl:flex' : 'flex'} auth-panel relative min-h-full items-center justify-center overflow-hidden px-5 py-7 sm:px-8 sm:py-9 lg:px-16 xl:min-h-172.5 ${isSignUp ? 'bg-[linear-gradient(135deg,#8e09c6_0%,#7607b0_45%,#5a0b92_100%)]' : 'bg-white'}`}>
              <div className={`absolute inset-0 flex items-center justify-center px-6 py-10 sm:px-10 lg:px-16 ${formMotion} ${isSignUp ? 'pointer-events-none translate-x-6 opacity-0 delay-100' : 'translate-x-0 opacity-100 delay-0'}`}>
                <form onSubmit={handleLogin} className="flex w-full max-w-90 flex-col items-center text-center">
                  <img src={logoImg} alt="QueryMe Logo" className="mb-6 h-12 w-auto object-contain sm:mb-9 sm:h-16" />
                  <h1 className="mb-6 text-[2rem] font-semibold leading-none tracking-tight text-[#30313a] sm:mb-7 sm:text-[2.25rem]">Sign In</h1>

                  <div className="w-full space-y-2.5">
                    <Field type="email" placeholder="admin@agrip2p.rw" value={loginEmail} onChange={(e) => { setLoginEmail(e.target.value); setLoginError(''); }} id="signin-email-input" autoComplete="email" disabled={isSigningIn} />
                    <Field type="password" placeholder="•••••••" value={loginPassword} onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }} id="signin-password-input" autoComplete="current-password" disabled={isSigningIn} />
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

                  <button
                    type="button"
                    className="mt-4 text-sm font-medium text-slate-500 transition hover:text-slate-700 xl:hidden"
                    onClick={() => setIsSignUp(true)}
                    disabled={isSigningIn || isSigningUp}
                  >
                    Need an account? Sign up
                  </button>
                </form>
              </div>

              <div className={`absolute inset-0 flex items-center justify-center px-6 py-10 sm:px-10 lg:px-16 ${formMotion} ${isSignUp ? 'opacity-100 translate-x-0 delay-0' : 'pointer-events-none translate-x-6 opacity-0 delay-100'}`}>
                <div className="flex max-w-95 flex-col items-center text-center text-white">
                  <h2 className="mb-4 text-[2.35rem] font-semibold leading-none tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.12)]">Welcome Back!</h2>
                  <p className="max-w-sm text-sm leading-6 text-white/70">Enter your personal details to use all of site features</p>
                  <button type="button" className={`${panelButtonBase} mt-8`} id="switch-to-signin-btn" onClick={() => setIsSignUp(false)} disabled={isSigningIn || isSigningUp}>
                    SIGN IN
                  </button>
                </div>
              </div>
            </section>

            <section className={`${isSignUp ? 'flex' : 'hidden xl:flex'} auth-panel relative min-h-full items-center justify-center overflow-hidden px-5 py-7 sm:px-8 sm:py-9 lg:px-16 xl:min-h-172.5 ${isSignUp ? 'bg-white' : 'bg-[linear-gradient(135deg,#8e09c6_0%,#7607b0_45%,#5a0b92_100%)]'}`}>
              <div className={`absolute inset-0 flex items-center justify-center px-6 py-10 sm:px-10 lg:px-16 ${formMotion} ${isSignUp ? 'opacity-100 translate-x-0 delay-0' : 'pointer-events-none translate-x-6 opacity-0 delay-100'}`}>
                <form onSubmit={handleSignup} className="flex w-full max-w-90 flex-col items-center text-center">
                  <img src={logoImg} alt="QueryMe Logo" className="mb-6 h-12 w-auto object-contain opacity-95 sm:mb-8 sm:h-16" />
                  <h1 className="text-[2rem] font-semibold leading-none tracking-tight text-[#30313a] sm:text-[2.45rem]">Create Account</h1>

                  <div className="mt-8 w-full space-y-2.5">
                    <Field type="text" placeholder="Name" value={signupName} onChange={(e) => setSignupName(e.target.value)} id="signup-name-input" autoComplete="name" disabled={isSigningUp} />
                    <Field type="email" placeholder="Email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} id="signup-email-input" autoComplete="email" disabled={isSigningUp} />
                    <Field type="password" placeholder="Password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} id="signup-password-input" autoComplete="new-password" disabled={isSigningUp} />
                    <SelectField id="signup-role-select" defaultValue="student" disabled>
                      <option value="student">Student</option>
                    </SelectField>
                  </div>

                  {signupError && <span className="mt-2 self-stretch text-sm font-medium text-rose-600">{signupError}</span>}

                  <button type="submit" className="mt-7 inline-flex h-11 w-full items-center justify-center rounded-md bg-[#7c10b8] px-5 text-xs font-semibold tracking-[0.24em] text-white shadow-[0_10px_24px_rgba(47,11,72,0.24)] transition duration-500 hover:-translate-y-0.5 hover:bg-[#6d0fa2] disabled:cursor-not-allowed disabled:opacity-70 sm:w-40" id="signup-submit-btn" disabled={isSigningUp}>
                    {isSigningUp ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                        SIGNING UP...
                      </span>
                    ) : 'SIGN UP'}
                  </button>

                  <button
                    type="button"
                    className="mt-4 text-sm font-medium text-slate-500 transition hover:text-slate-700 xl:hidden"
                    onClick={() => setIsSignUp(false)}
                    disabled={isSigningIn || isSigningUp}
                  >
                    Already have an account? Sign in
                  </button>
                </form>
              </div>

              <div className={`absolute inset-0 flex items-center justify-center px-6 py-10 sm:px-10 lg:px-16 ${formMotion} ${isSignUp ? 'pointer-events-none translate-x-6 opacity-0 delay-100' : 'opacity-100 translate-x-0 delay-0'}`}>
                <div className="flex max-w-95 flex-col items-center text-center text-white">
                  <h2 className="mb-4 text-[2.35rem] font-semibold leading-none tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.12)]">Hello, Friend!</h2>
                  <p className="max-w-sm text-sm leading-6 text-white/70">Register with your personal details to use all of site features</p>
                  <button type="button" className={`${panelButtonBase} mt-8`} id="switch-to-signup-btn" onClick={() => setIsSignUp(true)} disabled={isSigningIn || isSigningUp}>
                    SIGN UP
                  </button>
                </div>
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
