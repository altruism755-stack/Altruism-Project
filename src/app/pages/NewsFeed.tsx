import { useState, useEffect } from "react";
import { Navbar } from "../components/Navbar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { OrgLogo } from "../components/OrgLogos";

const GREEN = "#16A34A";

export function NewsFeed() {
  const { user, profile } = useAuth();
  const volName = profile?.name || "Volunteer";
  const volId = user?.id || 0;

  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [appliedEvents, setAppliedEvents] = useState<Set<number>>(new Set());
  const [applyingTo, setApplyingTo] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "events" | "announcements">("all");
  const [myOrgIds, setMyOrgIds] = useState<number[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // First, fetch volunteer profile to know which orgs they belong to (Active only)
        const volRes = await api.getVolunteer(volId);
        const activeOrgs: any[] = (volRes.organizations || []).filter(
          (o: any) => o.membership_status === "Active"
        );
        const orgIds = activeOrgs.map((o: any) => o.id);
        setMyOrgIds(orgIds);

        if (orgIds.length === 0) {
          setLoading(false);
          return;
        }

        // Fetch events + announcements + applications in parallel, then filter to only our orgs
        const [evtRes, annRes, appsRes] = await Promise.all([
          api.getEvents({ status: "Upcoming" }),
          api.getAnnouncements(orgIds).catch(() => ({ announcements: [] })),
          api.getEventApplications().catch(() => ({ applications: [] })),
        ]);

        const orgIdSet = new Set(orgIds);
        const filteredEvents = (evtRes.events || []).filter((e: any) => orgIdSet.has(e.org_id));
        setUpcomingEvents(filteredEvents);
        setAnnouncements(annRes.announcements || []);

        const applied = new Set<number>((appsRes.applications || []).map((a: any) => a.event_id));
        setAppliedEvents(applied);
      } catch (e) { console.error("Failed to load feed:", e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [volId]);

  const handleApply = async (eventId: number) => {
    setApplyingTo(eventId);
    try {
      await api.applyToEvent(eventId);
      setAppliedEvents((prev) => new Set([...prev, eventId]));
    } catch (e: any) {
      console.error("Failed to apply:", e);
    }
    setApplyingTo(null);
  };

  // Merge events and announcements into a combined feed sorted by date
  const feedItems: any[] = [];
  upcomingEvents.forEach((e) => feedItems.push({ ...e, _type: "event", _sortDate: e.date }));
  announcements.forEach((a) => feedItems.push({ ...a, _type: "announcement", _sortDate: a.created_at }));
  feedItems.sort((a, b) => (b._sortDate || "").localeCompare(a._sortDate || ""));

  const filteredItems = activeTab === "all" ? feedItems
    : activeTab === "events" ? feedItems.filter((i) => i._type === "event")
    : feedItems.filter((i) => i._type === "announcement");

  if (loading) return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="volunteer" />
      <div className="flex-1 flex items-center justify-center"><p style={{ color: "#94A3B8" }}>Loading...</p></div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="volunteer" />

      <div className="flex-1 px-8 py-6" style={{ maxWidth: 800, margin: "0 auto", width: "100%" }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, color: "#1E293B", margin: "0 0 8px 0" }}>News Feed</h1>
        <p style={{ fontSize: 14, color: "#94A3B8", margin: "0 0 24px 0" }}>
          Updates from the organizations you belong to.
        </p>

        {myOrgIds.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#1E293B", marginBottom: 6 }}>No organizations yet</div>
            <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>
              Join an organization to see their activities and announcements here.
            </div>
            <a href="/dashboard/orgs" style={{ color: GREEN, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              Browse organizations →
            </a>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1" style={{ marginBottom: 24, borderBottom: "2px solid #E2E8F0" }}>
              {([
                { key: "all", label: "All" },
                { key: "events", label: `Activities (${upcomingEvents.length})` },
                { key: "announcements", label: `Announcements (${announcements.length})` },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  style={{
                    padding: "10px 20px", background: "none", border: "none", cursor: "pointer",
                    fontSize: 14, fontWeight: activeTab === tab.key ? 600 : 400,
                    color: activeTab === tab.key ? GREEN : "#64748B",
                    borderBottom: activeTab === tab.key ? `2px solid ${GREEN}` : "2px solid transparent",
                    marginBottom: -2,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Feed items */}
            <div className="flex flex-col gap-4">
              {filteredItems.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, color: "#94A3B8", fontSize: 14 }}>No items to show.</div>
              )}

              {filteredItems.map((item) => {
                if (item._type === "event") {
                  const alreadyApplied = appliedEvents.has(item.id);
                  return (
                    <div key={`event-${item.id}`} style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20 }}>
                      <div className="flex items-start gap-4">
                        <div style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <OrgLogo orgId={item.org_id} size={44} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: "#DCFCE7", color: "#15803D", borderRadius: 4, padding: "2px 8px" }}>Activity</span>
                            <span style={{ fontSize: 12, color: "#94A3B8" }}>{item.org_name}</span>
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", marginBottom: 6 }}>{item.name}</div>
                          {item.description && <div style={{ fontSize: 13, color: "#64748B", marginBottom: 8, lineHeight: 1.5 }}>{item.description}</div>}
                          <div className="flex items-center gap-4 flex-wrap" style={{ fontSize: 12, color: "#94A3B8" }}>
                            <span>{item.date}</span>
                            {item.time && <span>{item.time}</span>}
                            {item.location && <span>{item.location}</span>}
                            {item.duration && <span>{item.duration} hrs</span>}
                            {item.max_volunteers > 0 && (
                              <span>{item.current_volunteers || 0}/{item.max_volunteers} volunteers</span>
                            )}
                          </div>
                          {item.required_skills && (
                            <div className="flex flex-wrap gap-1" style={{ marginTop: 8 }}>
                              {item.required_skills.split(",").map((s: string, i: number) => (
                                <span key={i} style={{ fontSize: 11, backgroundColor: "#F1F5F9", color: "#64748B", padding: "2px 8px", borderRadius: 12 }}>{s.trim()}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          {alreadyApplied ? (
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#15803D", backgroundColor: "#DCFCE7", padding: "6px 16px", borderRadius: 8 }}>Applied</span>
                          ) : (
                            <button
                              onClick={() => handleApply(item.id)}
                              disabled={applyingTo === item.id}
                              style={{
                                height: 36, padding: "0 20px", backgroundColor: applyingTo === item.id ? "#86EFAC" : GREEN,
                                color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
                                cursor: applyingTo === item.id ? "not-allowed" : "pointer",
                              }}
                            >
                              {applyingTo === item.id ? "Applying..." : "Apply"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Announcement
                return (
                  <div key={`ann-${item.id}`} style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20 }}>
                    <div className="flex items-start gap-4">
                      <div style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <OrgLogo orgId={item.org_id} size={44} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: "#DBEAFE", color: "#1D4ED8", borderRadius: 4, padding: "2px 8px" }}>Announcement</span>
                          <span style={{ fontSize: 12, color: "#94A3B8" }}>{item.org_name}</span>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", marginBottom: 6 }}>{item.title}</div>
                        {item.content && <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5 }}>{item.content}</div>}
                        <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 8 }}>{item.created_at?.split("T")[0] || ""}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
