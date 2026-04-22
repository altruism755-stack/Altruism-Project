import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { Navbar } from "../components/Navbar";

const GREEN = "#16A34A";
const GREEN_HOVER = "#15803D";

function formatDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function OrgPendingPage() {
  const navigate = useNavigate();
  const { orgStatus, profile } = useAuth();

  const isRejected = orgStatus === "rejected";
  const orgName = profile?.name || "Your organization";
  const submittedAt = formatDate(profile?.created_at || profile?.submitted_at);
  const rejectionReason = profile?.rejection_reason;
  const registrationId = profile?.id ? `#${String(profile.id).padStart(5, "0")}` : null;

  useEffect(() => {
    if (orgStatus === "approved") navigate("/org", { replace: true });
  }, [orgStatus, navigate]);

  if (isRejected) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
        <Navbar hideNavLinks hideUserMenu />

        <div className="flex-1 flex items-center justify-center px-4 py-10">
          <div style={{ maxWidth: 580, width: "100%", backgroundColor: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", padding: "48px 48px 40px", textAlign: "center" }}>

            {/* Icon */}
            <div style={{
              width: 72, height: 72, borderRadius: "50%", margin: "0 auto 20px",
              backgroundColor: "#FFF7ED",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 32,
            }}>
              ✉️
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1E293B", margin: "0 0 8px 0" }}>
              We weren't able to approve your application
            </h1>
            <p style={{ fontSize: 14, color: "#64748B", margin: "0 0 24px 0", lineHeight: 1.6 }}>
              After reviewing <strong>{orgName}</strong>'s registration, our team was unable
              to approve it at this time. We understand this is disappointing and want to
              help you find a path forward.
            </p>

            {/* Rejection reason */}
            <div style={{
              backgroundColor: "#FFF7ED", border: "1px solid #FED7AA",
              borderRadius: 10, padding: "16px 20px", textAlign: "left", marginBottom: 20,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#9A3412", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                Reason for decision
              </div>
              <p style={{ fontSize: 14, color: "#7C2D12", margin: 0, lineHeight: 1.6 }}>
                {rejectionReason || "Incomplete or insufficient documentation provided during registration."}
              </p>
            </div>

            {/* What you can do */}
            <div style={{
              backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0",
              borderRadius: 10, padding: "16px 20px", textAlign: "left", marginBottom: 24,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                What you can do
              </div>
              <ul style={{ fontSize: 13, color: "#475569", lineHeight: 1.8, margin: 0, paddingLeft: 18 }}>
                <li>Review the reason above and gather any missing documents</li>
                <li>Submit a new application once the issue has been addressed</li>
                <li>Contact support if you believe this decision was made in error</li>
              </ul>
            </div>

            {/* Registration ID */}
            {registrationId && (
              <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 20 }}>
                When contacting support, reference your registration ID: <strong style={{ color: "#64748B" }}>{registrationId}</strong>
              </p>
            )}

            {/* CTAs */}
            <div className="flex flex-col gap-3" style={{ alignItems: "stretch" }}>
              <a
                href="mailto:support@altruism.org"
                style={{
                  height: 42, backgroundColor: GREEN, color: "#fff",
                  border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600,
                  cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", textDecoration: "none",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = GREEN_HOVER)}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = GREEN)}
              >
                Contact Support
              </a>
              <button
                onClick={() => navigate("/register")}
                style={{
                  height: 42, backgroundColor: "transparent", color: "#16A34A",
                  border: "1.5px solid #16A34A", borderRadius: 8, fontSize: 14,
                  fontWeight: 600, cursor: "pointer",
                }}
              >
                Submit a New Application
              </button>
              <button
                onClick={() => navigate("/")}
                style={{
                  height: 38, backgroundColor: "transparent", color: "#94A3B8",
                  border: "none", borderRadius: 8, fontSize: 13,
                  fontWeight: 400, cursor: "pointer",
                }}
              >
                Back to home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar hideNavLinks hideUserMenu />

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div style={{ maxWidth: 560, width: "100%", backgroundColor: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", padding: "48px 48px 40px", textAlign: "center" }}>

          {/* Icon */}
          <div style={{
            width: 72, height: 72, borderRadius: "50%", margin: "0 auto 20px",
            backgroundColor: "#FEF3C7",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32,
          }}>
            ⏳
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1E293B", margin: "0 0 8px 0" }}>
            Your application is under review
          </h1>

          {submittedAt && (
            <p style={{ fontSize: 13, color: "#94A3B8", margin: "0 0 16px 0" }}>
              Submitted {submittedAt}
            </p>
          )}

          <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6, margin: "0 0 24px 0" }}>
            Thanks for registering <strong>{orgName}</strong>. Our platform admins are
            reviewing the information you provided. You'll receive full dashboard access
            once approved — typically within 1–2 business days.
            <br /><br />
            We'll send a confirmation to your registered email address as soon as a
            decision is made.
          </p>

          {/* What's next */}
          <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 16, textAlign: "left", marginBottom: 28 }}>
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

          {/* CTAs */}
          <div className="flex gap-3" style={{ justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                height: 40, padding: "0 20px", backgroundColor: "transparent",
                color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8,
                fontSize: 14, fontWeight: 500, cursor: "pointer",
              }}
            >
              ← Back
            </button>
            <a
              href="mailto:support@altruism.org"
              style={{
                height: 40, padding: "0 20px", backgroundColor: "transparent",
                color: "#2563EB", border: "1px solid #BFDBFE", borderRadius: 8,
                fontSize: 14, fontWeight: 500, cursor: "pointer",
                display: "inline-flex", alignItems: "center", textDecoration: "none",
              }}
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
