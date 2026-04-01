import React from 'react';
import { Link } from 'react-router-dom';

const GuestNavbar: React.FC = () => {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link to="/guest" className="flex items-center space-x-2">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                QueryMe
              </span>
            </Link>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
            <Link
              to="/guest"
              className="text-gray-900 border-transparent hover:text-blue-600 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
            >
              Home
            </Link>
            <Link
              to="/guest/browse"
              className="text-gray-900 border-transparent hover:text-blue-600 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
            >
              Browsing Exams
            </Link>
          </div>
          <div className="sm:hidden">
            {/* Mobile menu button could be added here if needed */}
          </div>
        </div>
      </div>
    </nav>
  );
};

const GuestBanner: React.FC = () => {
  return (
    <div className="bg-blue-50 border-b border-blue-100 py-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center space-x-2">
        <svg
          className="h-5 w-5 text-blue-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <p className="text-sm font-medium text-blue-700">
          Guest Mode: You can only preview exams
        </p>
      </div>
    </div>
  );
};

export { GuestNavbar, GuestBanner };
