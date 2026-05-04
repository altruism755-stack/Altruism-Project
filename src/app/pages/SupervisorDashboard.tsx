import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { Navbar } from "../components/Navbar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const GREEN = "#16A34A";

type DashTab = "volunteers" | "pending" | "activities" | "events";

export function SupervisorDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const supName = profile?.name || "Supervisor";

  const [org, setOrg] = useState<any>(null);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [pendingSupervisors, setPendingSupervisors] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DashTab>("volunteers");

  // Accept modal state
  const [acceptingVol, setAcceptingVol] = useState<any | null>(null);
  const [acceptForm, setAcceptForm] = useState({ supervisor_id: "", department: "" });
  const [rejectConfirm, setRejectConfirm] = useState<number | null>(null);

  // Certificate modal state
  const [certActivity, setCertActivity] = useState<any | null>(null);
  const [certForm, setCertForm] = useState({ type: "Participation" });
  const [certBusy, setCertBusy] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [profileRes, volsRes, pendingRes, actsRes, evtsRes] = await Promise.all([
        api.getMyProfile(),
        api.getMyVolunteers(),
        api.getMyPendingRequests(),
        api.getMyActivities(),
        api.getMyEvents(),
      ]);
      setOrg(profileRes.organization);
      setVolunteers(volsRes.volunteers || []);
      setPending(pendingRes.pending || []);
      setPendingSupervisors(pendingRes.supervisors || []);
      setActivities(actsRes.activities || []);
      setEvents(evtsRes.events || []);
    } catch (e) { console.error("Failed to load supervisor dashboard:", e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleApproveRequest = async () => {
    if (!acceptingVol) return;
    try {
      await api.approveMyRequest(acceptingVol.id, {
        supervisor_id: acceptForm.supervisor_id ? Number(acceptForm.supervisor_id) : null,
        department: acceptForm.department,
      });
      setAcceptingVol(null);
      setAcceptForm({ supervisor_id: "", department: "" });
      loadAll();
    } catch (e) { console.error("Approve failed:", e); }
  };

  const handleRejectRequest = async (volId: number) => {
    try {
      await api.rejectMyRequest(volId);
      setRejectConfirm(null);
      loadAll();
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
    setCertBusy(true);
    try {
      await api.approveActivity(certActivity.id);
      await api.issueCertificate({
        volunteer_id: certActivity.volunteer_id,
        org_id: certActivity.org_id,
        event_id: certActivity.event_id,
        type: certForm.type,
        hours: certActivity.hours,
      });
      setActivities((a) => a.filter((act) => act.id !== certActivity.id));
      setCertActivity(null);
    } catch (e) { console.error("Approve+certify failed:", e); }
    setCertBusy(false);
  };

  const handleRejectActivity = async (id: number) => {
    try {
      await api.rejectActivity(id);
      setActivities((a) => a.filter((act) => act.id !== id));
    } catch (e) { console.error("Reject activity failed:", e); }
  };

  const upcomingEvents = events.filter((e) => e.status === "Upcoming" || e.status === "Active");

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
                            {v.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
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
                <div style={{ fontSize: 14, color: "#64748B", marginBottom: 16 }}>
                  Volunteers who applied to join <strong>{org?.name}</strong>. Review and assign them to a supervisor.
                </div>
                {pending.length === 0 ? (
                  <EmptyState label="No pending requests." />
                ) : (
                  <div className="flex flex-col gap-3">
                    {pending.map((v) => (
                      <div key={v.id} style={{ border: "1px solid #FDE68A", borderLeft: "4px solid #F59E0B", borderRadius: 10, padding: 16, backgroundColor: "#FFFBEB" }}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "#F59E0B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>
                              {v.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                            </div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: "#1E293B" }}>{v.name}</div>
                              <div style={{ fontSize: 12, color: "#94A3B8" }}>{v.email} · Applied {v.joined_date}</div>
                              {v.skills && (
                                <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                                  Skills: {JSON.parse(v.skills || "[]").join(", ") || "—"}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2" style={{ flexShrink: 0 }}>
                            <button
                              onClick={() => { setAcceptingVol(v); setAcceptForm({ supervisor_id: "", department: "" }); }}
                              style={{ height: 34, padding: "0 16px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => setRejectConfirm(v.id)}
                              style={{ height: 34, padding: "0 16px", backgroundColor: "#fff", color: "#DC2626", border: "1px solid #FECACA", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                            >
                              Reject
                            </button>
                          </div>
                        </div>

                        {rejectConfirm === v.id && (
                          <div style={{ marginTop: 12, padding: 12, backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8 }}>
                            <div style={{ fontSize: 13, color: "#991B1B", marginBottom: 8 }}>Reject this volunteer request?</div>
                            <div className="flex gap-2" style={{ justifyContent: "flex-end" }}>
                              <button onClick={() => setRejectConfirm(null)} style={{ height: 30, padding: "0 12px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 12, cursor: "pointer", color: "#64748B" }}>Cancel</button>
                              <button onClick={() => handleRejectRequest(v.id)} style={{ height: 30, padding: "0 14px", backgroundColor: "#DC2626", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Confirm</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Activity approvals tab */}
            {tab === "activities" && (
              <div>
                <div style={{ fontSize: 14, color: "#64748B", marginBottom: 16 }}>
                  Pending activity logs from volunteers in <strong>{org?.name}</strong> awaiting your review.
                </div>
                {activities.length === 0 ? (
                  <EmptyState label="No pending activity approvals." />
                ) : (
                  <div className="flex flex-col gap-3">
                    {activities.map((a) => (
                      <div key={a.id} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 16 }}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: "#1E293B" }}>{a.volunteer_name}</div>
                            <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
                              {a.event_name ? `Event: ${a.event_name} · ` : ""}{a.hours} hrs · {a.date}
                            </div>
                            {a.description && (
                              <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 6, lineHeight: 1.5 }}>{a.description}</div>
                            )}
                          </div>
                          <div className="flex gap-2" style={{ flexShrink: 0 }}>
                            <button onClick={() => handleApproveActivity(a.id)} style={{ height: 32, padding: "0 14px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Approve</button>
                            <button
                              onClick={() => { setCertActivity(a); setCertForm({ type: "Participation" }); }}
                              title="Approve and issue certificate"
                              style={{ height: 32, padding: "0 14px", backgroundColor: "#0891B2", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                            >+ Certificate</button>
                            <button onClick={() => handleRejectActivity(a.id)} style={{ height: 32, padding: "0 14px", backgroundColor: "#DC2626", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Reject</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Events tab */}
            {tab === "events" && (
              <div>
                <div style={{ fontSize: 14, color: "#64748B", marginBottom: 16 }}>
                  Events for <strong>{org?.name}</strong>. Volunteers who attend should log their hours after each event.
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
        <div onClick={() => setCertActivity(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "#fff", borderRadius: 16, width: "100%", maxWidth: 460, padding: 28 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#1E293B", marginBottom: 4 }}>Approve & Issue Certificate</div>
            <div style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>
              Approving <strong>{certActivity.hours} hr(s)</strong> for <strong>{certActivity.volunteer_name}</strong> — {certActivity.event_name || "activity"}.
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Certificate Type</label>
              <div className="flex gap-2">
                {(["Participation", "Achievement", "Completion"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setCertForm({ type: t })}
                    style={{
                      flex: 1, height: 38, border: "1.5px solid", borderRadius: 8, fontSize: 13, fontWeight: certForm.type === t ? 600 : 400, cursor: "pointer",
                      borderColor: certForm.type === t ? (t === "Participation" ? "#2563EB" : t === "Achievement" ? "#D97706" : GREEN) : "#E2E8F0",
                      backgroundColor: certForm.type === t ? (t === "Participation" ? "#EFF6FF" : t === "Achievement" ? "#FFFBEB" : "#F0FDF4") : "#fff",
                      color: certForm.type === t ? (t === "Participation" ? "#1D4ED8" : t === "Achievement" ? "#B45309" : "#15803D") : "#64748B",
                    }}
                  >{t}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2" style={{ justifyContent: "flex-end" }}>
              <button onClick={() => setCertActivity(null)} style={{ height: 36, padding: "0 16px", backgroundColor: "#fff", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={async () => { await handleApproveActivity(certActivity.id); setCertActivity(null); }} style={{ height: 36, padding: "0 14px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Approve Only</button>
              <button onClick={handleApproveAndCertify} disabled={certBusy} style={{ height: 36, padding: "0 16px", backgroundColor: "#0891B2", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: certBusy ? "not-allowed" : "pointer", opacity: certBusy ? 0.7 : 1 }}>{certBusy ? "Issuing…" : "Approve + Issue"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Accept modal */}
      {acceptingVol && (
        <div onClick={() => setAcceptingVol(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, padding: 28 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#1E293B", marginBottom: 4 }}>Accept Volunteer</div>
            <div style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>
              Accepting <strong>{acceptingVol.name}</strong> into {org?.name}
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Assign Supervisor (optional)</label>
                <select
                  value={acceptForm.supervisor_id}
                  onChange={(e) => setAcceptForm((f) => ({ ...f, supervisor_id: e.target.value }))}
                  style={{ width: "100%", height: 40, border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 10px", fontSize: 13, outline: "none" }}
                >
                  <option value="">Assign to me</option>
                  {pendingSupervisors.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}{s.team ? ` (${s.team})` : ""}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Department (optional)</label>
                <input
                  value={acceptForm.department}
                  onChange={(e) => setAcceptForm((f) => ({ ...f, department: e.target.value }))}
                  placeholder="e.g. Programs, Media, Operations…"
                  style={{ width: "100%", height: 40, border: "1px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div className="flex gap-2" style={{ justifyContent: "flex-end", marginTop: 4 }}>
                <button onClick={() => setAcceptingVol(null)} style={{ height: 36, padding: "0 16px", backgroundColor: "#fff", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={handleApproveRequest} style={{ height: 36, padding: "0 18px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Accept Volunteer
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
