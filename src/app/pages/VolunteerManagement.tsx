import { useState, useEffect, useRef } from "react";
import { Navbar } from "../components/Navbar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

const GREEN = "#16A34A";

function confirm(message: string): boolean {
  return window.confirm(message);
}

export function VolunteerManagement() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const orgName = profile?.name || "Organization";
  const orgId: number = profile?.id || 0;

  const [tab, setTab] = useState<"pending" | "active">("pending");
  const [members, setMembers] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleExport = async (format: "xlsx" | "csv") => {
    if (exporting) return;
    setExportMenuOpen(false);
    setExporting(true);
    try {
      const { blob, filename, count } = await api.exportOrgVolunteersFull(format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast(`Exported ${count} volunteer${count === 1 ? "" : "s"}`, "success");
    } catch (e) {
      console.error(e);
      showToast("Export failed. Please try again.", "error");
    } finally {
      setExporting(false);
    }
  };

  // Approve modal state
  const [approveTarget, setApproveTarget] = useState<any | null>(null);
  const [assignForm, setAssignForm] = useState({ supervisor_id: "", department: "" });

  const fetchData = async () => {
    try {
      const [membersRes, supRes] = await Promise.all([
        api.getOrgMembers(orgId),
        api.getSupervisors(),
      ]);
      setMembers(membersRes.volunteers || []);
      setSupervisors(supRes.supervisors || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (orgId) fetchData(); }, [orgId]);

  const pendingMembers = members.filter((m) => m.org_status === "Pending");
  const activeMembers = members.filter((m) => m.org_status === "Active");

  const filtered = (tab === "pending" ? pendingMembers : activeMembers).filter((m) =>
    !search ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleApprove = async () => {
    if (!approveTarget) return;
    setActionLoading(approveTarget.id);
    try {
      await api.approveOrgMember(orgId, approveTarget.id, {
        supervisor_id: assignForm.supervisor_id ? Number(assignForm.supervisor_id) : null,
        department: assignForm.department || null,
      });
      setApproveTarget(null);
      fetchData();
    } catch (e) { console.error(e); }
    setActionLoading(null);
  };

  const handleReject = async (volId: number, name: string) => {
    if (!confirm(`Reject ${name}'s application?`)) return;
    setActionLoading(volId);
    try {
      await api.rejectOrgMember(orgId, volId);
      fetchData();
    } catch (e) { console.error(e); }
    setActionLoading(null);
  };

  const handleKick = async (volId: number, name: string) => {
    if (!confirm(`Remove ${name} from your organization? This cannot be undone.`)) return;
    setActionLoading(volId);
    try {
      await api.removeOrgMember(orgId, volId);
      fetchData();
    } catch (e) { console.error(e); }
    setActionLoading(null);
  };

  const inputStyle = { width: "100%", height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" as const };

  if (loading) return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="org" />
      <div className="flex-1 flex items-center justify-center"><p style={{ color: "#94A3B8" }}>Loading...</p></div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="org" />

      {/* Approve modal */}
      {approveTarget && (
        <>
          <div onClick={() => setApproveTarget(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 50 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 440, backgroundColor: "#fff", borderRadius: 16, zIndex: 51, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "#1E293B", margin: "0 0 6px 0" }}>Approve Volunteer</h3>
            <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 20px 0" }}>Approve <strong>{approveTarget.name}</strong> and optionally assign a supervisor and department.</p>
            <div className="flex flex-col gap-4">
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Assign Supervisor (optional)</label>
                <select value={assignForm.supervisor_id} onChange={(e) => setAssignForm((f) => ({ ...f, supervisor_id: e.target.value }))} style={inputStyle}>
                  <option value="">— No supervisor —</option>
                  {supervisors.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.team})</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 }}>Department (optional)</label>
                <input value={assignForm.department} onChange={(e) => setAssignForm((f) => ({ ...f, department: e.target.value }))} placeholder="e.g. Media, Operations…" style={inputStyle} />
              </div>
            </div>
            <div className="flex gap-3" style={{ marginTop: 24 }}>
              <button onClick={() => setApproveTarget(null)} style={{ flex: 1, height: 42, backgroundColor: "#fff", color: "#64748B", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleApprove} disabled={actionLoading === approveTarget.id} style={{ flex: 1, height: 42, backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                {actionLoading === approveTarget.id ? "Approving…" : "Approve"}
              </button>
            </div>
          </div>
        </>
      )}

      <div className="flex-1 px-8 py-6" style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
          <div className="flex items-center gap-3">
            <h1 style={{ fontSize: 28, fontWeight: 600, color: "#1E293B", margin: 0 }}>Volunteers</h1>
            {pendingMembers.length > 0 && (
              <span style={{ backgroundColor: "#FEF3C7", color: "#B45309", fontSize: 12, fontWeight: 700, borderRadius: 20, padding: "3px 10px" }}>
                {pendingMembers.length} pending
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 260, height: 40, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none" }}
            />
            {(() => {
              const totalVolunteers = members.length;
              const disabled = exporting || totalVolunteers === 0;
              const tooltip = totalVolunteers === 0 ? "No volunteers to export" : "";
              return (
                <div ref={exportMenuRef} style={{ position: "relative" }} title={tooltip}>
                  <div style={{ display: "flex", alignItems: "stretch", border: `1.5px solid ${disabled ? "#E2E8F0" : GREEN}`, borderRadius: 8, overflow: "hidden", opacity: disabled ? 0.5 : 1 }}>
                    <button
                      onClick={() => handleExport("xlsx")}
                      disabled={disabled}
                      style={{ height: 40, padding: "0 14px", backgroundColor: "#fff", color: GREEN, border: "none", fontSize: 14, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span style={{ fontSize: 15 }}>↓</span>
                      {exporting ? "Preparing…" : "Export"}
                    </button>
                    <button
                      onClick={() => setExportMenuOpen((o) => !o)}
                      disabled={disabled}
                      aria-label="Export options"
                      style={{ height: 40, width: 30, backgroundColor: "#fff", color: GREEN, border: "none", borderLeft: `1px solid ${disabled ? "#E2E8F0" : GREEN}`, fontSize: 11, cursor: disabled ? "not-allowed" : "pointer" }}
                    >
                      ▼
                    </button>
                  </div>
                  {exportMenuOpen && !disabled && (
                    <div style={{ position: "absolute", top: 44, right: 0, backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", zIndex: 40, minWidth: 200, overflow: "hidden" }}>
                      <button onClick={() => handleExport("xlsx")} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", fontSize: 13, color: "#1E293B", background: "none", border: "none", cursor: "pointer" }}>
                        Export as Excel (.xlsx)
                      </button>
                      <button onClick={() => handleExport("csv")} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", fontSize: 13, color: "#1E293B", background: "none", border: "none", cursor: "pointer", borderTop: "1px solid #F1F5F9" }}>
                        Export as CSV
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1" style={{ marginBottom: 20, borderBottom: "2px solid #E2E8F0" }}>
          {([
            { key: "pending", label: `Pending (${pendingMembers.length})` },
            { key: "active", label: `Active (${activeMembers.length})` },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "10px 20px", background: "none", border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: tab === t.key ? 600 : 400,
                color: tab === t.key ? GREEN : "#64748B",
                borderBottom: tab === t.key ? `2px solid ${GREEN}` : "2px solid transparent",
                marginBottom: -2,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
          {/* Header row */}
          <div className="grid" style={{
            gridTemplateColumns: tab === "pending" ? "2fr 2fr 1.2fr 1.2fr 1.6fr" : "2fr 2fr 1.2fr 1.4fr 1.2fr 1.6fr",
            padding: "12px 20px", backgroundColor: "#F8FAFC", borderBottom: "2px solid #E2E8F0",
          }}>
            {(tab === "pending"
              ? ["Volunteer", "Email", "Phone", "Applied", "Actions"]
              : ["Volunteer", "Email", "Phone", "Supervisor", "Department", "Actions"]
            ).map((h) => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14" style={{ color: "#94A3B8" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{tab === "pending" ? "✅" : "👥"}</div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>
                {tab === "pending" ? "No pending requests." : "No active volunteers yet."}
              </div>
            </div>
          ) : (
            filtered.map((v) => {
              const initials = v.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2);
              const isLoading = actionLoading === v.id;

              if (tab === "pending") {
                return (
                  <div key={v.id} className="grid items-center" style={{ gridTemplateColumns: "2fr 2fr 1.2fr 1.2fr 1.6fr", padding: "14px 20px", borderBottom: "1px solid #F1F5F9", borderLeft: "3px solid #D97706" }}>
                    <div className="flex items-center gap-3">
                      <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#D97706", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{initials}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#1E293B" }}>{v.name}</div>
                        {v.city && <div style={{ fontSize: 12, color: "#94A3B8" }}>{v.city}</div>}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "#64748B" }}>{v.email}</div>
                    <div style={{ fontSize: 13, color: "#64748B" }}>{v.phone || "—"}</div>
                    <div style={{ fontSize: 12, color: "#94A3B8" }}>{v.joined_date || "—"}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setApproveTarget(v); setAssignForm({ supervisor_id: "", department: "" }); }}
                        disabled={isLoading}
                        style={{ height: 32, padding: "0 14px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleReject(v.id, v.name)}
                        disabled={isLoading}
                        style={{ height: 32, padding: "0 14px", backgroundColor: "#fff", color: "#DC2626", border: "1px solid #DC2626", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                );
              }

              // Active tab
              const skills: string[] = (() => { try { return JSON.parse(v.skills || "[]"); } catch { return []; } })();
              return (
                <div key={v.id} className="grid items-center" style={{ gridTemplateColumns: "2fr 2fr 1.2fr 1.4fr 1.2fr 1.6fr", padding: "14px 20px", borderBottom: "1px solid #F1F5F9" }}>
                  <div className="flex items-center gap-3">
                    <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: GREEN, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{initials}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#1E293B" }}>{v.name}</div>
                      {skills.length > 0 && (
                        <div style={{ fontSize: 11, color: "#94A3B8" }}>{skills.slice(0, 2).join(", ")}{skills.length > 2 ? " +" + (skills.length - 2) : ""}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "#64748B" }}>{v.email}</div>
                  <div style={{ fontSize: 13, color: "#64748B" }}>{v.phone || "—"}</div>
                  <div style={{ fontSize: 13, color: "#64748B" }}>{v.supervisor_name || "—"}</div>
                  <div style={{ fontSize: 13, color: "#64748B" }}>{v.department || "—"}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleKick(v.id, v.name)}
                      disabled={isLoading}
                      style={{ height: 32, padding: "0 12px", backgroundColor: "#fff", color: "#DC2626", border: "1px solid #DC2626", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                    >
                      {isLoading ? "…" : "Remove"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
