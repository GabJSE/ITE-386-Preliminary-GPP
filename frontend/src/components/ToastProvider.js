import React, { createContext, useContext, useCallback, useState, useRef, useEffect } from 'react';
import './Toast.css';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(1);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const show = useCallback((message, { type = 'info', duration = 4000 } = {}) => {
    const id = idRef.current++;
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) setTimeout(() => remove(id), duration);
    return id;
  }, [remove]);

  const api = {
    show,
    success: (msg, opts) => show(msg, { ...(opts||{}), type: 'success' }),
    error: (msg, opts) => show(msg, { ...(opts||{}), type: 'error' }),
    info: (msg, opts) => show(msg, { ...(opts||{}), type: 'info' }),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="wc-toast-root" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`wc-toast ${t.type}`} role="status">
            <div className="wc-toast-message">{t.message}</div>
            <button className="wc-toast-close" onClick={() => remove(t.id)} aria-label="Dismiss">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export default ToastProvider;
