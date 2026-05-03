import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/Logo";

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

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = (): boolean => {
    const errs: { email?: string; password?: string } = {};
    if (!email.trim()) errs.email = "Email is required.";
    else if (!EMAIL_RE.test(email)) errs.email = "Please enter a valid email address.";
    if (!password) errs.password = "Password is required.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const FORM_ERROR_MESSAGES = {
    invalid_credentials: "Incorrect email or password. Please try again.",
    not_activated: "Your account hasn't been activated yet. Check your email for an invitation link to set your password.",
    server_error: "Something went wrong. Please try again in a moment.",
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;
    const result = await login(email, password);
    if (result.ok) {
      if (result.isPlatformAdmin) navigate("/platform-admin");
      else if (result.role === "org_admin") {
        const status = result.orgStatus;
        navigate(status === "pending" || status === "rejected" ? "/org/pending" : "/org");
      }
      else if (result.role === "supervisor") navigate("/supervisor");
      else navigate("/dashboard/profile");
    } else {
      setFormError(FORM_ERROR_MESSAGES[result.errorCode ?? "invalid_credentials"]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Simple nav */}
      <nav style={{ backgroundColor: "#0F172A", height: 64, display: "flex", alignItems: "center", padding: "0 32px" }}>
        <a onClick={() => navigate("/")} style={{ cursor: "pointer", textDecoration: "none" }}>
          <Logo size={24} color="#FFFFFF" />
        </a>
      </nav>

      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div style={{ width: 440, backgroundColor: "#FFFFFF", borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.08)", padding: 40 }}>
          {/* Logo */}
          <div className="flex flex-col items-center" style={{ marginBottom: 32 }}>
            <Logo size={44} color="#1E293B" align="center" tagline taglineColor="#64748B" taglineSize={13} />
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            {formError && (
              <div role="alert" style={{ display: "flex", alignItems: "flex-start", gap: 10, backgroundColor: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#9F1239" }}>
                <span style={{ fontSize: 15, lineHeight: 1, marginTop: 1, flexShrink: 0 }}>⚠</span>
                <span style={{ flex: 1, lineHeight: 1.5 }}>{formError}</span>
                <button type="button" onClick={() => setFormError(null)} aria-label="Dismiss" style={{ background: "none", border: "none", color: "#9F1239", fontSize: 16, cursor: "pointer", lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label style={{ fontSize: 13, color: "#1E293B", fontWeight: 500 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: undefined })); setFormError(null); }}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                aria-invalid={!!fieldErrors.email}
                style={{ width: "100%", height: 42, border: fieldErrors.email ? "1.5px solid #F87171" : focusedField === "email" ? "1.5px solid #2563EB" : "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
              {fieldErrors.email && <span style={{ fontSize: 12, color: "#DC2626", marginTop: 2 }}>{fieldErrors.email}</span>}
            </div>

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

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="rememberMe" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer", accentColor: GREEN }} />
                <label htmlFor="rememberMe" style={{ fontSize: 14, color: "#64748B", cursor: "pointer" }}>Remember me</label>
              </div>
              <a href="#" style={{ fontSize: 14, color: "#2563EB", textDecoration: "none" }}>Forgot password?</a>
            </div>

            <button type="submit" disabled={isLoading} style={{ width: "100%", height: 42, backgroundColor: GREEN, color: "#FFFFFF", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: isLoading ? "wait" : "pointer", opacity: isLoading ? 0.7 : 1 }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = GREEN_HOVER)} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = GREEN)}>
              {isLoading ? "Signing in..." : "Sign In"}
            </button>

            <div style={{ borderTop: "1px solid #E2E8F0", margin: "4px 0" }} />

            <div className="text-center">
              <span style={{ fontSize: 14, color: "#64748B" }}>Don't have an account? </span>
              <a onClick={() => navigate("/register")} style={{ fontSize: 14, color: GREEN, fontWeight: 500, cursor: "pointer", textDecoration: "none" }}>Sign up →</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}