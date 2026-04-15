import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts';
import logoImg from '../../assets/logo.png';
import { clearRememberedEmail, getRememberedEmail, setRememberedEmail } from '../../utils/authStorage';
import { extractErrorMessage } from '../../utils/errorUtils';
import { AUTH_PAGE_TW } from '../../theme/twStyles';

const ROLE_REDIRECTS: Record<string, string> = {
  ADMIN: '/admin',
  TEACHER: '/teacher',
  STUDENT: '/student',
  GUEST: '/guest',
};

const AuthPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const { isAuthenticated, user, login, signup } = useAuth();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Check for remembered email on mount
  useEffect(() => {
    const savedEmail = getRememberedEmail();
    if (savedEmail) {
      setLoginEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

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
    <div className={AUTH_PAGE_TW}>
      <div className={`auth-container ${isSignUp ? 'active' : ''}`} id="auth-container">

        <div className="auth-form-container auth-signup">
          <form onSubmit={handleSignup}>
            <div style={{ marginBottom: 24, textAlign: 'center' }}>
              <img src={logoImg} alt="QueryMe Logo" style={{ width: 240, height: 75, objectFit: 'contain' }} />
            </div>
            <h1 className="auth-title">Create Account</h1>

            <input type="text" placeholder="Name" value={signupName} onChange={(e) => setSignupName(e.target.value)} id="signup-name-input" autoComplete="name" disabled={isSigningUp} />
            <input type="email" placeholder="Email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} id="signup-email-input" autoComplete="email" disabled={isSigningUp} />
            <input type="password" placeholder="Password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} id="signup-password-input" autoComplete="new-password" disabled={isSigningUp} />
            <div className="auth-select-wrapper">
              <div className="auth-select" id="signup-role-select" aria-disabled="true">
                Student Account
              </div>
              <span className="auth-select-arrow">Locked</span>
            </div>
            <div className="auth-demo-label" style={{ marginBottom: 12 }}>
              Public signup is limited to student accounts. Teacher, admin, and guest access are provisioned separately.
            </div>

            {signupError && <span className="auth-error">{signupError}</span>}

            <button type="submit" className="auth-btn" id="signup-submit-btn" disabled={isSigningUp}>
              {isSigningUp ? (
                <span className="auth-btn-content">
                  <span className="auth-spinner" aria-hidden="true" />
                  Signing up...
                </span>
              ) : 'SIGN UP'}
            </button>
          </form>
        </div>

        {/* ========== Sign In Form ========== */}
        <div className="auth-form-container auth-signin">
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 32, textAlign: 'center' }}>
              <img src={logoImg} alt="QueryMe Logo" style={{ width: 340, height: 120, objectFit: 'contain' }} />
            </div>
            <h1 className="auth-title">Sign In</h1>

            <input type="text" placeholder="Email" value={loginEmail} onChange={(e) => { setLoginEmail(e.target.value); setLoginError(''); }} id="signin-email-input" autoComplete="email" disabled={isSigningIn} />
            <input type="password" placeholder="Password" value={loginPassword} onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }} id="signin-password-input" autoComplete="current-password" disabled={isSigningIn} />

            {loginError && <span className="auth-error">{loginError}</span>}

            <div className="auth-options-row">
              <label className="auth-remember-me">
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)} 
                  id="remember-me-checkbox"
                  disabled={isSigningIn}
                />
                <span className="checkmark"></span>
                Remember Me
              </label>
              <a href="#" className="auth-forgot-link" id="forgot-password-link">Forget Your Password?</a>
            </div>

            <button type="submit" className="auth-btn" id="signin-submit-btn" disabled={isSigningIn}>
              {isSigningIn ? (
                <span className="auth-btn-content">
                  <span className="auth-spinner" aria-hidden="true" />
                  Signing in...
                </span>
              ) : 'SIGN IN'}
            </button>
          </form>
        </div>

        {/* ========== Overlay / Toggle Panel ========== */}
        <div className="auth-toggle-container">
          <div className="auth-toggle">
            <div className="auth-toggle-panel auth-toggle-left">
              <h1>Welcome Back!</h1>
              <p>Enter your personal details to use all of site features</p>
              <button className="auth-toggle-btn" id="switch-to-signin-btn" onClick={() => setIsSignUp(false)} disabled={isSigningIn || isSigningUp}>SIGN IN</button>
            </div>
            <div className="auth-toggle-panel auth-toggle-right">
              <h1>Hello, Friend!</h1>
              <p>Register with your personal details to use all of site features</p>
              <button className="auth-toggle-btn" id="switch-to-signup-btn" onClick={() => setIsSignUp(true)} disabled={isSigningIn || isSigningUp}>SIGN UP</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AuthPage;
