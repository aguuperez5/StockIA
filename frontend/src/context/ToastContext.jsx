import React, { createContext, useCallback, useContext, useState } from "react";
import { CircleCheck, CircleAlert, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const icons = { success: CircleCheck, error: CircleAlert, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((message, tone = "success", timeout = 4200) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, tone }]);
    if (timeout) setTimeout(() => remove(id), timeout);
    return id;
  }, [remove]);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="toast-stack">
        {toasts.map(t => {
          const Icon = icons[t.tone] || Info;
          return (
            <div className={`toast toast-${t.tone}`} key={t.id}>
              <Icon size={16} />
              <span>{t.message}</span>
              <button onClick={() => remove(t.id)}><X size={13} /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}
