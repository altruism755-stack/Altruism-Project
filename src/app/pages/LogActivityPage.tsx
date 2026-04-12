import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Navbar } from "../components/Navbar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const GREEN = "#16A34A";

export function LogActivityPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const volName = profile?.name || "Volunteer";

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const [form, setForm] = useState({ date: "", event: "", hours: "", description: "" });
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.getEvents({});
        setEvents(res.events || []);
      } catch (e) { console.error("Failed to load events:", e); }
    };
    fetchEvents();
  }, []);

  const inputStyle = (field: string) => ({
    width: "100%",
    height: 42,
    border: focused === field ? "1.5px solid #2563EB" : "1.5px solid #E2E8F0",
    borderRadius: 8,
    padding: "0 12px",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box" as const,
    backgroundColor: "#FFFFFF",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.logActivity({
        event_id: Number(form.event),
        date: form.date,
        hours: Number(form.hours),
        description: form.description,
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to submit activity:", err);
      setError("Failed to submit activity. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
        <Navbar role="volunteer" userName={volName} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center" style={{ textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: "#1E293B", margin: "0 0 8px 0" }}>Activity submitted!</h2>
            <p style={{ fontSize: 14, color: "#94A3B8", marginBottom: 24 }}>Your supervisor will review it shortly.</p>
            <div className="flex gap-3">
              <button onClick={() => { setSubmitted(false); setForm({ date: "", event: "", hours: "", description: "" }); }} style={{ height: 40, padding: "0 20px", backgroundColor: "#fff", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Log another</button>
              <button onClick={() => navigate("/dashboard")} style={{ height: 40, padding: "0 20px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Back to Dashboard</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="volunteer" userName={volName} />

      <div className="flex-1 px-8 py-6" style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        {/* Breadcrumb */}
        <div className="mb-4" style={{ fontSize: 14 }}>
          <button onClick={() => navigate("/dashboard")} style={{ color: "#2563EB", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Dashboard</button>
          <span style={{ color: "#94A3B8", margin: "0 8px" }}>/</span>
          <span style={{ color: "#64748B" }}>Log Activity</span>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 600, color: "#1E293B", margin: "0 0 24px 0" }}>Log an Activity</h1>

        <div className="flex justify-center">
          <div style={{ width: 640, backgroundColor: "#fff", borderRadius: 16, boxShadow: "0 4px 16px rgba(0,0,0,0.06)", padding: 36 }}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {error && (
                <div style={{ backgroundColor: "#FEE2E2", color: "#B91C1C", padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>{error}</div>
              )}

              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Activity Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} onFocus={() => setFocused("date")} onBlur={() => setFocused(null)} style={inputStyle("date")} />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Related Event</label>
                <select value={form.event} onChange={(e) => setForm((f) => ({ ...f, event: e.target.value }))} onFocus={() => setFocused("event")} onBlur={() => setFocused(null)} style={{ ...inputStyle("event"), color: form.event ? "#1E293B" : "#94A3B8" }}>
                  <option value="">Select an event...</option>
                  {events.map((ev) => (<option key={ev.id} value={ev.id}>{ev.name}</option>))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Hours Contributed</label>
                <div style={{ position: "relative" }}>
                  <input type="number" step="0.5" min="0" value={form.hours} onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))} onFocus={() => setFocused("hours")} onBlur={() => setFocused(null)} style={{ ...inputStyle("hours"), paddingRight: 40 }} />
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", fontSize: 13 }}>hrs</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Description</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} onFocus={() => setFocused("desc")} onBlur={() => setFocused(null)} rows={5} placeholder="Briefly describe what you did and any impact you observed." style={{ ...inputStyle("desc"), height: "auto", padding: "10px 12px", resize: "vertical" as const }} />
                <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 6 }}>Your supervisor will review and approve this entry.</p>
              </div>

              <div className="flex justify-between" style={{ marginTop: 8 }}>
                <button type="button" onClick={() => navigate("/dashboard")} style={{ height: 42, padding: "0 20px", backgroundColor: "#fff", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ height: 42, padding: "0 24px", backgroundColor: submitting ? "#86EFAC" : GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer" }}>{submitting ? "Submitting..." : "Submit Activity"}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
