export function LegalModal({ type, onClose }: { type: "terms" | "privacy"; onClose: () => void }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={type === "terms" ? "Terms of Service" : "Privacy Policy"}
    >
      <div
        style={{ backgroundColor: "#FFFFFF", borderRadius: 14, padding: "32px 36px", maxWidth: 520, width: "100%", maxHeight: "80vh", overflowY: "auto", position: "relative", boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label="Close"
          style={{ position: "absolute", top: 16, right: 18, background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94A3B8", lineHeight: 1 }}>
          ×
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1E293B", margin: "0 0 20px 0" }}>
          {type === "terms" ? "Terms of Service" : "Privacy Policy"}
        </h2>
        {type === "terms" ? (
          <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.8 }}>
            <p style={{ marginBottom: 14 }}>By registering on Altruism, you agree to use the platform responsibly and in accordance with its purpose of facilitating community volunteerism.</p>
            <p style={{ marginBottom: 14 }}>You agree not to misrepresent your identity, qualifications, or availability. You commit to fulfilling volunteer obligations made through the platform to the best of your ability.</p>
            <p style={{ marginBottom: 14 }}>Altruism reserves the right to suspend or remove accounts that violate community guidelines, engage in fraudulent activity, or harm other users or organizations.</p>
            <p>These terms may be updated periodically. Continued use of the platform constitutes acceptance of the current terms.</p>
          </div>
        ) : (
          <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.8 }}>
            <p style={{ marginBottom: 14 }}>Altruism collects personal information you provide during registration — including your name, contact details, skills, and preferences — to match you with volunteering opportunities.</p>
            <p style={{ marginBottom: 14 }}>Your data is stored securely and is never sold to third parties. Organizations you apply to will be able to view relevant profile information to assess your suitability for their activities.</p>
            <p style={{ marginBottom: 14 }}>Sensitive fields such as your National ID are stored encrypted and are only accessible to authorized platform administrators for identity verification purposes.</p>
            <p>You may request the deletion of your account and all associated personal data at any time by contacting our support team.</p>
          </div>
        )}
        <button onClick={onClose}
          style={{ marginTop: 24, width: "100%", height: 42, backgroundColor: "#16A34A", color: "#FFFFFF", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          I understand
        </button>
      </div>
    </div>
  );
}

export function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 8, borderBottom: "1px solid #F1F5F9", paddingBottom: 6 }}>
      {children}
    </div>
  );
}
