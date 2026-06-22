import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { TOAST_DURATION_MS } from '../../constants/config';

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), TOAST_DURATION_MS);
    return () => clearTimeout(t);
  }, [message]);

  const showToast = useCallback((msg: string) => setMessage(msg), []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message ? (
        <div role="status" aria-live="polite" className="fixed bottom-[max(2rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[250] px-5 py-3 rounded-full bg-on-surface text-surface text-sm shadow-lg max-w-[90vw] text-center">
          {message}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
};
