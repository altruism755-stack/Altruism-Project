import { useState, useEffect } from "react";
import { Navbar } from "../components/Navbar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

export function ReportsPage() {
  const { profile } = useAuth();
  const orgName = profile?.name || "Organization";

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [report, setReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingSchema, setExportingSchema] = useState(false);

  const fetchData = async () => {
    try {
      const [sumRes, reportRes] = await Promise.all([
        api.getReportSummary(),
        api.getVolunteerHoursReport({ date_from: dateFrom, date_to: dateTo }),
      ]);
      setSummary(sumRes);
      setReport(reportRes.report || []);
    } catch (e) { console.error("Failed to load reports:", e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleFilter = () => { setLoading(true); fetchData(); };

  const handleExportCSV = async () => {
    try {
      const csv = await api.exportCSV();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "volunteer_report.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error("Failed to export CSV:", e); }
  };

  const handleExportStarSchema = async () => {
    if (exportingSchema) return;
    setExportingSchema(true);
    try {
      const { blob, filename } = await api.exportStarSchema();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to export star schema:", e);
    } finally {
      setExportingSchema(false);
    }
  };

  const totalHours = summary?.totalHours || 0;
  const activeVolunteers = summary?.totalVolunteers || 0;
  const completedEvents = summary?.completedEvents || 0;
  const totalReportHours = report.reduce((s: number, r: any) => s + (r.total_hours || 0), 0);
  const totalReportEvents = report.reduce((s: number, r: any) => s + (r.events_attended || 0), 0);

  if (loading) return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="org" />
      <div className="flex-1 flex items-center justify-center"><p style={{ color: "#94A3B8" }}>Loading...</p></div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="org" />
      <div className="flex-1 px-8 py-6" style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, color: "#1E293B", margin: "0 0 24px 0" }}>Reports</h1>

        {/* Date filter bar */}
        <div className="flex gap-3 items-center mb-6">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none" }} />
          <span style={{ color: "#94A3B8" }}>to</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none" }} />
          <button onClick={handleFilter} style={{ height: 42, padding: "0 20px", backgroundColor: "#16A34A", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Filter</button>
          <button onClick={handleExportCSV} style={{ height: 42, padding: "0 20px", backgroundColor: "#fff", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", marginLeft: "auto" }}>Export CSV</button>
          <button
            onClick={handleExportStarSchema}
            disabled={exportingSchema}
            style={{ height: 42, padding: "0 20px", backgroundColor: exportingSchema ? "#F1F5F9" : "#0F172A", color: exportingSchema ? "#94A3B8" : "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: exportingSchema ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {exportingSchema ? "Exporting…" : "Export Star Schema"}
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Hours Logged", value: totalHours, color: "#16A34A" },
            { label: "Active Volunteers", value: activeVolunteers, color: "#2563EB" },
            { label: "Events Completed", value: completedEvents, color: "#0891B2" },
          ].map((s) => (
            <div key={s.label} style={{ backgroundColor: "#F8FAFC", borderRadius: 8, padding: "16px 20px", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 13, color: "#64748B", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Hours table */}
        <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
          <div className="grid" style={{ gridTemplateColumns: "2fr 2fr 1fr 1fr 1.2fr 1fr", padding: "12px 20px", backgroundColor: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
            {["Volunteer", "Email", "Events", "Total Hours", "Last Activity", "Status"].map((h) => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
            ))}
          </div>
          {report.map((r: any, idx: number) => (
            <div key={r.id} className="grid items-center" style={{ gridTemplateColumns: "2fr 2fr 1fr 1fr 1.2fr 1fr", padding: "14px 20px", backgroundColor: idx % 2 === 0 ? "#fff" : "#FAFBFC", borderBottom: "1px solid #F1F5F9" }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{r.name}</div>
              <div style={{ fontSize: 13, color: "#64748B" }}>{r.email}</div>
              <div style={{ fontSize: 14, color: "#1E293B" }}>{r.events_attended || 0}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#16A34A" }}>{r.total_hours || 0}</div>
              <div style={{ fontSize: 13, color: "#64748B" }}>{r.last_activity || "—"}</div>
              <div><span style={{ backgroundColor: r.status === "Active" ? "#DCFCE7" : r.status === "Pending" ? "#FEF3C7" : "#FEE2E2", color: r.status === "Active" ? "#15803D" : r.status === "Pending" ? "#B45309" : "#B91C1C", fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "3px 10px" }}>{r.status}</span></div>
            </div>
          ))}
          {/* Totals row */}
          <div className="grid items-center" style={{ gridTemplateColumns: "2fr 2fr 1fr 1fr 1.2fr 1fr", padding: "14px 20px", backgroundColor: "#F8FAFC", borderTop: "2px solid #E2E8F0" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>Totals</div>
            <div />
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>{totalReportEvents}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#16A34A" }}>{totalReportHours}</div>
            <div />
            <div />
          </div>
        </div>
      </div>
    </div>
  );
}
