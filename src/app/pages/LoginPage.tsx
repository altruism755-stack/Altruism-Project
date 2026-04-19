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
  const [error, setError] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    const success = await login(email, password);
    if (success) {
      // Determine redirect based on role stored after login
      const stored = sessionStorage.getItem("altruism_user");
      const u = stored ? JSON.parse(stored) : null;
      const orgStatus = sessionStorage.getItem("altruism_org_status");
      if (u?.is_platform_admin) navigate("/platform-admin");
      else if (u?.role === "org_admin") {
        navigate(orgStatus && orgStatus !== "approved" ? "/org/pending" : "/org");
      }
      else if (u?.role === "supervisor") navigate("/supervisor");
      else navigate("/dashboard/profile");
    } else {
      setError(true);
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

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between px-6" style={{ backgroundColor: "#FEE2E2", borderLeft: "4px solid #DC2626", minHeight: 48, fontSize: 14, color: "#991B1B" }}>
          <span>Login unsuccessful. Please check your email and password.</span>
          <button onClick={() => setError(false)} style={{ background: "none", border: "none", color: "#991B1B", fontSize: 18, cursor: "pointer" }}>×</button>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div style={{ width: 440, backgroundColor: "#FFFFFF", borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.08)", padding: 40 }}>
          {/* Logo */}
          <div className="flex flex-col items-center" style={{ marginBottom: 32 }}>
            <Logo size={44} color="#1E293B" align="center" tagline taglineColor="#64748B" taglineSize={13} />
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <label style={{ fontSize: 13, color: "#1E293B", fontWeight: 500 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                style={{ width: "100%", height: 42, border: focusedField === "email" ? "1.5px solid #2563EB" : "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label style={{ fontSize: 13, color: "#1E293B", fontWeight: 500 }}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  style={{ width: "100%", height: 42, border: focusedField === "password" ? "1.5px solid #2563EB" : "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 40px 0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8", display: "flex", alignItems: "center", padding: 0 }}>
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
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

            <div style={{ marginTop: 4, backgroundColor: "#F8FAFC", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "#64748B", lineHeight: 1.8 }}>
              <strong style={{ color: "#1E293B" }}>Demo accounts:</strong><br />
              volunteer@example.com / <strong>volunteer</strong> — Yara Hassan<br />
              admin@resala.org / <strong>admin</strong> — Resala Admin<br />
              admin@redcrescent.org / <strong>admin</strong> — Red Crescent Admin<br />
              amira@resala.org / <strong>supervisor</strong> — Resala Supervisor<br />
              platform@altruism.org / <strong>platform</strong> — Platform Admin
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}