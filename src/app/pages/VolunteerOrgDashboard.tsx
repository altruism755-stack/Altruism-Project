import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
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

export function VolunteerOrgDashboard() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const volName = profile?.name || "Volunteer";
  const volId = user?.id || 0;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"activities" | "certificates" | "pending">("activities");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.getVolunteerOrgDashboard(volId, Number(orgId));
        setData(res);
      } catch (e) { console.error("Failed to load org dashboard:", e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [volId, orgId]);

  if (loading) return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="volunteer" userName={volName} />
      <div className="flex-1 flex items-center justify-center"><p style={{ color: "#94A3B8" }}>Loading...</p></div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="volunteer" userName={volName} />
      <div className="flex-1 flex items-center justify-center"><p style={{ color: "#94A3B8" }}>Organization not found.</p></div>
    </div>
  );

  const org = data.organization;
  const activities = data.activities || [];
  const certificates = data.certificates || [];
  const pendingActivities = data.pending_activities || [];
  const pendingApplications = data.pending_applications || [];
  const totalHours = data.total_hours || 0;
  const completedCount = data.completed_activities || 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="volunteer" userName={volName} />

      <div className="flex-1 px-8 py-6" style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        {/* Back button + Org header */}
        <button onClick={() => navigate("/dashboard/profile")} style={{ background: "none", border: "none", color: "#64748B", fontSize: 14, cursor: "pointer", marginBottom: 16, padding: 0 }}>
          &larr; Back to Profile
        </button>

        <div className="flex items-center gap-4" style={{ marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <OrgLogo orgId={org.id} size={56} />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: "#1E293B", margin: 0 }}>{org.name}</h1>
            <div style={{ fontSize: 13, color: "#94A3B8" }}>{org.category || "Organization"}</div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)", borderRadius: 12, padding: "20px 24px", height: 110, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>Total Volunteer Hours</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{totalHours}</div>
          </div>
          <div style={{ background: "linear-gradient(135deg,#2563EB,#3B82F6)", borderRadius: 12, padding: "20px 24px", height: 110, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>Activities Completed</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{completedCount}</div>
          </div>
          <div style={{ background: "linear-gradient(135deg,#0891B2,#06B6D4)", borderRadius: 12, padding: "20px 24px", height: 110, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>Certificates Earned</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{certificates.length}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1" style={{ marginBottom: 20, borderBottom: "2px solid #E2E8F0" }}>
          {(["activities", "certificates", "pending"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "10px 20px", background: "none", border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? GREEN : "#64748B",
                borderBottom: activeTab === tab ? `2px solid ${GREEN}` : "2px solid transparent",
                marginBottom: -2, textTransform: "capitalize",
              }}
            >
              {tab === "pending" ? `Pending (${pendingActivities.length + pendingApplications.length})` : tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "activities" && (
          <div className="flex flex-col gap-3">
            {activities.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: "#94A3B8", fontSize: 14 }}>No activities recorded for this organization yet.</div>
            ) : (
              activities.map((a: any) => {
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
                    {a.description && <div style={{ fontSize: 13, color: "#94A3B8" }}>{a.description}</div>}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "certificates" && (
          <div className="flex flex-col gap-3">
            {certificates.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: "#94A3B8", fontSize: 14 }}>No certificates earned from this organization yet.</div>
            ) : (
              certificates.map((cert: any) => {
                const tc = certTypeColors[cert.type] || certTypeColors.Participation;
                return (
                  <div key={cert.id} style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#1E293B" }}>{cert.event_name}</div>
                        <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>{cert.issued_date} {cert.hours ? `\u00B7 ${cert.hours} hrs` : ""}</div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, backgroundColor: tc.bg, color: tc.text, borderRadius: 20, padding: "4px 12px" }}>{cert.type}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "pending" && (
          <div className="flex flex-col gap-3">
            {pendingActivities.length === 0 && pendingApplications.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: "#94A3B8", fontSize: 14 }}>No pending items for this organization.</div>
            ) : (
              <>
                {pendingActivities.length > 0 && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>Pending Activity Hours</div>
                    {pendingActivities.map((a: any) => (
                      <div key={a.id} style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{a.event_name}</div>
                            <div style={{ fontSize: 12, color: "#94A3B8" }}>{a.date} \u00B7 {a.hours} hrs</div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: "#FEF3C7", color: "#B45309", borderRadius: 20, padding: "3px 10px" }}>Pending</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {pendingApplications.length > 0 && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: pendingActivities.length > 0 ? 12 : 0 }}>Pending Event Applications</div>
                    {pendingApplications.map((app: any) => (
                      <div key={app.id} style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{app.event_name}</div>
                            <div style={{ fontSize: 12, color: "#94A3B8" }}>{app.event_date}</div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: "#FEF3C7", color: "#B45309", borderRadius: 20, padding: "3px 10px" }}>Pending</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
