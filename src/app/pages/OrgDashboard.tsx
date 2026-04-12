import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Navbar } from "../components/Navbar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const GREEN = "#16A34A";

export function OrgDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const orgName = profile?.name || "Organization";

  const [summary, setSummary] = useState<any>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [sumRes, volRes, evtRes] = await Promise.all([
        api.getReportSummary(),
        api.getVolunteers({ status: "Pending" }),
        api.getEvents(),
      ]);
      setSummary(sumRes);
      setPending(volRes.volunteers || []);
      setRecentEvents((evtRes.events || []).slice(0, 4));
    } catch (e) {
      console.error("Failed to load dashboard data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (id: number) => {
    try {
      const orgId = profile?.id;
      if (orgId) await api.approveOrgMember(orgId, id, {});
      setPending((p) => p.filter((v) => v.id !== id));
    } catch (e) { console.error("Approve failed:", e); }
  };

  const handleReject = async (id: number) => {
    try {
      await api.updateVolunteerStatus(id, "Suspended");
      setPending((p) => p.filter((v) => v.id !== id));
    } catch (e) { console.error("Reject failed:", e); }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="org" userName={orgName} />
      <div className="flex-1 flex items-center justify-center"><p style={{ color: "#94A3B8" }}>Loading...</p></div>
    </div>
  );

  const totalVolunteers = summary?.totalVolunteers || 0;
  const pendingCount = (summary?.pendingActivities || 0) + pending.length;
  const activeEvents = (summary?.totalEvents || 0) - (summary?.completedEvents || 0);
  const hoursThisMonth = summary?.totalHours || 0;

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="org" userName={orgName} />

      <div className="flex-1 px-8 py-6" style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 600, color: "#1E293B", margin: 0 }}>Welcome back, {orgName}</h1>
            <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>{today}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate("/org/supervisors")} style={{ height: 40, padding: "0 20px", backgroundColor: "#fff", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Add Supervisor</button>
            <button onClick={() => navigate("/org/events")} style={{ height: 40, padding: "0 20px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Create Event</button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Volunteers", value: totalVolunteers, gradient: "linear-gradient(135deg,#16A34A,#22C55E)", icon: "👥" },
            { label: "Pending Approvals", value: pendingCount, gradient: "linear-gradient(135deg,#D97706,#F59E0B)", icon: "⏳" },
            { label: "Active Events", value: activeEvents, gradient: "linear-gradient(135deg,#2563EB,#3B82F6)", icon: "📅" },
            { label: "Hours This Month", value: hoursThisMonth, gradient: "linear-gradient(135deg,#0891B2,#06B6D4)", icon: "📊" },
          ].map((s) => (
            <div key={s.label} style={{ background: s.gradient, borderRadius: 12, padding: "20px 24px", height: 120, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ fontSize: 24 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="flex gap-6">
          {/* Left - Pending Approvals */}
          <div style={{ flex: "0 0 60%" }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: "#1E293B", marginBottom: 16 }}>Pending Approvals</h2>
            <div className="flex flex-col gap-3">
              {pending.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderLeft: "4px solid #D97706" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#1E293B" }}>{v.name}</div>
                    <div style={{ fontSize: 13, color: "#64748B" }}>{v.email}</div>
                    <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>Applied {v.created_at?.split("T")[0] || "recently"}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(v.id)} style={{ height: 32, padding: "0 14px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Approve</button>
                    <button onClick={() => handleReject(v.id)} style={{ height: 32, padding: "0 14px", backgroundColor: "#DC2626", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Reject</button>
                  </div>
                </div>
              ))}
              {pending.length === 0 && (
                <div className="text-center py-8" style={{ color: "#94A3B8", fontSize: 14 }}>No pending approvals right now.</div>
              )}
            </div>
          </div>

          {/* Right - Recent Events */}
          <div style={{ flex: "0 0 40%" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontSize: 20, fontWeight: 600, color: "#1E293B" }}>Recent Events</h2>
              <button onClick={() => navigate("/org/events")} style={{ fontSize: 13, color: "#2563EB", background: "none", border: "none", cursor: "pointer" }}>View all →</button>
            </div>
            <div style={{ backgroundColor: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden" }}>
              {recentEvents.map((event, idx) => {
                const statusColors: Record<string, { bg: string; text: string }> = {
                  Upcoming: { bg: "#DCFCE7", text: "#15803D" },
                  Active: { bg: "#FEF3C7", text: "#B45309" },
                  Completed: { bg: "#F1F5F9", text: "#64748B" },
                };
                const sc = statusColors[event.status] || statusColors.Completed;
                return (
                  <div key={event.id} className="p-4" style={{ borderBottom: idx < recentEvents.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#1E293B" }}>{event.name}</span>
                      <span style={{ fontSize: 12, backgroundColor: sc.bg, color: sc.text, borderRadius: 20, padding: "2px 10px", fontWeight: 500 }}>{event.status}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#64748B" }}>📅 {event.date} · 📍 {event.location}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
