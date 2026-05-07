import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Navbar } from "../components/Navbar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { OrgLogo } from "../components/OrgLogos";
import { MEMBERSHIP_STATUS } from "../types";

const GREEN = "#16A34A";

const statusColors: Record<string, { bg: string; text: string }> = {
  Pending: { bg: "#FEF3C7", text: "#B45309" },
  Approved: { bg: "#DCFCE7", text: "#15803D" },
  Rejected: { bg: "#FEE2E2", text: "#B91C1C" },
  Completed: { bg: "#DBEAFE", text: "#1D4ED8" },
};

function relativeDate(isoOrDate: string): string {
  const d = new Date(isoOrDate);
  if (isNaN(d.getTime())) return isoOrDate;
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function VolunteerDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const volName = profile?.name?.split(" ")[0] || "there";
  const volId = profile?.id || 0; // volunteer profile ID, not user.id

  const [volunteer, setVolunteer] = useState<any>(null);
  const [myActivities, setMyActivities] = useState<any[]>([]);
  const [myOrgs, setMyOrgs] = useState<any[]>([]);
  const [myCertificates, setMyCertificates] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [whatsNew, setWhatsNew] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [volRes, evtRes] = await Promise.all([
        api.getVolunteer(volId),
        api.getEvents({ status: "Upcoming" }),
      ]);
      setVolunteer(volRes);
      const activities = volRes.activities || [];
      const orgs = volRes.organizations || [];
      setMyActivities(activities);
      setMyOrgs(orgs);
      setMyCertificates((volRes.certificates || []).filter((c: any) => c.file_url));
      setUpcomingEvents((evtRes.events || []).slice(0, 3));

      // Build "What's New": events + announcements from active orgs, capped at 5
      const activeOrgIds: number[] = orgs
        .filter((o: any) => o.membership_status === MEMBERSHIP_STATUS.Active)
        .map((o: any) => o.id);

      if (activeOrgIds.length > 0) {
        const orgIdSet = new Set(activeOrgIds);
        const newEvents = (evtRes.events || [])
          .filter((e: any) => orgIdSet.has(e.org_id))
          .map((e: any) => ({ ...e, _kind: "event", _sortKey: e.date || "" }));

        const annRes = await api.getAnnouncements(activeOrgIds).catch(() => ({ announcements: [] }));
        const newAnns = (annRes.announcements || [])
          .map((a: any) => ({ ...a, _kind: "announcement", _sortKey: a.created_at || "" }));

        const merged = [...newEvents, ...newAnns]
          .sort((a, b) => b._sortKey.localeCompare(a._sortKey))
          .slice(0, 5);
        setWhatsNew(merged);
      }
    } catch (e) { console.error("Failed to load dashboard:", e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [volId]);

  const totalHours = myActivities.filter((a) => a.status === "Approved").reduce((s: number, a: any) => s + (a.hours || 0), 0);
  const totalSubmitted = myActivities.length;

  // Hours logged this calendar month
  const thisMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const hoursThisMonth = myActivities
    .filter((a) => a.status === "Approved" && (a.date || "").startsWith(thisMonth))
    .reduce((s: number, a: any) => s + (a.hours || 0), 0);

  // Days since last approved activity
  const lastActivityDate = myActivities
    .filter((a) => a.status === "Approved")
    .map((a) => a.date)
    .filter(Boolean)
    .sort()
    .at(-1);
  const daysSinceActive = lastActivityDate
    ? Math.floor((Date.now() - new Date(lastActivityDate).getTime()) / 86_400_000)
    : null;

  const hasNoOrgs = myOrgs.length === 0;
  const isLapsed = daysSinceActive !== null && daysSinceActive > 30;
  const isNewUser = totalSubmitted === 0 && myOrgs.length === 0;

  if (loading) return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="volunteer" />
      <div className="flex-1 flex items-center justify-center"><p style={{ color: "#94A3B8" }}>Loading...</p></div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="volunteer" />

      <div className="flex-1 px-8 py-6" style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>

        {/* Welcome-back greeting */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1E293B", margin: "0 0 4px 0" }}>
            Welcome back, {volName}!
          </h1>
          {hoursThisMonth > 0 ? (
            <p style={{ fontSize: 14, color: "#64748B", margin: 0 }}>
              You've contributed <strong style={{ color: GREEN }}>{hoursThisMonth} hour{hoursThisMonth !== 1 ? "s" : ""}</strong> this month. Keep it up!
            </p>
          ) : isNewUser ? (
            <p style={{ fontSize: 14, color: "#64748B", margin: 0 }}>
              Ready to get started? Join an organization and attend your first activity.
            </p>
          ) : isLapsed ? (
            <p style={{ fontSize: 14, color: "#64748B", margin: 0 }}>
              It's been a while — your last approved activity was {daysSinceActive} days ago. There might be new events waiting for you.
            </p>
          ) : (
            <p style={{ fontSize: 14, color: "#64748B", margin: 0 }}>
              Here's an overview of your volunteer activity.
            </p>
          )}
        </div>

        {/* Call-to-action banners */}
        {hasNoOrgs && (
          <div style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1D4ED8", marginBottom: 2 }}>Join an organization to get started</div>
              <div style={{ fontSize: 13, color: "#3B82F6" }}>Browse organizations and apply for membership to see their events and announcements.</div>
            </div>
            <button
              onClick={() => navigate("/dashboard/orgs")}
              style={{ flexShrink: 0, height: 36, padding: "0 18px", backgroundColor: "#2563EB", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              Browse Organizations
            </button>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Hours Logged", value: volunteer?.totalHours || totalHours, gradient: "linear-gradient(135deg,#16A34A,#22C55E)" },
            { label: "Activities Logged", value: totalSubmitted, gradient: "linear-gradient(135deg,#2563EB,#3B82F6)" },
            { label: "Certificates Earned", value: myCertificates.length, gradient: "linear-gradient(135deg,#0891B2,#06B6D4)" },
          ].map((s) => (
            <div key={s.label} style={{ background: s.gradient, borderRadius: 12, padding: "20px 24px", height: 110, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{s.label}</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* What's New — feed preview from active orgs */}
        {whatsNew.length > 0 && (
          <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", margin: 0 }}>What's New</h2>
              <a
                onClick={() => navigate("/dashboard/feed")}
                style={{ fontSize: 13, color: GREEN, fontWeight: 500, cursor: "pointer", textDecoration: "none" }}
              >
                See all →
              </a>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {whatsNew.map((item, idx) => (
                <div
                  key={`${item._kind}-${item.id}`}
                  onClick={() => {
                    if (item._kind === "event") navigate(`/dashboard/org/${item.org_id}?tab=events`);
                    else navigate(`/dashboard/org/${item.org_id}?tab=announcements`);
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 0",
                    borderBottom: idx < whatsNew.length - 1 ? "1px solid #F1F5F9" : "none",
                    cursor: "pointer",
                  }}
                >
                  <span style={{
                    flexShrink: 0, fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "2px 7px",
                    backgroundColor: item._kind === "event" ? "#DCFCE7" : "#DBEAFE",
                    color: item._kind === "event" ? "#15803D" : "#1D4ED8",
                  }}>
                    {item._kind === "event" ? "EVENT" : "ANNOUNCEMENT"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 14, color: "#1E293B", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                      {item._kind === "event" ? item.name : item.title}
                    </span>
                    <span style={{ fontSize: 12, color: "#94A3B8" }}>{item.org_name}</span>
                  </div>
                  <span style={{ flexShrink: 0, fontSize: 12, color: "#94A3B8" }}>
                    {relativeDate(item._kind === "event" ? item.date : item.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  const title = cert.certificate_title || cert.type || "Certificate";
                  return (
                    <div key={cert.id} className="py-3" style={{ borderBottom: idx < myCertificates.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#1E293B", marginBottom: 2 }}>{title}</div>
                      <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 6 }}>
                        {cert.org_name}{cert.event_name ? ` · ${cert.event_name}` : ""} · {cert.issued_date}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => api.viewCertificateFile(cert.id).catch(() => {})}
                          style={{ height: 26, padding: "0 10px", fontSize: 11, fontWeight: 600, backgroundColor: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", borderRadius: 6, cursor: "pointer" }}
                        >
                          View
                        </button>
                        <button
                          onClick={() => api.downloadCertificateFile(cert.id, title).catch(() => {})}
                          style={{ height: 26, padding: "0 10px", fontSize: 11, fontWeight: 600, backgroundColor: "#F0FDF4", color: "#15803D", border: "1px solid #BBF7D0", borderRadius: 6, cursor: "pointer" }}
                        >
                          Download
                        </button>
                      </div>
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
            </div>

            <div className="flex flex-col gap-3">
              {myActivities.map((a: any) => {
                const sc = statusColors[a.status] || statusColors.Pending;
                const hasHours = a.hours != null && a.hours > 0;
                return (
                  <div key={a.id} style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#1E293B" }}>{a.event_name}</div>
                        <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>{a.date}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span style={{ backgroundColor: "#DCFCE7", color: GREEN, fontSize: 12, fontWeight: 600, borderRadius: 20, padding: "3px 10px" }}>
                          {hasHours ? `${a.hours} hrs contributed` : "Participated"}
                        </span>
                        <span style={{ backgroundColor: sc.bg, color: sc.text, fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "3px 10px" }}>{a.status}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "#94A3B8" }}>{a.description}</div>
                  </div>
                );
              })}
              {myActivities.length === 0 && (
                <div className="text-center py-8" style={{ color: "#94A3B8", fontSize: 14 }}>No activities logged yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
