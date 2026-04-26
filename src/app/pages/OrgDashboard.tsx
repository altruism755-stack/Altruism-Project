import { useState, useEffect, useCallback, useRef } from "react";
import { Navbar } from "../components/Navbar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const GREEN = "#16A34A";

// ─── shared helpers ───────────────────────────────────────────────────────────
const iStyle = {
  width: "100%", height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8,
  padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" as const,
};
const lStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4,
};
const actStatus: Record<string, { bg: string; band: string; text: string; label: string }> = {
  Upcoming:  { bg: "#DCFCE7", band: GREEN,    text: "#15803D", label: "Upcoming" },
  Active:    { bg: "#FEF3C7", band: "#D97706", text: "#B45309", label: "Ongoing"  },
  Completed: { bg: "#F1F5F9", band: "#94A3B8", text: "#64748B", label: "Completed"},
};

// ─── Volunteers tab ───────────────────────────────────────────────────────────
function VolunteersTab({ orgId, members, supervisors, onRefresh }: {
  orgId: number; members: any[]; supervisors: any[]; onRefresh: () => void;
}) {
  const [sub, setSub] = useState<"pending" | "active">("pending");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [approveTarget, setApproveTarget] = useState<any | null>(null);
  const [assignForm, setAssignForm] = useState({ supervisor_id: "", department: "" });

  const pending = members.filter((m) => m.org_status === "Pending");
  const active  = members.filter((m) => m.org_status === "Active");
  const list    = (sub === "pending" ? pending : active).filter((m) =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  const doApprove = async () => {
    if (!approveTarget) return;
    setBusy(approveTarget.id);
    try {
      await api.approveOrgMember(orgId, approveTarget.id, {
        supervisor_id: assignForm.supervisor_id ? Number(assignForm.supervisor_id) : null,
        department: assignForm.department || null,
      });
      setApproveTarget(null);
      onRefresh();
    } catch (e) { console.error(e); }
    setBusy(null);
  };

  const doReject = async (id: number, name: string) => {
    if (!window.confirm(`Reject ${name}'s request?`)) return;
    setBusy(id);
    try { await api.rejectOrgMember(orgId, id); onRefresh(); } catch (e) { console.error(e); }
    setBusy(null);
  };

  const doRemove = async (id: number, name: string) => {
    if (!window.confirm(`Remove ${name} from your organization?`)) return;
    setBusy(id);
    try { await api.removeOrgMember(orgId, id); onRefresh(); } catch (e) { console.error(e); }
    setBusy(null);
  };

  return (
    <div>
      {/* Approve modal */}
      {approveTarget && (
        <>
          <div onClick={() => setApproveTarget(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 50 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 440, backgroundColor: "#fff", borderRadius: 16, zIndex: 51, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "#1E293B", margin: "0 0 6px 0" }}>Accept Volunteer</h3>
            <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 20px 0" }}>
              Accept <strong>{approveTarget.name}</strong> and optionally assign a supervisor and department.
            </p>
            <div className="flex flex-col gap-4">
              <div>
                <label style={lStyle}>Supervisor (optional)</label>
                <select value={assignForm.supervisor_id} onChange={(e) => setAssignForm((f) => ({ ...f, supervisor_id: e.target.value }))} style={iStyle}>
                  <option value="">— No supervisor —</option>
                  {supervisors.map((s) => <option key={s.id} value={s.id}>{s.name}{s.team ? ` · ${s.team}` : ""}</option>)}
                </select>
              </div>
              <div>
                <label style={lStyle}>Department (optional)</label>
                <input value={assignForm.department} onChange={(e) => setAssignForm((f) => ({ ...f, department: e.target.value }))} placeholder="e.g. Media, Operations…" style={iStyle} />
              </div>
            </div>
            <div className="flex gap-3" style={{ marginTop: 24 }}>
              <button onClick={() => setApproveTarget(null)} style={{ flex: 1, height: 42, backgroundColor: "#fff", color: "#64748B", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancel</button>
              <button onClick={doApprove} disabled={busy === approveTarget.id} style={{ flex: 1, height: 42, backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                {busy === approveTarget.id ? "Accepting…" : "Accept"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Sub-tabs */}
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <div className="flex gap-1" style={{ borderBottom: "2px solid #E2E8F0" }}>
          {([
            { k: "pending" as const, label: `Pending (${pending.length})` },
            { k: "active"  as const, label: `Active (${active.length})` },
          ]).map((t) => (
            <button key={t.k} onClick={() => setSub(t.k)} style={{
              padding: "8px 18px", background: "none", border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: sub === t.k ? 600 : 400,
              color: sub === t.k ? GREEN : "#64748B",
              borderBottom: sub === t.k ? `2px solid ${GREEN}` : "2px solid transparent",
              marginBottom: -2,
            }}>{t.label}</button>
          ))}
        </div>
        <input type="text" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ width: 220, height: 36, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 13, outline: "none" }} />
      </div>

      {/* Table */}
      <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
        {/* Header */}
        <div className="grid" style={{
          gridTemplateColumns: sub === "pending" ? "2fr 2fr 1.2fr 1.2fr 1.5fr" : "2fr 2fr 1.2fr 1.4fr 1.2fr 1.4fr",
          padding: "11px 20px", backgroundColor: "#F8FAFC", borderBottom: "2px solid #E2E8F0",
        }}>
          {(sub === "pending"
            ? ["Volunteer", "Email", "Phone", "Applied", "Actions"]
            : ["Volunteer", "Email", "Phone", "Supervisor", "Department", "Actions"]
          ).map((h) => <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>)}
        </div>

        {list.length === 0 ? (
          <div className="text-center py-12" style={{ color: "#94A3B8", fontSize: 14 }}>
            {sub === "pending" ? "No pending requests." : "No active members yet."}
          </div>
        ) : list.map((v) => {
          const initials = v.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2);
          const loading = busy === v.id;
          if (sub === "pending") return (
            <div key={v.id} className="grid items-center" style={{ gridTemplateColumns: "2fr 2fr 1.2fr 1.2fr 1.5fr", padding: "13px 20px", borderBottom: "1px solid #F1F5F9", borderLeft: "3px solid #D97706" }}>
              <div className="flex items-center gap-3">
                <div style={{ width: 34, height: 34, borderRadius: "50%", backgroundColor: "#D97706", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{initials}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1E293B" }}>{v.name}</div>
                  {v.city && <div style={{ fontSize: 11, color: "#94A3B8" }}>{v.city}</div>}
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#64748B" }}>{v.email}</div>
              <div style={{ fontSize: 13, color: "#64748B" }}>{v.phone || "—"}</div>
              <div style={{ fontSize: 12, color: "#94A3B8" }}>{v.joined_date || "—"}</div>
              <div className="flex gap-2">
                <button onClick={() => { setApproveTarget(v); setAssignForm({ supervisor_id: "", department: "" }); }} disabled={loading}
                  style={{ height: 30, padding: "0 14px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Accept</button>
                <button onClick={() => doReject(v.id, v.name)} disabled={loading}
                  style={{ height: 30, padding: "0 14px", backgroundColor: "#fff", color: "#DC2626", border: "1px solid #DC2626", borderRadius: 7, fontSize: 12, cursor: "pointer" }}>Reject</button>
              </div>
            </div>
          );
          return (
            <div key={v.id} className="grid items-center" style={{ gridTemplateColumns: "2fr 2fr 1.2fr 1.4fr 1.2fr 1.4fr", padding: "13px 20px", borderBottom: "1px solid #F1F5F9" }}>
              <div className="flex items-center gap-3">
                <div style={{ width: 34, height: 34, borderRadius: "50%", backgroundColor: GREEN, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{initials}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1E293B" }}>{v.name}</div>
                  {(() => { try { const s = JSON.parse(v.skills || "[]"); return s.length ? <div style={{ fontSize: 11, color: "#94A3B8" }}>{s.slice(0,2).join(", ")}</div> : null; } catch { return null; } })()}
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#64748B" }}>{v.email}</div>
              <div style={{ fontSize: 13, color: "#64748B" }}>{v.phone || "—"}</div>
              <div style={{ fontSize: 13, color: "#64748B" }}>{v.supervisor_name || "—"}</div>
              <div style={{ fontSize: 13, color: "#64748B" }}>{v.department || "—"}</div>
              <button onClick={() => doRemove(v.id, v.name)} disabled={loading}
                style={{ height: 30, padding: "0 12px", backgroundColor: "#fff", color: "#DC2626", border: "1px solid #DC2626", borderRadius: 7, fontSize: 12, cursor: "pointer", width: "fit-content" }}>
                {loading ? "…" : "Remove"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Supervisors tab ──────────────────────────────────────────────────────────
function SupervisorsTab({ supervisors, onRefresh }: { supervisors: any[]; onRefresh: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", team: "" });
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const [error, setError] = useState("");

  const doAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setSaving(true); setError("");
    try {
      await api.createSupervisor({ name: form.name, email: form.email, phone: form.phone, team: form.team });
      setForm({ name: "", email: "", phone: "", team: "" });
      onRefresh();
    } catch (err: any) { setError(err.message || "Failed to add supervisor"); }
    setSaving(false);
  };

  const doRemove = async (id: number, name: string) => {
    if (!window.confirm(`Remove ${name} as supervisor?`)) return;
    setRemoving(id);
    try { await api.deleteSupervisor(id); onRefresh(); } catch (e) { console.error(e); }
    setRemoving(null);
  };

  return (
    <div className="flex gap-6 items-start">
      {/* Add form */}
      <div style={{ flex: "0 0 340px" }}>
        <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", margin: "0 0 4px 0" }}>Add Supervisor</h3>
          <p style={{ fontSize: 12, color: "#94A3B8", margin: "0 0 20px 0", lineHeight: 1.5 }}>
            New supervisors receive the default password <strong>supervisor123</strong> to log in.
          </p>
          {error && <div style={{ fontSize: 13, color: "#DC2626", backgroundColor: "#FEE2E2", padding: "8px 12px", borderRadius: 6, marginBottom: 12 }}>{error}</div>}
          <form onSubmit={doAdd} className="flex flex-col gap-4">
            <div><label style={lStyle}>Full Name *</label><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={iStyle} /></div>
            <div><label style={lStyle}>Email *</label><input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} style={iStyle} /></div>
            <div><label style={lStyle}>Phone</label><input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} style={iStyle} /></div>
            <div><label style={lStyle}>Department / Team</label><input value={form.team} onChange={(e) => setForm((f) => ({ ...f, team: e.target.value }))} style={iStyle} /></div>
            <button type="submit" disabled={saving || !form.name || !form.email} style={{ height: 42, backgroundColor: saving ? "#86EFAC" : GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Adding…" : "Add Supervisor"}
            </button>
          </form>
        </div>
      </div>

      {/* Supervisors list */}
      <div style={{ flex: 1 }}>
        <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
          <div className="grid" style={{ gridTemplateColumns: "2fr 2fr 1.2fr 1fr 1fr 1.2fr", padding: "11px 20px", backgroundColor: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
            {["Name", "Email", "Department", "Volunteers", "Status", "Actions"].map((h) => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
            ))}
          </div>
          {supervisors.length === 0 ? (
            <div className="text-center py-12" style={{ color: "#94A3B8", fontSize: 14 }}>No supervisors yet. Add one using the form.</div>
          ) : supervisors.map((s) => (
            <div key={s.id} className="grid items-center" style={{ gridTemplateColumns: "2fr 2fr 1.2fr 1fr 1fr 1.2fr", padding: "13px 20px", borderBottom: "1px solid #F1F5F9" }}>
              <div className="flex items-center gap-3">
                <div style={{ width: 34, height: 34, borderRadius: "50%", backgroundColor: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>
                  {s.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{s.name}</span>
              </div>
              <div style={{ fontSize: 13, color: "#64748B" }}>{s.email}</div>
              <div style={{ fontSize: 13, color: "#64748B" }}>{s.team || "—"}</div>
              <div><span style={{ backgroundColor: "#DBEAFE", color: "#1D4ED8", fontSize: 12, fontWeight: 600, borderRadius: 20, padding: "2px 8px" }}>{s.assigned_volunteers ?? 0}</span></div>
              <div><span style={{ backgroundColor: s.status === "Active" ? "#DCFCE7" : "#FEF3C7", color: s.status === "Active" ? "#15803D" : "#B45309", fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "3px 10px" }}>{s.status}</span></div>
              <button onClick={() => doRemove(s.id, s.name)} disabled={removing === s.id}
                style={{ height: 30, padding: "0 12px", backgroundColor: "#fff", color: "#DC2626", border: "1px solid #DC2626", borderRadius: 7, fontSize: 12, cursor: "pointer", width: "fit-content" }}>
                {removing === s.id ? "…" : "Remove"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Activities tab ────────────────────────────────────────────────────────────
const emptyForm = { name: "", description: "", location: "", date: "", time: "", duration: "", maxVolunteers: "", requiredSkills: "", status: "Upcoming" };

function ActivitiesTab({ events, onRefresh }: { events: any[]; onRefresh: () => void }) {
  const [sub, setSub] = useState<"Upcoming" | "Active" | "Completed">("Upcoming");
  const [showPanel, setShowPanel] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const byStatus = events.filter((e) => e.status === sub);
  const counts = { Upcoming: events.filter((e) => e.status === "Upcoming").length, Active: events.filter((e) => e.status === "Active").length, Completed: events.filter((e) => e.status === "Completed").length };

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, status: sub === "Active" ? "Active" : "Upcoming" }); setShowPanel(true); };
  const openEdit = (ev: any) => {
    setEditing(ev);
    setForm({ name: ev.name, description: ev.description || "", location: ev.location || "", date: ev.date, time: ev.time || "", duration: String(ev.duration || ""), maxVolunteers: String(ev.max_volunteers || ""), requiredSkills: ev.required_skills || "", status: ev.status });
    setShowPanel(true);
  };

  const doSave = async () => {
    setSaving(true);
    const data = { name: form.name, description: form.description, location: form.location, date: form.date, time: form.time, duration: Number(form.duration) || undefined, max_volunteers: Number(form.maxVolunteers) || undefined, required_skills: form.requiredSkills, status: form.status };
    try {
      if (editing) await api.updateEvent(editing.id, data); else await api.createEvent(data);
      setShowPanel(false); onRefresh();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const doDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try { await api.deleteEvent(id); onRefresh(); } catch (e) { console.error(e); }
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Panel overlay */}
      {showPanel && (
        <>
          <div onClick={() => setShowPanel(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", zIndex: 50 }} />
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 480, backgroundColor: "#fff", zIndex: 51, boxShadow: "-8px 0 32px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column" }}>
            <div className="flex items-center justify-between px-6" style={{ height: 64, borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: "#1E293B", margin: 0 }}>{editing ? "Edit Activity" : "New Activity"}</h3>
              <button onClick={() => setShowPanel(false)} style={{ background: "none", border: "none", fontSize: 22, color: "#94A3B8", cursor: "pointer" }}>×</button>
            </div>
            <div className="flex-1 overflow-y-auto" style={{ padding: 24 }}>
              <div className="flex flex-col gap-4">
                <div><label style={lStyle}>Name *</label><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={iStyle} /></div>
                <div><label style={lStyle}>Description</label><textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} style={{ ...iStyle, height: 80, padding: "10px 12px", resize: "vertical" as const }} /></div>
                <div><label style={lStyle}>Location</label><input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} style={iStyle} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label style={lStyle}>Date *</label><input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={iStyle} /></div>
                  <div><label style={lStyle}>Time</label><input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} style={iStyle} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label style={lStyle}>Duration (h)</label><input type="number" min="0" step="0.5" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} style={iStyle} /></div>
                  <div><label style={lStyle}>Max Volunteers</label><input type="number" min="0" value={form.maxVolunteers} onChange={(e) => setForm((f) => ({ ...f, maxVolunteers: e.target.value }))} style={iStyle} /></div>
                </div>
                <div><label style={lStyle}>Required Skills</label><input value={form.requiredSkills} onChange={(e) => setForm((f) => ({ ...f, requiredSkills: e.target.value }))} placeholder="Comma separated" style={iStyle} /></div>
                <div><label style={lStyle}>Status</label>
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} style={iStyle}>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Active">Ongoing</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4" style={{ borderTop: "1px solid #E2E8F0", flexShrink: 0 }}>
              <button onClick={() => setShowPanel(false)} style={{ flex: 1, height: 42, backgroundColor: "#fff", color: "#64748B", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancel</button>
              <button onClick={doSave} disabled={saving || !form.name || !form.date} style={{ flex: 1, height: 42, backgroundColor: saving ? "#86EFAC" : GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Create"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Sub-tabs + Add button */}
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <div className="flex gap-1" style={{ borderBottom: "2px solid #E2E8F0" }}>
          {(["Upcoming", "Active", "Completed"] as const).map((s) => {
            const m = actStatus[s];
            return (
              <button key={s} onClick={() => setSub(s)} style={{
                padding: "8px 18px", background: "none", border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: sub === s ? 600 : 400,
                color: sub === s ? m.band : "#64748B",
                borderBottom: sub === s ? `2px solid ${m.band}` : "2px solid transparent",
                marginBottom: -2,
              }}>
                {m.label}
                <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, backgroundColor: sub === s ? m.bg : "#F1F5F9", color: sub === s ? m.text : "#94A3B8", borderRadius: 20, padding: "2px 7px" }}>{counts[s]}</span>
              </button>
            );
          })}
        </div>
        <button onClick={openCreate} style={{ height: 36, padding: "0 20px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Add Activity</button>
      </div>

      {/* Cards */}
      {byStatus.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14" style={{ backgroundColor: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", color: "#94A3B8" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>{sub === "Upcoming" ? "📅" : sub === "Active" ? "⚡" : "✅"}</div>
          <div style={{ fontSize: 14 }}>No {actStatus[sub].label.toLowerCase()} activities</div>
          {sub !== "Completed" && <button onClick={openCreate} style={{ marginTop: 12, height: 36, padding: "0 20px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Create Activity</button>}
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
          {byStatus.map((ev) => {
            const m = actStatus[ev.status as "Upcoming" | "Active" | "Completed"] || actStatus.Completed;
            const skills = (ev.required_skills || "").split(",").map((s: string) => s.trim()).filter(Boolean);
            return (
              <div key={ev.id} style={{ backgroundColor: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden" }}>
                <div style={{ height: 4, backgroundColor: m.band }} />
                <div style={{ padding: 18 }}>
                  <div className="flex items-start justify-between mb-2">
                    <h4 style={{ fontSize: 15, fontWeight: 600, color: "#1E293B", margin: 0, flex: 1, paddingRight: 8 }}>{ev.name}</h4>
                    <span style={{ backgroundColor: m.bg, color: m.text, fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "2px 8px", flexShrink: 0 }}>{m.label}</span>
                  </div>
                  {ev.description && <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 8px 0", lineHeight: 1.5 }}>{ev.description.slice(0, 90)}{ev.description.length > 90 ? "…" : ""}</p>}
                  <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 6 }}>
                    📅 {ev.date}{ev.time ? " · " + ev.time : ""}
                    {ev.location ? " · 📍 " + ev.location : ""}
                  </div>
                  <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 8 }}>
                    👥 {ev.current_volunteers || 0}/{ev.max_volunteers || "∞"} volunteers{ev.duration ? ` · ${ev.duration}h` : ""}
                  </div>
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1" style={{ marginBottom: 10 }}>
                      {skills.map((s: string, i: number) => <span key={i} style={{ fontSize: 10, backgroundColor: "#F1F5F9", color: "#64748B", padding: "2px 6px", borderRadius: 10 }}>{s}</span>)}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(ev)} style={{ height: 28, padding: "0 12px", backgroundColor: "#fff", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Edit</button>
                    <button onClick={() => doDelete(ev.id, ev.name)} style={{ height: 28, padding: "0 12px", backgroundColor: "#fff", color: "#DC2626", border: "1px solid #DC2626", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton shown while admins tab data loads ───────────────────────────────
function AdminsTabSkeleton() {
  const bar = (w: string | number, h = 12, mb = 0): React.CSSProperties => ({
    width: w, height: h, borderRadius: 6, backgroundColor: "#E2E8F0",
    marginBottom: mb || undefined,
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Submitter card shape */}
      <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "18px 20px", display: "flex", gap: 14 }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", backgroundColor: "#E2E8F0", flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={bar("40%", 10)} />
          <div style={bar("55%", 13)} />
          <div style={bar("30%", 10)} />
        </div>
      </div>
      {/* Add-form card shape */}
      <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={bar("28%", 14)} />
        <div style={bar("60%", 10)} />
        <div style={{ height: 40, borderRadius: 8, backgroundColor: "#E2E8F0" }} />
      </div>
      {/* List card shape */}
      <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
          <div style={bar("38%", 11)} />
        </div>
        <div style={{ padding: 32, textAlign: "center" }}>
          <div style={{ ...bar("45%", 11), margin: "0 auto" }} />
        </div>
      </div>
    </div>
  );
}

// ─── Org Admins tab ───────────────────────────────────────────────────────────
// Invariant enforced by backend: creator is always in the admins list.
// "No admins" is therefore an unexpected state, shown only as a safety fallback.
const _norm = (e: string) => e.toLowerCase().trim();

function OrgAdminsTab({
  currentUserEmail,
  orgProfile,
}: {
  currentUserEmail: string;
  orgProfile: any;
}) {
  // ── All hooks unconditional ──────────────────────────────────────────────
  const [admins, setAdmins]             = useState<any[]>([]);
  const [adminsLoaded, setAdminsLoaded] = useState(false);
  const [email, setEmail]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [granting, setGranting]         = useState(false);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState("");
  // Toast is keyed — same key while visible won't restart the timer unnecessarily.
  const [toast, setToast]               = useState<{ key: string; msg: string } | null>(null);
  const [confirmId, setConfirmId]       = useState<number | null>(null);

  // key-based dependency: if a new toast arrives with the same key, the timer resets correctly.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast?.key]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.orgListAdmins();
      setAdmins(r.admins || []);
      setAdminsLoaded(true);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleFormGrant = async () => {
    const target = _norm(email);
    setError(""); setSuccess("");
    if (!target || granting) return;
    setGranting(true);
    try {
      await api.orgAddAdmin(target);
      setSuccess(`${target} is now an organization admin.`);
      setEmail("");
      load();
    } catch (e: any) {
      setError(e.message || "Couldn't grant admin access. Please try again.");
    } finally {
      setGranting(false);
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await api.orgRemoveAdmin(id);
      setConfirmId(null);
      load();
    } catch (e: any) {
      setError(e.message || "Failed to remove admin");
      setConfirmId(null);
    }
  };

  // ── Guard: both sources must be ready ───────────────────────────────────
  if (!orgProfile || !adminsLoaded) {
    return <AdminsTabSkeleton />;
  }

  // ── Derived state — normalised emails prevent case-mismatch false negatives ─
  const submitterEmail = _norm(orgProfile.submitter_email || "");
  const submitterName  = orgProfile.submitter_name  || "";
  const submitterRole  = orgProfile.submitter_role  || "";
  const hasSubmitter   = !!(submitterName || submitterRole);
  const normCurrentUser = _norm(currentUserEmail);

  const isOwner = !!(submitterEmail && submitterEmail === normCurrentUser);

  return (
    <div>
      {/* ── Toast ──────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 100,
          backgroundColor: "#1E293B", color: "#fff",
          padding: "12px 18px", borderRadius: 10,
          fontSize: 13, fontWeight: 500,
          boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
          display: "flex", alignItems: "center", gap: 8,
          pointerEvents: "none",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ADE80"
               strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {toast.msg}
        </div>
      )}

      {/* ── Confirm removal modal ──────────────────────────────────────── */}
      {confirmId !== null && (
        <>
          <div onClick={() => setConfirmId(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 50 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 400, backgroundColor: "#fff", borderRadius: 16, zIndex: 51, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: "#1E293B", margin: "0 0 8px 0" }}>Remove Organization Admin</h3>
            <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 24px 0" }}>
              This person will lose organization admin access. You can re-add them later.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmId(null)} style={{ flex: 1, height: 40, backgroundColor: "#fff", color: "#64748B", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => handleRemove(confirmId)} style={{ flex: 1, height: 40, backgroundColor: "#DC2626", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Remove</button>
            </div>
          </div>
        </>
      )}

      {/* ── Submitter info card — informational only, no CTA ───────────── */}
      {hasSubmitter && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 14,
          padding: "18px 20px", marginBottom: 16,
          backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            backgroundColor: "#EFF6FF", border: "1px solid #DBEAFE",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, marginTop: 1,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3B82F6"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 5px 0" }}>
              {isOwner ? "You submitted this organization" : "Submitted by"}
            </p>
            {!isOwner && submitterName && (
              <p
                title={submitterEmail || undefined}
                style={{
                  fontSize: 15, fontWeight: 600, color: "#1E293B", margin: "0 0 3px 0",
                  wordBreak: "break-word", overflowWrap: "break-word",
                  cursor: "help",
                  textDecoration: "underline", textDecorationStyle: "dotted",
                  textDecorationColor: "#CBD5E1",
                }}
              >
                {submitterName}
              </p>
            )}
            {submitterRole && (
              <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>{submitterRole}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Add form — primary action ───────────────────────────────────── */}
      <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", margin: "0 0 4px 0" }}>Add Organization Admin</h3>
        <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 14px 0" }}>Enter the email of an existing user to grant them admin access to your organization.</p>
        {error   && <div style={{ fontSize: 13, color: "#B91C1C", backgroundColor: "#FEE2E2", padding: "8px 12px", borderRadius: 6, marginBottom: 10 }}>{error}</div>}
        {success && <div style={{ fontSize: 13, color: "#15803D", backgroundColor: "#DCFCE7", padding: "8px 12px", borderRadius: 6, marginBottom: 10 }}>{success}</div>}
        <div className="flex gap-3">
          <input
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFormGrant()}
            style={{ flex: 1, height: 40, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none" }}
          />
          <button
            onClick={handleFormGrant}
            disabled={granting}
            style={{
              height: 40, padding: "0 18px",
              backgroundColor: granting ? "#475569" : "#0F172A", color: "#fff",
              border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: granting ? "wait" : "pointer", whiteSpace: "nowrap",
            }}
          >
            {granting ? "Granting…" : "Grant Access"}
          </button>
        </div>
      </div>

      {/* ── Admin list ─────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0", backgroundColor: "#F8FAFC" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>Current Organization Admins ({admins.length})</span>
        </div>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Loading...</div>
        ) : admins.length === 0 ? (
          // Unexpected state — backend guarantees creator is always an admin.
          <div style={{ padding: 32, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
            No organization admins yet.
          </div>
        ) : (
          admins.map((a, idx) => {
            const aEmail = _norm(a.email);
            return (
              <div key={a.id} className="flex items-center justify-between" style={{ padding: "14px 20px", borderBottom: idx < admins.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{a.email}</span>
                    {/* Creator badge — matches via normalised email; future-proofs for userId match */}
                    {submitterEmail && aEmail === submitterEmail && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                        backgroundColor: "#EFF6FF", color: "#3B82F6",
                        border: "1px solid #BFDBFE", borderRadius: 4,
                        padding: "1px 6px",
                      }}>
                        Creator
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>Added {a.created_at?.split("T")[0]}</div>
                </div>
                <div className="flex items-center gap-3">
                  {aEmail === normCurrentUser && (
                    <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: "#DCFCE7", color: "#15803D", borderRadius: 4, padding: "2px 8px" }}>You</span>
                  )}
                  {aEmail !== normCurrentUser && (
                    <button
                      onClick={() => setConfirmId(a.id)}
                      style={{ height: 30, padding: "0 12px", backgroundColor: "#fff", color: "#DC2626", border: "1px solid #FECACA", borderRadius: 7, fontSize: 12, cursor: "pointer" }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── CSV Import Modal ─────────────────────────────────────────────────────────

/** Parse a single CSV line, respecting double-quoted fields that contain commas. */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQ = !inQ; }
    } else if (ch === "," && !inQ) {
      result.push(cur.trim()); cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function parsedCSV(text: string): { headers: string[]; data: string[][] } {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { headers: [], data: [] };
  return {
    headers: parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim()),
    data:    lines.slice(1).map(parseCSVLine),
  };
}

const _EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const _PHONE_RE = /^01[0-9]{9}$/;

interface LiveValidation {
  rowCount: number;
  hasRequired: boolean;
  missingHeaders: string[];
  errors: { row: number; message: string }[];
}

function runLiveValidation(text: string): LiveValidation {
  if (!text.trim()) return { rowCount: 0, hasRequired: false, missingHeaders: ["name", "email"], errors: [] };
  const { headers, data } = parsedCSV(text);
  const missing = ["name", "email"].filter((h) => !headers.includes(h));
  const emailIdx = headers.indexOf("email");
  const phoneIdx = headers.indexOf("phone");
  const errors: LiveValidation["errors"] = [];

  if (!missing.length) {
    data.forEach((row, i) => {
      const rowNum = i + 2;
      if (row.length < headers.length) {
        errors.push({ row: rowNum, message: `Row ${rowNum} has missing fields` });
        return;
      }
      const email = (row[emailIdx] ?? "").trim();
      if (email && !_EMAIL_RE.test(email))
        errors.push({ row: rowNum, message: `Invalid email on row ${rowNum}` });
      if (phoneIdx >= 0) {
        const phone = (row[phoneIdx] ?? "").replace(/\s/g, "");
        if (phone && !_PHONE_RE.test(phone))
          errors.push({ row: rowNum, message: `Invalid phone on row ${rowNum} (must be 11 digits starting with 01)` });
      }
    });
  }
  return { rowCount: data.length, hasRequired: !missing.length, missingHeaders: missing, errors };
}

type ImportStep = "input" | "preview" | "confirming" | "importing" | "result";

interface PreviewRow {
  name: string; email: string; phone: string; city: string; skills: string;
  status: "new" | "existing" | "error"; reason?: string;
}

const DUP_HINTS: Record<string, string> = {
  skip_duplicates: "Existing volunteers will not be changed.",
  update_existing: "Department and source fields will be refreshed.",
  invite_anyway:   "An invitation link will be regenerated if their account is not yet active.",
};

function ImportModal({ orgId, onClose, onSuccess }: {
  orgId: number; onClose: () => void; onSuccess: () => void;
}) {
  const [step, setStep]             = useState<ImportStep>("input");
  const [csvText, setCsvText]       = useState("");
  const [fileName, setFileName]     = useState<string | null>(null);
  const [dupStrategy, setDupStrategy] = useState("skip_duplicates");
  const [liveVal, setLiveVal]       = useState<LiveValidation | null>(null);
  const [previewData, setPreviewData] = useState<{ summary: { new: number; existing: number; errors: number }; rows: PreviewRow[] } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [previewing, setPreviewing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Escape key — don't close while import is running
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && step !== "importing") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, step]);

  // Debounced live validation (500 ms)
  useEffect(() => {
    if (!csvText.trim()) { setLiveVal(null); return; }
    const t = setTimeout(() => setLiveVal(runLiveValidation(csvText)), 500);
    return () => clearTimeout(t);
  }, [csvText]);

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("Please select a .csv file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? "";
      setCsvText(text);
      const { data } = parsedCSV(text);
      setFileName(`${file.name} (${data.length} row${data.length !== 1 ? "s" : ""})`);
    };
    reader.readAsText(file);
  };

  const handlePreview = async () => {
    setPreviewError(null);
    if (!csvText.trim()) { setPreviewError("Please enter CSV data or upload a file."); return; }
    setPreviewing(true);
    try {
      const res = await api.previewVolunteersCSV(orgId, csvText, dupStrategy);
      setPreviewData(res);
      setStep("preview");
    } catch {
      setPreviewError("Preview failed. Please check your CSV format and try again.");
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    setPreviewError(null);
    setStep("importing");
    try {
      const res = await api.importVolunteersCSV(orgId, csvText, dupStrategy);
      setImportResult(res);
      setStep("result");
      onSuccess();
    } catch {
      setStep("preview");
      setPreviewError("Import failed. Please try again.");
    }
  };

  const downloadTemplate = () => {
    const rows = [
      "name,email,phone,city,skills,department,role,source",
      "Ahmed Ali,ahmed@example.com,01012345678,Cairo,Teaching,Education,volunteer,manual_import",
      'Mona Khalil,mona@example.com,01098765432,Alexandria,"Event Planning,Communication",Programs,volunteer,manual_import',
      "Omar Hassan,omar@example.com,01155667788,Giza,Leadership|Management,Operations,volunteer,platform",
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement("a"), { href: url, download: "volunteers_template.csv" });
    a.click(); URL.revokeObjectURL(url);
  };

  const downloadErrorReport = () => {
    if (!importResult?.errors?.length) return;
    const lines = ["row,reason", ...importResult.errors.map((e: any) => `"${e.row}","${e.reason}"`)];
    const blob  = new Blob([lines.join("\n")], { type: "text/csv" });
    const url   = URL.createObjectURL(blob);
    const a     = Object.assign(document.createElement("a"), { href: url, download: "import_errors.csv" });
    a.click(); URL.revokeObjectURL(url);
  };

  const resetToInput = () => {
    setStep("input"); setCsvText(""); setFileName(null); setLiveVal(null);
    setPreviewData(null); setPreviewError(null); setImportResult(null);
  };

  // Preview button enabled only when text present + no blocking validation errors
  const canPreview =
    !previewing && !!csvText.trim() &&
    (!liveVal || (liveVal.hasRequired && liveVal.errors.length === 0));

  const importableCount = (previewData?.summary.new ?? 0) + (previewData?.summary.existing ?? 0);

  return (
    <>
      {/* Keyframe injection */}
      <style>{`
        @keyframes _fadeSlide { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes _shimmer   { 0%,100% { background-position:200% 0; } }
      `}</style>

      {/* Backdrop — does NOT close modal (prevents accidental data loss) */}
      <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}>
        <div
          role="dialog"
          aria-modal="true"
          style={{
            backgroundColor: "#fff", borderRadius: 16, width: "100%",
            maxWidth: step === "preview" || step === "confirming" ? 720 : 640,
            padding: 28, maxHeight: "90vh", overflowY: "auto",
            transition: "max-width 220ms ease",
          }}
        >

          {/* ── INPUT ─────────────────────────────────────────────────────── */}
          {step === "input" && (
            <>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#1E293B", marginBottom: 6 }}>Import Volunteers from CSV</div>
              <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, marginBottom: 16 }}>
                Import volunteers using a CSV file. New users will receive an invitation link to activate their account.
                Existing users will be automatically linked to your organization.
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
              />

              {/* Upload + template row */}
              <div style={{ display: "flex", gap: 8, marginBottom: fileName ? 8 : 10 }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{ height: 36, padding: "0 14px", backgroundColor: "#F1F5F9", color: "#1E293B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
                >
                  Upload CSV file
                </button>
                <button
                  onClick={downloadTemplate}
                  style={{ height: 36, padding: "0 14px", backgroundColor: "#fff", color: "#2563EB", border: "1px solid #BFDBFE", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
                >
                  Download template
                </button>
              </div>

              {/* Filename badge */}
              {fileName && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 10px", backgroundColor: "#F0F9FF", borderRadius: 8, border: "1px solid #BAE6FD" }}>
                  <span style={{ fontSize: 12, color: "#0369A1" }}>📄 {fileName}</span>
                  <button
                    onClick={() => { setCsvText(""); setFileName(null); setLiveVal(null); }}
                    style={{ marginLeft: "auto", fontSize: 11, color: "#64748B", background: "none", border: "none", cursor: "pointer", padding: "0 4px" }}
                  >
                    Clear ✕
                  </button>
                </div>
              )}

              {/* Textarea */}
              <textarea
                value={csvText}
                onChange={(e) => { setCsvText(e.target.value); setFileName(null); }}
                placeholder={"name,email,phone,city,skills\nAhmed Ali,ahmed@example.com,01012345678,Cairo,Teaching\nMona Khalil,mona@example.com,01098765432,Alexandria,\"Event Planning,Communication\""}
                style={{
                  width: "100%", minHeight: 150, padding: 12, fontSize: 12, fontFamily: "monospace",
                  border: `1px solid ${liveVal && (!liveVal.hasRequired || liveVal.errors.length > 0) ? "#FECACA" : "#E2E8F0"}`,
                  borderRadius: 8, resize: "vertical", outline: "none", boxSizing: "border-box",
                  transition: "border-color 200ms", marginBottom: 6,
                }}
              />

              {/* Live validation feedback */}
              {liveVal && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "center", fontSize: 12, color: "#64748B", marginBottom: liveVal.errors.length ? 6 : 0 }}>
                    <span>{liveVal.rowCount} row{liveVal.rowCount !== 1 ? "s" : ""} detected (excluding header)</span>
                    {liveVal.hasRequired
                      ? <span style={{ color: "#15803D", fontWeight: 500 }}>✓ Required headers found</span>
                      : <span style={{ color: "#B91C1C", fontWeight: 500 }}>✗ Missing: {liveVal.missingHeaders.join(", ")}</span>
                    }
                  </div>
                  {liveVal.errors.length > 0 && (
                    <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "8px 10px" }}>
                      {liveVal.errors.slice(0, 5).map((e, i) => (
                        <div key={i} style={{ fontSize: 12, color: "#B91C1C", padding: "1px 0" }}>• {e.message}</div>
                      ))}
                      {liveVal.errors.length > 5 && (
                        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>+ {liveVal.errors.length - 5} more issues</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Duplicate strategy */}
              <div style={{ marginBottom: 16 }}>
                <label
                  aria-label="Duplicate handling strategy"
                  style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 6 }}
                >
                  If a volunteer is already in this organization:
                </label>
                <select
                  value={dupStrategy}
                  onChange={(e) => setDupStrategy(e.target.value)}
                  style={{ height: 38, padding: "0 10px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, color: "#1E293B", outline: "none", backgroundColor: "#fff", width: "100%", marginBottom: 4 }}
                >
                  <option value="skip_duplicates">Skip — do not change existing members</option>
                  <option value="update_existing">Update — refresh department / source fields</option>
                  <option value="invite_anyway">Re-invite — resend invitation if account not yet activated</option>
                </select>
                <div style={{ fontSize: 12, color: "#64748B", paddingLeft: 2 }}>{DUP_HINTS[dupStrategy]}</div>
              </div>

              {previewError && (
                <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 13, color: "#B91C1C" }}>
                  {previewError}
                </div>
              )}

              <div className="flex gap-2" style={{ justifyContent: "flex-end" }}>
                <button onClick={onClose} style={{ height: 36, padding: "0 16px", backgroundColor: "#fff", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
                  Close
                </button>
                <button
                  onClick={handlePreview}
                  disabled={!canPreview}
                  style={{ height: 36, padding: "0 18px", backgroundColor: canPreview ? "#16A34A" : "#86EFAC", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: canPreview ? "pointer" : "not-allowed", opacity: canPreview ? 1 : 0.75 }}
                >
                  {previewing ? "Analyzing..." : "Preview"}
                </button>
              </div>
            </>
          )}

          {/* ── PREVIEW ───────────────────────────────────────────────────── */}
          {step === "preview" && previewData && (
            <>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#1E293B", marginBottom: 12 }}>Import Preview</div>

              {/* Summary bar */}
              <div style={{ display: "flex", gap: 16, padding: "10px 14px", backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, marginBottom: 14, fontSize: 13, flexWrap: "wrap" }}>
                <span style={{ color: "#15803D", fontWeight: 500 }}>✅ {previewData.summary.new} will be created</span>
                <span style={{ color: "#0369A1", fontWeight: 500 }}>🔵 {previewData.summary.existing} existing</span>
                <span style={{ color: "#B91C1C", fontWeight: 500 }}>❌ {previewData.summary.errors} error{previewData.summary.errors !== 1 ? "s" : ""}</span>
              </div>

              {previewError && (
                <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 13, color: "#B91C1C" }}>
                  {previewError}
                </div>
              )}

              {/* Row table */}
              <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #E2E8F0", marginBottom: 16, animation: "_fadeSlide 200ms ease" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ backgroundColor: "#F8FAFC" }}>
                      {["Name", "Email", "Phone", "City", "Skills", "Status"].map((h) => (
                        <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontWeight: 600, color: "#64748B", fontSize: 11, borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.rows.map((r, i) => (
                      <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                        <td style={{ padding: "8px 12px", color: "#1E293B", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name || "—"}</td>
                        <td style={{ padding: "8px 12px", color: "#64748B", maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.email || "—"}</td>
                        <td style={{ padding: "8px 12px", color: "#64748B", whiteSpace: "nowrap" }}>{r.phone || "—"}</td>
                        <td style={{ padding: "8px 12px", color: "#64748B", whiteSpace: "nowrap" }}>{r.city || "—"}</td>
                        <td style={{ padding: "8px 12px", color: "#64748B", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.skills || "—"}</td>
                        <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                          {r.status === "new"      && <span style={{ padding: "2px 8px", backgroundColor: "#DCFCE7", color: "#15803D",  borderRadius: 20, fontSize: 11, fontWeight: 600 }}>🟢 New</span>}
                          {r.status === "existing" && <span style={{ padding: "2px 8px", backgroundColor: "#E0F2FE", color: "#0369A1",  borderRadius: 20, fontSize: 11, fontWeight: 600 }}>🔵 Existing</span>}
                          {r.status === "error"    && (
                            <span title={r.reason} style={{ padding: "2px 8px", backgroundColor: "#FEE2E2", color: "#B91C1C", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "help" }}>
                              🔴 Error
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2" style={{ justifyContent: "flex-end" }}>
                <button
                  onClick={() => { setStep("input"); setPreviewError(null); }}
                  style={{ height: 36, padding: "0 16px", backgroundColor: "#fff", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
                >
                  Back
                </button>
                <button
                  onClick={() => setStep("confirming")}
                  disabled={importableCount === 0}
                  style={{ height: 36, padding: "0 18px", backgroundColor: importableCount > 0 ? "#16A34A" : "#86EFAC", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: importableCount > 0 ? "pointer" : "not-allowed" }}
                >
                  Import {importableCount} volunteer{importableCount !== 1 ? "s" : ""}
                </button>
              </div>
            </>
          )}

          {/* ── CONFIRM ───────────────────────────────────────────────────── */}
          {step === "confirming" && previewData && (
            <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
              <div style={{ fontSize: 38, marginBottom: 12 }}>⚠️</div>
              <div style={{ fontSize: 17, fontWeight: 600, color: "#1E293B", marginBottom: 8 }}>Confirm Import</div>
              <div style={{ fontSize: 14, color: "#64748B", lineHeight: 1.7, marginBottom: 28, maxWidth: 400, margin: "0 auto 28px" }}>
                You are about to import{" "}
                <strong>{importableCount} volunteer{importableCount !== 1 ? "s" : ""}</strong>.
                {previewData.summary.new > 0 && <> New users will receive an invitation link.</>}
                {" "}This action cannot be undone. Continue?
              </div>
              <div className="flex gap-3" style={{ justifyContent: "center" }}>
                <button
                  onClick={() => setStep("preview")}
                  style={{ height: 40, padding: "0 22px", backgroundColor: "#fff", color: "#64748B", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 14, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  style={{ height: 40, padding: "0 26px", backgroundColor: "#16A34A", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Confirm &amp; Import
                </button>
              </div>
            </div>
          )}

          {/* ── IMPORTING ─────────────────────────────────────────────────── */}
          {step === "importing" && (
            <div style={{ textAlign: "center", padding: "36px 0" }}>
              <div style={{ fontSize: 34, marginBottom: 14 }}>⏳</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", marginBottom: 6 }}>Importing volunteers…</div>
              <div style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>Please wait, this may take a moment.</div>
              <div style={{ height: 4, backgroundColor: "#E2E8F0", borderRadius: 4, overflow: "hidden", maxWidth: 300, margin: "0 auto" }}>
                <div style={{ height: "100%", background: "linear-gradient(90deg,#16A34A 0%,#22C55E 50%,#16A34A 100%)", backgroundSize: "200% 100%", borderRadius: 4, animation: "_shimmer 1.4s linear infinite" }} />
              </div>
            </div>
          )}

          {/* ── RESULT ────────────────────────────────────────────────────── */}
          {step === "result" && importResult && (() => {
            const isFullSuccess  = importResult.errorCount === 0 && importResult.successCount > 0;
            const isPartial      = importResult.errorCount > 0 && importResult.successCount > 0;
            const isFullFailure  = importResult.successCount === 0;
            return (
              <>
                {/* Headline */}
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>
                    {isFullSuccess ? "✅" : isPartial ? "⚠️" : "❌"}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 600, color: isFullSuccess ? "#15803D" : isPartial ? "#B45309" : "#B91C1C" }}>
                    {isFullSuccess && `${importResult.successCount} volunteer${importResult.successCount !== 1 ? "s" : ""} imported successfully.`}
                    {isPartial    && `${importResult.successCount} imported, ${importResult.skippedCount} skipped, ${importResult.errorCount} error${importResult.errorCount !== 1 ? "s" : ""}.`}
                    {isFullFailure && "Import failed. No volunteers were added."}
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
                  {[
                    { label: "Invited (new)",     value: importResult.invitedCount,  color: "#7C3AED", bg: "#F5F3FF" },
                    { label: "Linked (existing)", value: importResult.linkedCount,   color: "#0369A1", bg: "#F0F9FF" },
                    { label: "Skipped",           value: importResult.skippedCount,  color: "#92400E", bg: "#FFFBEB" },
                    { label: "Errors",            value: importResult.errorCount,    color: "#B91C1C", bg: "#FEF2F2" },
                  ].map((c) => (
                    <div key={c.label} style={{ backgroundColor: c.bg, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{c.value}</div>
                      <div style={{ fontSize: 10, color: "#64748B", marginTop: 1 }}>{c.label}</div>
                    </div>
                  ))}
                </div>

                {/* Invite links */}
                {importResult.inviteLinks?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", marginBottom: 8 }}>
                      Invitation Links — share with new volunteers (expire in 48 h)
                    </div>
                    <div style={{ backgroundColor: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 8, padding: 10, maxHeight: 180, overflowY: "auto" }}>
                      {importResult.inviteLinks.map((il: any, i: number) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: i < importResult.inviteLinks.length - 1 ? "1px solid #EDE9FE" : "none" }}>
                          <span style={{ fontSize: 11, color: "#4C1D95", fontWeight: 500, minWidth: 155, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{il.email}</span>
                          <input
                            readOnly value={il.link}
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                            style={{ flex: 1, height: 26, padding: "0 8px", fontSize: 10, fontFamily: "monospace", border: "1px solid #DDD6FE", borderRadius: 5, backgroundColor: "#fff", outline: "none" }}
                          />
                          <button
                            onClick={() => navigator.clipboard.writeText(il.link)}
                            style={{ height: 26, padding: "0 8px", backgroundColor: "#7C3AED", color: "#fff", border: "none", borderRadius: 5, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}
                          >
                            Copy
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error report */}
                {importResult.errorCount > 0 && (
                  <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 12, marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#B91C1C" }}>
                        {importResult.errorCount} error{importResult.errorCount !== 1 ? "s" : ""}
                      </span>
                      <button
                        onClick={downloadErrorReport}
                        style={{ fontSize: 12, color: "#B91C1C", background: "none", border: "1px solid #FECACA", borderRadius: 6, padding: "2px 10px", cursor: "pointer" }}
                      >
                        Download error report
                      </button>
                    </div>
                    <div style={{ maxHeight: 100, overflowY: "auto" }}>
                      {importResult.errors.slice(0, 10).map((e: any, i: number) => (
                        <div key={i} style={{ fontSize: 12, color: "#991B1B", padding: "1px 0" }}>{e.row}: {e.reason}</div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2" style={{ justifyContent: "flex-end" }}>
                  <button onClick={resetToInput} style={{ height: 36, padding: "0 16px", backgroundColor: "#fff", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
                    Import Another
                  </button>
                  <button onClick={onClose} style={{ height: 36, padding: "0 18px", backgroundColor: "#16A34A", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Done
                  </button>
                </div>
              </>
            );
          })()}

        </div>
      </div>
    </>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
type MainTab = "volunteers" | "supervisors" | "activities" | "admins";

export function OrgDashboard() {
  const { profile, user } = useAuth();
  const orgName = profile?.name || "Organization";
  const orgId: number = profile?.id || 0;

  const [stats, setStats]         = useState<any>(null);
  const [members, setMembers]     = useState<any[]>([]);
  const [supervisors, setSups]    = useState<any[]>([]);
  const [events, setEvents]       = useState<any[]>([]);
  const [orgProfileData, setOrgProfileData] = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<MainTab>("volunteers");
  const [showImport, setShowImport] = useState(false);

  const loadAll = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    try {
      const [sumRes, memRes, supRes, evtRes, profRes] = await Promise.all([
        api.getReportSummary(),
        api.getOrgMembers(orgId),
        api.getSupervisors(),
        api.getEvents({ org_id: String(orgId) }),
        api.getMyOrgProfile(),
      ]);
      setStats(sumRes);
      setMembers(memRes.volunteers || []);
      setSups(supRes.supervisors || []);
      setEvents(evtRes.events || []);
      setOrgProfileData(profRes.organization || null);
    } catch (e) { console.error("Dashboard load error:", e); }
    finally { setLoading(false); }
  }, [orgId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const pending  = members.filter((m) => m.org_status === "Pending");
  const active   = members.filter((m) => m.org_status === "Active");
  const activeEv = events.filter((e) => e.status === "Active" || e.status === "Upcoming");

  const statCards = [
    {
      label: "Total Volunteers", value: active.length,
      gradient: "linear-gradient(135deg,#16A34A,#22C55E)",
      sub: "View list →", tab: "volunteers" as MainTab,
    },
    {
      label: "Pending Requests", value: pending.length,
      gradient: pending.length > 0 ? "linear-gradient(135deg,#D97706,#F59E0B)" : "linear-gradient(135deg,#94A3B8,#CBD5E1)",
      sub: pending.length > 0 ? "Review requests →" : "No pending", tab: "volunteers" as MainTab,
    },
    {
      label: "Active Activities", value: activeEv.length,
      gradient: "linear-gradient(135deg,#2563EB,#3B82F6)",
      sub: "View activities →", tab: "activities" as MainTab,
    },
    {
      label: "Total Hours Logged", value: stats?.totalHours ?? 0,
      gradient: "linear-gradient(135deg,#0891B2,#06B6D4)",
      sub: `${active.length} active volunteers`, tab: null,
    },
  ];

  if (loading) return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="org" userName={orgName} />
      <div className="flex-1 flex items-center justify-center"><p style={{ color: "#94A3B8" }}>Loading…</p></div>
    </div>
  );

  const mainTabs: { key: MainTab; label: string; badge?: number }[] = [
    { key: "volunteers",  label: "Volunteers",  badge: pending.length || undefined },
    { key: "supervisors", label: "Supervisors" },
    { key: "activities",  label: "Activities",  badge: activeEv.length || undefined },
    { key: "admins",      label: "Admins" },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="org" userName={orgName} />

      <div className="flex-1 px-8 py-6" style={{ maxWidth: 1400, margin: "0 auto", width: "100%" }}>
        {/* Page title */}
        <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 600, color: "#1E293B", margin: 0 }}>{orgName}</h1>
            <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <button
            onClick={() => setShowImport(true)}
            style={{
              height: 38, padding: "0 16px", backgroundColor: "#fff",
              color: "#1E293B", border: "1px solid #E2E8F0", borderRadius: 8,
              fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}
          >
            Import Volunteers (CSV)
          </button>
        </div>

        {/* CSV import modal */}
        {showImport && (
          <ImportModal
            orgId={orgId}
            onClose={() => setShowImport(false)}
            onSuccess={() => { loadAll(); setShowImport(false); }}
          />
        )}
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4" style={{ marginBottom: 28 }}>
          {statCards.map((s) => (
            <div
              key={s.label}
              onClick={() => s.tab && setTab(s.tab)}
              style={{
                background: s.gradient, borderRadius: 12, padding: "18px 22px", height: 110,
                display: "flex", flexDirection: "column", justifyContent: "space-between",
                cursor: s.tab ? "pointer" : "default",
                transition: "transform 140ms, box-shadow 140ms",
              }}
              onMouseEnter={(e) => { if (s.tab) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.13)"; }}}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
            >
              <div style={{ fontSize: 34, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{s.value}</div>
              <div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.95)", fontWeight: 500 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 1 }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main tabs */}
        <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden" }}>
          {/* Tab bar */}
          <div className="flex" style={{ borderBottom: "2px solid #E2E8F0", padding: "0 24px" }}>
            {mainTabs.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: "14px 20px", background: "none", border: "none", cursor: "pointer",
                fontSize: 15, fontWeight: tab === t.key ? 600 : 400,
                color: tab === t.key ? "#1E293B" : "#64748B",
                borderBottom: tab === t.key ? "2px solid " + GREEN : "2px solid transparent",
                marginBottom: -2, display: "flex", alignItems: "center", gap: 8,
              }}>
                {t.label}
                {t.badge !== undefined && (
                  <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: t.key === "volunteers" ? "#FEF3C7" : "#DCFCE7", color: t.key === "volunteers" ? "#B45309" : "#15803D", borderRadius: 20, padding: "2px 8px", minWidth: 20, textAlign: "center" }}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab body */}
          <div style={{ padding: 24 }}>
            {tab === "volunteers" && (
              <VolunteersTab orgId={orgId} members={members} supervisors={supervisors} onRefresh={loadAll} />
            )}
            {tab === "supervisors" && (
              <SupervisorsTab supervisors={supervisors} onRefresh={loadAll} />
            )}
            {tab === "activities" && (
              <ActivitiesTab events={events} onRefresh={loadAll} />
            )}
            {tab === "admins" && (
              <OrgAdminsTab
                currentUserEmail={user?.email || ""}
                orgProfile={orgProfileData}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
