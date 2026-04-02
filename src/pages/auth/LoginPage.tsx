import React, { useState } from 'react';
import logo from '../../assets/logo.png';

interface LoginPageProps {
  onSwitchToSignup: () => void;
  onLogin: (email: string, password: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToSignup, onLogin }) => {
  const [email, setEmail] = useState('AsmrProg');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="flex bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Left - Sign In Form */}
      <div className="w-full lg:w-3/5 p-12">
        <div className="flex justify-center mb-8">
          <img src={logo} alt="QueryMe Logo" className="h-24 w-auto" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Sign In</h2>
        
        <p className="text-gray-500 text-sm mb-8">Enter your email and password to sign in</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 transition"
              placeholder="Email"
            />
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 transition"
              placeholder="Password"
            />
          </div>

          <div className="text-right">
            <a href="#" className="text-blue-600 text-sm hover:underline">
              Forget Your Password?
            </a>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            SIGN IN
          </button>
        </form>
      </div>

      {/* Right - Hello Friend Section */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-blue-600 to-blue-700 relative overflow-hidden">
        {/* Curved shape overlay */}
        <svg className="absolute top-0 left-0 w-20 h-full" viewBox="0 0 80 800" preserveAspectRatio="none">
          <path d="M 0 0 Q 80 400 0 800 L 0 0" fill="white" />
        </svg>
        
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 text-center flex-1">
          <h2 className="text-4xl font-bold mb-4">Hello, Friend!</h2>
          <p className="mb-8 text-blue-50 max-w-xs">
            Register with your personal details to use all of site features
          </p>
          <button
            onClick={onSwitchToSignup}
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition border-2 border-white"
          >
            SIGN UP
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
