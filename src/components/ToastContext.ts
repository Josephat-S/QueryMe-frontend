import { createContext, use } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ConfirmOpts {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

export interface ToastContextValue {
  showToast: (type: ToastType, title: string, message?: string) => void;
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
}

export const ToastCtx = createContext<ToastContextValue>({
  showToast: () => {},
  confirm: async () => false,
});

export const useToast = () => {
  const context = use(ToastCtx);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
};