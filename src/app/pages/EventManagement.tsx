import { useState, useEffect } from "react";
import { Navbar } from "../components/Navbar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const GREEN = "#16A34A";
type Tab = "Upcoming" | "Active" | "Completed";

const statusMeta: Record<Tab, { bg: string; band: string; text: string; label: string }> = {
  Upcoming:  { bg: "#DCFCE7", band: GREEN,     text: "#15803D", label: "Upcoming"  },
  Active:    { bg: "#FEF3C7", band: "#D97706",  text: "#B45309", label: "Ongoing"   },
  Completed: { bg: "#F1F5F9", band: "#94A3B8",  text: "#64748B", label: "Completed" },
};

const emptyForm = {
  name: "", description: "", location: "",
  date: "", time: "", duration: "", maxVolunteers: "", requiredSkills: "", status: "Upcoming",
};

export function EventManagement() {
  const { profile } = useAuth();
  const orgName = profile?.name || "Organization";
  const orgId: number = profile?.id || 0;

  const [tab, setTab] = useState<Tab>("Upcoming");
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchEvents = async () => {
    try {
      const res = await api.getEvents(orgId ? { org_id: String(orgId) } : {});
      setAllEvents(res.events || []);
    } catch (e) { console.error("Failed to load activities:", e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, [orgId]);

  const byTab = allEvents.filter((e) => e.status === tab);

  const counts = {
    Upcoming:  allEvents.filter((e) => e.status === "Upcoming").length,
    Active:    allEvents.filter((e) => e.status === "Active").length,
    Completed: allEvents.filter((e) => e.status === "Completed").length,
  };

  const openCreate = () => {
    setEditingEvent(null);
    setForm({ ...emptyForm, status: tab === "Active" ? "Active" : "Upcoming" });
    setShowPanel(true);
  };

  const openEdit = (ev: any) => {
    setEditingEvent(ev);
    setForm({
      name: ev.name, description: ev.description || "", location: ev.location || "",
      date: ev.date, time: ev.time || "", duration: String(ev.duration || ""),
      maxVolunteers: String(ev.max_volunteers || ""), requiredSkills: ev.required_skills || "",
      status: ev.status,
    });
    setShowPanel(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = {
      name: form.name, description: form.description, location: form.location,
      date: form.date, time: form.time,
      duration: Number(form.duration) || undefined,
      max_volunteers: Number(form.maxVolunteers) || undefined,
      required_skills: form.requiredSkills,
      status: form.status,
    };
    try {
      if (editingEvent) {
        await api.updateEvent(editingEvent.id, data);
      } else {
        await api.createEvent(data);
      }
      setShowPanel(false);
      fetchEvents();
    } catch (e) { console.error("Failed to save:", e); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.deleteEvent(id);
      fetchEvents();
    } catch (e) { console.error("Failed to delete:", e); }
  };

  const inputStyle = {
    width: "100%", height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8,
    padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" as const,
  };
  const labelStyle = { fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 };

  if (loading) return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="org" userName={orgName} />
      <div className="flex-1 flex items-center justify-center"><p style={{ color: "#94A3B8" }}>Loading…</p></div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="org" userName={orgName} />

      <div className="flex-1 px-8 py-6" style={{ maxWidth: 1280, margin: "0 auto", width: "100%", position: "relative" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 600, color: "#1E293B", margin: 0 }}>Activities</h1>
            <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>{allEvents.length} total activities</p>
          </div>
          <button
            onClick={openCreate}
            style={{ height: 40, padding: "0 24px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            + New Activity
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1" style={{ marginBottom: 24, borderBottom: "2px solid #E2E8F0" }}>
          {(["Upcoming", "Active", "Completed"] as Tab[]).map((t) => {
            const meta = statusMeta[t];
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "10px 20px", background: "none", border: "none", cursor: "pointer",
                  fontSize: 14, fontWeight: tab === t ? 600 : 400,
                  color: tab === t ? meta.band : "#64748B",
                  borderBottom: tab === t ? `2px solid ${meta.band}` : "2px solid transparent",
                  marginBottom: -2,
                }}
              >
                {meta.label}
                <span style={{
                  marginLeft: 6, fontSize: 11, fontWeight: 700,
                  backgroundColor: tab === t ? meta.bg : "#F1F5F9",
                  color: tab === t ? meta.text : "#94A3B8",
                  borderRadius: 20, padding: "2px 7px",
                }}>
                  {counts[t]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Event cards */}
        {byTab.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16" style={{ backgroundColor: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", color: "#94A3B8" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>
              {tab === "Upcoming" ? "📅" : tab === "Active" ? "⚡" : "✅"}
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>No {statusMeta[tab].label.toLowerCase()} activities</div>
            {tab !== "Completed" && (
              <button onClick={openCreate} style={{ marginTop: 12, height: 38, padding: "0 20px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Create Activity
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))" }}>
            {byTab.map((ev) => {
              const meta = statusMeta[ev.status as Tab] || statusMeta.Completed;
              const skills = (ev.required_skills || "").split(",").map((s: string) => s.trim()).filter(Boolean);
              return (
                <div key={ev.id} style={{ backgroundColor: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden" }}>
                  <div style={{ height: 4, backgroundColor: meta.band }} />
                  <div style={{ padding: 20 }}>
                    <div className="flex items-start justify-between mb-3">
                      <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", margin: 0, flex: 1, paddingRight: 8 }}>{ev.name}</h3>
                      <span style={{ backgroundColor: meta.bg, color: meta.text, fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "3px 10px", flexShrink: 0 }}>{meta.label}</span>
                    </div>

                    {ev.description && (
                      <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 10px 0", lineHeight: 1.5 }}>
                        {ev.description.length > 100 ? ev.description.slice(0, 100) + "…" : ev.description}
                      </p>
                    )}

                    <div className="flex flex-col gap-1" style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 13, color: "#64748B" }}>📅 {ev.date}{ev.time ? " at " + ev.time : ""}</div>
                      {ev.location && <div style={{ fontSize: 13, color: "#64748B" }}>📍 {ev.location}</div>}
                      <div style={{ fontSize: 13, color: "#64748B" }}>
                        👥 {ev.current_volunteers || 0} / {ev.max_volunteers || "∞"} volunteers
                        {ev.duration ? ` · ${ev.duration}h` : ""}
                      </div>
                    </div>

                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1" style={{ marginBottom: 14 }}>
                        {skills.map((s: string, i: number) => (
                          <span key={i} style={{ fontSize: 11, backgroundColor: "#F1F5F9", color: "#64748B", padding: "2px 8px", borderRadius: 12 }}>{s}</span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(ev)}
                        style={{ height: 32, padding: "0 14px", backgroundColor: "transparent", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(ev.id, ev.name)}
                        style={{ height: 32, padding: "0 14px", backgroundColor: "transparent", color: "#DC2626", border: "1px solid #DC2626", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Side panel */}
        {showPanel && (
          <>
            <div onClick={() => setShowPanel(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", zIndex: 50 }} />
            <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 500, backgroundColor: "#fff", zIndex: 51, boxShadow: "-8px 0 32px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column" }}>
              <div className="flex items-center justify-between px-6" style={{ height: 64, borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: "#1E293B", margin: 0 }}>
                  {editingEvent ? "Edit Activity" : "New Activity"}
                </h3>
                <button onClick={() => setShowPanel(false)} style={{ background: "none", border: "none", fontSize: 22, color: "#94A3B8", cursor: "pointer" }}>×</button>
              </div>

              <div className="flex-1 overflow-y-auto" style={{ padding: 24 }}>
                <div className="flex flex-col gap-4">
                  <div>
                    <label style={labelStyle}>Activity Name *</label>
                    <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Youth Leadership Workshop" style={inputStyle} />
                  </div>

                  <div>
                    <label style={labelStyle}>Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="What will volunteers be doing?"
                      style={{ ...inputStyle, height: 90, padding: "10px 12px", resize: "vertical" as const }}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Location</label>
                    <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. Cairo Community Center" style={inputStyle} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label style={labelStyle}>Date *</label>
                      <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Time</label>
                      <input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label style={labelStyle}>Duration (hours)</label>
                      <input type="number" min="0" step="0.5" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Max Volunteers</label>
                      <input type="number" min="0" value={form.maxVolunteers} onChange={(e) => setForm((f) => ({ ...f, maxVolunteers: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Required Skills</label>
                    <input value={form.requiredSkills} onChange={(e) => setForm((f) => ({ ...f, requiredSkills: e.target.value }))} placeholder="e.g. Communication, Fieldwork (comma separated)" style={inputStyle} />
                  </div>

                  <div>
                    <label style={labelStyle}>Status</label>
                    <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} style={inputStyle}>
                      <option value="Upcoming">Upcoming</option>
                      <option value="Active">Ongoing</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 px-6 py-4" style={{ borderTop: "1px solid #E2E8F0", flexShrink: 0 }}>
                <button onClick={() => setShowPanel(false)} style={{ flex: 1, height: 42, backgroundColor: "#fff", color: "#64748B", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleSave} disabled={saving || !form.name || !form.date} style={{ flex: 1, height: 42, backgroundColor: saving || !form.name || !form.date ? "#86EFAC" : GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Saving…" : editingEvent ? "Save Changes" : "Create Activity"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
