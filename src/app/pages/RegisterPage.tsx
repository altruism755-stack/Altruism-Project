import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";

const GREEN = "#16A34A";
const GREEN_HOVER = "#15803D";

type Role = "Volunteer" | "Organization";

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [role, setRole] = useState<Role>("Volunteer");
  const [focused, setFocused] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [volForm, setVolForm] = useState({ fullName: "", email: "", password: "", phone: "", city: "", skills: "" });
  const [orgForm, setOrgForm] = useState({ orgName: "", email: "", password: "", phone: "", website: "", description: "", category: "" });

  const inputStyle = (field: string) => ({
    width: "100%",
    height: 42,
    border: focused === field ? "1.5px solid #2563EB" : "1.5px solid #E2E8F0",
    borderRadius: 8,
    padding: "0 12px",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box" as const,
    backgroundColor: "#FFFFFF",
  });

  const labelStyle = { fontSize: 13, color: "#1E293B", fontWeight: 500 as const, marginBottom: 4, display: "block" as const };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const data = role === "Organization"
      ? { role: "org_admin", email: orgForm.email, password: orgForm.password, orgName: orgForm.orgName, phone: orgForm.phone, website: orgForm.website, description: orgForm.description, category: orgForm.category }
      : { role: "volunteer", email: volForm.email, password: volForm.password, name: volForm.fullName, phone: volForm.phone, city: volForm.city, skills: volForm.skills.split(",").map(s => s.trim()).filter(Boolean) };
    const success = await register(data);
    setIsSubmitting(false);
    if (success) {
      navigate(role === "Organization" ? "/org" : "/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <nav style={{ backgroundColor: "#0F172A", height: 64, display: "flex", alignItems: "center", padding: "0 32px" }}>
        <a onClick={() => navigate("/")} className="flex items-center gap-2" style={{ cursor: "pointer" }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="16" fill={GREEN} opacity={0.2} />
            <path d="M16 8C16 8 9 12 9 18C9 21.3 12.1 24 16 24C19.9 24 23 21.3 23 18C23 12 16 8 16 8Z" fill={GREEN} />
          </svg>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Altruism</span>
        </a>
      </nav>

      <div className="flex-1 flex items-start justify-center py-10 px-4">
        <div style={{ width: 520, backgroundColor: "#FFFFFF", borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.08)", padding: 40 }}>
          <h2 className="text-center" style={{ fontSize: 20, fontWeight: 700, color: "#1E293B", margin: "0 0 8px 0" }}>Create your account</h2>
          <p className="text-center" style={{ fontSize: 13, color: "#94A3B8", margin: "0 0 24px 0" }}>Altruism is completely free — no payments required</p>

          {/* Role tabs — only Volunteer & Organization (supervisors are added by orgs) */}
          <div className="flex gap-2" style={{ marginBottom: 28, backgroundColor: "#F1F5F9", borderRadius: 10, padding: 4 }}>
            {(["Volunteer", "Organization"] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                style={{
                  flex: 1,
                  height: 36,
                  borderRadius: 8,
                  border: "none",
                  backgroundColor: role === r ? GREEN : "transparent",
                  color: role === r ? "#fff" : "#64748B",
                  fontSize: 13,
                  fontWeight: role === r ? 600 : 500,
                  cursor: "pointer",
                  transition: "all 150ms",
                }}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Info note for supervisors */}
          <div style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "10px 14px", marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: "#15803D", margin: 0, lineHeight: 1.5 }}>
              {role === "Volunteer"
                ? "Sign up and apply to available organizations. You can join multiple organizations and manage all your activities from one profile."
                : "Register your organization to start managing supervisors, volunteers, activities, and certificates. Supervisors will be added by you through the dashboard."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {role === "Volunteer" && (
              <>
                <div><label style={labelStyle}>Full Name</label><input value={volForm.fullName} onChange={(e) => setVolForm((f) => ({ ...f, fullName: e.target.value }))} onFocus={() => setFocused("vfn")} onBlur={() => setFocused(null)} style={inputStyle("vfn")} /></div>
                <div><label style={labelStyle}>Email</label><input type="email" value={volForm.email} onChange={(e) => setVolForm((f) => ({ ...f, email: e.target.value }))} onFocus={() => setFocused("ve")} onBlur={() => setFocused(null)} style={inputStyle("ve")} /></div>
                <div><label style={labelStyle}>Password</label><input type="password" value={volForm.password} onChange={(e) => setVolForm((f) => ({ ...f, password: e.target.value }))} onFocus={() => setFocused("vp")} onBlur={() => setFocused(null)} style={inputStyle("vp")} /></div>
                <div><label style={labelStyle}>Phone</label><input value={volForm.phone} onChange={(e) => setVolForm((f) => ({ ...f, phone: e.target.value }))} onFocus={() => setFocused("vph")} onBlur={() => setFocused(null)} style={inputStyle("vph")} /></div>
                <div><label style={labelStyle}>City</label><input value={volForm.city} onChange={(e) => setVolForm((f) => ({ ...f, city: e.target.value }))} onFocus={() => setFocused("vc")} onBlur={() => setFocused(null)} style={inputStyle("vc")} /></div>
                <div>
                  <label style={labelStyle}>Skills</label>
                  <textarea value={volForm.skills} onChange={(e) => setVolForm((f) => ({ ...f, skills: e.target.value }))} onFocus={() => setFocused("vs")} onBlur={() => setFocused(null)} placeholder="Communication, Event Planning, Photography..." style={{ ...inputStyle("vs"), height: 80, padding: "10px 12px", resize: "vertical" as const }} />
                </div>
              </>
            )}
            {role === "Organization" && (
              <>
                <div><label style={labelStyle}>Organization Name</label><input value={orgForm.orgName} onChange={(e) => setOrgForm((f) => ({ ...f, orgName: e.target.value }))} onFocus={() => setFocused("on")} onBlur={() => setFocused(null)} style={inputStyle("on")} /></div>
                <div><label style={labelStyle}>Email</label><input type="email" value={orgForm.email} onChange={(e) => setOrgForm((f) => ({ ...f, email: e.target.value }))} onFocus={() => setFocused("oe")} onBlur={() => setFocused(null)} style={inputStyle("oe")} /></div>
                <div><label style={labelStyle}>Password</label><input type="password" value={orgForm.password} onChange={(e) => setOrgForm((f) => ({ ...f, password: e.target.value }))} onFocus={() => setFocused("op")} onBlur={() => setFocused(null)} style={inputStyle("op")} /></div>
                <div><label style={labelStyle}>Phone</label><input value={orgForm.phone} onChange={(e) => setOrgForm((f) => ({ ...f, phone: e.target.value }))} onFocus={() => setFocused("oph")} onBlur={() => setFocused(null)} style={inputStyle("oph")} /></div>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select value={orgForm.category} onChange={(e) => setOrgForm((f) => ({ ...f, category: e.target.value }))} onFocus={() => setFocused("oc")} onBlur={() => setFocused(null)} style={inputStyle("oc")}>
                    <option value="">Select category...</option>
                    <option value="Social Welfare">Social Welfare</option>
                    <option value="Environment">Environment</option>
                    <option value="Education">Education</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Student Activity">Student Activity</option>
                    <option value="Media & Communications">Media & Communications</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div><label style={labelStyle}>Website (optional)</label><input value={orgForm.website} onChange={(e) => setOrgForm((f) => ({ ...f, website: e.target.value }))} onFocus={() => setFocused("ow")} onBlur={() => setFocused(null)} style={inputStyle("ow")} placeholder="https://..." /></div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea value={orgForm.description} onChange={(e) => setOrgForm((f) => ({ ...f, description: e.target.value }))} onFocus={() => setFocused("od")} onBlur={() => setFocused(null)} placeholder="Tell us about your organization..." style={{ ...inputStyle("od"), height: 80, padding: "10px 12px", resize: "vertical" as const }} />
                </div>
              </>
            )}

            <button type="submit" disabled={isSubmitting} style={{ width: "100%", height: 42, backgroundColor: GREEN, color: "#FFFFFF", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: isSubmitting ? "wait" : "pointer", marginTop: 8, opacity: isSubmitting ? 0.7 : 1 }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = GREEN_HOVER)} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = GREEN)}>
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </button>

            <div className="text-center">
              <span style={{ fontSize: 14, color: "#64748B" }}>Already registered? </span>
              <a onClick={() => navigate("/login")} style={{ fontSize: 14, color: GREEN, fontWeight: 500, cursor: "pointer", textDecoration: "none" }}>Log in →</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
