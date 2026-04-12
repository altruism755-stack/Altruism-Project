import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Navbar } from "../components/Navbar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const GREEN = "#16A34A";

export function SupervisorDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const supName = profile?.name || "Supervisor";

  const [myVolunteers, setMyVolunteers] = useState<any[]>([]);
  const [pendingActivities, setPendingActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [volRes, actRes] = await Promise.all([
        api.getVolunteers({}),
        api.getActivities({ status: "Pending" }),
      ]);
      setMyVolunteers(volRes.volunteers || []);
      setPendingActivities(actRes.activities || []);
    } catch (e) { console.error("Failed to load dashboard:", e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const totalHoursThisMonth = 0; // Summary endpoint can provide this if needed

  const handleApprove = async (id: number) => {
    try {
      await api.approveActivity(id);
      setPendingActivities((p) => p.filter((a) => a.id !== id));
    } catch (e) { console.error("Approve failed:", e); }
  };

  const handleReject = async (id: number) => {
    try {
      await api.rejectActivity(id);
      setPendingActivities((p) => p.filter((a) => a.id !== id));
    } catch (e) { console.error("Reject failed:", e); }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="supervisor" userName={supName} />
      <div className="flex-1 flex items-center justify-center"><p style={{ color: "#94A3B8" }}>Loading...</p></div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="supervisor" userName={supName} />

      <div className="flex-1 px-8 py-6" style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "My Volunteers", value: myVolunteers.length, gradient: "linear-gradient(135deg,#16A34A,#22C55E)" },
            { label: "Pending Approvals", value: pendingActivities.length, gradient: "linear-gradient(135deg,#D97706,#F59E0B)" },
            { label: "Total Hours This Month", value: totalHoursThisMonth, gradient: "linear-gradient(135deg,#2563EB,#3B82F6)" },
          ].map((s) => (
            <div key={s.label} style={{ background: s.gradient, borderRadius: 12, padding: "20px 24px", height: 110, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{s.label}</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="flex gap-6">
          {/* Left - Pending Approvals */}
          <div style={{ flex: "0 0 55%" }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: "#1E293B", marginBottom: 16 }}>Pending Activity Approvals</h2>
            <div className="flex flex-col gap-3">
              {pendingActivities.map((a) => (
                <div key={a.id} style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#1E293B" }}>{a.volunteer_name}</div>
                      <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>Event: {a.event_name} · {a.hours} hrs · {a.date}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(a.id)} style={{ height: 32, padding: "0 14px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Approve</button>
                      <button onClick={() => handleReject(a.id)} style={{ height: 32, padding: "0 14px", backgroundColor: "#DC2626", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Reject</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "#94A3B8" }}>{a.description}</div>
                </div>
              ))}
              {pendingActivities.length === 0 && (
                <div className="text-center py-8" style={{ color: "#94A3B8", fontSize: 14 }}>No pending approvals.</div>
              )}
            </div>
          </div>

          {/* Right - My Volunteers */}
          <div style={{ flex: "0 0 45%" }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: "#1E293B", marginBottom: 16 }}>My Volunteers</h2>
            <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
              {myVolunteers.map((v, idx) => {
                const sc = v.status === "Active" ? { bg: "#DCFCE7", text: "#15803D" } : v.status === "Pending" ? { bg: "#FEF3C7", text: "#B45309" } : { bg: "#FEE2E2", text: "#B91C1C" };
                return (
                  <div
                    key={v.id}
                    onClick={() => navigate(`/supervisor/volunteer/${v.id}`)}
                    className="flex items-center gap-3 p-4"
                    style={{ borderBottom: idx < myVolunteers.length - 1 ? "1px solid #F1F5F9" : "none", cursor: "pointer", transition: "background 150ms" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#fff")}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: GREEN, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{v.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{v.name}</div>
                      <div style={{ fontSize: 12, color: "#94A3B8" }}>{v.total_hours || 0} hrs</div>
                    </div>
                    <span style={{ backgroundColor: sc.bg, color: sc.text, fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "3px 10px" }}>{v.status}</span>
                    <span style={{ color: "#CBD5E1" }}>→</span>
                  </div>
                );
              })}
              {myVolunteers.length === 0 && (
                <div className="text-center py-8" style={{ color: "#94A3B8", fontSize: 14 }}>No volunteers assigned yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
