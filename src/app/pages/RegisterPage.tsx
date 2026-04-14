import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { DatePicker } from "../components/DatePicker";

const GREEN = "#16A34A";
const GREEN_HOVER = "#15803D";

type Role = "Volunteer" | "Organization";

const GOVERNORATES = [
  "Cairo", "Alexandria", "Giza", "Qalyubia", "Sharqia", "Dakahlia", "Beheira",
  "Minya", "Asyut", "Sohag", "Qena", "Luxor", "Aswan", "Fayoum", "Beni Suef",
  "Ismailia", "Port Said", "Suez", "Damietta", "Kafr El Sheikh", "Gharbia",
  "Monufia", "Red Sea", "New Valley", "Matrouh", "North Sinai", "South Sinai",
];

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [role, setRole] = useState<Role>("Volunteer");
  const [focused, setFocused] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [volForm, setVolForm] = useState({ fullName: "", email: "", password: "", phone: "", city: "", skills: "", dateOfBirth: "", governorate: "", nationalId: "" });
  const [orgForm, setOrgForm] = useState({
    orgName: "", email: "", password: "", phone: "",
    officialEmail: "", orgType: "", foundedYear: "", location: "",
    website: "", socialLinks: "", description: "", category: "",
    submitterName: "", submitterRole: "",
    logoDataUri: "", documentsUrl: "",
  });

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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setOrgForm((f) => ({ ...f, logoDataUri: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    const data = role === "Organization"
      ? {
          role: "org_admin",
          email: orgForm.email,
          password: orgForm.password,
          orgName: orgForm.orgName,
          phone: orgForm.phone,
          website: orgForm.website,
          description: orgForm.description,
          category: orgForm.category,
          officialEmail: orgForm.officialEmail,
          orgType: orgForm.orgType,
          foundedYear: orgForm.foundedYear,
          location: orgForm.location,
          socialLinks: orgForm.socialLinks,
          logoUrl: orgForm.logoDataUri,
          documentsUrl: orgForm.documentsUrl,
          submitterName: orgForm.submitterName,
          submitterRole: orgForm.submitterRole,
        }
      : {
          role: "volunteer",
          email: volForm.email,
          password: volForm.password,
          name: volForm.fullName,
          phone: volForm.phone,
          city: volForm.city,
          skills: volForm.skills.split(",").map((s) => s.trim()).filter(Boolean),
          dateOfBirth: volForm.dateOfBirth,
          governorate: volForm.governorate,
          nationalId: volForm.nationalId,
        };

    const result = await register(data);
    setIsSubmitting(false);

    if (!result.ok) {
      setSubmitError("Registration failed. Please try again.");
      return;
    }

    if (role === "Organization") {
      // Pending approval — show confirmation screen instead of dashboard
      navigate("/org/pending");
    } else {
      navigate("/dashboard/profile");
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
        <div style={{ width: role === "Organization" ? 640 : 520, backgroundColor: "#FFFFFF", borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.08)", padding: 40 }}>
          <h2 className="text-center" style={{ fontSize: 20, fontWeight: 700, color: "#1E293B", margin: "0 0 24px 0" }}>Create your account</h2>

          <div className="flex gap-2" style={{ marginBottom: 28, backgroundColor: "#F1F5F9", borderRadius: 10, padding: 4 }}>
            {(["Volunteer", "Organization"] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                type="button"
                style={{
                  flex: 1, height: 36, borderRadius: 8, border: "none",
                  backgroundColor: role === r ? GREEN : "transparent",
                  color: role === r ? "#fff" : "#64748B",
                  fontSize: 13, fontWeight: role === r ? 600 : 500, cursor: "pointer", transition: "all 150ms",
                }}
              >
                {r}
              </button>
            ))}
          </div>

          <div style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "10px 14px", marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: "#15803D", margin: 0, lineHeight: 1.5 }}>
              {role === "Volunteer"
                ? "Sign up and apply to available organizations. You can join multiple organizations and manage all your activities from one profile."
                : "Register your organization for platform review. Our admins will verify your details and approve access within 1-2 business days."}
            </p>
          </div>

          {submitError && (
            <div style={{ backgroundColor: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#B91C1C", fontSize: 13 }}>
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {role === "Volunteer" && (
              <>
                <div><label style={labelStyle}>Full Name *</label><input required value={volForm.fullName} onChange={(e) => setVolForm((f) => ({ ...f, fullName: e.target.value }))} onFocus={() => setFocused("vfn")} onBlur={() => setFocused(null)} style={inputStyle("vfn")} /></div>
                <div><label style={labelStyle}>Email *</label><input required type="email" value={volForm.email} onChange={(e) => setVolForm((f) => ({ ...f, email: e.target.value }))} onFocus={() => setFocused("ve")} onBlur={() => setFocused(null)} style={inputStyle("ve")} /></div>
                <div><label style={labelStyle}>Password *</label><input required type="password" value={volForm.password} onChange={(e) => setVolForm((f) => ({ ...f, password: e.target.value }))} onFocus={() => setFocused("vp")} onBlur={() => setFocused(null)} style={inputStyle("vp")} /></div>
                <div><label style={labelStyle}>National ID *</label><input required value={volForm.nationalId} onChange={(e) => setVolForm((f) => ({ ...f, nationalId: e.target.value }))} onFocus={() => setFocused("vnid")} onBlur={() => setFocused(null)} style={inputStyle("vnid")} placeholder="e.g. 30012151234567" /></div>
                <div>
                  <label style={labelStyle}>Date of Birth *</label>
                  <DatePicker
                    value={volForm.dateOfBirth}
                    onChange={(v) => setVolForm((f) => ({ ...f, dateOfBirth: v }))}
                    required
                    focusedKey="vdob"
                    currentFocused={focused}
                    onFocus={() => setFocused("vdob")}
                    onBlur={() => setFocused(null)}
                    inputStyleBase={inputStyle("vdob")}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Governorate *</label>
                  <select required value={volForm.governorate} onChange={(e) => setVolForm((f) => ({ ...f, governorate: e.target.value }))} onFocus={() => setFocused("vgov")} onBlur={() => setFocused(null)} style={inputStyle("vgov")}>
                    <option value="">Select governorate...</option>
                    {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
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
                <SectionHeader>Organization Details</SectionHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div><label style={labelStyle}>Organization Name *</label><input required value={orgForm.orgName} onChange={(e) => setOrgForm((f) => ({ ...f, orgName: e.target.value }))} onFocus={() => setFocused("on")} onBlur={() => setFocused(null)} style={inputStyle("on")} /></div>
                  <div>
                    <label style={labelStyle}>Organization Type *</label>
                    <select required value={orgForm.orgType} onChange={(e) => setOrgForm((f) => ({ ...f, orgType: e.target.value }))} onFocus={() => setFocused("otype")} onBlur={() => setFocused(null)} style={inputStyle("otype")}>
                      <option value="">Select type...</option>
                      <option value="NGO">NGO / Non-profit</option>
                      <option value="Company">Company / Corporate</option>
                      <option value="Student Activity">Student Activity</option>
                      <option value="Government">Government</option>
                      <option value="Religious">Religious Organization</option>
                      <option value="Foundation">Foundation</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>Category *</label>
                    <select required value={orgForm.category} onChange={(e) => setOrgForm((f) => ({ ...f, category: e.target.value }))} onFocus={() => setFocused("oc")} onBlur={() => setFocused(null)} style={inputStyle("oc")}>
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
                  <div><label style={labelStyle}>Founded Year *</label><input required type="number" min="1900" max="2100" value={orgForm.foundedYear} onChange={(e) => setOrgForm((f) => ({ ...f, foundedYear: e.target.value }))} onFocus={() => setFocused("oyear")} onBlur={() => setFocused(null)} style={inputStyle("oyear")} placeholder="e.g. 2015" /></div>
                </div>

                <div>
                  <label style={labelStyle}>Description *</label>
                  <textarea required value={orgForm.description} onChange={(e) => setOrgForm((f) => ({ ...f, description: e.target.value }))} onFocus={() => setFocused("od")} onBlur={() => setFocused(null)} placeholder="Tell us about your organization, its mission, and impact..." style={{ ...inputStyle("od"), height: 90, padding: "10px 12px", resize: "vertical" as const }} />
                </div>

                <div>
                  <label style={labelStyle}>Logo (optional)</label>
                  <div className="flex items-center gap-3">
                    {orgForm.logoDataUri ? (
                      <img src={orgForm.logoDataUri} alt="logo" style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover", border: "1px solid #E2E8F0" }} />
                    ) : (
                      <div style={{ width: 64, height: 64, borderRadius: 12, border: "1px dashed #CBD5E1", display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", fontSize: 20 }}>+</div>
                    )}
                    <label style={{ cursor: "pointer", padding: "8px 14px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, color: "#64748B" }}>
                      {orgForm.logoDataUri ? "Change Logo" : "Upload Logo"}
                      <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
                    </label>
                  </div>
                </div>

                <SectionHeader>Contact & Location</SectionHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div><label style={labelStyle}>Login Email *</label><input required type="email" value={orgForm.email} onChange={(e) => setOrgForm((f) => ({ ...f, email: e.target.value }))} onFocus={() => setFocused("oe")} onBlur={() => setFocused(null)} style={inputStyle("oe")} /></div>
                  <div><label style={labelStyle}>Password *</label><input required type="password" value={orgForm.password} onChange={(e) => setOrgForm((f) => ({ ...f, password: e.target.value }))} onFocus={() => setFocused("op")} onBlur={() => setFocused(null)} style={inputStyle("op")} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label style={labelStyle}>Official Email</label><input type="email" value={orgForm.officialEmail} onChange={(e) => setOrgForm((f) => ({ ...f, officialEmail: e.target.value }))} onFocus={() => setFocused("oemail")} onBlur={() => setFocused(null)} style={inputStyle("oemail")} placeholder="contact@organization.org" /></div>
                  <div><label style={labelStyle}>Phone Number *</label><input required value={orgForm.phone} onChange={(e) => setOrgForm((f) => ({ ...f, phone: e.target.value }))} onFocus={() => setFocused("oph")} onBlur={() => setFocused(null)} style={inputStyle("oph")} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>Governorate *</label>
                    <select required value={orgForm.location} onChange={(e) => setOrgForm((f) => ({ ...f, location: e.target.value }))} onFocus={() => setFocused("oloc")} onBlur={() => setFocused(null)} style={inputStyle("oloc")}>
                      <option value="">Select governorate...</option>
                      {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Website</label><input value={orgForm.website} onChange={(e) => setOrgForm((f) => ({ ...f, website: e.target.value }))} onFocus={() => setFocused("ow")} onBlur={() => setFocused(null)} style={inputStyle("ow")} placeholder="https://..." /></div>
                </div>
                <div>
                  <label style={labelStyle}>Social Media Links</label>
                  <input value={orgForm.socialLinks} onChange={(e) => setOrgForm((f) => ({ ...f, socialLinks: e.target.value }))} onFocus={() => setFocused("osocial")} onBlur={() => setFocused(null)} style={inputStyle("osocial")} placeholder="Facebook, Instagram, LinkedIn URLs (comma-separated)" />
                </div>

                <SectionHeader>Verification</SectionHeader>
                <div>
                  <label style={labelStyle}>Supporting Documents URL (optional)</label>
                  <input value={orgForm.documentsUrl} onChange={(e) => setOrgForm((f) => ({ ...f, documentsUrl: e.target.value }))} onFocus={() => setFocused("odocs")} onBlur={() => setFocused(null)} style={inputStyle("odocs")} placeholder="Link to registration certificate, proof of activity, etc." />
                  <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>Upload to a cloud service (Google Drive, Dropbox) and paste a shareable link.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label style={labelStyle}>Submitter Name *</label><input required value={orgForm.submitterName} onChange={(e) => setOrgForm((f) => ({ ...f, submitterName: e.target.value }))} onFocus={() => setFocused("osname")} onBlur={() => setFocused(null)} style={inputStyle("osname")} placeholder="Your full name" /></div>
                  <div><label style={labelStyle}>Your Role *</label><input required value={orgForm.submitterRole} onChange={(e) => setOrgForm((f) => ({ ...f, submitterRole: e.target.value }))} onFocus={() => setFocused("osrole")} onBlur={() => setFocused(null)} style={inputStyle("osrole")} placeholder="e.g. Founder, Director" /></div>
                </div>
              </>
            )}

            <button type="submit" disabled={isSubmitting} style={{ width: "100%", height: 42, backgroundColor: GREEN, color: "#FFFFFF", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: isSubmitting ? "wait" : "pointer", marginTop: 8, opacity: isSubmitting ? 0.7 : 1 }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = GREEN_HOVER)} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = GREEN)}>
              {isSubmitting ? "Creating Account..." : role === "Organization" ? "Submit for Review" : "Create Account"}
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

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 8, borderBottom: "1px solid #F1F5F9", paddingBottom: 6 }}>
      {children}
    </div>
  );
}
