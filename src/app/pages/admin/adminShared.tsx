import type { CSSProperties, ReactNode } from "react";

export const GREEN = "#16A34A";
export const NAV = "#0F172A";

export function btnStyle(bg: string, color: string, border?: string): CSSProperties {
  return {
    height: 34,
    padding: "0 14px",
    backgroundColor: bg,
    color,
    border: border ?? "none",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: "center", padding: 48, color: "#94A3B8", backgroundColor: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 14 }}>
      {message}
    </div>
  );
}

type BadgeVariant = "pending" | "approved" | "rejected" | "Active" | "Pending" | "Suspended";

const BADGE_MAP: Record<BadgeVariant, { bg: string; color: string; label: string }> = {
  pending:   { bg: "#FEF3C7", color: "#B45309", label: "Pending" },
  approved:  { bg: "#DCFCE7", color: "#15803D", label: "Approved" },
  rejected:  { bg: "#FEE2E2", color: "#B91C1C", label: "Rejected" },
  Active:    { bg: "#DCFCE7", color: "#15803D", label: "Active" },
  Pending:   { bg: "#FEF3C7", color: "#B45309", label: "Pending" },
  Suspended: { bg: "#FEE2E2", color: "#B91C1C", label: "Suspended" },
};

export function Badge({ status }: { status: string }) {
  const s = BADGE_MAP[status as BadgeVariant] ?? BADGE_MAP.pending;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: s.bg, color: s.color, borderRadius: 4, padding: "2px 8px", textTransform: "capitalize" }}>
      {s.label}
    </span>
  );
}

export function Detail({ label, value, multiline, link }: { label: string; value: any; multiline?: boolean; link?: boolean }) {
  if (!value) return null;
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
      {link ? (
        <a href={value} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: GREEN, wordBreak: "break-all" }}>{value}</a>
      ) : (
        <div style={{ fontSize: 13, color: "#1E293B", lineHeight: multiline ? 1.6 : 1.4, whiteSpace: multiline ? "pre-wrap" : "normal" }}>{value}</div>
      )}
    </div>
  );
}

export function ConfirmModal({
  title,
  description,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  danger = false,
}: {
  title: string;
  description: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <>
      <div onClick={onCancel} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.4)", zIndex: 60 }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 420, backgroundColor: "#fff", borderRadius: 16, zIndex: 61, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
      >
        <h3 id="confirm-modal-title" style={{ fontSize: 17, fontWeight: 600, color: "#1E293B", margin: "0 0 8px 0" }}>{title}</h3>
        <div style={{ fontSize: 13, color: "#64748B", margin: "0 0 24px 0" }}>{description}</div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onCancel} style={{ flex: 1, height: 40, backgroundColor: "#fff", color: "#64748B", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancel</button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, height: 40, backgroundColor: danger ? "#EF4444" : GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
