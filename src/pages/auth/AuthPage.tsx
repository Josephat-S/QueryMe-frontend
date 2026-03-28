import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts';
import type { UserRole } from '../../contexts';
import logoImg from '../../assets/logo.png';
import './AuthPage.css';

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
  const [loginError, setLoginError] = useState('');

  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupRole, setSignupRole] = useState<UserRole>('STUDENT');
  const [signupGuestDuration, setSignupGuestDuration] = useState('24');
  const [signupError, setSignupError] = useState('');
  const [guestSuccessMsg, setGuestSuccessMsg] = useState('');

  if (isAuthenticated && user) {
    const dest = ROLE_REDIRECTS[user.role] || '/student';
    return <Navigate to={dest} replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await login(loginEmail, loginPassword);
    } catch {
      setLoginError('Invalid email or password. Try the demo credentials below.');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');
    setGuestSuccessMsg('');

    if (signupRole === 'GUEST') {
      setGuestSuccessMsg(`Guest access request for ${signupGuestDuration} hours has been sent to the Admin!`);
      return;
    }

    try {
      await signup(signupName, signupEmail, signupPassword, signupRole);
    } catch {
      setSignupError('Signup failed. Please try again.');
    }
  };

  const fillDemoCredentials = (email: string, password: string) => {
    setLoginEmail(email);
    setLoginPassword(password);
    setLoginError('');
  };

  return (
    <div className="auth-page">
      <div className={`auth-container ${isSignUp ? 'active' : ''}`} id="auth-container">

        <div className="auth-form-container auth-signup">
          <form onSubmit={handleSignup}>
            <div style={{ marginBottom: 24, textAlign: 'center' }}>
              <img src={logoImg} alt="QueryMe Logo" style={{ width: 240, height: 75, objectFit: 'contain' }} />
            </div>
            <h1 className="auth-title">Create Account</h1>

            <input type="text" placeholder="Name" value={signupName} onChange={(e) => setSignupName(e.target.value)} id="signup-name-input" />
            <input type="email" placeholder="Email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} id="signup-email-input" />
            
            {signupRole !== 'GUEST' && (
              <input type="password" placeholder="Password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} id="signup-password-input" />
            )}

            {/* Role dropdown */}
            <div className="auth-select-wrapper">
              <select
                className="auth-select"
                value={signupRole}
                onChange={(e) => setSignupRole(e.target.value as UserRole)}
                id="signup-role-select"
              >
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
                <option value="ADMIN">Admin</option>
                <option value="GUEST">Guest</option>
              </select>
              <span className="auth-select-arrow">▾</span>
            </div>

            {signupRole === 'GUEST' && (
              <input 
                type="number" 
                placeholder="Requested Session Duration (Hours)" 
                value={signupGuestDuration} 
                onChange={(e) => setSignupGuestDuration(e.target.value)} 
                min="1" 
                max="720"
                style={{ marginTop: '-4px' }}
              />
            )}

            {signupError && <span className="auth-error">{signupError}</span>}
            {guestSuccessMsg && <span className="auth-error" style={{ color: '#38a169', background: 'rgba(56,161,105,0.1)' }}>{guestSuccessMsg}</span>}

            <button type="submit" className="auth-btn" id="signup-submit-btn">
              {signupRole === 'GUEST' ? 'REQUEST ACCESS' : 'SIGN UP'}
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

            <input type="text" placeholder="Email" value={loginEmail} onChange={(e) => { setLoginEmail(e.target.value); setLoginError(''); }} id="signin-email-input" />
            <input type="password" placeholder="Password" value={loginPassword} onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }} id="signin-password-input" />

            {loginError && <span className="auth-error">{loginError}</span>}

            <a href="#" className="auth-forgot-link" id="forgot-password-link">Forget Your Password?</a>

            <button type="submit" className="auth-btn" id="signin-submit-btn">SIGN IN</button>

            {/* Demo credentials quick-fill */}
            <div className="auth-demo-creds">
              <span className="auth-demo-label">Demo accounts:</span>
              <div className="auth-demo-buttons">
                <button type="button" className="auth-demo-btn" onClick={() => fillDemoCredentials('admin@queryme.com', 'admin123')}>Admin</button>
                <button type="button" className="auth-demo-btn" onClick={() => fillDemoCredentials('teacher@queryme.com', 'teacher123')}>Teacher</button>
                <button type="button" className="auth-demo-btn auth-demo-btn--active" onClick={() => fillDemoCredentials('student@queryme.com', 'student123')}>Student</button>
                <button type="button" className="auth-demo-btn" onClick={() => fillDemoCredentials('guest@queryme.com', 'guest123')}>Guest</button>
              </div>
            </div>
          </form>
        </div>

        {/* ========== Overlay / Toggle Panel ========== */}
        <div className="auth-toggle-container">
          <div className="auth-toggle">
            <div className="auth-toggle-panel auth-toggle-left">
              <h1>Welcome Back!</h1>
              <p>Enter your personal details to use all of site features</p>
              <button className="auth-toggle-btn" id="switch-to-signin-btn" onClick={() => setIsSignUp(false)}>SIGN IN</button>
            </div>
            <div className="auth-toggle-panel auth-toggle-right">
              <h1>Hello, Friend!</h1>
              <p>Register with your personal details to use all of site features</p>
              <button className="auth-toggle-btn" id="switch-to-signup-btn" onClick={() => setIsSignUp(true)}>SIGN UP</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AuthPage;
