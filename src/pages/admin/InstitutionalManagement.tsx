import React from 'react';

const InstitutionalManagement: React.FC = () => {
  return (
    <div className="admin-page p-6 space-y-6">
      <div className="page-header">
        <h1 className="text-3xl font-bold">Institutional Management</h1>
        <p className="text-slate-500">Manage Colleges, Departments, and Programs.</p>
      </div>

      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
        <div className="h-16 w-16 bg-violet-50 rounded-full flex items-center justify-center mb-6">
          <svg className="h-8 w-8 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Coming Soon</h2>
        <p className="text-slate-500 max-w-sm text-center px-6">
          Institutional management tools for colleges, departments, and programs are currently under development and will be available in a future update.
        </p>
      </div>
    </div>
  );
};

export default InstitutionalManagement;
