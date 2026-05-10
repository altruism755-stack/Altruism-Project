import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import { EventDetail, EventApplicant, AttendanceStatus } from "../types";

const GREEN = "#16A34A";
const BLUE = "#2563EB";
const AMBER = "#D97706";
const RED = "#DC2626";
const CYAN = "#0891B2";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt12h(time?: string): string {
  if (!time) return "";
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function statusBadge(status: string) {
  const styles: Record<string, { bg: string; color: string }> = {
    Upcoming:  { bg: "#DBEAFE", color: "#1D4ED8" },
    Active:    { bg: "#DCFCE7", color: "#15803D" },
    Completed: { bg: "#F1F5F9", color: "#475569" },
  };
  const s = styles[status] || styles.Upcoming;
  return (
    <span style={{ fontSize: 12, fontWeight: 600, backgroundColor: s.bg, color: s.color, borderRadius: 4, padding: "2px 8px" }}>
      {status === "Active" ? "Live Now" : status}
    </span>
  );
}

function sectionHead(label: string) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10, marginTop: 20 }}>
      {label}
    </div>
  );
}

function Btn({ label, color, onClick, disabled, small }: { label: string; color: string; onClick: () => void; disabled?: boolean; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: small ? 28 : 34, padding: small ? "0 10px" : "0 14px",
        backgroundColor: disabled ? "#CBD5E1" : color,
        color: "#fff", border: "none", borderRadius: 7,
        fontSize: small ? 12 : 13, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

// ── Applicant row ─────────────────────────────────────────────────────────────

type DraftAtt = Record<number, AttendanceStatus | "">;

function ApplicantRow({
  app,
  draft,
  onSelect,
  onDraftAtt,
  showAttendance,
  selected,
}: {
  app: EventApplicant;
  draft: boolean;
  onSelect: (id: number) => void;
  onDraftAtt: (appId: number, val: AttendanceStatus | "") => void;
  showAttendance: boolean;
  selected: boolean;
}) {
  const attColors: Record<string, string> = { Attended: GREEN, Absent: RED };
  const savedAtt = app.attendance_status;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>
      {!showAttendance && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(app.app_id)}
          style={{ width: 16, height: 16, cursor: "pointer", flexShrink: 0 }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {app.volunteer_name}
        </div>
        <div style={{ fontSize: 12, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {app.volunteer_email}
        </div>
      </div>
      {showAttendance ? (
        <div className="flex gap-2" style={{ flexShrink: 0 }}>
          {(["Attended", "Absent"] as AttendanceStatus[]).map((v) => (
            <button
              key={v}
              onClick={() => onDraftAtt(app.app_id, draft === (savedAtt === v) ? "" : v)}
              style={{
                height: 26, padding: "0 10px",
                backgroundColor: (draft ? (app as any)._draft === v : savedAtt === v)
                  ? (v === "Attended" ? GREEN : RED)
                  : "#F1F5F9",
                color: (draft ? (app as any)._draft === v : savedAtt === v) ? "#fff" : "#64748B",
                border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              {v}
            </button>
          ))}
          {savedAtt && (
            <span style={{ fontSize: 11, fontWeight: 700, color: attColors[savedAtt], alignSelf: "center" }}>
              ✓ {savedAtt}
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ── Certificate sub-modal ────────────────────────────────────────────────────

function CertModal({ volunteer, eventId, orgId, onClose }: { volunteer: EventApplicant; eventId: number; orgId: number; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [certId, setCertId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [err, setErr] = useState("");

  const issue = async () => {
    if (!title.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const cert = await api.issueCertificate({ volunteer_id: volunteer.volunteer_id, org_id: orgId, event_id: eventId, certificate_title: title.trim() });
      setCertId(cert.id);
    } catch (e: any) { setErr(e?.message || "Failed to issue certificate"); }
    finally { setBusy(false); }
  };

  const upload = async () => {
    if (!certId || !file) return;
    setUploadBusy(true);
    setErr("");
    try {
      await api.uploadCertificateFile(certId, file);
      onClose();
    } catch { setErr("Upload failed. Try again."); }
    finally { setUploadBusy(false); }
  };

  return (
    <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "#fff", borderRadius: 14, width: "100%", maxWidth: 440, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
      {!certId ? (
        <>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", marginBottom: 4 }}>Issue Certificate</div>
          <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>For <strong>{volunteer.volunteer_name}</strong></div>
          {err && <div style={{ backgroundColor: "#FEE2E2", color: RED, padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{err}</div>}
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Volunteer Appreciation Certificate"
            style={{ width: "100%", height: 40, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 16 }}
          />
          <div className="flex gap-2" style={{ justifyContent: "flex-end" }}>
            <Btn label="Cancel" color="#94A3B8" onClick={onClose} />
            <Btn label={busy ? "Issuing…" : "Issue Certificate"} color={CYAN} onClick={issue} disabled={busy || !title.trim()} />
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", marginBottom: 4 }}>Certificate Issued!</div>
          <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>Upload the PDF or image so the volunteer can download it.</div>
          {err && <div style={{ backgroundColor: "#FEE2E2", color: RED, padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{err}</div>}
          <div
            style={{ border: "2px dashed #E2E8F0", borderRadius: 10, padding: "18px 14px", textAlign: "center", marginBottom: 14, cursor: "pointer", backgroundColor: file ? "#F0FDF4" : "#FAFAFA" }}
            onClick={() => document.getElementById("cert-file-ev")?.click()}
          >
            <input id="cert-file-ev" type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
            {file ? <div style={{ fontSize: 13, fontWeight: 600, color: "#15803D" }}>{file.name}</div> : <div style={{ fontSize: 13, color: "#64748B" }}>Click to select file (PDF/PNG/JPG)</div>}
          </div>
          <div className="flex gap-2" style={{ justifyContent: "flex-end" }}>
            <Btn label="Skip" color="#94A3B8" onClick={onClose} />
            <Btn label={uploadBusy ? "Uploading…" : "Upload File"} color={GREEN} onClick={upload} disabled={!file || uploadBusy} />
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Modal ───────────────────────────────────────────────────────────────

interface Props {
  eventId: number;
  onClose: () => void;
  onEventUpdated: () => void;
}

export function EventDetailModal({ eventId, onClose, onEventUpdated }: Props) {
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Applications tab state
  const [appTab, setAppTab] = useState<"Pending" | "Approved" | "Rejected">("Pending");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(null);

  // Attendance draft: appId → AttendanceStatus | ""
  const [attDraft, setAttDraft] = useState<DraftAtt>({});
  const [attBusy, setAttBusy] = useState(false);
  const [attDirty, setAttDirty] = useState(false);

  // Certificate sub-modal
  const [certVolunteer, setCertVolunteer] = useState<EventApplicant | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErr("");
    try {
      const res = await api.getMyEventDetail(eventId);
      setEvent(res);
    } catch (e: any) { setErr(e?.message || "Failed to load event"); }
    finally { if (!silent) setLoading(false); }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  // Auto-activate: if event is Upcoming and current time has passed start time, trigger activate.
  useEffect(() => {
    if (!event || event.status !== "Upcoming") return;
    if (!event.date || !event.time) return;
    const [h, m] = event.time.split(":").map(Number);
    const start = new Date(`${event.date}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00`);
    const now = new Date();
    if (now >= start) {
      api.activateEvent(event.id).then(() => { load(); onEventUpdated(); }).catch(() => {});
    } else {
      const ms = start.getTime() - now.getTime();
      const t = setTimeout(() => {
        api.activateEvent(event.id).then(() => { load(); onEventUpdated(); }).catch(() => {});
      }, ms);
      return () => clearTimeout(t);
    }
  }, [event?.id, event?.status, event?.date, event?.time]);

  const doToggleRegistration = async (open: boolean) => {
    if (!event) return;
    setBusy(true);
    try {
      await api.toggleRegistration(event.id, open);
      await load();
      onEventUpdated();
    } catch (e: any) { setErr(e?.message || "Failed to toggle registration"); }
    finally { setBusy(false); }
  };

  const doActivate = async () => {
    if (!event) return;
    setBusy(true);
    try {
      await api.activateEvent(event.id);
      await load();
      onEventUpdated();
    } catch (e: any) { setErr(e?.message || "Failed to activate event"); }
    finally { setBusy(false); }
  };

  // Staged bulk approve/reject
  const doApplyChanges = async () => {
    if (!event || !pendingAction || selected.size === 0) return;
    setBusy(true);
    setErr("");
    try {
      const ids = Array.from(selected);
      await Promise.all(ids.map((id) =>
        pendingAction === "approve"
          ? api.approveMyApplication(id)
          : api.rejectMyApplication(id)
      ));
      setSelected(new Set());
      setPendingAction(null);
      await load();
      onEventUpdated();
    } catch (e: any) { setErr(e?.message || "Action failed"); }
    finally { setBusy(false); }
  };

  const doSaveAttendance = async () => {
    if (!event) return;
    const records = Object.entries(attDraft)
      .filter(([, v]) => v !== "")
      .map(([appId, att]) => ({ app_id: Number(appId), attendance_status: att as AttendanceStatus }));
    if (records.length === 0) return;
    setAttBusy(true);
    try {
      await api.markAttendance(event.id, records);
      // Optimistically apply draft to local state so UI updates immediately.
      const draftMap = Object.fromEntries(records.map((r) => [r.app_id, r.attendance_status]));
      setEvent((prev) => prev ? {
        ...prev,
        applicants: prev.applicants.map((a) =>
          draftMap[a.app_id] ? { ...a, attendance_status: draftMap[a.app_id] as AttendanceStatus } : a
        ),
      } : prev);
      setAttDraft({});
      setAttDirty(false);
      // Background sync to confirm server state without showing spinner.
      load(true);
    } catch (e: any) { setErr(e?.message || "Failed to save attendance"); }
    finally { setAttBusy(false); }
  };

  const toggleSelect = (id: number) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = (ids: number[]) => {
    setSelected((s) => ids.every((id) => s.has(id)) ? new Set() : new Set(ids));
  };

  if (loading) {
    return (
      <ModalShell onClose={onClose}>
        <div style={{ padding: 48, textAlign: "center", color: "#94A3B8" }}>Loading…</div>
      </ModalShell>
    );
  }

  if (err && !event) {
    return (
      <ModalShell onClose={onClose}>
        <div style={{ padding: 32, color: RED, fontSize: 14 }}>{err}</div>
      </ModalShell>
    );
  }

  if (!event) return null;

  const isUpcoming = event.status === "Upcoming";
  const isActive = event.status === "Active";
  const isCompleted = event.status === "Completed";
  const showAttendance = isActive || isCompleted;

  const applicantsByStatus = {
    Pending:  event.applicants.filter((a) => a.status === "Pending"),
    Approved: event.applicants.filter((a) => a.status === "Approved"),
    Rejected: event.applicants.filter((a) => a.status === "Rejected"),
  };
  const currentList = applicantsByStatus[appTab];
  const currentIds = currentList.map((a) => a.app_id);

  const canApprove = appTab === "Pending" && selected.size > 0;
  const canReject  = (appTab === "Pending" || appTab === "Approved") && selected.size > 0;

  return (
    <ModalShell onClose={onClose}>
      {/* Header */}
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #E2E8F0" }}>
        <div className="flex items-center justify-between gap-3">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1E293B", margin: 0 }}>{event.name}</h2>
              {statusBadge(event.status)}
              {isUpcoming && !event.registration_open && (
                <span style={{ fontSize: 12, fontWeight: 600, backgroundColor: "#FEF3C7", color: "#92400E", borderRadius: 4, padding: "2px 8px" }}>
                  Registration Closed
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
              {event.date}{event.time ? ` · ${fmt12h(event.time)}` : ""}
              {event.location ? ` · 📍 ${event.location}` : ""}
              {event.duration ? ` · ${event.duration} hrs` : ""}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "#94A3B8", cursor: "pointer", flexShrink: 0, lineHeight: 1 }}>×</button>
        </div>

        {event.description && (
          <p style={{ fontSize: 13, color: "#64748B", marginTop: 8, marginBottom: 0 }}>{event.description}</p>
        )}

        {err && (
          <div style={{ backgroundColor: "#FEE2E2", color: RED, padding: "8px 12px", borderRadius: 8, fontSize: 13, marginTop: 12 }}>{err}</div>
        )}

        {/* Action bar */}
        <div className="flex gap-2" style={{ marginTop: 14, flexWrap: "wrap" }}>
          {isUpcoming && (
            <>
              {event.registration_open
                ? <Btn label="Stop Registration" color={AMBER} onClick={() => doToggleRegistration(false)} disabled={busy} />
                : <Btn label="Resume Registration" color={GREEN} onClick={() => doToggleRegistration(true)} disabled={busy} />
              }
              <Btn label="Go Live Now" color={BLUE} onClick={doActivate} disabled={busy} />
            </>
          )}
          {isActive && (
            <span style={{ fontSize: 13, fontWeight: 600, color: GREEN, alignSelf: "center" }}>
              🟢 Event is Live
            </span>
          )}
        </div>
      </div>

      {/* Capacity bar */}
      {event.max_volunteers > 0 && (
        <div style={{ padding: "12px 24px 0" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: "#64748B" }}>Volunteer Capacity</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#1E293B" }}>
              {event.applicants.filter((a) => a.status === "Approved").length} / {event.max_volunteers}
            </span>
          </div>
          <div style={{ height: 6, backgroundColor: "#E2E8F0", borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${Math.min(100, Math.round(event.applicants.filter((a) => a.status === "Approved").length / event.max_volunteers * 100))}%`,
              backgroundColor: GREEN, borderRadius: 3,
            }} />
          </div>
        </div>
      )}

      {/* Applicants section */}
      <div style={{ padding: "0 24px 24px", overflowY: "auto", flex: 1 }}>
        {sectionHead("Volunteers")}

        {/* Status tabs */}
        <div className="flex gap-1" style={{ marginBottom: 12 }}>
          {(["Pending", "Approved", "Rejected"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setAppTab(tab); setSelected(new Set()); setPendingAction(null); }}
              style={{
                height: 30, padding: "0 12px", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                backgroundColor: appTab === tab ? "#1E293B" : "#F1F5F9",
                color: appTab === tab ? "#fff" : "#64748B",
              }}
            >
              {tab} <span style={{ opacity: 0.7 }}>({applicantsByStatus[tab].length})</span>
            </button>
          ))}
        </div>

        {/* Bulk controls for Pending tab */}
        {appTab === "Pending" && currentList.length > 0 && !showAttendance && (
          <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={currentIds.length > 0 && currentIds.every((id) => selected.has(id))}
              onChange={() => toggleAll(currentIds)}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            <span style={{ fontSize: 13, color: "#64748B" }}>{selected.size > 0 ? `${selected.size} selected` : "Select all"}</span>
            {selected.size > 0 && (
              <>
                <Btn label="Approve" color={GREEN} small onClick={() => setPendingAction("approve")} disabled={busy} />
                <Btn label="Reject" color={RED} small onClick={() => setPendingAction("reject")} disabled={busy} />
              </>
            )}
          </div>
        )}

        {/* Approved tab: select for attendance or certificates */}
        {appTab === "Approved" && currentList.length > 0 && !showAttendance && (
          <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={currentIds.length > 0 && currentIds.every((id) => selected.has(id))}
              onChange={() => toggleAll(currentIds)}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            <span style={{ fontSize: 13, color: "#64748B" }}>{selected.size > 0 ? `${selected.size} selected` : "Select all"}</span>
            {selected.size > 0 && (
              <Btn label="Reject" color={RED} small onClick={() => setPendingAction("reject")} disabled={busy} />
            )}
          </div>
        )}

        {/* Attendance save bar */}
        {showAttendance && appTab === "Approved" && attDirty && (
          <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
            <Btn label={attBusy ? "Saving…" : "Apply Attendance"} color={GREEN} onClick={doSaveAttendance} disabled={attBusy} />
            <span style={{ fontSize: 12, color: "#64748B" }}>Unsaved changes</span>
          </div>
        )}

        {/* Confirmation bar */}
        {pendingAction && selected.size > 0 && (
          <div style={{ backgroundColor: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#92400E", marginBottom: 8 }}>
              {pendingAction === "approve"
                ? `Approve ${selected.size} volunteer${selected.size > 1 ? "s" : ""}?`
                : `Reject ${selected.size} volunteer${selected.size > 1 ? "s" : ""}?`}
            </div>
            <div className="flex gap-2">
              <Btn label="Confirm" color={pendingAction === "approve" ? GREEN : RED} onClick={doApplyChanges} disabled={busy} />
              <Btn label="Cancel" color="#94A3B8" onClick={() => { setPendingAction(null); setSelected(new Set()); }} />
            </div>
          </div>
        )}

        {/* Applicant list */}
        {currentList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "#94A3B8", fontSize: 13 }}>
            No {appTab.toLowerCase()} volunteers.
          </div>
        ) : (
          currentList.map((app) => {
            const draftVal = attDraft[app.app_id];
            // Merge draft onto app for display
            const displayApp = { ...app, _draft: draftVal };
            return (
              <div key={app.app_id}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>
                  {/* Checkbox: only for non-attendance tabs */}
                  {!showAttendance && (
                    <input
                      type="checkbox"
                      checked={selected.has(app.app_id)}
                      onChange={() => toggleSelect(app.app_id)}
                      style={{ width: 16, height: 16, cursor: "pointer", flexShrink: 0 }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {app.volunteer_name}
                    </div>
                    <div style={{ fontSize: 12, color: "#94A3B8" }}>{app.volunteer_email}</div>
                  </div>
                  {/* Attendance buttons (Active/Completed + Approved tab) */}
                  {showAttendance && appTab === "Approved" && (
                    <div className="flex gap-1" style={{ flexShrink: 0 }}>
                      {(["Attended", "Absent"] as AttendanceStatus[]).map((v) => {
                        const isDraft = draftVal === v;
                        const isSaved = !draftVal && app.attendance_status === v;
                        const active = isDraft || isSaved;
                        return (
                          <button
                            key={v}
                            onClick={() => {
                              const next: DraftAtt = { ...attDraft, [app.app_id]: isDraft ? "" : v };
                              setAttDraft(next);
                              setAttDirty(Object.values(next).some((x) => x !== ""));
                            }}
                            style={{
                              height: 26, padding: "0 9px",
                              backgroundColor: active ? (v === "Attended" ? GREEN : RED) : "#F1F5F9",
                              color: active ? "#fff" : "#64748B",
                              border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                            }}
                          >
                            {v}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {/* Certificate button: only for Completed + Attended */}
                  {isCompleted && appTab === "Approved" && app.attendance_status === "Attended" && (
                    <Btn label="+ Cert" color={CYAN} small onClick={() => setCertVolunteer(app)} />
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Attendance legend */}
        {showAttendance && appTab === "Approved" && currentList.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: "#94A3B8" }}>
            Select Attended / Absent for each volunteer, then click <strong>Apply Attendance</strong>.
            {isCompleted && " Certificates are available for Attended volunteers."}
          </div>
        )}
      </div>

      {/* Certificate sub-modal overlay */}
      {certVolunteer && (
        <div
          onClick={() => setCertVolunteer(null)}
          style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, borderRadius: 16, zIndex: 10 }}
        >
          <CertModal
            volunteer={certVolunteer}
            eventId={event.id}
            orgId={event.org_id}
            onClose={() => { setCertVolunteer(null); load(); }}
          />
        </div>
      )}
    </ModalShell>
  );
}

// ── Modal shell ───────────────────────────────────────────────────────────────

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.55)", zIndex: 100 }}
      />
      <div
        style={{
          position: "fixed", top: "5vh", left: "50%", transform: "translateX(-50%)",
          width: "min(640px, 96vw)", maxHeight: "90vh",
          backgroundColor: "#fff", borderRadius: 16,
          boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
          zIndex: 101, display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </>
  );
}
