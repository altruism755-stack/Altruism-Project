import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/Logo";
import { api } from "../services/api";

const GREEN = "#16A34A";
const GREEN_HOVER = "#15803D";

function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export function AcceptInvitePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // If already logged in, redirect away
  useEffect(() => {
    if (user) {
      if (user.role === "supervisor") navigate("/supervisor");
      else if (user.role === "org_admin") navigate("/org");
      else navigate("/dashboard/profile");
    }
  }, [user, navigate]);

  // No token in URL — show an error immediately
  if (!token) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
        <nav style={{ backgroundColor: "#0F172A", height: 64, display: "flex", alignItems: "center", padding: "0 32px" }}>
          <a onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
            <Logo size={24} color="#FFFFFF" />
          </a>
        </nav>
        <div className="flex-1 flex items-center justify-center py-12 px-4">
          <div style={{ width: 440, backgroundColor: "#FFFFFF", borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.08)", padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1E293B", marginBottom: 8 }}>Invalid Invitation Link</h2>
            <p style={{ fontSize: 14, color: "#64748B", marginBottom: 24 }}>
              This invitation link is missing or malformed. Please use the link shared with you by your organization administrator.
            </p>
            <button
              onClick={() => navigate("/login")}
              style={{ height: 42, padding: "0 24px", backgroundColor: GREEN, color: "#FFFFFF", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = GREEN_HOVER)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = GREEN)}
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  const validate = (): boolean => {
    const errs: { password?: string; confirm?: string } = {};
    if (!password) errs.password = "Password is required.";
    else if (password.length < 8) errs.password = "Password must be at least 8 characters.";
    if (!confirmPassword) errs.confirm = "Please confirm your password.";
    else if (password !== confirmPassword) errs.confirm = "Passwords do not match.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const data = await api.acceptInvite(token, password);
      // Persist auth state the same way AuthContext does
      localStorage.setItem("altruism_token", data.token);
      localStorage.setItem("altruism_user", JSON.stringify(data.user));
      setDone(true);
      // Brief pause so the success message is visible, then redirect
      setTimeout(() => {
        if (data.user.role === "supervisor") navigate("/supervisor");
        else if (data.user.role === "org_admin") navigate("/org");
        else navigate("/dashboard/profile");
      }, 1500);
    } catch (err: any) {
      const msg: string = err?.message ?? String(err);
      if (msg.includes("expired")) {
        setFormError("This invitation link has expired. Please ask your organization administrator to generate a new invite link.");
      } else if (msg.includes("Invalid") || msg.includes("already-used")) {
        setFormError("This invitation link is invalid or has already been used. Please request a new one.");
      } else {
        setFormError("Something went wrong. Please try again in a moment.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <nav style={{ backgroundColor: "#0F172A", height: 64, display: "flex", alignItems: "center", padding: "0 32px" }}>
        <a onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          <Logo size={24} color="#FFFFFF" />
        </a>
      </nav>

      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div style={{ width: 440, backgroundColor: "#FFFFFF", borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.08)", padding: 40 }}>
          <div className="flex flex-col items-center" style={{ marginBottom: 32 }}>
            <Logo size={44} color="#1E293B" align="center" tagline taglineColor="#64748B" taglineSize={13} />
          </div>

          {done ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1E293B", marginBottom: 8 }}>Account Activated!</h2>
              <p style={{ fontSize: 14, color: "#64748B" }}>Redirecting you to your dashboard…</p>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1E293B", marginBottom: 4, textAlign: "center" }}>Set Your Password</h2>
              <p style={{ fontSize: 14, color: "#64748B", textAlign: "center", marginBottom: 28 }}>
                Welcome! Create a password to activate your account.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {formError && (
                  <div role="alert" style={{ display: "flex", alignItems: "flex-start", gap: 10, backgroundColor: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#9F1239" }}>
                    <span style={{ fontSize: 15, lineHeight: 1, marginTop: 1, flexShrink: 0 }}>⚠</span>
                    <span style={{ flex: 1, lineHeight: 1.5 }}>{formError}</span>
                    <button type="button" onClick={() => setFormError(null)} aria-label="Dismiss" style={{ background: "none", border: "none", color: "#9F1239", fontSize: 16, cursor: "pointer", lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label style={{ fontSize: 13, color: "#1E293B", fontWeight: 500 }}>Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: undefined })); setFormError(null); }}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      aria-invalid={!!fieldErrors.password}
                      placeholder="At least 8 characters"
                      style={{ width: "100%", height: 42, border: fieldErrors.password ? "1.5px solid #F87171" : focusedField === "password" ? "1.5px solid #2563EB" : "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 40px 0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8", display: "flex", alignItems: "center", padding: 0 }}>
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {fieldErrors.password && <span style={{ fontSize: 12, color: "#DC2626", marginTop: 2 }}>{fieldErrors.password}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label style={{ fontSize: 13, color: "#1E293B", fontWeight: 500 }}>Confirm Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors(prev => ({ ...prev, confirm: undefined })); setFormError(null); }}
                      onFocus={() => setFocusedField("confirm")}
                      onBlur={() => setFocusedField(null)}
                      aria-invalid={!!fieldErrors.confirm}
                      placeholder="Re-enter your password"
                      style={{ width: "100%", height: 42, border: fieldErrors.confirm ? "1.5px solid #F87171" : focusedField === "confirm" ? "1.5px solid #2563EB" : "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 40px 0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8", display: "flex", alignItems: "center", padding: 0 }}>
                      {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {fieldErrors.confirm && <span style={{ fontSize: 12, color: "#DC2626", marginTop: 2 }}>{fieldErrors.confirm}</span>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ width: "100%", height: 42, backgroundColor: GREEN, color: "#FFFFFF", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: isSubmitting ? "wait" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}
                  onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.backgroundColor = GREEN_HOVER; }}
                  onMouseLeave={(e) => { if (!isSubmitting) e.currentTarget.style.backgroundColor = GREEN; }}
                >
                  {isSubmitting ? "Activating Account…" : "Activate Account"}
                </button>

                <div style={{ borderTop: "1px solid #E2E8F0", margin: "4px 0" }} />

                <div className="text-center">
                  <span style={{ fontSize: 14, color: "#64748B" }}>Already have an account? </span>
                  <a onClick={() => navigate("/login")} style={{ fontSize: 14, color: GREEN, fontWeight: 500, cursor: "pointer", textDecoration: "none" }}>Sign in →</a>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
