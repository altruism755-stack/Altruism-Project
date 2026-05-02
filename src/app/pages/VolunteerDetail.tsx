import { useState, useEffect } from "react";
import { useParams } from "react-router";
import { Navbar } from "../components/Navbar";
import { BackButton } from "../components/BackButton";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const GREEN = "#16A34A";
type Tab = "All" | "Pending" | "Approved" | "Rejected";

const statusColors: Record<string, { bg: string; text: string }> = {
  Pending: { bg: "#FEF3C7", text: "#B45309" },
  Approved: { bg: "#DCFCE7", text: "#15803D" },
  Rejected: { bg: "#FEE2E2", text: "#B91C1C" },
};

export function VolunteerDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const supName = profile?.name || "Supervisor";

  const [volunteer, setVolunteer] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>("All");
  const [loading, setLoading] = useState(true);

  const fetchVolunteer = async () => {
    try {
      const res = await api.getVolunteer(Number(id));
      setVolunteer(res);
      setActivities(res.activities || []);
    } catch (e) { console.error("Failed to load volunteer:", e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVolunteer(); }, [id]);

  const handleApprove = async (aid: number) => {
    try {
      await api.approveActivity(aid);
      setActivities((prev) => prev.map((a) => a.id === aid ? { ...a, status: "Approved" } : a));
    } catch (e) { console.error("Approve failed:", e); }
  };

  const handleReject = async (aid: number) => {
    try {
      await api.rejectActivity(aid);
      setActivities((prev) => prev.map((a) => a.id === aid ? { ...a, status: "Rejected" } : a));
    } catch (e) { console.error("Reject failed:", e); }
  };

  if (loading || !volunteer) return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="supervisor" />
      <div className="flex-1 flex items-center justify-center"><p style={{ color: "#94A3B8" }}>{loading ? "Loading..." : "Volunteer not found."}</p></div>
    </div>
  );

  const filtered = tab === "All" ? activities : activities.filter((a) => a.status === tab);
  const totalHours = activities.filter((a) => a.status === "Approved").reduce((s: number, a: any) => s + (a.hours || 0), 0);
  const skills = (() => { try { return JSON.parse(volunteer.skills || "[]"); } catch { return []; } })();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="supervisor" />

      <div className="flex-1 px-8 py-6" style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        <BackButton to="/supervisor" label="My Volunteers" />

        <div className="flex gap-6">
          {/* Left - Profile card */}
          <div style={{ flex: "0 0 30%" }}>
            <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24 }}>
              <div className="flex flex-col items-center" style={{ marginBottom: 20 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg, ${GREEN}, #22C55E)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 12 }}>{volunteer.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: "#1E293B" }}>{volunteer.name}</div>
                <div style={{ fontSize: 13, color: "#64748B" }}>{volunteer.email}</div>
              </div>

              <div className="flex flex-col gap-3" style={{ marginBottom: 16 }}>
                <div className="flex justify-between"><span style={{ fontSize: 13, color: "#94A3B8" }}>Phone</span><span style={{ fontSize: 13, color: "#1E293B" }}>{volunteer.phone || "—"}</span></div>
                <div className="flex justify-between"><span style={{ fontSize: 13, color: "#94A3B8" }}>City</span><span style={{ fontSize: 13, color: "#1E293B" }}>{volunteer.city || "—"}</span></div>
                <div className="flex justify-between"><span style={{ fontSize: 13, color: "#94A3B8" }}>Joined</span><span style={{ fontSize: 13, color: "#1E293B" }}>{volunteer.created_at?.split("T")[0] || "—"}</span></div>
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-2 mb-4">
                {skills.map((s: string) => (<span key={s} style={{ backgroundColor: "#F1F5F9", color: "#64748B", fontSize: 12, borderRadius: 20, padding: "3px 10px" }}>{s}</span>))}
              </div>

              <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 16 }}>
                <div style={{ fontSize: 13, color: "#94A3B8", marginBottom: 4 }}>Total Hours</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: GREEN }}>{volunteer.totalHours || totalHours}</div>
              </div>

              <div style={{ borderTop: "1px solid #E2E8F0", marginTop: 16, paddingTop: 16 }}>
                <button style={{ width: "100%", height: 40, backgroundColor: "#fff", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Send Message</button>
              </div>
            </div>
          </div>

          {/* Right - Activity log */}
          <div style={{ flex: 1 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontSize: 20, fontWeight: 600, color: "#1E293B", margin: 0 }}>Logged Activities</h2>
              <div className="flex gap-2">
                {(["All", "Pending", "Approved", "Rejected"] as Tab[]).map((t) => (
                  <button key={t} onClick={() => setTab(t)} style={{ height: 32, padding: "0 14px", borderRadius: 20, border: "none", backgroundColor: tab === t ? GREEN : "#fff", color: tab === t ? "#fff" : "#64748B", fontSize: 12, fontWeight: tab === t ? 600 : 500, cursor: "pointer", boxShadow: tab === t ? "none" : "0 0 0 1px #E2E8F0" }}>{t}</button>
                ))}
              </div>
            </div>

            <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1.5fr 2fr 0.8fr 1fr 1.5fr", padding: "12px 20px", backgroundColor: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
                {["Date", "Event", "Description", "Hours", "Status", "Actions"].map((h) => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
                ))}
              </div>
              {filtered.map((a: any) => {
                const sc = statusColors[a.status] || statusColors.Pending;
                return (
                  <div key={a.id} className="grid items-center" style={{ gridTemplateColumns: "1fr 1.5fr 2fr 0.8fr 1fr 1.5fr", padding: "14px 20px", borderBottom: "1px solid #F1F5F9" }}>
                    <div style={{ fontSize: 13, color: "#64748B" }}>{a.date}</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{a.event_name}</div>
                    <div style={{ fontSize: 13, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.description}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1E293B" }}>{a.hours}</div>
                    <div><span style={{ backgroundColor: sc.bg, color: sc.text, fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "3px 10px" }}>{a.status}</span></div>
                    <div className="flex gap-2">
                      {a.status === "Pending" ? (
                        <>
                          <button onClick={() => handleApprove(a.id)} style={{ height: 28, padding: "0 10px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Approve</button>
                          <button onClick={() => handleReject(a.id)} style={{ height: 28, padding: "0 10px", backgroundColor: "#DC2626", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Reject</button>
                        </>
                      ) : (
                        <span style={{ fontSize: 12, color: "#94A3B8" }}>—</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="text-center py-8" style={{ color: "#94A3B8", fontSize: 14 }}>No activities found.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
