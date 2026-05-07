import { useState, useEffect } from "react";
import { Navbar } from "../components/Navbar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

export function SupervisorManagement() {
  const { profile } = useAuth();
  const orgName = profile?.name || "Organization";

  const [form, setForm] = useState({ name: "", email: "", team: "" });
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchSupervisors = async () => {
    try {
      const res = await api.getSupervisors();
      setSupervisors(res.supervisors || []);
    } catch (e) { console.error("Failed to load supervisors:", e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSupervisors(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    try {
      const res = await api.createSupervisor({ name: form.name, email: form.email, team: form.team });
      setForm({ name: "", email: "", team: "" });
      fetchSupervisors();
      if (res?.invite_token) {
        const baseUrl = window.location.origin;
        setInviteLink(`${baseUrl}/accept-invite?token=${res.invite_token}`);
      }
    } catch (err) { console.error("Failed to create supervisor:", err); }
  };

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRemove = async (id: number) => {
    try {
      await api.deleteSupervisor(id);
      fetchSupervisors();
    } catch (err) { console.error("Failed to delete supervisor:", err); }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="org" />
      <div className="flex-1 flex items-center justify-center"><p style={{ color: "#94A3B8" }}>Loading...</p></div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="org" />
      <div className="flex-1 px-8 py-6" style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, color: "#1E293B", margin: "0 0 24px 0" }}>Supervisors</h1>

        <div className="flex gap-6 items-start">
          {/* Left - Invite form */}
          <div style={{ flex: "0 0 38%" }}>
            <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", marginBottom: 20, margin: "0 0 8px 0" }}>Add Supervisor</h3>
              <p style={{ fontSize: 12, color: "#94A3B8", margin: "0 0 20px 0", lineHeight: 1.5 }}>Register a new supervisor for your organization. You will receive an invite link to share with them so they can set their password and log in.</p>
              <form onSubmit={handleInvite} className="flex flex-col gap-4">
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Full Name</label>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={{ width: "100%", height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} style={{ width: "100%", height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Department / Team</label>
                  <input value={form.team} onChange={(e) => setForm((f) => ({ ...f, team: e.target.value }))} style={{ width: "100%", height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <button type="submit" style={{ width: "100%", height: 42, backgroundColor: "#16A34A", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add Supervisor</button>
              </form>
            </div>
            {inviteLink && (
              <div style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: 20, marginTop: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#15803D", margin: "0 0 6px 0" }}>Invite link generated</p>
                <p style={{ fontSize: 12, color: "#166534", margin: "0 0 10px 0" }}>Copy this link and share it with the supervisor so they can set their password.</p>
                <div style={{ backgroundColor: "#fff", border: "1px solid #BBF7D0", borderRadius: 8, padding: "8px 12px", wordBreak: "break-all", fontSize: 11, color: "#475569", fontFamily: "monospace", marginBottom: 10 }}>
                  {inviteLink}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={handleCopy}
                    style={{ flex: 1, height: 36, backgroundColor: copied ? "#DCFCE7" : "#16A34A", color: copied ? "#15803D" : "#fff", border: copied ? "1px solid #86EFAC" : "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    {copied ? "Copied!" : "Copy Link"}
                  </button>
                  <button
                    onClick={() => setInviteLink(null)}
                    style={{ height: 36, padding: "0 14px", backgroundColor: "#fff", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right - Table */}
          <div style={{ flex: 1 }}>
            <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
              <div className="grid" style={{ gridTemplateColumns: "2fr 2fr 1.2fr 1fr 1fr 1.5fr", padding: "12px 20px", backgroundColor: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
                {["Name", "Email", "Team", "Volunteers", "Status", "Actions"].map((h) => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
                ))}
              </div>
              {supervisors.map((s) => (
                <div key={s.id} className="grid items-center" style={{ gridTemplateColumns: "2fr 2fr 1.2fr 1fr 1fr 1.5fr", padding: "14px 20px", borderBottom: "1px solid #F1F5F9" }}>
                  <div className="flex items-center gap-3">
                    <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{(s.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{s.name}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#64748B" }}>{s.email}</div>
                  <div style={{ fontSize: 13, color: "#64748B" }}>{s.team || "—"}</div>
                  <div><span style={{ backgroundColor: "#DBEAFE", color: "#1D4ED8", fontSize: 12, fontWeight: 600, borderRadius: 20, padding: "2px 8px" }}>{s.assigned_volunteers ?? 0}</span></div>
                  <div><span style={{ backgroundColor: s.status === "Active" ? "#DCFCE7" : "#FEF3C7", color: s.status === "Active" ? "#15803D" : "#B45309", fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "3px 10px" }}>{s.status}</span></div>
                  <div className="flex gap-2">
                    <button style={{ height: 28, padding: "0 10px", backgroundColor: "transparent", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Manage</button>
                    <button onClick={() => handleRemove(s.id)} style={{ height: 28, padding: "0 10px", backgroundColor: "transparent", color: "#DC2626", border: "1px solid #DC2626", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
