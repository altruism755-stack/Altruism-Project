import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Navbar } from "../components/Navbar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { OrgLogo } from "../components/OrgLogos";

const GREEN = "#16A34A";

const certTypeColors: Record<string, { bg: string; text: string }> = {
  Participation: { bg: "#DBEAFE", text: "#1D4ED8" },
  Achievement: { bg: "#FEF3C7", text: "#B45309" },
  Completion: { bg: "#DCFCE7", text: "#15803D" },
};

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const volName = profile?.name || "Volunteer";
  const volId = user?.id || 0;

  const [volunteer, setVolunteer] = useState<any>(null);
  const [myOrgs, setMyOrgs] = useState<any[]>([]);
  const [myCertificates, setMyCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ fullName: "", phone: "", city: "", skills: "", aboutMe: "" });
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });

  const fetchProfile = async () => {
    try {
      const res = await api.getVolunteer(volId);
      setVolunteer(res);
      setMyOrgs(res.organizations || []);
      setMyCertificates(res.certificates || []);

      const skills = (() => { try { return JSON.parse(res.skills || "[]"); } catch { return []; } })();
      setForm({
        fullName: res.name || "",
        phone: res.phone || "",
        city: res.city || "",
        skills: Array.isArray(skills) ? skills.join(", ") : "",
        aboutMe: res.about_me || "",
      });
    } catch (e) { console.error("Failed to load profile:", e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProfile(); }, [volId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const skillsArray = form.skills.split(",").map((s) => s.trim()).filter(Boolean);
      await api.updateVolunteer(volId, {
        name: form.fullName,
        phone: form.phone,
        city: form.city,
        skills: skillsArray,
        about_me: form.aboutMe,
      });
      navigate("/dashboard");
    } catch (e) { console.error("Failed to save profile:", e); }
    finally { setSaving(false); }
  };

  const totalHours = volunteer?.totalHours || 0;
  const totalActivities = (volunteer?.activities || []).length;

  if (loading) return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="volunteer" userName={volName} />
      <div className="flex-1 flex items-center justify-center"><p style={{ color: "#94A3B8" }}>Loading...</p></div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="volunteer" userName={volName} />

      <div className="flex-1 px-8 py-6" style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, color: "#1E293B", margin: "0 0 24px 0" }}>My Profile</h1>

        <div className="flex gap-6">
          {/* Left - Profile summary */}
          <div style={{ flex: "0 0 35%" }}>
            <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <div className="flex flex-col items-center" style={{ marginBottom: 20 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg, ${GREEN}, #22C55E)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 12 }}>{(volunteer?.name || "").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: "#1E293B" }}>{volunteer?.name}</div>
                <div style={{ fontSize: 13, color: "#94A3B8" }}>{volunteer?.email}</div>
              </div>

              <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 16, marginBottom: 16 }}>
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between"><span style={{ fontSize: 13, color: "#94A3B8" }}>Total Hours</span><span style={{ fontSize: 15, fontWeight: 700, color: GREEN }}>{totalHours}</span></div>
                  <div className="flex justify-between"><span style={{ fontSize: 13, color: "#94A3B8" }}>Activities</span><span style={{ fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{totalActivities}</span></div>
                  <div className="flex justify-between"><span style={{ fontSize: 13, color: "#94A3B8" }}>Certificates</span><span style={{ fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{myCertificates.length}</span></div>
                  <div className="flex justify-between"><span style={{ fontSize: 13, color: "#94A3B8" }}>Member Since</span><span style={{ fontSize: 14, color: "#1E293B" }}>{volunteer?.created_at?.split("T")[0] || "—"}</span></div>
                </div>
              </div>

              {/* My Organizations */}
              <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", marginBottom: 12 }}>My Organizations ({myOrgs.length})</div>
                {myOrgs.map((org: any, idx: number) => (
                  <div key={org.id} className="flex items-center gap-3" style={{ padding: "8px 0", borderBottom: idx < myOrgs.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <OrgLogo orgId={org.id} size={32} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#1E293B" }}>{org.name}</div>
                      <div style={{ fontSize: 11, color: "#94A3B8" }}>{org.category || "Organization"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Certificates */}
            <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", marginBottom: 12 }}>My Certificates ({myCertificates.length})</div>
              {myCertificates.map((cert: any, idx: number) => {
                const tc = certTypeColors[cert.type] || certTypeColors.Participation;
                return (
                  <div key={cert.id} style={{ padding: "10px 0", borderBottom: idx < myCertificates.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#1E293B" }}>{cert.event_name}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, backgroundColor: tc.bg, color: tc.text, borderRadius: 20, padding: "2px 8px" }}>{cert.type}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#94A3B8" }}>{cert.org_name} · {cert.issued_date}</div>
                  </div>
                );
              })}
              {myCertificates.length === 0 && (
                <div style={{ fontSize: 13, color: "#94A3B8" }}>No certificates yet.</div>
              )}
            </div>
          </div>

          {/* Right - Edit form */}
          <div style={{ flex: 1 }}>
            <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, color: "#1E293B", margin: "0 0 20px 0" }}>Edit Profile</h3>
              <div className="flex flex-col gap-4">
                <div><label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Full Name</label><input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} style={{ width: "100%", height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} /></div>
                <div><label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Phone Number</label><input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} style={{ width: "100%", height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} /></div>
                <div><label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>City</label><input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} style={{ width: "100%", height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} /></div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Skills</label>
                  <textarea value={form.skills} onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))} style={{ width: "100%", height: 80, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                  <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>Add skills to help orgs find you</p>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>About Me</label>
                  <textarea value={form.aboutMe} onChange={(e) => setForm((f) => ({ ...f, aboutMe: e.target.value }))} style={{ width: "100%", height: 80, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                </div>
                <button onClick={handleSave} disabled={saving} style={{ width: "100%", height: 42, backgroundColor: saving ? "#86EFAC" : GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>{saving ? "Saving..." : "Save Changes"}</button>
              </div>
            </div>

            {/* Change Password */}
            <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
              <button onClick={() => setShowPasswordSection(!showPasswordSection)} className="flex items-center justify-between w-full" style={{ padding: "16px 24px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 15, fontWeight: 500, color: "#1E293B" }}>Change Password</span>
                <span style={{ color: "#94A3B8", transform: showPasswordSection ? "rotate(180deg)" : "none", transition: "transform 200ms" }}>▼</span>
              </button>
              {showPasswordSection && (
                <div className="px-6 pb-6 flex flex-col gap-4" style={{ borderTop: "1px solid #E2E8F0", paddingTop: 20 }}>
                  <div><label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Current Password</label><input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm((f) => ({ ...f, current: e.target.value }))} style={{ width: "100%", height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} /></div>
                  <div><label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>New Password</label><input type="password" value={passwordForm.newPass} onChange={(e) => setPasswordForm((f) => ({ ...f, newPass: e.target.value }))} style={{ width: "100%", height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} /></div>
                  <div><label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Confirm Password</label><input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))} style={{ width: "100%", height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} /></div>
                  <button style={{ width: "100%", height: 42, backgroundColor: "#1E293B", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Update Password</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
