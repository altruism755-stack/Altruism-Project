import { useState, useEffect } from "react";
import { Navbar } from "../components/Navbar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const GREEN = "#16A34A";
type Tab = "All" | "Upcoming" | "Active" | "Completed";

const statusColors: Record<string, { bg: string; band: string; text: string }> = {
  Upcoming: { bg: "#DCFCE7", band: "#16A34A", text: "#15803D" },
  Active: { bg: "#FEF3C7", band: "#D97706", text: "#B45309" },
  Completed: { bg: "#F1F5F9", band: "#94A3B8", text: "#64748B" },
};

export function EventManagement() {
  const { profile } = useAuth();
  const orgName = profile?.name || "Organization";

  const [tab, setTab] = useState<Tab>("All");
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [form, setForm] = useState({ name: "", description: "", location: "", date: "", time: "", duration: "", maxVolunteers: "", requiredSkills: "" });

  const fetchEvents = async () => {
    try {
      const params: Record<string, string> = {};
      if (tab !== "All") params.status = tab;
      const res = await api.getEvents(params);
      setEvents(res.events || []);
    } catch (e) { console.error("Failed to load events:", e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, [tab]);

  const openCreate = () => {
    setEditingEvent(null);
    setForm({ name: "", description: "", location: "", date: "", time: "", duration: "", maxVolunteers: "", requiredSkills: "" });
    setShowPanel(true);
  };

  const openEdit = (ev: any) => {
    setEditingEvent(ev);
    setForm({ name: ev.name, description: ev.description || "", location: ev.location || "", date: ev.date, time: ev.time || "", duration: String(ev.duration || ""), maxVolunteers: String(ev.max_volunteers || ""), requiredSkills: ev.required_skills || "" });
    setShowPanel(true);
  };

  const handleSave = async () => {
    const data = { name: form.name, description: form.description, location: form.location, date: form.date, time: form.time, duration: Number(form.duration) || undefined, max_volunteers: Number(form.maxVolunteers) || undefined, required_skills: form.requiredSkills };
    try {
      if (editingEvent) {
        await api.updateEvent(editingEvent.id, data);
      } else {
        await api.createEvent(data);
      }
      setShowPanel(false);
      fetchEvents();
    } catch (e) { console.error("Failed to save event:", e); }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteEvent(id);
      fetchEvents();
    } catch (e) { console.error("Failed to delete event:", e); }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="org" userName={orgName} />
      <div className="flex-1 flex items-center justify-center"><p style={{ color: "#94A3B8" }}>Loading...</p></div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="org" userName={orgName} />
      <div className="flex-1 px-8 py-6" style={{ maxWidth: 1280, margin: "0 auto", width: "100%", position: "relative" }}>
        <div className="flex items-center justify-between mb-6">
          <h1 style={{ fontSize: 28, fontWeight: 600, color: "#1E293B", margin: 0 }}>Events</h1>
          <button onClick={openCreate} style={{ height: 40, padding: "0 20px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Create Event</button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(["All", "Upcoming", "Active", "Completed"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ height: 36, padding: "0 18px", borderRadius: 20, border: "none", backgroundColor: tab === t ? GREEN : "#fff", color: tab === t ? "#fff" : "#64748B", fontSize: 13, fontWeight: tab === t ? 600 : 500, cursor: "pointer", boxShadow: tab === t ? "none" : "0 0 0 1px #E2E8F0" }}>{t}</button>
          ))}
        </div>

        {/* Event cards grid */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
          {events.map((ev) => {
            const sc = statusColors[ev.status] || statusColors.Completed;
            return (
              <div key={ev.id} style={{ backgroundColor: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden", transition: "box-shadow 200ms" }}>
                <div style={{ height: 4, backgroundColor: sc.band }} />
                <div style={{ padding: 20 }}>
                  <div className="flex items-start justify-between mb-3">
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", margin: 0 }}>{ev.name}</h3>
                    <span style={{ backgroundColor: sc.bg, color: sc.text, fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "3px 10px", flexShrink: 0 }}>{ev.status}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#64748B", marginBottom: 4 }}>📅 {ev.date}</div>
                  <div style={{ fontSize: 13, color: "#64748B", marginBottom: 4 }}>📍 {ev.location}</div>
                  <div style={{ fontSize: 13, color: "#64748B", marginBottom: 12 }}>👥 {ev.current_volunteers || 0} / {ev.max_volunteers || "∞"} volunteers</div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(ev)} style={{ height: 32, padding: "0 12px", backgroundColor: "transparent", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>Edit</button>
                    <button style={{ height: 32, padding: "0 12px", backgroundColor: "transparent", color: "#0891B2", border: "1px solid #0891B2", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>View Applicants</button>
                    <button onClick={() => handleDelete(ev.id)} style={{ height: 32, padding: "0 12px", backgroundColor: "transparent", color: "#DC2626", border: "1px solid #DC2626", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Side panel */}
        {showPanel && (
          <>
            <div onClick={() => setShowPanel(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)", zIndex: 50 }} />
            <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 480, backgroundColor: "#fff", zIndex: 51, boxShadow: "-8px 0 32px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column" }}>
              <div className="flex items-center justify-between px-6" style={{ height: 64, borderBottom: "1px solid #E2E8F0" }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: "#1E293B", margin: 0 }}>{editingEvent ? "Edit Event" : "Create Event"}</h3>
                <button onClick={() => setShowPanel(false)} style={{ background: "none", border: "none", fontSize: 20, color: "#94A3B8", cursor: "pointer" }}>×</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                <div><label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Event Name</label><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={{ width: "100%", height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} /></div>
                <div><label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Description</label><textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} style={{ width: "100%", height: 100, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box" }} /></div>
                <div><label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Location</label><input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} style={{ width: "100%", height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Date</label><input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={{ width: "100%", height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} /></div>
                  <div><label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Time</label><input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} style={{ width: "100%", height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Duration (hours)</label><input type="number" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} style={{ width: "100%", height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} /></div>
                  <div><label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Max Volunteers</label><input type="number" value={form.maxVolunteers} onChange={(e) => setForm((f) => ({ ...f, maxVolunteers: e.target.value }))} style={{ width: "100%", height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} /></div>
                </div>
                <div><label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Required Skills</label><input value={form.requiredSkills} onChange={(e) => setForm((f) => ({ ...f, requiredSkills: e.target.value }))} placeholder="Comma separated" style={{ width: "100%", height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} /></div>
              </div>
              <div className="flex gap-3 p-6" style={{ borderTop: "1px solid #E2E8F0" }}>
                <button onClick={() => setShowPanel(false)} style={{ flex: 1, height: 42, backgroundColor: "#fff", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleSave} style={{ flex: 1, height: 42, backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Save Event</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
