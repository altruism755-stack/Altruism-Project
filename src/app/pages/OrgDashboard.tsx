import { useState, useEffect, useCallback } from "react";
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

// ─── Org Admins tab ───────────────────────────────────────────────────────────
function OrgAdminsTab({ currentUserEmail }: { currentUserEmail: string }) {
  const [admins, setAdmins]       = useState<any[]>([]);
  const [email, setEmail]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.orgListAdmins(); setAdmins(r.admins || []); } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleGrant = async () => {
    setError(""); setSuccess("");
    if (!email.trim()) return;
    try {
      await api.orgAddAdmin(email.trim());
      setSuccess(`${email.trim()} is now an organization admin.`);
      setEmail("");
      load();
    } catch (e: any) {
      setError(e.message || "Failed to grant access");
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

  return (
    <div>
      {/* Confirm removal modal */}
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

      {/* Add form */}
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
            onKeyDown={(e) => e.key === "Enter" && handleGrant()}
            style={{ flex: 1, height: 40, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none" }}
          />
          <button
            onClick={handleGrant}
            style={{ height: 40, padding: "0 18px", backgroundColor: "#0F172A", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            Grant Access
          </button>
        </div>
      </div>

      {/* Admin list */}
      <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0", backgroundColor: "#F8FAFC" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>Current Organization Admins ({admins.length})</span>
        </div>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Loading...</div>
        ) : admins.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>No additional organization admins yet.</div>
        ) : (
          admins.map((a, idx) => (
            <div key={a.id} className="flex items-center justify-between" style={{ padding: "14px 20px", borderBottom: idx < admins.length - 1 ? "1px solid #F1F5F9" : "none" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{a.email}</div>
                <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>Added {a.created_at?.split("T")[0]}</div>
              </div>
              <div className="flex items-center gap-3">
                {a.email === currentUserEmail && (
                  <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: "#DCFCE7", color: "#15803D", borderRadius: 4, padding: "2px 8px" }}>You</span>
                )}
                {a.email !== currentUserEmail && (
                  <button
                    onClick={() => setConfirmId(a.id)}
                    style={{ height: 30, padding: "0 12px", backgroundColor: "#fff", color: "#DC2626", border: "1px solid #FECACA", borderRadius: 7, fontSize: 12, cursor: "pointer" }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
type MainTab = "volunteers" | "supervisors" | "activities" | "admins";

export function OrgDashboard() {
  const { profile, user } = useAuth();
  const orgName = profile?.name || "Organization";
  const orgId: number = profile?.id || 0;

  const [stats, setStats]       = useState<any>(null);
  const [members, setMembers]   = useState<any[]>([]);
  const [supervisors, setSups]  = useState<any[]>([]);
  const [events, setEvents]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<MainTab>("volunteers");
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText]   = useState("");
  const [importResult, setImportResult] = useState<any>(null);
  const [importing, setImporting] = useState(false);

  const loadAll = useCallback(async () => {
    if (!orgId) return;
    try {
      const [sumRes, memRes, supRes, evtRes] = await Promise.all([
        api.getReportSummary(),
        api.getOrgMembers(orgId),
        api.getSupervisors(),
        api.getEvents({ org_id: String(orgId) }),
      ]);
      setStats(sumRes);
      setMembers(memRes.volunteers || []);
      setSups(supRes.supervisors || []);
      setEvents(evtRes.events || []);
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
            onClick={() => { setShowImport(true); setCsvText(""); setImportResult(null); }}
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
          <div onClick={() => setShowImport(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "#fff", borderRadius: 16, width: "100%", maxWidth: 600, padding: 28 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#1E293B", marginBottom: 8 }}>Import Volunteers from CSV</div>
              <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.6, marginBottom: 14 }}>
                Paste CSV content with headers: <code style={{ backgroundColor: "#F1F5F9", padding: "1px 5px", borderRadius: 3 }}>name,email,phone,city,skills,department</code>.
                Each volunteer is created with default password <strong>volunteer123</strong> and added to this organization as Active.
              </div>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={"name,email,phone,city,skills\nAhmed Ali,ahmed@example.com,01012345678,Cairo,Teaching\nMona Khalil,mona@example.com,01098765432,Alexandria,\"Event Planning,Communication\""}
                style={{ width: "100%", minHeight: 180, padding: 12, fontSize: 13, fontFamily: "monospace", border: "1px solid #E2E8F0", borderRadius: 8, resize: "vertical", outline: "none", boxSizing: "border-box" }}
              />

              {importResult && (
                <div style={{ marginTop: 12, padding: 12, backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, fontSize: 13, color: "#15803D" }}>
                  Imported <strong>{importResult.created}</strong> volunteers.
                  {importResult.skipped > 0 && <> Skipped <strong>{importResult.skipped}</strong> (already existed or missing fields).</>}
                  {importResult.errors?.length > 0 && (
                    <div style={{ marginTop: 6, color: "#B91C1C" }}>
                      Errors: {importResult.errors.slice(0, 3).join("; ")}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2" style={{ marginTop: 16, justifyContent: "flex-end" }}>
                <button onClick={() => setShowImport(false)} style={{ height: 36, padding: "0 16px", backgroundColor: "#fff", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
                  Close
                </button>
                <button
                  onClick={async () => {
                    if (!csvText.trim()) return;
                    setImporting(true);
                    try {
                      const res = await api.importVolunteersCSV(orgId, csvText);
                      setImportResult(res);
                      loadAll();
                    } catch (e: any) {
                      setImportResult({ created: 0, skipped: 0, errors: [e.message || "Failed"] });
                    }
                    setImporting(false);
                  }}
                  disabled={importing || !csvText.trim()}
                  style={{ height: 36, padding: "0 18px", backgroundColor: importing || !csvText.trim() ? "#86EFAC" : "#16A34A", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: importing ? "wait" : "pointer" }}
                >
                  {importing ? "Importing..." : "Import"}
                </button>
              </div>
            </div>
          </div>
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
              <OrgAdminsTab currentUserEmail={user?.email || ""} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
