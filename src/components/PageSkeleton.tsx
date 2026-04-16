import React from 'react';

interface PageSkeletonProps {
  title?: string;
  showStats?: boolean;
  rows?: number;
}

const pulseClass = 'animate-pulse rounded-xl bg-slate-300/60';

export const PageSkeleton: React.FC<PageSkeletonProps> = ({
  title,
  showStats = true,
  rows = 4,
}) => {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      {title ? (
        <div className="space-y-2">
          <h1 className="m-0 text-3xl font-semibold tracking-tight text-slate-800">{title}</h1>
          <div className={`${pulseClass} h-4 w-72`} />
        </div>
      ) : (
        <div className="space-y-2">
          <div className={`${pulseClass} h-8 w-64`} />
          <div className={`${pulseClass} h-4 w-72`} />
        </div>
      )}

      {showStats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className={`${pulseClass} h-8 w-16`} />
              <div className={`${pulseClass} mt-3 h-3 w-28`} />
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className={`${pulseClass} h-5 w-40`} />
        <div className="mt-4 space-y-3">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className={`${pulseClass} h-11 w-full`} />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading content</span>
    </div>
  );
};

export const InlineSkeleton: React.FC<{ rows?: number; className?: string }> = ({ rows = 3, className = '' }) => {
  return (
    <div className={`space-y-3 p-4 ${className}`.trim()} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className={`${pulseClass} h-10 w-full`} />
      ))}
      <span className="sr-only">Loading content</span>
    </div>
  );
};
