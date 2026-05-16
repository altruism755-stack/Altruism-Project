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
import { ConfirmDialog } from "../components/ConfirmDialog";

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

  // Delete event confirm
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null);

  const handleDeleteEvent = (id: number, name: string) => setConfirmDelete({ id, name });

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    const { id } = confirmDelete;
    setConfirmDelete(null);
    try {
      await api.deleteMyEvent(id);
      setMyEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (e) { devError("Delete event failed:", e); }
  };


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
        api.getMyActivities("All"),
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
    { key: "activities", label: "Activity History", badge: activities.length || undefined },
    { key: "org-events", label: "All Org Events" },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Event"
        message={`Delete "${confirmDelete?.name}"? This will also remove all applications for this event. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
      />
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
                  <div />
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
                    {pageMyEvents.map((e) => <EventCard key={e.id} event={e} onViewActivities={() => setTab("activities")} isOwned onOpen={setSelectedEventId} onDelete={handleDeleteEvent} />)}
                  </div>
                  <Pagination page={myEvtsPage} totalPages={myEvtsTotalPages} onPage={setMyEvtsPage} totalItems={myEvents.length} pageSize={12} />
                  </>
                )}
              </div>
            )}

            {/* Applications tab */}
            {tab === "applications" && (
              <div>
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
                              {app.event_name} · Applied {app.created_at ? new Date(app.created_at).toLocaleDateString() : ""}
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

            {/* Activity History tab */}
            {tab === "activities" && (
              <div>
                {activities.length === 0 ? (
                  <EmptyState label="No activity records yet. Mark attendance on a completed event to generate records." />
                ) : (
                  <>
                  <div className="flex flex-col gap-3">
                    {pageActivities.map((a) => {
                      const statusStyles: Record<string, { bg: string; color: string; label: string }> = {
                        approved:  { bg: "#DCFCE7", color: "#15803D", label: "Approved" },
                        completed: { bg: "#F1F5F9", color: "#475569", label: "Completed" },
                        pending:   { bg: "#FEF3C7", color: "#B45309", label: "Pending" },
                        rejected:  { bg: "#FEE2E2", color: "#B91C1C", label: "Rejected" },
                      };
                      const ss = statusStyles[a.status] || statusStyles.pending;
                      return (
                        <div key={a.id} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 16 }}>
                          <div className="flex items-start justify-between gap-4">
                            <div style={{ flex: 1 }}>
                              <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                                <div style={{ fontSize: 15, fontWeight: 600, color: "#1E293B" }}>{a.volunteer_name}</div>
                                <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: ss.bg, color: ss.color, borderRadius: 20, padding: "2px 8px" }}>{ss.label}</span>
                              </div>
                              <div style={{ fontSize: 13, color: "#64748B" }}>
                                {a.event_name ? `${a.event_name} · ` : ""}
                                {a.hours != null && a.hours > 0 ? `${a.hours} hrs · ` : "Participated · "}
                                {a.date}
                              </div>
                              {a.description && (
                                <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 6, lineHeight: 1.5 }}>{a.description}</div>
                              )}
                            </div>
                            {a.status !== "rejected" && (
                              <button
                                onClick={() => { setCertActivity(a); setCertForm({ title: "" }); }}
                                style={{ height: 32, padding: "0 14px", backgroundColor: "#0891B2", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
                              >+ Certificate</button>
                            )}
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
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "#fff", borderRadius: 20, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
            {!issuedCertId ? (
              <>
                {/* Modal header */}
                <div style={{ background: "linear-gradient(135deg, #0891B2 0%, #0E7490 100%)", padding: "24px 28px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🏅</div>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>Issue Certificate</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 1 }}>Volunteer recognition</div>
                    </div>
                  </div>
                  {/* Volunteer & event info */}
                  <div style={{ backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "10px 14px", display: "flex", gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Volunteer</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{certActivity.volunteer_name}</div>
                    </div>
                    {certActivity.event_name && (
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Event</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{certActivity.event_name}</div>
                      </div>
                    )}
                    {certActivity.hours != null && (
                      <div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Hours</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{certActivity.hours} hrs</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal body */}
                <div style={{ padding: "22px 28px 24px" }}>
                  <div style={{ marginBottom: 22 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Certificate Title <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={certForm.title}
                      onChange={(e) => setCertForm({ title: e.target.value })}
                      placeholder="e.g. Volunteer Appreciation Certificate"
                      autoFocus
                      style={{ width: "100%", height: 44, border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "0 14px", fontSize: 14, outline: "none", boxSizing: "border-box", color: "#1E293B", transition: "border-color 0.15s" }}
                      onFocus={(e) => e.target.style.borderColor = "#0891B2"}
                      onBlur={(e) => e.target.style.borderColor = "#E2E8F0"}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={() => setCertActivity(null)} style={{ height: 40, padding: "0 18px", backgroundColor: "#fff", color: "#64748B", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Cancel</button>
                    <button
                      onClick={handleApproveAndCertify}
                      disabled={certBusy || !certForm.title.trim()}
                      style={{ height: 40, padding: "0 22px", backgroundColor: (certBusy || !certForm.title.trim()) ? "#94A3B8" : "#0891B2", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: (certBusy || !certForm.title.trim()) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}
                    >
                      {certBusy ? "Issuing…" : "Issue Certificate"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Success header */}
                <div style={{ background: "linear-gradient(135deg, #16A34A 0%, #15803D 100%)", padding: "24px 28px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>✅</div>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>Certificate Issued!</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 1 }}>Now attach the PDF file</div>
                    </div>
                  </div>
                </div>

                {/* Upload body */}
                <div style={{ padding: "22px 28px 24px" }}>
                  <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>
                    Upload a PDF so <strong>{certActivity.volunteer_name}</strong> can download it from their profile.
                  </div>
                  <div
                    style={{ border: `2px dashed ${certFile ? "#16A34A" : "#CBD5E1"}`, borderRadius: 12, padding: "20px 16px", textAlign: "center", marginBottom: 16, backgroundColor: certFile ? "#F0FDF4" : "#F8FAFC", cursor: "pointer", transition: "all 0.15s" }}
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
                        <div style={{ fontSize: 22, marginBottom: 6 }}>📄</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#15803D" }}>{certFile.name}</div>
                        <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{(certFile.size / 1024).toFixed(0)} KB · click to change</div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 28, marginBottom: 6 }}>📁</div>
                        <div style={{ fontSize: 13, color: "#475569", fontWeight: 500 }}>Click to select a PDF file</div>
                        <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>PDF only · max 10 MB</div>
                      </>
                    )}
                  </div>
                  {certUploadError && (
                    <div style={{ fontSize: 12, color: "#B91C1C", backgroundColor: "#FEE2E2", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>{certUploadError}</div>
                  )}
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={() => { setIssuedCertId(null); setCertActivity(null); setCertFile(null); }} style={{ height: 40, padding: "0 18px", backgroundColor: "#fff", color: "#64748B", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Skip for now</button>
                    <button onClick={handleCertFileUpload} disabled={!certFile || certUploadBusy} style={{ height: 40, padding: "0 22px", backgroundColor: (!certFile || certUploadBusy) ? "#94A3B8" : GREEN, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: (!certFile || certUploadBusy) ? "not-allowed" : "pointer" }}>
                      {certUploadBusy ? "Uploading…" : "Upload PDF"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Create Event side panel */}
      {showCreateEvent && (() => {
        const inp: React.CSSProperties = { width: "100%", height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box", color: "#1E293B", backgroundColor: "#fff" };
        const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" };
        const section: React.CSSProperties = { borderBottom: "1px solid #F1F5F9", paddingBottom: 20, marginBottom: 20 };
        const canSave = !!eventForm.name && !!eventForm.date;
        return (
          <>
            <div onClick={() => { setShowCreateEvent(false); setEventError(""); }} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 50 }} />
            <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 480, backgroundColor: "#fff", zIndex: 51, boxShadow: "-8px 0 40px rgba(0,0,0,0.14)", display: "flex", flexDirection: "column" }}>

              {/* Header */}
              <div className="flex items-center justify-between px-6" style={{ height: 64, borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1E293B", margin: 0 }}>New Event</h3>
                  <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>{org?.name}</p>
                </div>
                <button onClick={() => { setShowCreateEvent(false); setEventError(""); }} style={{ background: "none", border: "none", fontSize: 22, color: "#94A3B8", cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto" style={{ padding: "24px 24px 8px" }}>

                {/* Section: Basic info */}
                <div style={section}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Basic Info</div>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label style={lbl}>Event Name <span style={{ color: "#DC2626" }}>*</span></label>
                      <input value={eventForm.name} onChange={(e) => setEventForm((f) => ({ ...f, name: e.target.value }))} placeholder="Name your event" style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Description</label>
                      <textarea value={eventForm.description} onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))} placeholder="What will volunteers be doing? What should they expect?" style={{ ...inp, height: 88, padding: "10px 12px", resize: "vertical" as const }} />
                    </div>
                    <div>
                      <label style={lbl}>Location</label>
                      <input value={eventForm.location} onChange={(e) => setEventForm((f) => ({ ...f, location: e.target.value }))} placeholder="Venue or address" style={inp} />
                    </div>
                  </div>
                </div>

                {/* Section: Schedule */}
                <div style={section}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Schedule</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label style={lbl}>Date <span style={{ color: "#DC2626" }}>*</span></label>
                      <input type="date" value={eventForm.date} onChange={(e) => setEventForm((f) => ({ ...f, date: e.target.value }))} style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Start Time</label>
                      <input type="time" value={eventForm.time} onChange={(e) => setEventForm((f) => ({ ...f, time: e.target.value }))} style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Duration (hrs)</label>
                      <input type="number" min="0" step="0.5" value={eventForm.duration} onChange={(e) => setEventForm((f) => ({ ...f, duration: e.target.value }))} placeholder="e.g. 4" style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Max Volunteers</label>
                      <input type="number" min="0" value={eventForm.maxVolunteers} onChange={(e) => setEventForm((f) => ({ ...f, maxVolunteers: e.target.value }))} placeholder="Leave blank for unlimited" style={inp} />
                    </div>
                  </div>
                </div>

                {/* Section: Requirements & mode */}
                <div style={{ paddingBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Requirements</div>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label style={lbl}>Required Skills</label>
                      <input value={eventForm.requiredSkills} onChange={(e) => setEventForm((f) => ({ ...f, requiredSkills: e.target.value }))} placeholder="Separate skills with commas" style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Application Mode</label>
                      <div className="grid grid-cols-2 gap-3" style={{ marginTop: 2 }}>
                        {([["manual", "Manual Review", "You approve each applicant individually."], ["auto", "Auto-Accept", "Volunteers are accepted instantly up to capacity."]] as const).map(([val, title, desc]) => {
                          const selected = eventForm.acceptanceMode === val;
                          return (
                            <div key={val} onClick={() => setEventForm((f) => ({ ...f, acceptanceMode: val }))}
                              style={{ border: `2px solid ${selected ? GREEN : "#E2E8F0"}`, borderRadius: 10, padding: "12px 14px", cursor: "pointer", backgroundColor: selected ? "#F0FDF4" : "#fff", transition: "all 120ms" }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: selected ? "#15803D" : "#1E293B", marginBottom: 4 }}>
                                {val === "manual" ? "✋ " : "⚡ "}{title}
                              </div>
                              <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.4 }}>{desc}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ borderTop: "1px solid #E2E8F0", flexShrink: 0 }}>
                {eventError && (
                  <div style={{ backgroundColor: "#FEE2E2", color: "#B91C1C", padding: "10px 16px", fontSize: 13 }}>{eventError}</div>
                )}
                <div className="flex gap-3 px-6 py-4">
                  <button onClick={() => { setShowCreateEvent(false); setEventError(""); }} style={{ flex: 1, height: 44, backgroundColor: "#fff", color: "#64748B", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleCreateEvent} disabled={eventSaving || !canSave}
                    style={{ flex: 2, height: 44, backgroundColor: canSave && !eventSaving ? GREEN : "#86EFAC", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: canSave && !eventSaving ? "pointer" : "not-allowed", transition: "background 150ms" }}>
                    {eventSaving ? "Creating…" : "Create Event"}
                  </button>
                </div>
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

function EventCard({ event: e, onViewActivities, isOwned, onOpen, onDelete }: { event: any; onViewActivities: () => void; isOwned?: boolean; onOpen?: (id: number) => void; onDelete?: (id: number, name: string) => void }) {
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
            {(e.starts_at || e.date || "").slice(0, 10)}{e.time ? ` · ${fmt12h(e.time)}` : ""}
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
          {onDelete && isOwned && e.status === "upcoming" && (
            <div style={{ marginTop: 10 }}>
              <button
                onClick={(ev) => { ev.stopPropagation(); onDelete(e.id, e.name); }}
                style={{ height: 28, padding: "0 12px", backgroundColor: "#fff", color: "#DC2626", border: "1px solid #DC2626", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
              >Delete</button>
            </div>
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
