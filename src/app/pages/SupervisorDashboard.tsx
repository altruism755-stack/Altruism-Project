import { devError } from "../lib/devLog";
import { useState, useEffect, useCallback } from "react";
import { Navbar } from "../components/Navbar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { MiniLifecycleStepper } from "../components/StatusPill";
import { buildEventMiniSteps } from "../lib/lifecycle";
import { ACTIVITY_STATUS } from "../types";
import { Pagination, usePagination } from "../components/Pagination";
import { EventDetailModal } from "../components/EventDetailModal";

const GREEN = "#16A34A";

type DashTab = "my-events" | "applications" | "activities" | "org-events";

export function SupervisorDashboard() {
  const { profile } = useAuth();
  const supName = profile?.name || "Supervisor";

  const [org, setOrg] = useState<any>(null);
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [orgEvents, setOrgEvents] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DashTab>("my-events");

  // Certificate modal state
  const [certActivity, setCertActivity] = useState<any | null>(null);
  const [certForm, setCertForm] = useState({ title: "" });
  const [certBusy, setCertBusy] = useState(false);
  const [issuedCertId, setIssuedCertId] = useState<number | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certUploadBusy, setCertUploadBusy] = useState(false);
  const [certUploadError, setCertUploadError] = useState("");


  // Create event panel state
  const emptyEventForm = { name: "", description: "", location: "", date: "", time: "", duration: "", maxVolunteers: "", requiredSkills: "", acceptanceMode: "manual" as "manual" | "auto" };
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [eventForm, setEventForm] = useState(emptyEventForm);
  const [eventSaving, setEventSaving] = useState(false);
  const [eventError, setEventError] = useState("");

  // Event detail modal
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);


  const tracksHours = org != null && org.tracks_hours !== false && org.tracks_hours !== 0;

  const { page: myEvtsPage, setPage: setMyEvtsPage, totalPages: myEvtsTotalPages, pageItems: pageMyEvents, reset: resetMyEvtsPage } = usePagination(myEvents, 12);
  const { page: appsPage, setPage: setAppsPage, totalPages: appsTotalPages, pageItems: pageApplications, reset: resetAppsPage } = usePagination(applications);
  const { page: actsPage, setPage: setActsPage, totalPages: actsTotalPages, pageItems: pageActivities, reset: resetActsPage } = usePagination(activities);
  const { page: orgEvtsPage, setPage: setOrgEvtsPage, totalPages: orgEvtsTotalPages, pageItems: pageOrgEvents, reset: resetOrgEvtsPage } = usePagination(orgEvents, 12);

  useEffect(() => {
    resetMyEvtsPage(); resetAppsPage(); resetActsPage(); resetOrgEvtsPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const loadAll = useCallback(async () => {
    try {
      const [profileRes, myEvtsRes, appsRes, actsRes, orgEvtsRes] = await Promise.all([
        api.getMyProfile(),
        api.getMyEvents(),
        api.getMyApplications("pending"),
        api.getMyActivities("pending"),
        api.getMyOrgEvents(),
      ]);
      setOrg(profileRes.organization);
      setMyEvents(myEvtsRes.events || []);
      setApplications(appsRes.applications || []);
      setActivities(actsRes.activities || []);
      setOrgEvents(orgEvtsRes.events || []);

      // Load all active org volunteers for the log-activity dropdown.
      // We reuse the org events participants or fetch separately via activities endpoint scoped to org.
      // Simpler: pull from the org events list and deduplicate — but we need a volunteer list.
      // For now, we keep a lightweight fetch via the activities list's volunteer names or store separately.
    } catch (e) { devError("Failed to load supervisor dashboard:", e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleApproveApplication = async (id: number) => {
    try {
      await api.approveMyApplication(id);
      setApplications((a) => a.filter((app) => app.id !== id));
    } catch (e) { devError("Approve application failed:", e); }
  };

  const handleRejectApplication = async (id: number) => {
    try {
      await api.rejectMyApplication(id);
      setApplications((a) => a.filter((app) => app.id !== id));
    } catch (e) { devError("Reject application failed:", e); }
  };

  const handleApproveActivity = async (id: number) => {
    try {
      await api.approveActivity(id);
      setActivities((a) => a.filter((act) => act.id !== id));
    } catch (e) { devError("Approve activity failed:", e); }
  };

  const handleApproveAndCertify = async () => {
    if (!certActivity) return;
    if (!certForm.title.trim()) return;
    setCertBusy(true);
    try {
      if (certActivity.status !== ACTIVITY_STATUS.Completed) {
        await api.approveActivity(certActivity.id);
      }
      const cert = await api.issueCertificate({
        volunteer_id: certActivity.volunteer_id,
        org_id: certActivity.org_id,
        event_id: certActivity.event_id,
        certificate_title: certForm.title.trim(),
      });
      setActivities((a) => a.filter((act) => act.id !== certActivity.id));
      setIssuedCertId(cert?.id ?? null);
      setCertFile(null);
      setCertUploadError("");
    } catch (e) { devError("Approve+certify failed:", e); }
    setCertBusy(false);
  };

  const handleCertFileUpload = async () => {
    if (!issuedCertId || !certFile) return;
    setCertUploadBusy(true);
    setCertUploadError("");
    try {
      await api.uploadCertificateFile(issuedCertId, certFile);
      setIssuedCertId(null);
      setCertActivity(null);
      setCertFile(null);
    } catch {
      setCertUploadError("Upload failed. Please try again.");
    } finally {
      setCertUploadBusy(false);
    }
  };

  const handleRejectActivity = async (id: number) => {
    try {
      await api.rejectActivity(id);
      setActivities((a) => a.filter((act) => act.id !== id));
    } catch (e) { devError("Reject activity failed:", e); }
  };

  const handleCreateEvent = async () => {
    setEventSaving(true);
    setEventError("");
    try {
      await api.createMyEvent({
        name: eventForm.name,
        description: eventForm.description,
        location: eventForm.location,
        date: eventForm.date,
        time: eventForm.time,
        duration: Number(eventForm.duration) || undefined,
        max_volunteers: Number(eventForm.maxVolunteers) || undefined,
        required_skills: eventForm.requiredSkills,
        acceptance_mode: eventForm.acceptanceMode,
      });
      setShowCreateEvent(false);
      setEventForm(emptyEventForm);
      setEventError("");
      loadAll();
    } catch (e: any) {
      setEventError(e?.message || "Failed to create event. Please try again.");
    }
    finally { setEventSaving(false); }
  };



  if (loading) return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="supervisor" />
      <div className="flex-1 flex items-center justify-center"><p style={{ color: "#94A3B8" }}>Loading...</p></div>
    </div>
  );

  const tabs: { key: DashTab; label: string; badge?: number }[] = [
    { key: "my-events", label: "My Events", badge: myEvents.length || undefined },
    { key: "applications", label: "Applications", badge: applications.length || undefined },
    { key: "activities", label: "Activity Approvals", badge: activities.length || undefined },
    { key: "org-events", label: "All Org Events" },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="supervisor" />

      <div className="flex-1 px-8 py-6" style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 600, color: "#1E293B", margin: 0 }}>
            {supName}
          </h1>
          <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
            {org?.name || "—"} · Event Supervisor
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4" style={{ marginBottom: 24 }}>
          {[
            { label: "My Events", value: myEvents.length, gradient: "linear-gradient(135deg,#16A34A,#22C55E)", onClick: () => setTab("my-events") },
            { label: "Pending Applications", value: applications.length, gradient: applications.length > 0 ? "linear-gradient(135deg,#D97706,#F59E0B)" : "linear-gradient(135deg,#94A3B8,#CBD5E1)", onClick: () => setTab("applications") },
            { label: "Total Org Events", value: orgEvents.length, gradient: "linear-gradient(135deg,#0891B2,#06B6D4)", onClick: () => setTab("org-events") },
          ].map((s) => (
            <div
              key={s.label}
              onClick={s.onClick}
              style={{
                background: s.gradient, borderRadius: 12, padding: "18px 22px", height: 110,
                display: "flex", flexDirection: "column", justifyContent: "space-between",
                cursor: "pointer", transition: "transform 140ms, box-shadow 140ms",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.13)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
            >
              <div style={{ fontSize: 34, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tab bar + content card */}
        <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden" }}>
          <div className="flex" style={{ borderBottom: "2px solid #E2E8F0", padding: "0 24px" }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: "14px 20px", background: "none", border: "none", cursor: "pointer",
                  fontSize: 14, fontWeight: tab === t.key ? 600 : 400,
                  color: tab === t.key ? GREEN : "#64748B",
                  borderBottom: tab === t.key ? `2px solid ${GREEN}` : "2px solid transparent",
                  marginBottom: -2, position: "relative" as const,
                }}
              >
                {t.label}
                {t.badge ? (
                  <span style={{
                    marginLeft: 6, backgroundColor: tab === t.key ? GREEN : "#E2E8F0",
                    color: tab === t.key ? "#fff" : "#64748B",
                    borderRadius: 10, fontSize: 11, fontWeight: 700, padding: "1px 7px",
                  }}>{t.badge}</span>
                ) : null}
              </button>
            ))}
          </div>

          <div style={{ padding: 24 }}>

            {/* My Events tab */}
            {tab === "my-events" && (
              <div>
                <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, color: "#64748B" }}>
                    Events you created in <strong>{org?.name}</strong>. All org volunteers can browse and join these.
                  </div>
                  <button
                    onClick={() => { setEventForm(emptyEventForm); setShowCreateEvent(true); }}
                    style={{ height: 36, padding: "0 16px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
                  >
                    + New Event
                  </button>
                </div>
                {myEvents.length === 0 ? (
                  <EmptyState label="No events yet. Create your first event so volunteers can join." />
                ) : (
                  <>
                  <div className="flex flex-col gap-3">
                    {pageMyEvents.map((e) => <EventCard key={e.id} event={e} onViewActivities={() => setTab("activities")} isOwned onOpen={setSelectedEventId} />)}
                  </div>
                  <Pagination page={myEvtsPage} totalPages={myEvtsTotalPages} onPage={setMyEvtsPage} totalItems={myEvents.length} pageSize={12} />
                  </>
                )}
              </div>
            )}

            {/* Applications tab */}
            {tab === "applications" && (
              <div>
                <div style={{ fontSize: 14, color: "#64748B", marginBottom: 16 }}>
                  Volunteer applications to join events you manage in <strong>{org?.name}</strong>.
                </div>
                {applications.length === 0 ? (
                  <EmptyState label="No pending applications for your events." />
                ) : (
                  <>
                  <div className="flex flex-col gap-3">
                    {pageApplications.map((app) => (
                      <div key={app.id} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 16 }}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: "#1E293B" }}>{app.volunteer_name}</div>
                            <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
                              {app.event_name} · Applied {new Date(app.applied_date).toLocaleDateString()}
                              {app.event_date ? ` · ${app.event_date}${app.event_time ? ` ${fmt12h(app.event_time)}` : ""}` : ""}
                            </div>
                            {app.max_volunteers > 0 && (
                              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>
                                {app.approved_count} / {app.max_volunteers} spots filled
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2" style={{ flexShrink: 0 }}>
                            <button
                              onClick={() => handleApproveApplication(app.id)}
                              style={{ height: 32, padding: "0 14px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                            >Approve</button>
                            <button
                              onClick={() => handleRejectApplication(app.id)}
                              style={{ height: 32, padding: "0 14px", backgroundColor: "#DC2626", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
                            >Reject</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pagination page={appsPage} totalPages={appsTotalPages} onPage={setAppsPage} totalItems={applications.length} />
                  </>
                )}
              </div>
            )}

            {/* Activity Approvals tab */}
            {tab === "activities" && (
              <div>
                <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, color: "#64748B" }}>
                    Activity records auto-generated from attendance on your events in <strong>{org?.name}</strong>.
                    {tracksHours ? " Approve hours once you've reviewed them." : " Participation is recorded automatically — no approval needed."}
                  </div>
                </div>
                {activities.length === 0 ? (
                  <EmptyState label="No pending activity approvals for your events." />
                ) : (
                  <>
                  <div className="flex flex-col gap-3">
                    {pageActivities.map((a) => {
                      const isParticipation = a.status === ACTIVITY_STATUS.Completed;
                      return (
                        <div key={a.id} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 16 }}>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div style={{ fontSize: 15, fontWeight: 600, color: "#1E293B" }}>{a.volunteer_name}</div>
                              <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
                                {a.event_name ? `Event: ${a.event_name} · ` : ""}
                                {a.hours != null && a.hours > 0 ? `${a.hours} hrs · ` : "Participated · "}
                                {a.date}
                              </div>
                              {a.description && (
                                <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 6, lineHeight: 1.5 }}>{a.description}</div>
                              )}
                            </div>
                            <div className="flex gap-2" style={{ flexShrink: 0 }}>
                              {!isParticipation && (
                                <button onClick={() => handleApproveActivity(a.id)} style={{ height: 32, padding: "0 14px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Approve</button>
                              )}
                              <button
                                onClick={() => { setCertActivity(a); setCertForm({ title: "" }); }}
                                style={{ height: 32, padding: "0 14px", backgroundColor: "#0891B2", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                              >+ Certificate</button>
                              {!isParticipation && (
                                <button onClick={() => handleRejectActivity(a.id)} style={{ height: 32, padding: "0 14px", backgroundColor: "#DC2626", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Reject</button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Pagination page={actsPage} totalPages={actsTotalPages} onPage={setActsPage} totalItems={activities.length} />
                  </>
                )}
              </div>
            )}

            {/* All Org Events tab */}
            {tab === "org-events" && (
              <div>
                <div style={{ fontSize: 14, color: "#64748B", marginBottom: 16 }}>
                  All events in <strong>{org?.name}</strong> — visible to every volunteer in the organization.
                </div>
                {orgEvents.length === 0 ? (
                  <EmptyState label="No events found for your organization." />
                ) : (
                  <>
                  <div className="flex flex-col gap-3">
                    {pageOrgEvents.map((e) => <EventCard key={e.id} event={e} onViewActivities={() => setTab("activities")} />)}
                  </div>
                  <Pagination page={orgEvtsPage} totalPages={orgEvtsTotalPages} onPage={setOrgEvtsPage} totalItems={orgEvents.length} pageSize={12} />
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Certificate modal */}
      {certActivity && (
        <div
          onClick={() => { if (!issuedCertId) setCertActivity(null); }}
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "#fff", borderRadius: 16, width: "100%", maxWidth: 460, padding: 28 }}>
            {!issuedCertId ? (
              <>
                <div style={{ fontSize: 18, fontWeight: 600, color: "#1E293B", marginBottom: 4 }}>
                  {certActivity.status !== ACTIVITY_STATUS.Completed ? "Approve & Issue Certificate" : "Issue Certificate"}
                </div>
                <div style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>
                  For <strong>{certActivity.volunteer_name}</strong>{certActivity.event_name ? <> — {certActivity.event_name}</> : null}.
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>
                    Certificate Title <span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={certForm.title}
                    onChange={(e) => setCertForm({ title: e.target.value })}
                    placeholder="e.g. Volunteer Appreciation Certificate"
                    autoFocus
                    style={{ width: "100%", height: 40, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div className="flex gap-2" style={{ justifyContent: "flex-end" }}>
                  <button onClick={() => setCertActivity(null)} style={{ height: 36, padding: "0 16px", backgroundColor: "#fff", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  {certActivity.status !== ACTIVITY_STATUS.Completed && (
                    <button onClick={async () => { await handleApproveActivity(certActivity.id); setCertActivity(null); }} style={{ height: 36, padding: "0 14px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Approve Only</button>
                  )}
                  <button
                    onClick={handleApproveAndCertify}
                    disabled={certBusy || !certForm.title.trim()}
                    style={{ height: 36, padding: "0 16px", backgroundColor: (certBusy || !certForm.title.trim()) ? "#94A3B8" : "#0891B2", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: (certBusy || !certForm.title.trim()) ? "not-allowed" : "pointer" }}
                  >
                    {certBusy ? "Issuing…" : (certActivity.status !== ACTIVITY_STATUS.Completed ? "Approve + Issue" : "Issue Certificate")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>✅</div>
                  <div style={{ fontSize: 17, fontWeight: 600, color: "#1E293B" }}>Certificate Issued!</div>
                </div>
                <div style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>
                  Upload the certificate file so <strong>{certActivity.volunteer_name}</strong> can download it from their profile.
                </div>
                <div
                  style={{ border: "2px dashed #E2E8F0", borderRadius: 10, padding: "20px 16px", textAlign: "center", marginBottom: 16, backgroundColor: certFile ? "#F0FDF4" : "#FAFAFA", cursor: "pointer" }}
                  onClick={() => document.getElementById("cert-file-input")?.click()}
                >
                  <input
                    id="cert-file-input"
                    type="file"
                    accept=".pdf,application/pdf"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
                        setCertUploadError("Only PDF files are accepted.");
                        return;
                      }
                      setCertFile(f);
                      setCertUploadError("");
                    }}
                  />
                  {certFile ? (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#15803D" }}>{certFile.name}</div>
                      <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{(certFile.size / 1024).toFixed(0)} KB — click to change</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 13, color: "#64748B" }}>Click to select a PDF file</div>
                      <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>PDF only · max 10 MB</div>
                    </>
                  )}
                </div>
                {certUploadError && (
                  <div style={{ fontSize: 12, color: "#B91C1C", backgroundColor: "#FEE2E2", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>{certUploadError}</div>
                )}
                <div className="flex gap-2" style={{ justifyContent: "flex-end" }}>
                  <button onClick={() => { setIssuedCertId(null); setCertActivity(null); setCertFile(null); }} style={{ height: 36, padding: "0 16px", backgroundColor: "#fff", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Skip for now</button>
                  <button onClick={handleCertFileUpload} disabled={!certFile || certUploadBusy} style={{ height: 36, padding: "0 18px", backgroundColor: (!certFile || certUploadBusy) ? "#94A3B8" : GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: (!certFile || certUploadBusy) ? "not-allowed" : "pointer" }}>
                    {certUploadBusy ? "Uploading…" : "Upload File"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Create Event side panel */}
      {showCreateEvent && (() => {
        const inputStyle = { width: "100%", height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" as const };
        const labelStyle = { fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 };
        return (
          <>
            <div onClick={() => { setShowCreateEvent(false); setEventError(""); }} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", zIndex: 50 }} />
            <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 500, backgroundColor: "#fff", zIndex: 51, boxShadow: "-8px 0 32px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column" }}>
              <div className="flex items-center justify-between px-6" style={{ height: 64, borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: "#1E293B", margin: 0 }}>New Event</h3>
                <button onClick={() => { setShowCreateEvent(false); setEventError(""); }} style={{ background: "none", border: "none", fontSize: 22, color: "#94A3B8", cursor: "pointer" }}>×</button>
              </div>
              <div className="flex-1 overflow-y-auto" style={{ padding: 24 }}>
                {eventError && (
                  <div style={{ backgroundColor: "#FEE2E2", color: "#B91C1C", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{eventError}</div>
                )}
                <div className="flex flex-col gap-4">
                  <div>
                    <label style={labelStyle}>Event Name *</label>
                    <input value={eventForm.name} onChange={(e) => setEventForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Youth Leadership Workshop" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Description</label>
                    <textarea value={eventForm.description} onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))} placeholder="What will volunteers be doing?" style={{ ...inputStyle, height: 90, padding: "10px 12px", resize: "vertical" as const }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Location</label>
                    <input value={eventForm.location} onChange={(e) => setEventForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. Cairo Community Center" style={inputStyle} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label style={labelStyle}>Date *</label>
                      <input type="date" value={eventForm.date} onChange={(e) => setEventForm((f) => ({ ...f, date: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Time</label>
                      <input type="time" value={eventForm.time} onChange={(e) => setEventForm((f) => ({ ...f, time: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label style={labelStyle}>Duration (hours)</label>
                      <input type="number" min="0" step="0.5" value={eventForm.duration} onChange={(e) => setEventForm((f) => ({ ...f, duration: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Max Volunteers</label>
                      <input type="number" min="0" value={eventForm.maxVolunteers} onChange={(e) => setEventForm((f) => ({ ...f, maxVolunteers: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Required Skills</label>
                    <input value={eventForm.requiredSkills} onChange={(e) => setEventForm((f) => ({ ...f, requiredSkills: e.target.value }))} placeholder="e.g. Communication, Fieldwork (comma separated)" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Acceptance Mode</label>
                    <select value={eventForm.acceptanceMode} onChange={(e) => setEventForm((f) => ({ ...f, acceptanceMode: e.target.value as "manual" | "auto" }))} style={inputStyle}>
                      <option value="manual">✋ Manual Approval — you review each application</option>
                      <option value="auto">⚡ Auto Accept — first come, first served</option>
                    </select>
                    <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 4, marginBottom: 0 }}>
                      {eventForm.acceptanceMode === "auto"
                        ? "Volunteers are accepted instantly up to the capacity limit."
                        : "You manually approve or reject each application."}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4" style={{ borderTop: "1px solid #E2E8F0", flexShrink: 0 }}>
                <button onClick={() => { setShowCreateEvent(false); setEventError(""); }} style={{ flex: 1, height: 42, backgroundColor: "#fff", color: "#64748B", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleCreateEvent} disabled={eventSaving || !eventForm.name || !eventForm.date} style={{ flex: 1, height: 42, backgroundColor: eventSaving || !eventForm.name || !eventForm.date ? "#86EFAC" : GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: eventSaving ? "not-allowed" : "pointer" }}>
                  {eventSaving ? "Saving…" : "Create Event"}
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* Event detail modal */}
      {selectedEventId !== null && (
        <EventDetailModal
          eventId={selectedEventId}
          onClose={() => setSelectedEventId(null)}
          onEventUpdated={loadAll}
        />
      )}

    </div>
  );
}

function fmt12h(time?: string): string {
  if (!time) return "";
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function EventCard({ event: e, onViewActivities, isOwned, onOpen }: { event: any; onViewActivities: () => void; isOwned?: boolean; onOpen?: (id: number) => void }) {
  const statusStyle: Record<string, { bg: string; color: string; band: string; label: string }> = {
    upcoming:  { bg: "#DBEAFE", color: "#1D4ED8", band: "#2563EB", label: "Upcoming" },
    active:    { bg: "#DCFCE7", color: "#15803D", band: GREEN,      label: "Live Now" },
    completed: { bg: "#F1F5F9", color: "#475569", band: "#94A3B8",  label: "Completed" },
  };
  const st = statusStyle[e.status] || statusStyle.upcoming;
  const fillPct = e.max_volunteers > 0 ? Math.min(100, Math.round(((e.current_volunteers || 0) / e.max_volunteers) * 100)) : 0;
  const eventMiniSteps = buildEventMiniSteps({
    status: e.status,
    current_volunteers: e.current_volunteers || 0,
    onViewActivities,
  });
  const clickable = !!onOpen;

  return (
    <div
      onClick={clickable ? () => onOpen!(e.id) : undefined}
      style={{
        border: "1px solid #E2E8F0", borderLeft: `4px solid ${st.band}`, borderRadius: 10, padding: 16,
        cursor: clickable ? "pointer" : "default",
        transition: clickable ? "box-shadow 140ms, transform 140ms" : undefined,
      }}
      onMouseEnter={clickable ? (ev) => { ev.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; ev.currentTarget.style.transform = "translateY(-1px)"; } : undefined}
      onMouseLeave={clickable ? (ev) => { ev.currentTarget.style.boxShadow = ""; ev.currentTarget.style.transform = ""; } : undefined}
    >
      <div className="flex items-start justify-between gap-4">
        <div style={{ flex: 1 }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 4, flexWrap: "wrap" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#1E293B" }}>{e.name}</div>
            <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: st.bg, color: st.color, borderRadius: 4, padding: "2px 8px" }}>{st.label}</span>
            {isOwned && (
              <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: "#F0FDF4", color: "#15803D", borderRadius: 4, padding: "2px 8px" }}>Yours</span>
            )}
            {e.status === "upcoming" && isOwned && !e.registration_open && (
              <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: "#FEF3C7", color: "#92400E", borderRadius: 4, padding: "2px 8px" }}>Reg. Closed</span>
            )}
            {e.supervisor_name && !isOwned && (
              <span style={{ fontSize: 11, color: "#94A3B8" }}>by {e.supervisor_name}</span>
            )}
          </div>
          <div style={{ fontSize: 13, color: "#64748B" }}>
            {e.date}{e.time ? ` · ${fmt12h(e.time)}` : ""}
            {e.location ? ` · 📍 ${e.location}` : ""}
            {e.duration ? ` · ${e.duration} hrs` : ""}
          </div>
          {e.description && (
            <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 6 }}>{e.description.slice(0, 120)}{e.description.length > 120 ? "…" : ""}</div>
          )}
          {e.max_volunteers > 0 && (
            <div style={{ marginTop: 10 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: "#64748B" }}>Volunteer Capacity</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#1E293B" }}>{e.current_volunteers || 0} / {e.max_volunteers}</span>
              </div>
              <div style={{ height: 6, backgroundColor: "#E2E8F0", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${fillPct}%`, backgroundColor: fillPct >= 90 ? "#DC2626" : fillPct >= 60 ? "#D97706" : GREEN, borderRadius: 3, transition: "width 300ms" }} />
              </div>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
            <span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 500, whiteSpace: "nowrap" }}>Event flow:</span>
            <MiniLifecycleStepper steps={eventMiniSteps} />
          </div>
          {clickable && (
            <div style={{ fontSize: 12, color: "#2563EB", marginTop: 8, fontWeight: 500 }}>Click to manage →</div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div style={{ textAlign: "center", padding: 40, color: "#94A3B8", fontSize: 14 }}>{label}</div>
  );
}
