import { useEffect, useState } from "react";
import { getConnectionState, onConnectionChange } from "../config";

export function ConnectionBanner() {
  const [state, setState] = useState(getConnectionState());

  useEffect(() => onConnectionChange(setState), []);

  if (state === "online") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: "#FEF3C7",
        color: "#92400E",
        borderBottom: "1px solid #FCD34D",
        padding: "10px 16px",
        textAlign: "center",
        fontSize: 13,
        fontFamily: "Inter, system-ui, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 12,
          height: 12,
          border: "2px solid #92400E",
          borderTopColor: "transparent",
          borderRadius: "50%",
          animation: "altruism-spin 0.8s linear infinite",
          display: "inline-block",
        }}
      />
      <span>
        <strong style={{ fontWeight: 600 }}>Reconnecting to server…</strong>{" "}
        Some recent actions may not have been saved. Please retry them once the connection is restored.
      </span>
      <style>{`@keyframes altruism-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
