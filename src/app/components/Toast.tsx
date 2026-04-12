import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const colors: Record<ToastType, { bg: string; border: string; text: string }> = {
    success: { bg: "#F0FDF4", border: "#16A34A", text: "#15803D" },
    error: { bg: "#FEF2F2", border: "#DC2626", text: "#991B1B" },
    info: { bg: "#EFF6FF", border: "#2563EB", text: "#1D4ED8" },
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: "fixed", top: 80, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map((t) => {
          const c = colors[t.type];
          return (
            <div
              key={t.id}
              style={{
                backgroundColor: c.bg,
                borderLeft: `4px solid ${c.border}`,
                color: c.text,
                padding: "12px 20px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                minWidth: 280,
                maxWidth: 420,
                animation: "slideIn 200ms ease-out",
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              {t.type === "success" && "✓ "}
              {t.type === "error" && "✕ "}
              {t.message}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
