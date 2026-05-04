import { useNavigate } from "react-router";

export type ActionPriority = "urgent" | "normal" | "info" | "success" | "muted";

export interface WorkflowAction {
  priority: ActionPriority;
  icon: string;
  title: string;
  desc: string;
  cta: string;
  badge?: number;
  href?: string;
  onClick?: () => void;
}

const PRIORITY_STYLE: Record<ActionPriority, {
  border: string; band: string; bg: string;
  titleColor: string; btnBg: string; btnColor: string;
}> = {
  urgent:  { border: "#FDE68A", band: "#F59E0B", bg: "#FFFBEB", titleColor: "#B45309", btnBg: "#F59E0B",  btnColor: "#fff" },
  normal:  { border: "#BFDBFE", band: "#2563EB", bg: "#EFF6FF", titleColor: "#1D4ED8", btnBg: "#2563EB",  btnColor: "#fff" },
  info:    { border: "#A5F3FC", band: "#0891B2", bg: "#F0FDFF", titleColor: "#0E7490", btnBg: "#0891B2",  btnColor: "#fff" },
  success: { border: "#BBF7D0", band: "#16A34A", bg: "#F0FDF4", titleColor: "#15803D", btnBg: "#16A34A",  btnColor: "#fff" },
  muted:   { border: "#E2E8F0", band: "#94A3B8", bg: "#F8FAFC", titleColor: "#64748B", btnBg: "#64748B",  btnColor: "#fff" },
};

function ActionCard({ action }: { action: WorkflowAction }) {
  const navigate = useNavigate();
  const s = PRIORITY_STYLE[action.priority];

  const handleClick = () => {
    if (action.onClick) { action.onClick(); return; }
    if (action.href) navigate(action.href);
  };

  return (
    <div style={{
      backgroundColor: s.bg, border: `1px solid ${s.border}`,
      borderLeft: `4px solid ${s.band}`, borderRadius: 12,
      padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>{action.icon}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: s.titleColor }}>
            {action.title}
            {action.badge != null && action.badge > 0 && (
              <span style={{
                marginLeft: 8, display: "inline-flex", alignItems: "center", justifyContent: "center",
                minWidth: 20, height: 20, backgroundColor: s.band, color: "#fff",
                borderRadius: 10, fontSize: 11, fontWeight: 700, padding: "0 5px",
              }}>{action.badge}</span>
            )}
          </span>
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5 }}>{action.desc}</div>
      <button
        onClick={handleClick}
        style={{
          alignSelf: "flex-start", height: 30, padding: "0 14px",
          backgroundColor: s.btnBg, color: s.btnColor,
          border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600,
          cursor: "pointer", marginTop: 2,
          transition: "opacity 120ms",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        {action.cta} →
      </button>
    </div>
  );
}

interface WorkflowPanelProps {
  actions: WorkflowAction[];
  /** max columns to show side-by-side (default 3) */
  maxCols?: number;
  style?: React.CSSProperties;
}

export function WorkflowPanel({ actions, maxCols = 3, style }: WorkflowPanelProps) {
  if (!actions.length) return null;
  const cols = Math.min(actions.length, maxCols);
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 12,
      ...style,
    }}>
      {actions.slice(0, maxCols).map((a, i) => (
        <ActionCard key={i} action={a} />
      ))}
    </div>
  );
}
