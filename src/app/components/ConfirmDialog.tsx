import { type ReactNode } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <>
      <div
        onClick={onCancel}
        style={{
          position: "fixed", inset: 0,
          backgroundColor: "rgba(0,0,0,0.4)",
          zIndex: 9998,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: 420, backgroundColor: "#fff",
          borderRadius: 16, zIndex: 9999,
          padding: 28,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <h3
          id="confirm-dialog-title"
          style={{ fontSize: 17, fontWeight: 700, color: "#1E293B", margin: "0 0 10px 0" }}
        >
          {title}
        </h3>
        <p style={{ fontSize: 14, color: "#64748B", margin: "0 0 24px 0", lineHeight: 1.6 }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, height: 42,
              backgroundColor: "#fff", color: "#64748B",
              border: "1.5px solid #E2E8F0", borderRadius: 8,
              fontSize: 14, cursor: "pointer", fontWeight: 500,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, height: 42,
              backgroundColor: destructive ? "#DC2626" : "#16A34A",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}

interface AlertDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  onClose: () => void;
}

export function AlertDialog({ open, title, message, onClose }: AlertDialogProps) {
  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          backgroundColor: "rgba(0,0,0,0.4)",
          zIndex: 9998,
        }}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-dialog-title"
        style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: 380, backgroundColor: "#fff",
          borderRadius: 16, zIndex: 9999,
          padding: 28,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <h3
          id="alert-dialog-title"
          style={{ fontSize: 17, fontWeight: 700, color: "#1E293B", margin: "0 0 10px 0" }}
        >
          {title}
        </h3>
        <p style={{ fontSize: 14, color: "#64748B", margin: "0 0 24px 0", lineHeight: 1.6 }}>
          {message}
        </p>
        <button
          onClick={onClose}
          style={{
            width: "100%", height: 42,
            backgroundColor: "#16A34A", color: "#fff",
            border: "none", borderRadius: 8,
            fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}
        >
          OK
        </button>
      </div>
    </>
  );
}
