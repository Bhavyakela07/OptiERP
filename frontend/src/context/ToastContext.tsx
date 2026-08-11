import React, { useState } from 'react';
import { CheckCircleIcon, CrossIcon, AlertTriangleIcon } from '../components/Icons';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

const ToastContext = React.createContext<{
  show: (message: string, type?: Toast['type']) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = (message: string, type: Toast['type'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type === 'error' ? 'danger' : t.type}`}>
            {t.type === 'success' && <CheckCircleIcon size={18} color="var(--status-success)" />}
            {t.type === 'error' && <CrossIcon size={18} color="var(--status-danger)" />}
            {t.type === 'warning' && <AlertTriangleIcon size={18} color="var(--status-warning)" />}
            {t.type === 'info' && <AlertTriangleIcon size={18} color="var(--status-info)" />}
            <span style={{ flex: 1 }}>{t.message}</span>
            <div className="toast-progress" />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
