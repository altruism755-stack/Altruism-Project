/** Unified status badge used across all dashboards. */

type Status =
  | "Pending" | "Active" | "Approved" | "Rejected" | "Completed"
  | "Upcoming" | "Ongoing" | "pending" | "active" | "approved"
  | "rejected" | "completed" | "upcoming";

const STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  pending:   { bg: "#FEF3C7", text: "#B45309",  dot: "#F59E0B" },
  active:    { bg: "#DCFCE7", text: "#15803D",  dot: "#16A34A" },
  approved:  { bg: "#DCFCE7", text: "#15803D",  dot: "#16A34A" },
  rejected:  { bg: "#FEE2E2", text: "#B91C1C",  dot: "#DC2626" },
  completed: { bg: "#F1F5F9", text: "#475569",  dot: "#94A3B8" },
  upcoming:  { bg: "#DBEAFE", text: "#1D4ED8",  dot: "#2563EB" },
  ongoing:   { bg: "#FEF3C7", text: "#B45309",  dot: "#F59E0B" },
};

const LABEL: Record<string, string> = {
  active: "Active", approved: "Approved", pending: "Pending",
  rejected: "Rejected", completed: "Completed", upcoming: "Upcoming",
  ongoing: "Ongoing",
};

interface StatusPillProps {
  status: Status | string;
  size?: "sm" | "md";
  dot?: boolean;
}

export function StatusPill({ status, size = "sm", dot = false }: StatusPillProps) {
  const key = status.toLowerCase();
  const s = STYLE[key] || { bg: "#F1F5F9", text: "#475569", dot: "#94A3B8" };
  const label = LABEL[key] || status;
  const fs = size === "sm" ? 11 : 13;
  const pad = size === "sm" ? "3px 10px" : "5px 14px";

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      backgroundColor: s.bg, color: s.text,
      fontSize: fs, fontWeight: 600, borderRadius: 20, padding: pad,
      lineHeight: 1, whiteSpace: "nowrap",
    }}>
      {dot && (
        <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: s.dot, flexShrink: 0 }} />
      )}
      {label}
    </span>
  );
}


export interface LifecycleStep {
  label: string;
  status: "done" | "active" | "pending";
  icon?: string;
  tooltip?: string;
  onClick?: () => void;
}

interface LifecycleStepperProps {
  steps: LifecycleStep[];
  stuckMsg?: string;
}

export function LifecycleStepper({ steps, stuckMsg }: LifecycleStepperProps) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", padding: "12px 0" }}>
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          const isClickable = !!step.onClick;
          const dotColor =
            step.status === "done"   ? "#16A34A" :
            step.status === "active" ? "#2563EB" : "#CBD5E1";
          const labelColor =
            step.status === "done"   ? "#15803D" :
            step.status === "active" ? "#1D4ED8" : "#94A3B8";
          const lineColor = step.status === "done" ? "#86EFAC" : "#E2E8F0";

          return (
            <div key={idx} style={{ display: "flex", alignItems: "center", flex: isLast ? "0 0 auto" : 1, minWidth: 0 }}>
              <div
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0, cursor: isClickable ? "pointer" : "default" }}
                onClick={step.onClick}
                title={step.tooltip}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  backgroundColor: step.status === "done" ? "#DCFCE7" : step.status === "active" ? "#DBEAFE" : "#F1F5F9",
                  border: `2px solid ${dotColor}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12,
                  boxShadow: step.status === "active" ? "0 0 0 4px rgba(37,99,235,0.12)" : "none",
                  transition: "transform 140ms",
                }}>
                  {step.status === "done" ? "✓" : step.icon || (idx + 1)}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: step.status === "active" ? 700 : 500,
                  color: labelColor, whiteSpace: "nowrap", maxWidth: 72,
                  textAlign: "center", lineHeight: 1.3,
                  textDecoration: isClickable ? "underline" : "none",
                  textDecorationStyle: "dotted" as const,
                  textDecorationColor: labelColor,
                }}>
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div style={{ flex: 1, height: 2, backgroundColor: lineColor, margin: "0 4px", marginBottom: 14 }} />
              )}
            </div>
          );
        })}
      </div>
      {stuckMsg && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 11, color: "#1D4ED8", backgroundColor: "#EFF6FF",
          border: "1px solid #BFDBFE", borderRadius: 6,
          padding: "4px 10px", marginTop: 2,
        }}>
          <span>👉</span>
          <span>{stuckMsg}</span>
        </div>
      )}
    </div>
  );
}

/** Compact dot-only stepper for use inside cards. Labels appear as tooltips. */
export function MiniLifecycleStepper({ steps }: { steps: Pick<LifecycleStep, "label" | "status" | "tooltip" | "onClick">[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        const dotColor =
          step.status === "done"   ? "#16A34A" :
          step.status === "active" ? "#2563EB" : "#CBD5E1";
        const lineColor = step.status === "done" ? "#86EFAC" : "#E2E8F0";
        const isClickable = !!step.onClick;
        return (
          <div key={idx} style={{ display: "flex", alignItems: "center", flex: isLast ? "0 0 auto" : 1 }}>
            <div
              style={{
                width: 18, height: 18, borderRadius: "50%",
                backgroundColor: step.status === "done" ? "#DCFCE7" : step.status === "active" ? "#DBEAFE" : "#F1F5F9",
                border: `2px solid ${dotColor}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, flexShrink: 0,
                cursor: isClickable ? "pointer" : "default",
                boxShadow: step.status === "active" ? "0 0 0 3px rgba(37,99,235,0.12)" : "none",
              }}
              title={step.tooltip || step.label}
              onClick={step.onClick}
            >
              {step.status === "done" && <span style={{ fontSize: 8, color: "#16A34A" }}>✓</span>}
            </div>
            {!isLast && (
              <div style={{ flex: 1, height: 2, backgroundColor: lineColor, minWidth: 10, maxWidth: 24 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
