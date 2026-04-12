import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Navbar } from "../components/Navbar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { OrgLogo } from "../components/OrgLogos";

const GREEN = "#16A34A";

const statusColors: Record<string, { bg: string; text: string }> = {
  Pending: { bg: "#FEF3C7", text: "#B45309" },
  Approved: { bg: "#DCFCE7", text: "#15803D" },
  Rejected: { bg: "#FEE2E2", text: "#B91C1C" },
};

const certTypeColors: Record<string, { bg: string; text: string }> = {
  Participation: { bg: "#DBEAFE", text: "#1D4ED8" },
  Achievement: { bg: "#FEF3C7", text: "#B45309" },
  Completion: { bg: "#DCFCE7", text: "#15803D" },
};

export function VolunteerDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const volName = profile?.name || "Volunteer";
  const volId = user?.id || 0;

  const [volunteer, setVolunteer] = useState<any>(null);
  const [myActivities, setMyActivities] = useState<any[]>([]);
  const [myOrgs, setMyOrgs] = useState<any[]>([]);
  const [myCertificates, setMyCertificates] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [volRes, evtRes] = await Promise.all([
        api.getVolunteer(volId),
        api.getEvents({ status: "Upcoming" }),
      ]);
      setVolunteer(volRes);
      setMyActivities(volRes.activities || []);
      setMyOrgs(volRes.organizations || []);
      setMyCertificates(volRes.certificates || []);
      setUpcomingEvents((evtRes.events || []).slice(0, 3));
    } catch (e) { console.error("Failed to load dashboard:", e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [volId]);

  const totalHours = myActivities.filter((a) => a.status === "Approved").reduce((s: number, a: any) => s + (a.hours || 0), 0);
  const totalSubmitted = myActivities.length;
  const pendingReview = myActivities.filter((a) => a.status === "Pending").length;

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
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Hours Logged", value: volunteer?.totalHours || totalHours, gradient: "linear-gradient(135deg,#16A34A,#22C55E)" },
            { label: "Activities Submitted", value: totalSubmitted, gradient: "linear-gradient(135deg,#2563EB,#3B82F6)" },
            { label: "Pending Review", value: pendingReview, gradient: "linear-gradient(135deg,#D97706,#F59E0B)" },
            { label: "Certificates Earned", value: myCertificates.length, gradient: "linear-gradient(135deg,#0891B2,#06B6D4)" },
          ].map((s) => (
            <div key={s.label} style={{ background: s.gradient, borderRadius: 12, padding: "20px 24px", height: 110, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{s.label}</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Left - My Organizations + Certificates + Upcoming Events */}
          <div style={{ flex: "0 0 35%" }}>
            {/* My Organizations */}
            <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", margin: "0 0 16px 0" }}>My Organizations</h3>
              {myOrgs.map((org: any, idx: number) => (
                <div key={org.id} className="flex items-center gap-3" style={{ padding: "10px 0", borderBottom: idx < myOrgs.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <OrgLogo orgId={org.id} size={40} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1E293B" }}>{org.name}</div>
                    <div style={{ fontSize: 12, color: "#94A3B8" }}>{org.category || "Organization"}</div>
                  </div>
                </div>
              ))}
              {myOrgs.length === 0 && (
                <div style={{ fontSize: 13, color: "#94A3B8" }}>You haven't joined any organizations yet.</div>
              )}
            </div>

            {/* Certificates */}
            <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", margin: "0 0 12px 0" }}>My Certificates</h3>
              {myCertificates.length === 0 ? (
                <div style={{ fontSize: 13, color: "#94A3B8" }}>No certificates yet.</div>
              ) : (
                myCertificates.map((cert: any, idx: number) => {
                  const tc = certTypeColors[cert.type] || certTypeColors.Participation;
                  return (
                    <div key={cert.id} className="py-3" style={{ borderBottom: idx < myCertificates.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span style={{ fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{cert.event_name}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: tc.bg, color: tc.text, borderRadius: 20, padding: "2px 8px" }}>{cert.type}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#94A3B8" }}>{cert.org_name} · {cert.issued_date} · {cert.hours} hrs</div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Upcoming Events */}
            <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", margin: "0 0 12px 0" }}>Upcoming Events</h3>
              {upcomingEvents.length === 0 ? (
                <div style={{ fontSize: 13, color: "#94A3B8" }}>No upcoming events.</div>
              ) : (
                upcomingEvents.map((e: any, idx: number) => (
                  <div key={e.id} className="flex items-center gap-3 py-3" style={{ borderBottom: idx < upcomingEvents.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                    <span style={{ backgroundColor: "#DCFCE7", color: "#15803D", fontSize: 11, fontWeight: 600, borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>{e.date}</span>
                    <span style={{ fontSize: 14, color: "#1E293B" }}>{e.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right - Recent Activity */}
          <div style={{ flex: "0 0 65%" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontSize: 20, fontWeight: 600, color: "#1E293B", margin: 0 }}>Recent Activity</h2>
              <button onClick={() => navigate("/dashboard/log-activity")} style={{ height: 40, padding: "0 20px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Log New Activity</button>
            </div>

            <div className="flex flex-col gap-3">
              {myActivities.map((a: any) => {
                const sc = statusColors[a.status] || statusColors.Pending;
                return (
                  <div key={a.id} style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#1E293B" }}>{a.event_name}</div>
                        <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>{a.date}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span style={{ backgroundColor: "#DCFCE7", color: GREEN, fontSize: 12, fontWeight: 600, borderRadius: 20, padding: "3px 10px" }}>{a.hours} hrs</span>
                        <span style={{ backgroundColor: sc.bg, color: sc.text, fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "3px 10px" }}>{a.status}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "#94A3B8" }}>{a.description}</div>
                  </div>
                );
              })}
              {myActivities.length === 0 && (
                <div className="text-center py-8" style={{ color: "#94A3B8", fontSize: 14 }}>No activities yet. Log your first activity!</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
