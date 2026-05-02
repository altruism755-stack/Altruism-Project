import { useNavigate } from "react-router";

interface BackButtonProps {
  to?: string;
  label?: string;
}

export function BackButton({ to, label = "Back" }: BackButtonProps) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => (to ? navigate(to) : navigate(-1))}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "none",
        border: "none",
        color: "#64748B",
        fontSize: 14,
        fontFamily: "Inter, system-ui, sans-serif",
        cursor: "pointer",
        padding: 0,
        marginBottom: 16,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#0F172A")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}
    >
      ← {label}
    </button>
  );
}
