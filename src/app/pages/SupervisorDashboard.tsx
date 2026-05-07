import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { Navbar } from "../components/Navbar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { WorkflowPanel, type WorkflowAction } from "../components/WorkflowPanel";
import { LifecycleStepper, MiniLifecycleStepper } from "../components/StatusPill";
import { resolveStepActions, buildEventMiniSteps, type BackendLifecycle } from "../lib/lifecycle";

const GREEN = "#16A34A";

type DashTab = "volunteers" | "pending" | "activities" | "events";

export function SupervisorDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const supName = profile?.name || "Supervisor";

  const [org, setOrg] = useState<any>(null);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DashTab>("volunteers");
  const [supLifecycle, setSupLifecycle] = useState<BackendLifecycle | null>(null);

  // Pending requests modal state
  const [selectedVol, setSelectedVol] = useState<any | null>(null);
  const [rejectConfirm, setRejectConfirm] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  // Certificate modal state
  const [certActivity, setCertActivity] = useState<any | null>(null);
  const [certForm, setCertForm] = useState({ title: "" });
  const [certBusy, setCertBusy] = useState(false);
  // After issuing, hold the new cert ID so we can attach a file
  const [issuedCertId, setIssuedCertId] = useState<number | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certUploadBusy, setCertUploadBusy] = useState(false);
  const [certUploadError, setCertUploadError] = useState("");

  // Log activity modal state
  const [showLogActivity, setShowLogActivity] = useState(false);
  const [logForm, setLogForm] = useState({ volunteer_id: "", event_id: "", date: "", hours: "", description: "", status: "Approved" });
  const [logBusy, setLogBusy] = useState(false);
  const [logError, setLogError] = useState("");

  // Create activity panel state
  const emptyActivityForm = { name: "", description: "", location: "", date: "", time: "", duration: "", maxVolunteers: "", requiredSkills: "", status: "Upcoming", acceptanceMode: "manual" as "manual" | "auto" };
  const [showCreateActivity, setShowCreateActivity] = useState(false);
  const [activityForm, setActivityForm] = useState(emptyActivityForm);
  const [activitySaving, setActivitySaving] = useState(false);

  const tracksHours = org?.tracks_hours !== 0;

  const loadAll = useCallback(async () => {
    try {
      const [profileRes, volsRes, pendingRes, actsRes, evtsRes, lcRes] = await Promise.all([
        api.getMyProfile(),
        api.getMyVolunteers(),
        api.getMyPendingRequests(),
        api.getMyActivities(),
        api.getMyEvents(),
        api.getSupervisorLifecycle(),
      ]);
      setOrg(profileRes.organization);
      setVolunteers(volsRes.volunteers || []);
      setPending(pendingRes.pending || []);
      setActivities(actsRes.activities || []);
      setEvents(evtsRes.events || []);
      setSupLifecycle(lcRes.lifecycle || null);
    } catch (e) { console.error("Failed to load supervisor dashboard:", e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleApproveRequest = async (volId: number) => {
    try {
      await api.approveMyRequest(volId, {});
      setSelectedVol(null);
      setPending((prev) => prev.filter((v) => v.id !== volId));
      setSuccessMsg("Volunteer assigned to you");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (e: any) {
      alert(e?.message || "Failed to accept volunteer");
    }
  };

  const handleRejectRequest = async (volId: number) => {
    try {
      await api.rejectMyRequest(volId);
      setRejectConfirm(null);
      setSelectedVol(null);
      setPending((prev) => prev.filter((v) => v.id !== volId));
    } catch (e) { console.error("Reject failed:", e); }
  };

  const handleApproveActivity = async (id: number) => {
    try {
      await api.approveActivity(id);
      setActivities((a) => a.filter((act) => act.id !== id));
    } catch (e) { console.error("Approve activity failed:", e); }
  };

  const handleApproveAndCertify = async () => {
    if (!certActivity) return;
    if (!certForm.title.trim()) return;
    setCertBusy(true);
    try {
      // Only call approve for hour-based activities; participation ones are already Completed.
      if (certActivity.status !== "Completed") {
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
    } catch (e) { console.error("Approve+certify failed:", e); }
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
    } catch (e) { console.error("Reject activity failed:", e); }
  };

  const handleCreateActivity = async () => {
    setActivitySaving(true);
    const data = {
      name: activityForm.name,
      description: activityForm.description,
      location: activityForm.location,
      date: activityForm.date,
      time: activityForm.time,
      duration: Number(activityForm.duration) || undefined,
      max_volunteers: Number(activityForm.maxVolunteers) || undefined,
      required_skills: activityForm.requiredSkills,
      status: activityForm.status,
      acceptance_mode: activityForm.acceptanceMode,
      org_id: org?.id,
    };
    try {
      await api.createEvent(data);
      setShowCreateActivity(false);
      setActivityForm(emptyActivityForm);
      loadAll();
    } catch (e) { console.error("Failed to create activity:", e); }
    finally { setActivitySaving(false); }
  };

  const handleLogActivity = async () => {
    if (!logForm.volunteer_id || !logForm.date) {
      setLogError("Volunteer and date are required.");
      return;
    }
    if (tracksHours && !logForm.hours) {
      setLogError("Hours are required for this organization.");
      return;
    }
    setLogBusy(true);
    setLogError("");
    try {
      await api.logActivity({
        volunteer_id: Number(logForm.volunteer_id),
        event_id: logForm.event_id ? Number(logForm.event_id) : undefined,
        date: logForm.date,
        ...(tracksHours && logForm.hours ? { hours: Number(logForm.hours), status: logForm.status } : {}),
        description: logForm.description,
        org_id: org?.id,
      });
      setShowLogActivity(false);
      setLogForm({ volunteer_id: "", event_id: "", date: "", hours: "", description: "", status: "Approved" });
      loadAll();
    } catch (e: any) {
      setLogError(e?.message || "Failed to log activity.");
    } finally {
      setLogBusy(false);
    }
  };

  const upcomingEvents = events.filter((e) => e.status === "Upcoming" || e.status === "Active");

  // Next Best Action cards
  const nextActions: WorkflowAction[] = [];
  if (pending.length > 0) {
    nextActions.push({
      priority: "urgent",
      icon: "👥",
      title: "Pending Requests",
      desc: `${pending.length} volunteer${pending.length > 1 ? "s" : ""} applied to join. Accept or reject their requests.`,
      cta: "Review Requests",
      badge: pending.length,
      onClick: () => setTab("pending"),
    });
  }
  if (activities.length > 0) {
    nextActions.push({
      priority: "urgent",
      icon: "📋",
      title: "Activity Logs Pending",
      desc: `${activities.length} volunteer hour submission${activities.length > 1 ? "s" : ""} waiting for your approval.`,
      cta: "Review Hours",
      badge: activities.length,
      onClick: () => setTab("activities"),
    });
  }
  if (upcomingEvents.length > 0 && pending.length === 0 && activities.length === 0) {
    nextActions.push({
      priority: "normal",
      icon: "📅",
      title: "Upcoming Events",
      desc: `${upcomingEvents.length} event${upcomingEvents.length > 1 ? "s" : ""} scheduled. Ensure volunteers are prepared and will log hours after.`,
      cta: "View Events",
      onClick: () => setTab("events"),
    });
  }
  if (volunteers.length > 0 && nextActions.length < 3) {
    nextActions.push({
      priority: "info",
      icon: "👤",
      title: "Your Volunteers",
      desc: `${volunteers.length} active volunteer${volunteers.length > 1 ? "s" : ""} in ${org?.name || "your organization"}. Review their progress.`,
      cta: "View Volunteers",
      onClick: () => setTab("volunteers"),
    });
  }
  if (nextActions.length === 0) {
    nextActions.push({
      priority: "success",
      icon: "✅",
      title: "All caught up!",
      desc: "No pending actions. Volunteers will submit hours after upcoming events.",
      cta: "View Events",
      onClick: () => setTab("events"),
    });
  }

  const supPipelineSteps = resolveStepActions(supLifecycle?.steps ?? [], {
    goto_volunteers: () => setTab("volunteers"),
    goto_activities: () => setTab("pending"),
  });
  const supStuckMsg = supLifecycle?.stuck_msg ?? undefined;

  if (loading) return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="supervisor" />
      <div className="flex-1 flex items-center justify-center"><p style={{ color: "#94A3B8" }}>Loading...</p></div>
    </div>
  );

  const tabs: { key: DashTab; label: string; badge?: number }[] = [
    { key: "volunteers", label: "Volunteers", badge: volunteers.length || undefined },
    { key: "pending", label: "Pending Requests", badge: pending.length || undefined },
    { key: "activities", label: "Activity Approvals", badge: activities.length || undefined },
    { key: "events", label: "Events" },
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
            {org?.name || "—"} · Supervisor
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4" style={{ marginBottom: 24 }}>
          {[
            { label: "Volunteers in Org", value: volunteers.length, gradient: "linear-gradient(135deg,#16A34A,#22C55E)", onClick: () => setTab("volunteers") },
            { label: "Pending Requests", value: pending.length, gradient: pending.length > 0 ? "linear-gradient(135deg,#D97706,#F59E0B)" : "linear-gradient(135deg,#94A3B8,#CBD5E1)", onClick: () => setTab("pending") },
            { label: "Awaiting Approval", value: activities.length, gradient: activities.length > 0 ? "linear-gradient(135deg,#2563EB,#3B82F6)" : "linear-gradient(135deg,#94A3B8,#CBD5E1)", onClick: () => setTab("activities") },
            { label: "Upcoming Events", value: upcomingEvents.length, gradient: "linear-gradient(135deg,#0891B2,#06B6D4)", onClick: () => setTab("events") },
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
            {/* Volunteers tab */}
            {tab === "volunteers" && (
              <div>
                <div style={{ fontSize: 14, color: "#64748B", marginBottom: 16 }}>
                  All active volunteers in <strong>{org?.name}</strong>. Click a volunteer to view their profile.
                </div>
                {volunteers.length === 0 ? (
                  <EmptyState label="No active volunteers yet. Accept pending requests to onboard your first volunteers." />
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                    {volunteers.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => navigate(`/supervisor/volunteer/${v.id}`)}
                        style={{
                          border: "1px solid #E2E8F0", borderRadius: 10, padding: 16,
                          cursor: "pointer", transition: "box-shadow 140ms, border-color 140ms",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = ""; }}
                      >
                        <div className="flex items-center gap-3">
                          <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: GREEN, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                            {(v.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</div>
                            <div style={{ fontSize: 12, color: "#94A3B8" }}>
                              {v.department || "—"} · {Number(v.total_hours || 0).toFixed(0)} hrs
                            </div>
                          </div>
                        </div>
                        {v.supervisor_name && (
                          <div style={{ fontSize: 11, color: "#64748B", marginTop: 8 }}>Supervisor: {v.supervisor_name}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pending requests tab */}
            {tab === "pending" && (
              <div>
                {/* Success toast */}
                {successMsg && (
                  <div style={{ marginBottom: 16, padding: "10px 16px", backgroundColor: "#DCFCE7", border: "1px solid #86EFAC", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#15803D" }}>
                    ✓ {successMsg}
                  </div>
                )}
                <div style={{ fontSize: 14, color: "#64748B", marginBottom: 16 }}>
                  Volunteers who applied to join <strong>{org?.name}</strong>. Click a card to review and accept.
                </div>
                {pending.length === 0 ? (
                  <EmptyState label="No pending requests." />
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                    {pending.map((v) => {
                      let skills: string[] = [];
                      try { skills = JSON.parse(v.skills || "[]"); } catch {}
                      const initials = (v.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2);
                      return (
                        <div
                          key={v.id}
                          onClick={() => setSelectedVol(v)}
                          style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, cursor: "pointer", backgroundColor: "#fff", transition: "box-shadow 140ms, border-color 140ms" }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = ""; }}
                        >
                          <div className="flex items-center gap-3" style={{ marginBottom: 10 }}>
                            <div style={{ width: 42, height: 42, borderRadius: "50%", backgroundColor: GREEN, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                              {initials}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</div>
                              <div style={{ fontSize: 12, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.email}</div>
                            </div>
                          </div>
                          <div style={{ fontSize: 11, color: "#64748B", marginBottom: 8 }}>Applied {v.joined_date || "—"}</div>
                          {skills.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {skills.slice(0, 3).map((s) => (
                                <span key={s} style={{ fontSize: 11, backgroundColor: "#F1F5F9", color: "#475569", borderRadius: 4, padding: "2px 7px" }}>{s}</span>
                              ))}
                              {skills.length > 3 && <span style={{ fontSize: 11, color: "#94A3B8" }}>+{skills.length - 3} more</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Volunteer detail modal */}
                {selectedVol && (() => {
                  const v = selectedVol;
                  let skills: string[] = [];
                  let languages: string[] = [];
                  let availability: string[] = [];
                  try { skills = JSON.parse(v.skills || "[]"); } catch {}
                  try { languages = JSON.parse(v.languages || "[]"); } catch {}
                  try { availability = JSON.parse(v.availability || "[]"); } catch {}
                  const initials = (v.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2);
                  return (
                    <>
                      <div onClick={() => { setSelectedVol(null); setRejectConfirm(null); }} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.5)", zIndex: 50 }} />
                      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 440, backgroundColor: "#fff", zIndex: 51, overflowY: "auto", boxShadow: "-4px 0 32px rgba(0,0,0,0.12)" }}>
                        {/* Header */}
                        <div style={{ padding: "24px 24px 20px", borderBottom: "1px solid #E2E8F0" }}>
                          <div className="flex items-center gap-3" style={{ marginBottom: 4 }}>
                            <div style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: GREEN, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontSize: 18, fontWeight: 700, color: "#1E293B" }}>{v.name}</div>
                              <div style={{ fontSize: 13, color: "#64748B" }}>{v.email}</div>
                            </div>
                          </div>
                          <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 8 }}>Applied {v.joined_date || "—"}</div>
                        </div>

                        {/* Details */}
                        <div style={{ padding: "20px 24px" }}>
                          {[
                            ["Phone", v.phone],
                            ["City", v.city],
                            ["Governorate", v.governorate],
                            ["Gender", v.gender],
                            ["Date of Birth", v.date_of_birth],
                            ["Nationality", v.nationality],
                            ["Education", v.education_level],
                            ["University", v.university_name],
                            ["Faculty", v.faculty],
                            ["Field of Study", v.field_of_study],
                            ["Study Year", v.study_year],
                            ["Hours/Week", v.hours_per_week ? `${v.hours_per_week} hrs` : null],
                            ["Prior Experience", v.prior_experience ? "Yes" : v.prior_experience === 0 ? "No" : null],
                            ["Prior Org", v.prior_org],
                          ].filter(([, val]) => val).map(([label, val]) => (
                            <div key={label as string} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B", minWidth: 120 }}>{label}</span>
                              <span style={{ fontSize: 13, color: "#1E293B" }}>{val}</span>
                            </div>
                          ))}

                          {skills.length > 0 && (
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 6 }}>Skills</div>
                              <div className="flex flex-wrap gap-1">
                                {skills.map((s) => <span key={s} style={{ fontSize: 12, backgroundColor: "#F1F5F9", color: "#475569", borderRadius: 4, padding: "3px 8px" }}>{s}</span>)}
                              </div>
                            </div>
                          )}
                          {languages.length > 0 && (
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 6 }}>Languages</div>
                              <div className="flex flex-wrap gap-1">
                                {languages.map((l: any, i: number) => { const label = typeof l === "string" ? l : l?.language || ""; const prof = l?.proficiency; return <span key={i} style={{ fontSize: 12, backgroundColor: "#EFF6FF", color: "#1D4ED8", borderRadius: 4, padding: "3px 8px" }}>{label}{prof ? ` · ${prof}` : ""}</span>; })}
                              </div>
                            </div>
                          )}
                          {availability.length > 0 && (
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 6 }}>Availability</div>
                              <div style={{ fontSize: 13, color: "#1E293B" }}>{availability.join(", ")}</div>
                            </div>
                          )}
                          {v.health_notes && (
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 4 }}>Health Notes</div>
                              <div style={{ fontSize: 13, color: "#1E293B" }}>{v.health_notes}</div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div style={{ padding: "16px 24px", borderTop: "1px solid #E2E8F0", position: "sticky", bottom: 0, backgroundColor: "#fff" }}>
                          {rejectConfirm === v.id ? (
                            <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 14 }}>
                              <div style={{ fontSize: 13, color: "#991B1B", marginBottom: 10 }}>Reject this volunteer's request?</div>
                              <div className="flex gap-2">
                                <button onClick={() => setRejectConfirm(null)} style={{ flex: 1, height: 36, backgroundColor: "#fff", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                                <button onClick={() => handleRejectRequest(v.id)} style={{ flex: 1, height: 36, backgroundColor: "#DC2626", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Confirm Reject</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button onClick={() => setRejectConfirm(v.id)} style={{ flex: 1, height: 40, backgroundColor: "#fff", color: "#DC2626", border: "1px solid #FECACA", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Reject</button>
                              <button onClick={() => handleApproveRequest(v.id)} style={{ flex: 2, height: 40, backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Accept & Assign to Me</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Activity approvals tab */}
            {tab === "activities" && (
              <div>
                <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, color: "#64748B" }}>
                    Activity logs for volunteers in <strong>{org?.name}</strong>. You can also log hours on behalf of a volunteer.
                  </div>
                  <button
                    onClick={() => { setShowLogActivity(true); setLogError(""); }}
                    style={{ height: 36, padding: "0 16px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
                  >
                    + Log Activity
                  </button>
                </div>
                {activities.length === 0 ? (
                  <EmptyState label="No pending activity approvals." />
                ) : (
                  <div className="flex flex-col gap-3">
                    {activities.map((a) => {
                      const isParticipation = a.status === "Completed";
                      return (
                        <div key={a.id} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 16 }}>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div style={{ fontSize: 15, fontWeight: 600, color: "#1E293B" }}>{a.volunteer_name}</div>
                              <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
                                {a.event_name ? `Event: ${a.event_name} · ` : ""}
                                {a.hours != null && a.hours > 0 ? `${a.hours} hrs contributed · ` : "Participated · "}
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
                                title="Issue certificate"
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
                )}
              </div>
            )}

            {/* Events tab */}
            {tab === "events" && (
              <div>
                <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, color: "#64748B" }}>
                    Events for <strong>{org?.name}</strong>. Volunteers who attend should log their hours after each event.
                  </div>
                  <button
                    onClick={() => { setActivityForm(emptyActivityForm); setShowCreateActivity(true); }}
                    style={{ height: 36, padding: "0 16px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
                  >
                    + New Activity
                  </button>
                </div>
                {events.length === 0 ? (
                  <EmptyState label="No events found for your organization." />
                ) : (
                  <div className="flex flex-col gap-3">
                    {events.map((e) => {
                      const statusStyle: Record<string, { bg: string; color: string; band: string }> = {
                        Upcoming: { bg: "#DBEAFE", color: "#1D4ED8", band: "#2563EB" },
                        Active:   { bg: "#DCFCE7", color: "#15803D", band: GREEN },
                        Completed:{ bg: "#F1F5F9", color: "#475569", band: "#94A3B8" },
                      };
                      const st = statusStyle[e.status] || statusStyle.Upcoming;
                      const fillPct = e.max_volunteers > 0 ? Math.min(100, Math.round(((e.current_volunteers || 0) / e.max_volunteers) * 100)) : 0;
                      const eventMiniSteps = buildEventMiniSteps({
                        status: e.status,
                        current_volunteers: e.current_volunteers || 0,
                        onViewActivities: () => setTab("activities"),
                      });
                      return (
                        <div key={e.id} style={{ border: "1px solid #E2E8F0", borderLeft: `4px solid ${st.band}`, borderRadius: 10, padding: 16 }}>
                          <div className="flex items-start justify-between gap-4">
                            <div style={{ flex: 1 }}>
                              <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                                <div style={{ fontSize: 15, fontWeight: 600, color: "#1E293B" }}>{e.name}</div>
                                <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: st.bg, color: st.color, borderRadius: 4, padding: "2px 8px" }}>{e.status}</span>
                              </div>
                              <div style={{ fontSize: 13, color: "#64748B" }}>
                                {e.date}{e.time ? ` · ${e.time}` : ""}
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
                              {/* Event lifecycle mini stepper */}
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                                <span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 500, whiteSpace: "nowrap" }}>Event flow:</span>
                                <MiniLifecycleStepper steps={eventMiniSteps} />
                              </div>
                            </div>
                            {e.status === "Active" && (
                              <div style={{ flexShrink: 0 }}>
                                <span style={{ fontSize: 11, backgroundColor: "#DCFCE7", color: "#15803D", borderRadius: 6, padding: "4px 10px", fontWeight: 600 }}>Ongoing — review activity logs</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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

            {/* Step 1 — Certificate title */}
            {!issuedCertId ? (
              <>
                <div style={{ fontSize: 18, fontWeight: 600, color: "#1E293B", marginBottom: 4 }}>
                  {certActivity.status !== "Completed" ? "Approve & Issue Certificate" : "Issue Certificate"}
                </div>
                <div style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>
                  For <strong>{certActivity.volunteer_name}</strong>
                  {certActivity.event_name ? <> — {certActivity.event_name}</> : null}.
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
                  {certActivity.status !== "Completed" && (
                    <button onClick={async () => { await handleApproveActivity(certActivity.id); setCertActivity(null); }} style={{ height: 36, padding: "0 14px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Approve Only</button>
                  )}
                  <button
                    onClick={handleApproveAndCertify}
                    disabled={certBusy || !certForm.title.trim()}
                    style={{ height: 36, padding: "0 16px", backgroundColor: (certBusy || !certForm.title.trim()) ? "#94A3B8" : "#0891B2", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: (certBusy || !certForm.title.trim()) ? "not-allowed" : "pointer" }}
                  >
                    {certBusy ? "Issuing…" : (certActivity.status !== "Completed" ? "Approve + Issue" : "Issue Certificate")}
                  </button>
                </div>
              </>
            ) : (
              /* Step 2 — File upload */
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>✅</div>
                  <div style={{ fontSize: 17, fontWeight: 600, color: "#1E293B" }}>Certificate Issued!</div>
                </div>
                <div style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>
                  Upload the certificate file so <strong>{certActivity.volunteer_name}</strong> can view and download it from their profile.
                </div>

                <div
                  style={{ border: "2px dashed #E2E8F0", borderRadius: 10, padding: "20px 16px", textAlign: "center", marginBottom: 16, backgroundColor: certFile ? "#F0FDF4" : "#FAFAFA", cursor: "pointer" }}
                  onClick={() => document.getElementById("cert-file-input")?.click()}
                >
                  <input
                    id="cert-file-input"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    style={{ display: "none" }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) { setCertFile(f); setCertUploadError(""); } }}
                  />
                  {certFile ? (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#15803D" }}>{certFile.name}</div>
                      <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{(certFile.size / 1024).toFixed(0)} KB — click to change</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 13, color: "#64748B" }}>Click to select a file</div>
                      <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>PDF, PNG, or JPG</div>
                    </>
                  )}
                </div>

                {certUploadError && (
                  <div style={{ fontSize: 12, color: "#B91C1C", backgroundColor: "#FEE2E2", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>{certUploadError}</div>
                )}

                <div className="flex gap-2" style={{ justifyContent: "flex-end" }}>
                  <button
                    onClick={() => { setIssuedCertId(null); setCertActivity(null); setCertFile(null); }}
                    style={{ height: 36, padding: "0 16px", backgroundColor: "#fff", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={handleCertFileUpload}
                    disabled={!certFile || certUploadBusy}
                    style={{ height: 36, padding: "0 18px", backgroundColor: (!certFile || certUploadBusy) ? "#94A3B8" : GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: (!certFile || certUploadBusy) ? "not-allowed" : "pointer" }}
                  >
                    {certUploadBusy ? "Uploading…" : "Upload File"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Create Activity side panel */}
      {showCreateActivity && (() => {
        const inputStyle = { width: "100%", height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" as const };
        const labelStyle = { fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 };
        return (
          <>
            <div onClick={() => setShowCreateActivity(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", zIndex: 50 }} />
            <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 500, backgroundColor: "#fff", zIndex: 51, boxShadow: "-8px 0 32px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column" }}>
              <div className="flex items-center justify-between px-6" style={{ height: 64, borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: "#1E293B", margin: 0 }}>New Activity</h3>
                <button onClick={() => setShowCreateActivity(false)} style={{ background: "none", border: "none", fontSize: 22, color: "#94A3B8", cursor: "pointer" }}>×</button>
              </div>

              <div className="flex-1 overflow-y-auto" style={{ padding: 24 }}>
                <div className="flex flex-col gap-4">
                  <div>
                    <label style={labelStyle}>Activity Name *</label>
                    <input value={activityForm.name} onChange={(e) => setActivityForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Youth Leadership Workshop" style={inputStyle} />
                  </div>

                  <div>
                    <label style={labelStyle}>Description</label>
                    <textarea value={activityForm.description} onChange={(e) => setActivityForm((f) => ({ ...f, description: e.target.value }))} placeholder="What will volunteers be doing?" style={{ ...inputStyle, height: 90, padding: "10px 12px", resize: "vertical" as const }} />
                  </div>

                  <div>
                    <label style={labelStyle}>Location</label>
                    <input value={activityForm.location} onChange={(e) => setActivityForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. Cairo Community Center" style={inputStyle} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label style={labelStyle}>Date *</label>
                      <input type="date" value={activityForm.date} onChange={(e) => setActivityForm((f) => ({ ...f, date: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Time</label>
                      <input type="time" value={activityForm.time} onChange={(e) => setActivityForm((f) => ({ ...f, time: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label style={labelStyle}>Duration (hours)</label>
                      <input type="number" min="0" step="0.5" value={activityForm.duration} onChange={(e) => setActivityForm((f) => ({ ...f, duration: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Max Volunteers</label>
                      <input type="number" min="0" value={activityForm.maxVolunteers} onChange={(e) => setActivityForm((f) => ({ ...f, maxVolunteers: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Required Skills</label>
                    <input value={activityForm.requiredSkills} onChange={(e) => setActivityForm((f) => ({ ...f, requiredSkills: e.target.value }))} placeholder="e.g. Communication, Fieldwork (comma separated)" style={inputStyle} />
                  </div>

                  <div>
                    <label style={labelStyle}>Status</label>
                    <select value={activityForm.status} onChange={(e) => setActivityForm((f) => ({ ...f, status: e.target.value }))} style={inputStyle}>
                      <option value="Upcoming">Upcoming</option>
                      <option value="Active">Ongoing</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Acceptance Mode</label>
                    <select value={activityForm.acceptanceMode} onChange={(e) => setActivityForm((f) => ({ ...f, acceptanceMode: e.target.value as "manual" | "auto" }))} style={inputStyle}>
                      <option value="manual">✋ Manual Approval — you review each application</option>
                      <option value="auto">⚡ Auto Accept — first come, first served</option>
                    </select>
                    <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 4, marginBottom: 0 }}>
                      {activityForm.acceptanceMode === "auto"
                        ? "Volunteers are accepted instantly up to the capacity limit."
                        : "You manually approve or reject each application."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 px-6 py-4" style={{ borderTop: "1px solid #E2E8F0", flexShrink: 0 }}>
                <button onClick={() => setShowCreateActivity(false)} style={{ flex: 1, height: 42, backgroundColor: "#fff", color: "#64748B", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleCreateActivity} disabled={activitySaving || !activityForm.name || !activityForm.date} style={{ flex: 1, height: 42, backgroundColor: activitySaving || !activityForm.name || !activityForm.date ? "#86EFAC" : GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: activitySaving ? "not-allowed" : "pointer" }}>
                  {activitySaving ? "Saving…" : "Create Activity"}
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* Log Activity modal */}
      {showLogActivity && (
        <div onClick={() => setShowLogActivity(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, padding: 28 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#1E293B", marginBottom: 4 }}>Log Activity for Volunteer</div>
            <div style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>
              {tracksHours
                ? `Record volunteer hours on behalf of a member of ${org?.name}.`
                : `Record volunteer participation on behalf of a member of ${org?.name}.`}
            </div>

            {logError && (
              <div style={{ backgroundColor: "#FEE2E2", color: "#B91C1C", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{logError}</div>
            )}

            <div className="flex flex-col gap-4">
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Volunteer <span style={{ color: "#DC2626" }}>*</span></label>
                <select
                  value={logForm.volunteer_id}
                  onChange={(e) => setLogForm((f) => ({ ...f, volunteer_id: e.target.value }))}
                  style={{ width: "100%", height: 40, border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 10px", fontSize: 13, outline: "none" }}
                >
                  <option value="">Select volunteer…</option>
                  {volunteers.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Related Event (optional)</label>
                <select
                  value={logForm.event_id}
                  onChange={(e) => setLogForm((f) => ({ ...f, event_id: e.target.value }))}
                  style={{ width: "100%", height: 40, border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 10px", fontSize: 13, outline: "none" }}
                >
                  <option value="">No specific event</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <div style={{ flex: tracksHours ? 1 : "1 1 100%" }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Date <span style={{ color: "#DC2626" }}>*</span></label>
                  <input
                    type="date"
                    value={logForm.date}
                    onChange={(e) => setLogForm((f) => ({ ...f, date: e.target.value }))}
                    style={{ width: "100%", height: 40, border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                {tracksHours && (
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Hours <span style={{ color: "#DC2626" }}>*</span></label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={logForm.hours}
                      onChange={(e) => setLogForm((f) => ({ ...f, hours: e.target.value }))}
                      placeholder="e.g. 3"
                      style={{ width: "100%", height: 40, border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                )}
              </div>

              {tracksHours && (
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Status</label>
                  <select
                    value={logForm.status}
                    onChange={(e) => setLogForm((f) => ({ ...f, status: e.target.value }))}
                    style={{ width: "100%", height: 40, border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 10px", fontSize: 13, outline: "none" }}
                  >
                    <option value="Approved">Approved</option>
                    <option value="Pending">Pending (under review)</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              )}

              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Description (optional)</label>
                <textarea
                  value={logForm.description}
                  onChange={(e) => setLogForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Brief notes about the activity…"
                  style={{ width: "100%", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>

              <div className="flex gap-2" style={{ justifyContent: "flex-end", marginTop: 4 }}>
                <button onClick={() => setShowLogActivity(false)} style={{ height: 36, padding: "0 16px", backgroundColor: "#fff", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleLogActivity} disabled={logBusy} style={{ height: 36, padding: "0 18px", backgroundColor: logBusy ? "#94A3B8" : GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: logBusy ? "not-allowed" : "pointer" }}>
                  {logBusy ? "Saving…" : "Save Activity"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div style={{ textAlign: "center", padding: 40, color: "#94A3B8", fontSize: 14 }}>{label}</div>
  );
}
