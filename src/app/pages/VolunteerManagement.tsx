import { useState, useEffect } from "react";
import { Navbar } from "../components/Navbar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const statusColors: Record<string, { bg: string; text: string }> = {
  Active: { bg: "#DCFCE7", text: "#15803D" },
  Pending: { bg: "#FEF3C7", text: "#B45309" },
  Suspended: { bg: "#FEE2E2", text: "#B91C1C" },
};

export function VolunteerManagement() {
  const { profile } = useAuth();
  const orgName = profile?.name || "Organization";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [supervisorFilter, setSupervisorFilter] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 6;

  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVolunteers = async () => {
    try {
      const params: Record<string, string> = { page: String(page), limit: String(perPage) };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (supervisorFilter) params.supervisor = supervisorFilter;
      const res = await api.getVolunteers(params);
      setVolunteers(res.volunteers || []);
      setTotalCount(res.total || 0);
    } catch (e) { console.error("Failed to load volunteers:", e); }
  };

  const fetchSupervisors = async () => {
    try {
      const res = await api.getSupervisors();
      setSupervisors(res.supervisors || []);
    } catch (e) { console.error("Failed to load supervisors:", e); }
  };

  useEffect(() => { fetchSupervisors(); }, []);
  useEffect(() => { fetchVolunteers().finally(() => setLoading(false)); }, [page, search, statusFilter, supervisorFilter]);

  const totalPages = Math.ceil(totalCount / perPage);

  if (loading) return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="org" userName={orgName} />
      <div className="flex-1 flex items-center justify-center"><p style={{ color: "#94A3B8" }}>Loading...</p></div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="org" userName={orgName} />
      <div className="flex-1 px-8 py-6" style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        <div className="flex items-center gap-3 mb-6">
          <h1 style={{ fontSize: 28, fontWeight: 600, color: "#1E293B", margin: 0 }}>Volunteers</h1>
          <span style={{ backgroundColor: "#DCFCE7", color: "#15803D", fontSize: 13, fontWeight: 600, borderRadius: 20, padding: "2px 10px" }}>{totalCount}</span>
        </div>

        {/* Filter bar */}
        <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div className="flex gap-3 items-center flex-wrap">
            <input type="text" placeholder="Search by name or email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ flex: 2, minWidth: 200, height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none" }} />
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ flex: 1, minWidth: 140, height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 10px", fontSize: 14, outline: "none", color: statusFilter ? "#1E293B" : "#94A3B8" }}>
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Suspended">Suspended</option>
            </select>
            <select value={supervisorFilter} onChange={(e) => { setSupervisorFilter(e.target.value); setPage(1); }} style={{ flex: 1, minWidth: 160, height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 10px", fontSize: 14, outline: "none", color: supervisorFilter ? "#1E293B" : "#94A3B8" }}>
              <option value="">All Supervisors</option>
              {supervisors.map((s) => (<option key={s.id} value={s.name}>{s.name}</option>))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
          <div className="grid" style={{ gridTemplateColumns: "2fr 2fr 1.2fr 1.5fr 1fr 0.8fr 1.2fr", padding: "12px 20px", backgroundColor: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
            {["Name", "Email", "Phone", "Supervisor", "Status", "Hours", "Actions"].map((h) => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
            ))}
          </div>

          {volunteers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: "#94A3B8" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>👤</div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>No volunteers yet. Invite your first volunteer.</div>
              <button style={{ marginTop: 16, height: 40, padding: "0 24px", backgroundColor: "#16A34A", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Invite Volunteer</button>
            </div>
          ) : (
            volunteers.map((v) => {
              const sc = statusColors[v.status] || statusColors.Active;
              return (
                <div key={v.id} className="grid items-center" style={{ gridTemplateColumns: "2fr 2fr 1.2fr 1.5fr 1fr 0.8fr 1.2fr", padding: "14px 20px", borderBottom: "1px solid #F1F5F9" }}>
                  <div className="flex items-center gap-3">
                    <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{v.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{v.name}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#64748B" }}>{v.email}</div>
                  <div style={{ fontSize: 13, color: "#64748B" }}>{v.phone || "—"}</div>
                  <div style={{ fontSize: 13, color: "#64748B" }}>{v.supervisor_name || "—"}</div>
                  <div><span style={{ backgroundColor: sc.bg, color: sc.text, fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "3px 10px" }}>{v.status}</span></div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1E293B" }}>—</div>
                  <div className="flex gap-2">
                    <button style={{ height: 28, padding: "0 10px", backgroundColor: "transparent", color: "#0891B2", border: "1px solid #0891B2", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>View</button>
                    <button style={{ height: 28, padding: "0 10px", backgroundColor: "transparent", color: "#DC2626", border: "1px solid #DC2626", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Remove</button>
                  </div>
                </div>
              );
            })
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4" style={{ borderTop: "1px solid #E2E8F0" }}>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)} style={{ width: 32, height: 32, borderRadius: 8, border: page === i + 1 ? "none" : "1px solid #E2E8F0", backgroundColor: page === i + 1 ? "#16A34A" : "#fff", color: page === i + 1 ? "#fff" : "#64748B", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{i + 1}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
