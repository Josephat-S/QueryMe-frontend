import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

/* ─── Types ───────────────────────────────────────────────────── */
export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, message?: string) => void;
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
}

interface ConfirmOpts {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOpts {
  resolve: (v: boolean) => void;
}

/* ─── Context ─────────────────────────────────────────────────── */
const ToastCtx = createContext<ToastContextValue>({
  showToast: () => {},
  confirm: async () => false,
});

export const useToast = () => useContext(ToastCtx);

/* ─── Icons ───────────────────────────────────────────────────── */
const icons: Record<ToastType, React.ReactNode> = {
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  warning: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

const colors: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'rgba(56,161,105,0.12)', border: '#38a169', icon: '#38a169' },
  error:   { bg: 'rgba(229,62,62,0.12)',  border: '#e53e3e', icon: '#e53e3e' },
  warning: { bg: 'rgba(221,107,32,0.12)', border: '#dd6b20', icon: '#dd6b20' },
  info:    { bg: 'rgba(49,130,206,0.12)', border: '#3182ce', icon: '#3182ce' },
};

/* ─── Provider ────────────────────────────────────────────────── */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const counter = useRef(0);
  const isDarkMode = document.body.classList.contains('dark-mode');

  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = ++counter.current;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  const confirm = useCallback((opts: ConfirmOpts): Promise<boolean> => {
    return new Promise(resolve => {
      setConfirmState({ ...opts, resolve });
    });
  }, []);

  const handleConfirm = (val: boolean) => {
    confirmState?.resolve(val);
    setConfirmState(null);
  };

  return (
    <ToastCtx.Provider value={{ showToast, confirm }}>
      {children}

      {/* ── Toast Stack ── */}
      <div style={{
        position: 'fixed', bottom: '24px', right: '24px',
        zIndex: 99998, display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const c = colors[t.type];
          return (
            <div
              key={t.id}
              style={{
                pointerEvents: 'all',
                minWidth: '300px', maxWidth: '380px',
                background: 'var(--toast-bg, #fff)',
                border: `1px solid ${c.border}`,
                borderLeft: `4px solid ${c.border}`,
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex', gap: '12px', alignItems: 'flex-start',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                animation: 'toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              }}
            >
              <div style={{ color: c.icon, flexShrink: 0, marginTop: '1px' }}>{icons[t.type]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: t.message ? '2px' : 0 }}>{t.title}</div>
                {t.message && <div style={{ fontSize: '12px', opacity: 0.7 }}>{t.message}</div>}
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, padding: '0 2px', fontSize: '16px', lineHeight: 1 }}
              >✕</button>
            </div>
          );
        })}
      </div>

      {/* ── Confirm Modal ── */}
      {confirmState && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={() => handleConfirm(false)}
          role="presentation"
        >
          <div style={{
            background: isDarkMode ? '#1e293b' : '#fff',
            color: isDarkMode ? '#f8fafc' : '#1a1a2e',
            borderRadius: '20px',
            padding: '32px 28px',
            width: '420px', maxWidth: '92vw',
            boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
            animation: 'scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          }}
          onClick={(event) => event.stopPropagation()}
          >
            {/* Icon */}
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: confirmState.danger ? 'rgba(229,62,62,0.12)' : 'rgba(49,130,206,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '18px',
              color: confirmState.danger ? '#e53e3e' : '#3182ce',
            }}>
              {confirmState.danger ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </div>

            <h2 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#f8fafc' : '#1a1a2e' }}>{confirmState.title}</h2>
            <p style={{ margin: '0 0 28px', fontSize: '14px', opacity: 0.78, lineHeight: 1.6, color: isDarkMode ? '#cbd5e1' : '#475569' }}>{confirmState.message}</p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => handleConfirm(false)}
                style={{
                  padding: '10px 22px', borderRadius: '10px', border: '1px solid var(--cancel-border, #e2e8f0)',
                  background: isDarkMode ? '#0f172a' : 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
                  color: isDarkMode ? '#cbd5e1' : '#334155',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirm(true)}
                style={{
                  padding: '10px 22px', borderRadius: '10px', border: 'none',
                  background: confirmState.danger ? '#e53e3e' : '#6a3cb0',
                  color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '14px',
                  boxShadow: confirmState.danger ? '0 4px 14px rgba(229,62,62,0.4)' : '0 4px 14px rgba(106,60,176,0.4)',
                }}
              >
                {confirmState.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(40px) scale(0.9); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        body.dark-mode {
          --toast-bg: #1e293b;
          --cancel-border: #334155;
        }
      `}</style>
    </ToastCtx.Provider>
  );
};

export default ToastProvider;
