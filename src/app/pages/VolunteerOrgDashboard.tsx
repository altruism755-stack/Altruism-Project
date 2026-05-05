import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { Navbar } from "../components/Navbar";
import { BackButton } from "../components/BackButton";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { OrgLogoByName } from "../components/OrgLogos";

const GREEN  = "#16A34A";
const INDIGO = "#4F46E5";

const statusColors: Record<string, { bg: string; text: string }> = {
  Pending:  { bg: "#FEF3C7", text: "#B45309" },
  Approved: { bg: "#DCFCE7", text: "#15803D" },
  Rejected: { bg: "#FEE2E2", text: "#B91C1C" },
};

const certTypeColors: Record<string, { bg: string; text: string }> = {
  Participation: { bg: "#DBEAFE", text: "#1D4ED8" },
  Achievement:   { bg: "#FEF3C7", text: "#B45309" },
  Completion:    { bg: "#DCFCE7", text: "#15803D" },
};

function formatTime(time?: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

type TabType = "events" | "activities" | "certificates" | "pending";

export function VolunteerOrgDashboard() {
  const { orgId } = useParams<{ orgId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const volId = profile?.id || 0; // volunteer profile ID, not user.id

  const initialTab = (searchParams.get("tab") as TabType) || "events";

  const [data,           setData]           = useState<any>(null);
  const [orgEvents,      setOrgEvents]      = useState<any[]>([]);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [activeTab,      setActiveTab]      = useState<TabType>(initialTab);
  const [applyingId,     setApplyingId]     = useState<number | null>(null);
  const [applyError,     setApplyError]     = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [res, evtRes, appsRes] = await Promise.all([
          api.getVolunteerOrgDashboard(volId, Number(orgId)),
          api.getEvents({ org_id: String(orgId), status: "Upcoming" }),
          api.getEventApplications(),
        ]);
        setData(res);
        setOrgEvents(evtRes.events || []);
        setMyApplications(appsRes.applications || []);

        // If ?tab=pending was requested but this org has nothing pending, fall back to events
        if (searchParams.get("tab") === "pending") {
          const pAct = (res.pending_activities || []).length;
          const pApp = (res.pending_applications || []).length;
          if (pAct + pApp === 0) setActiveTab("events");
        }
      } catch (e) {
        console.error("Failed to load org dashboard:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [volId, orgId]);

  const refreshApplications = async () => {
    try {
      const appsRes = await api.getEventApplications();
      setMyApplications(appsRes.applications || []);
    } catch { /* ignore */ }
  };

  const handleApply = async (eventId: number) => {
    setApplyingId(eventId);
    setApplyError(null);
    try {
      await api.applyToEvent(eventId);
      await refreshApplications();
    } catch (e: any) {
      setApplyError(e?.message || "Failed to apply. Please try again.");
    } finally {
      setApplyingId(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="volunteer" />
      <div className="flex-1 flex items-center justify-center">
        <div style={{ textAlign: "center", color: "#94A3B8" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <p>Loading organization dashboard…</p>
        </div>
      </div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="volunteer" />
      <div className="flex-1 flex items-center justify-center">
        <div style={{ textAlign: "center", color: "#94A3B8" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🏢</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#64748B", marginBottom: 8 }}>Organization not found</div>
          <div style={{ marginBottom: 20 }}>This organization may have been removed or you don't have access.</div>
          <button onClick={() => navigate("/dashboard/orgs")} style={{ height: 38, padding: "0 20px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Browse Organizations
          </button>
        </div>
      </div>
    </div>
  );

  const org                = data.organization;
  const activities         = data.activities         || [];
  const certificates       = data.certificates       || [];
  const pendingApplications = data.pending_applications || [];
  const totalHours         = data.total_hours         || 0;
  const completedCount     = data.completed_activities || 0;
  const memberStatus       = data.member_status       || "Pending";

  // Applications lookup
  const appliedMap = new Map<number, string>(); // eventId → applicationStatus
  myApplications.forEach((a: any) => appliedMap.set(a.event_id, a.status));

  const tabs: { key: TabType; label: string }[] = [
    { key: "events",       label: `Events (${orgEvents.length})`                                                          },
    { key: "activities",   label: "Activities"                                                                             },
    { key: "certificates", label: "Certificates"                                                                           },
    { key: "pending",      label: pendingApplications.length > 0 ? `Pending (${pendingApplications.length})` : "Pending"  },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="volunteer" />

      <div className="flex-1 px-8 py-6" style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        <BackButton to="/dashboard/orgs" label="Organizations" />

        {/* ── Org header ── */}
        <div className="flex items-center gap-4" style={{ marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid #E2E8F0", backgroundColor: "#F8FAFC" }}>
            <OrgLogoByName name={org.name} size={56} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: "#1E293B", margin: 0 }}>{org.name}</h1>
            <div style={{ fontSize: 13, color: "#94A3B8" }}>{org.category || "Organization"}</div>
          </div>
          <div className="flex gap-2" style={{ flexShrink: 0 }}>
            <button onClick={() => navigate(`/dashboard/org/${orgId}/profile`)}
              style={{ height: 36, padding: "0 16px", backgroundColor: "#fff", color: "#334155", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              View Profile
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {([
            { label: "Total Volunteer Hours", value: totalHours,           emptyText: "No hours recorded yet",  gradient: "linear-gradient(135deg,#16A34A,#22C55E)" },
            { label: "Activities Completed",  value: completedCount,       emptyText: "No activities yet",      gradient: "linear-gradient(135deg,#2563EB,#3B82F6)" },
            { label: "Certificates Earned",   value: certificates.length,  emptyText: "No certificates yet",    gradient: "linear-gradient(135deg,#0891B2,#06B6D4)" },
          ]).map(({ label, value, emptyText, gradient }) => (
            <div key={label} style={{ background: gradient, borderRadius: 12, padding: "20px 24px", height: 110, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{label}</div>
              {value > 0 ? (
                <div style={{ fontSize: 36, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{value}</div>
              ) : (
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", fontStyle: "italic" }}>{emptyText}</div>
              )}
            </div>
          ))}
        </div>

        {/* ── Status banners ── */}
        {memberStatus === "Pending" && (
          <Banner icon="⏳" color="#F59E0B" bg="#FFFBEB" border="#FDE68A"
            title="Waiting for Approval"
            body="Your membership request is under review. You'll get a notification once the admin responds." />
        )}

        {/* Apply error */}
        {applyError && (
          <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#B91C1C" }}>
            {applyError}
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-1" style={{ marginBottom: 20, borderBottom: "2px solid #E2E8F0" }}>
          {tabs.map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              padding: "10px 20px", background: "none", border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: activeTab === key ? 600 : 400,
              color: activeTab === key ? GREEN : "#64748B",
              borderBottom: activeTab === key ? `2px solid ${GREEN}` : "2px solid transparent",
              marginBottom: -2, whiteSpace: "nowrap",
            }}>{label}</button>
          ))}
        </div>

        {/* ── Events Tab ── */}
        {activeTab === "events" && (
          <div className="flex flex-col gap-3">
            {orgEvents.length === 0 ? (
              <EmptyState icon="📅" title="No upcoming events"
                body={`${org.name} hasn't scheduled any upcoming events yet. Check back later.`} />
            ) : (
              orgEvents.map((evt: any) => {
                const appStatus = appliedMap.get(evt.id);
                const isApplied = appStatus !== undefined;
                const asc = appStatus ? (statusColors[appStatus] || statusColors.Pending) : null;
                const isFull = evt.max_volunteers > 0 && evt.current_volunteers >= evt.max_volunteers;
                const spotsLeft = evt.max_volunteers > 0 ? evt.max_volunteers - evt.current_volunteers : null;
                const fillPct = evt.max_volunteers > 0
                  ? Math.min(100, Math.round((evt.current_volunteers / evt.max_volunteers) * 100))
                  : 0;

                return (
                  <div key={evt.id} style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                      {/* Left: event info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                          <span style={{ fontSize: 15, fontWeight: 600, color: "#1E293B" }}>{evt.name}</span>
                          {isApplied && asc && (
                            <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: asc.bg, color: asc.text, borderRadius: 20, padding: "2px 10px" }}>{appStatus}</span>
                          )}
                          {isFull && !isApplied && (
                            <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: "#FEE2E2", color: "#B91C1C", borderRadius: 20, padding: "2px 10px" }}>Full</span>
                          )}
                        </div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 13, color: "#64748B", marginBottom: 8 }}>
                          <span>📅 {formatDate(evt.date)}</span>
                          {evt.time && <span>🕐 {formatTime(evt.time)}{evt.duration ? ` · ${evt.duration}h` : ""}</span>}
                          {evt.location && <span>📍 {evt.location}</span>}
                        </div>

                        {evt.description && (
                          <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.55, marginBottom: 10 }}>
                            {evt.description}
                          </div>
                        )}

                        {evt.required_skills && (
                          <div style={{ fontSize: 12, color: "#64748B", marginBottom: 10 }}>
                            <span style={{ fontWeight: 600 }}>Skills: </span>{evt.required_skills}
                          </div>
                        )}

                        {/* Volunteer fill bar */}
                        {evt.max_volunteers > 0 && (
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94A3B8", marginBottom: 4 }}>
                              <span>{evt.current_volunteers} / {evt.max_volunteers} volunteers filled</span>
                              {!isFull && spotsLeft !== null && <span style={{ color: spotsLeft <= 5 ? "#DC2626" : "#64748B" }}>{spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left</span>}
                            </div>
                            <div style={{ height: 5, borderRadius: 3, backgroundColor: "#F1F5F9", overflow: "hidden" }}>
                              <div style={{
                                height: "100%", borderRadius: 3, transition: "width 400ms ease",
                                backgroundColor: isFull ? "#DC2626" : fillPct >= 80 ? "#F59E0B" : GREEN,
                                width: `${fillPct}%`,
                              }} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right: CTA */}
                      <div style={{ flexShrink: 0, paddingTop: 2 }}>
                        {isApplied ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748B", fontWeight: 500 }}>
                            <span style={{ fontSize: 16 }}>{appStatus === "Approved" ? "✅" : appStatus === "Rejected" ? "❌" : "⏳"}</span>
                            Applied
                          </div>
                        ) : memberStatus !== "Active" ? (
                          <span style={{ fontSize: 12, color: "#94A3B8" }}>Join org to apply</span>
                        ) : isFull ? (
                          <span style={{ fontSize: 12, color: "#94A3B8" }}>Event full</span>
                        ) : (
                          <button
                            disabled={applyingId === evt.id}
                            onClick={() => handleApply(evt.id)}
                            style={{
                              height: 36, padding: "0 20px",
                              backgroundColor: applyingId === evt.id ? "#94A3B8" : INDIGO,
                              color: "#fff", border: "none", borderRadius: 8,
                              fontSize: 13, fontWeight: 600,
                              cursor: applyingId === evt.id ? "not-allowed" : "pointer",
                              transition: "background 150ms",
                            }}>
                            {applyingId === evt.id ? "Applying…" : "Apply"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Activities Tab ── */}
        {activeTab === "activities" && (
          <div className="flex flex-col gap-3">
            {activities.length === 0 ? (
              <EmptyState icon="📋" title="No activities yet"
                body={`Your supervisor will record your volunteer hours here after each activity at ${org.name}.`} />
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

        {/* ── Certificates Tab ── */}
        {activeTab === "certificates" && (
          <div className="flex flex-col gap-3">
            {certificates.length === 0 ? (
              <EmptyState icon="🏆" title="No certificates yet"
                body="Certificates will appear here once the organization uploads them for you." />
            ) : (
              certificates.map((cert: any) => {
                const tc = certTypeColors[cert.type] || certTypeColors.Participation;
                return (
                  <div key={cert.id} style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#1E293B" }}>{cert.event_name}</div>
                        <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
                          {cert.issued_date}{cert.hours ? ` · ${cert.hours} hrs` : ""}
                        </div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, backgroundColor: tc.bg, color: tc.text, borderRadius: 20, padding: "4px 12px" }}>{cert.type}</span>
                    </div>
                    {cert.file_url ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => api.viewCertificateFile(cert.id).catch(() => {})}
                          style={{ height: 28, padding: "0 12px", fontSize: 12, fontWeight: 600, backgroundColor: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", borderRadius: 6, cursor: "pointer" }}
                        >View</button>
                        <button
                          onClick={() => api.downloadCertificateFile(cert.id, `certificate_${cert.type}`).catch(() => {})}
                          style={{ height: 28, padding: "0 12px", fontSize: 12, fontWeight: 600, backgroundColor: "#F0FDF4", color: "#15803D", border: "1px solid #BBF7D0", borderRadius: 6, cursor: "pointer" }}
                        >Download</button>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#94A3B8", fontStyle: "italic" }}>File not yet uploaded by the organization</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Pending Tab ── */}
        {activeTab === "pending" && (
          <div className="flex flex-col gap-3">
            {pendingApplications.length === 0 ? (
              memberStatus === "Pending" ? (
                <EmptyState icon="⏳" title="Membership pending"
                  body="Your request to join this organization is under review. Once approved, you'll be able to apply to events." />
              ) : (
                <EmptyState icon="📭" title="No pending applications"
                  body="You have no pending event applications for this organization." />
              )
            ) : (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Pending Event Applications</div>
                {pendingApplications.map((app: any) => (
                  <div key={app.id} style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{app.event_name}</div>
                        <div style={{ fontSize: 12, color: "#94A3B8" }}>
                          {app.event_date}{app.event_time ? ` · ${formatTime(app.event_time)}` : ""}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: "#FEF3C7", color: "#B45309", borderRadius: 20, padding: "3px 10px" }}>Pending</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function EmptyState({ icon, title, body, cta, onCta }: {
  icon: string; title: string; body: string; cta?: string; onCta?: () => void;
}) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", color: "#94A3B8" }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#64748B", marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 14, marginBottom: cta ? 20 : 0 }}>{body}</div>
      {cta && onCta && (
        <button onClick={onCta} style={{ height: 38, padding: "0 20px", backgroundColor: "#16A34A", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {cta}
        </button>
      )}
    </div>
  );
}

function Banner({ icon, color, bg, border, title, body, cta, onCta }: {
  icon: string; color: string; bg: string; border: string;
  title: string; body: string; cta?: string; onCta?: () => void;
}) {
  return (
    <div style={{ backgroundColor: bg, border: `1px solid ${border}`, borderLeft: `4px solid ${color}`, borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color }}>{title}</div>
          <div style={{ fontSize: 13, color, opacity: 0.8, marginTop: 2 }}>{body}</div>
        </div>
      </div>
      {cta && onCta && (
        <button onClick={onCta} style={{ flexShrink: 0, height: 36, padding: "0 16px", backgroundColor: color, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {cta}
        </button>
      )}
    </div>
  );
}
