import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

interface ToastItem {
  id: number;
  message: string;
  tone: "success" | "error" | "info";
}

const ToastContext = createContext<{ showToast: (message: string, tone?: ToastItem["tone"]) => void }>({
  showToast: () => undefined,
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, tone: ToastItem["tone"] = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={clsx(
                "animate-pop-in pointer-events-auto w-full max-w-xs rounded-2xl px-4 py-3 text-center text-sm font-bold shadow-card",
                toast.tone === "success" && "bg-brand-600 text-white",
                toast.tone === "error" && "bg-rose-500 text-white",
                toast.tone === "info" && "bg-white text-brand-700"
              )}
            >
              {toast.message}
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
