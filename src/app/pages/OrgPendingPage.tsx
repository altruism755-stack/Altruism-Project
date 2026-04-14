import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { Navbar } from "../components/Navbar";

const GREEN = "#16A34A";

export function OrgPendingPage() {
  const navigate = useNavigate();
  const { orgStatus, profile, logout } = useAuth();

  const isRejected = orgStatus === "rejected";
  const orgName = profile?.name || "Your organization";

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="org" userName={orgName} />

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div style={{ maxWidth: 560, backgroundColor: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", padding: 48, textAlign: "center" }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%", margin: "0 auto 20px",
            backgroundColor: isRejected ? "#FEE2E2" : "#FEF3C7",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 32 }}>{isRejected ? "✕" : "⏳"}</span>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1E293B", margin: "0 0 12px 0" }}>
            {isRejected ? "Registration Rejected" : "Pending Platform Review"}
          </h1>

          <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6, margin: "0 0 24px 0" }}>
            {isRejected ? (
              <>
                Unfortunately, <strong>{orgName}</strong>'s registration was not approved.
                {profile?.rejection_reason && (
                  <>
                    <br /><br />
                    <strong>Reason:</strong> {profile.rejection_reason}
                  </>
                )}
                <br /><br />
                Please contact platform support for more information.
              </>
            ) : (
              <>
                Thanks for registering <strong>{orgName}</strong>. Our platform admins are
                reviewing the information you provided. You'll receive full dashboard access
                once approved — typically within 1-2 business days.
              </>
            )}
          </p>

          <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 16, textAlign: "left", marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              What's next?
            </div>
            <ul style={{ fontSize: 13, color: "#475569", lineHeight: 1.7, margin: 0, paddingLeft: 20 }}>
              <li>Platform admins verify your organization details and documents</li>
              <li>Once approved, you can log in and access your full dashboard</li>
              <li>You'll be able to manage volunteers, supervisors, and activities</li>
              <li>Optionally import existing data via CSV upload</li>
            </ul>
          </div>

          <div className="flex gap-3" style={{ justifyContent: "center" }}>
            <button
              onClick={() => { logout(); navigate("/"); }}
              style={{
                height: 40, padding: "0 20px", backgroundColor: "transparent",
                color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8,
                fontSize: 14, fontWeight: 500, cursor: "pointer",
              }}
            >
              Log out
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                height: 40, padding: "0 20px", backgroundColor: GREEN,
                color: "#fff", border: "none", borderRadius: 8,
                fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              Check Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
