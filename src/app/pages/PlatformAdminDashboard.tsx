import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

const GREEN = "#16A34A";
const NAV = "#0F172A";

type MainTab = "organizations" | "volunteers" | "admins";
type OrgFilterTab = "pending" | "approved" | "rejected" | "all";

export function PlatformAdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [mainTab, setMainTab] = useState<MainTab>("organizations");
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Orgs state
  const [orgs, setOrgs] = useState<any[]>([]);
  const [orgTab, setOrgTab] = useState<OrgFilterTab>("pending");
  const [selectedOrg, setSelectedOrg] = useState<any | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Volunteers state
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [volSearch, setVolSearch] = useState("");
  const [volStatusFilter, setVolStatusFilter] = useState("");
  const [volLoading, setVolLoading] = useState(false);

  // Admins state
  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState("");
  const [adminsLoading, setAdminsLoading] = useState(false);

  // Org admins state (platform-level management)
  const [allApprovedOrgs, setAllApprovedOrgs] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | "">("");
  const [orgAdmins, setOrgAdmins] = useState<any[]>([]);
  const [newOrgAdminEmail, setNewOrgAdminEmail] = useState("");
  const [orgAdminError, setOrgAdminError] = useState("");
  const [orgAdminSuccess, setOrgAdminSuccess] = useState("");
  const [orgAdminsLoading, setOrgAdminsLoading] = useState(false);
  const [orgAdminConfirmId, setOrgAdminConfirmId] = useState<number | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const s = await api.adminPlatformStats();
      setStats(s);
    } catch { /* ignore */ }
  }, []);

  const loadOrgs = useCallback(async () => {
    try {
      const res = await api.adminListOrganizations(orgTab === "all" ? undefined : orgTab);
      setOrgs(res.organizations || []);
    } catch { /* ignore */ }
  }, [orgTab]);

  const loadVolunteers = useCallback(async () => {
    setVolLoading(true);
    try {
      const res = await api.adminListVolunteers({
        status: volStatusFilter || undefined,
        search: volSearch || undefined,
      });
      setVolunteers(res.volunteers || []);
    } catch { /* ignore */ }
    finally { setVolLoading(false); }
  }, [volStatusFilter, volSearch]);

  const loadAdmins = useCallback(async () => {
    setAdminsLoading(true);
    try {
      const res = await api.adminListAdmins();
      setAdmins(res.admins || []);
    } catch { /* ignore */ }
    finally { setAdminsLoading(false); }
  }, []);

  const loadAllApprovedOrgs = useCallback(async () => {
    try {
      const res = await api.adminListOrganizations("approved");
      setAllApprovedOrgs(res.organizations || []);
    } catch { /* ignore */ }
  }, []);

  const loadOrgAdmins = useCallback(async (orgId?: number) => {
    setOrgAdminsLoading(true);
    try {
      const res = await api.adminListOrgAdmins(orgId);
      setOrgAdmins(res.admins || []);
    } catch { /* ignore */ }
    finally { setOrgAdminsLoading(false); }
  }, []);

  // Initial load
  useEffect(() => {
    Promise.all([loadStats(), loadOrgs()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadOrgs(); }, [loadOrgs]);
  useEffect(() => { if (mainTab === "volunteers") loadVolunteers(); }, [mainTab, loadVolunteers]);
  useEffect(() => {
    if (mainTab === "admins") {
      loadAdmins();
      loadAllApprovedOrgs();
      loadOrgAdmins();
    }
  }, [mainTab, loadAdmins, loadAllApprovedOrgs, loadOrgAdmins]);

  const handleApprove = async (orgId: number) => {
    await api.adminApproveOrganization(orgId);
    setSelectedOrg(null);
    await Promise.all([loadOrgs(), loadStats()]);
  };

  const handleReject = async (orgId: number) => {
    if (!rejectReason.trim()) return;
    await api.adminRejectOrganization(orgId, rejectReason);
    setRejectingId(null);
    setRejectReason("");
    setSelectedOrg(null);
    await Promise.all([loadOrgs(), loadStats()]);
  };

  const handleVolStatus = async (volId: number, status: string) => {
    try {
      await api.adminUpdateVolunteerStatus(volId, status);
      await Promise.all([loadVolunteers(), loadStats()]);
    } catch (e: any) { console.error(e); }
  };

  const handleAddAdmin = async () => {
    setAdminError(""); setAdminSuccess("");
    if (!newAdminEmail.trim()) return;
    try {
      await api.adminAddAdmin(newAdminEmail.trim());
      setNewAdminEmail("");
      setAdminSuccess(`${newAdminEmail.trim()} is now a platform admin.`);
      await Promise.all([loadAdmins(), loadStats()]);
    } catch (e: any) { setAdminError(e.message || "Failed to add admin"); }
  };

  const handleRemoveAdmin = async (userId: number, email: string) => {
    if (!confirm(`Remove platform admin access from ${email}?`)) return;
    try {
      await api.adminRemoveAdmin(userId);
      await Promise.all([loadAdmins(), loadStats()]);
    } catch (e: any) { setAdminError(e.message || "Failed to remove admin"); }
  };

  const handleAddOrgAdmin = async () => {
    setOrgAdminError(""); setOrgAdminSuccess("");
    if (!newOrgAdminEmail.trim() || !selectedOrgId) return;
    try {
      const res = await api.adminAddOrgAdmin(newOrgAdminEmail.trim(), Number(selectedOrgId));
      setNewOrgAdminEmail("");
      setOrgAdminSuccess(res.message || `Access granted.`);
      await loadOrgAdmins(Number(selectedOrgId));
    } catch (e: any) { setOrgAdminError(e.message || "Failed to add organization admin"); }
  };

  const handleRemoveOrgAdmin = async (adminId: number) => {
    try {
      await api.adminRemoveOrgAdmin(adminId);
      setOrgAdminConfirmId(null);
      await loadOrgAdmins(selectedOrgId ? Number(selectedOrgId) : undefined);
    } catch (e: any) {
      setOrgAdminError(e.message || "Failed to remove organization admin");
      setOrgAdminConfirmId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Navbar */}
      <nav className="w-full flex items-center justify-between px-8" style={{ backgroundColor: NAV, height: 64, flexShrink: 0 }}>
        <div className="flex items-center gap-3">
          <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 600, color: "#fff", letterSpacing: "0.01em" }}>Altruism</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#FCD34D", backgroundColor: "rgba(252,211,77,0.15)", borderRadius: 4, padding: "2px 8px", marginLeft: 8 }}>PLATFORM ADMIN</span>
        </div>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 13, color: "#94A3B8" }}>{user?.email}</span>
          <button onClick={() => { logout(); navigate("/"); }} style={{ backgroundColor: "transparent", color: "#94A3B8", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, height: 32, padding: "0 12px", fontSize: 13, cursor: "pointer" }}>
            Log out
          </button>
        </div>
      </nav>

      <div className="flex-1 px-8 py-6" style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1E293B", margin: "0 0 20px 0" }}>Platform Administration</h1>

        {/* Stats grid */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(6, 1fr)", marginBottom: 24 }}>
          <StatCard label="Pending Review" value={stats.pending_organizations ?? 0} color="#F59E0B" onClick={() => { setMainTab("organizations"); setOrgTab("pending"); }} active={mainTab === "organizations" && orgTab === "pending"} />
          <StatCard label="Approved Orgs" value={stats.approved_organizations ?? 0} color={GREEN} onClick={() => { setMainTab("organizations"); setOrgTab("approved"); }} active={mainTab === "organizations" && orgTab === "approved"} />
          <StatCard label="Rejected Orgs" value={stats.rejected_organizations ?? 0} color="#EF4444" onClick={() => { setMainTab("organizations"); setOrgTab("rejected"); }} active={mainTab === "organizations" && orgTab === "rejected"} />
          <StatCard label="Total Volunteers" value={stats.total_volunteers ?? 0} color="#8B5CF6" onClick={() => setMainTab("volunteers")} active={mainTab === "volunteers"} />
          <StatCard label="Total Users" value={stats.total_users ?? 0} color="#3B82F6" />
          <StatCard label="Platform Admins" value={stats.total_platform_admins ?? 0} color="#EC4899" onClick={() => setMainTab("admins")} active={mainTab === "admins"} />
        </div>

        {/* Main tab bar */}
        <div className="flex gap-1" style={{ marginBottom: 20, borderBottom: "2px solid #E2E8F0" }}>
          {(["organizations", "volunteers", "admins"] as MainTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setMainTab(t)}
              style={{
                padding: "10px 22px", background: "none", border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: mainTab === t ? 600 : 400,
                color: mainTab === t ? GREEN : "#64748B",
                borderBottom: mainTab === t ? `2px solid ${GREEN}` : "2px solid transparent",
                marginBottom: -2, textTransform: "capitalize",
              }}
            >{t}</button>
          ))}
        </div>

        {/* ── Organizations tab ── */}
        {mainTab === "organizations" && (
          <>
            <div className="flex gap-1" style={{ marginBottom: 16 }}>
              {(["pending", "approved", "rejected", "all"] as OrgFilterTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setOrgTab(t)}
                  style={{
                    padding: "6px 16px", borderRadius: 20, border: "1px solid",
                    borderColor: orgTab === t ? GREEN : "#E2E8F0",
                    backgroundColor: orgTab === t ? "#DCFCE7" : "#fff",
                    color: orgTab === t ? "#15803D" : "#64748B",
                    fontSize: 13, fontWeight: orgTab === t ? 600 : 400, cursor: "pointer", textTransform: "capitalize",
                  }}
                >{t}</button>
              ))}
            </div>

            {loading ? (
              <EmptyState message="Loading..." />
            ) : orgs.length === 0 ? (
              <EmptyState message={`No ${orgTab === "all" ? "" : orgTab} organizations.`} />
            ) : (
              <div className="flex flex-col gap-3">
                {orgs.map((org) => (
                  <div key={org.id} style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20 }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3" style={{ flex: 1 }}>
                        {org.logo_url ? (
                          <img src={org.logo_url} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", border: "1px solid #E2E8F0" }} />
                        ) : (
                          <div style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: org.color || "#E2E8F0", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>
                            {org.initials || "?"}
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <div className="flex items-center gap-2">
                            <div style={{ fontSize: 16, fontWeight: 600, color: "#1E293B" }}>{org.name}</div>
                            <StatusBadge status={org.status} />
                          </div>
                          <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                            {[org.org_type, org.category, org.location, org.founded_year ? `Founded ${org.founded_year}` : null].filter(Boolean).join(" · ")}
                          </div>
                          <div style={{ fontSize: 13, color: "#64748B", marginTop: 6, lineHeight: 1.5 }}>
                            {org.description?.slice(0, 140)}{org.description?.length > 140 ? "…" : ""}
                          </div>
                          <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 8 }}>
                            Submitted by {org.submitter_name || "—"} ({org.submitter_role || "—"}) &middot; {org.admin_email}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2" style={{ minWidth: 130 }}>
                        <button onClick={() => setSelectedOrg(org)} style={btnStyle("#F1F5F9", "#475569")}>View Details</button>
                        {org.status === "pending" && (
                          <>
                            <button onClick={() => handleApprove(org.id)} style={btnStyle(GREEN, "#fff")}>Approve</button>
                            <button onClick={() => { setRejectingId(org.id); setRejectReason(""); }} style={{ ...btnStyle("#fff", "#EF4444"), border: "1px solid #FECACA" }}>Reject</button>
                          </>
                        )}
                        {org.status === "rejected" && (
                          <button onClick={() => handleApprove(org.id)} style={btnStyle(GREEN, "#fff")}>Re-approve</button>
                        )}
                      </div>
                    </div>
                    {rejectingId === org.id && (
                      <div style={{ marginTop: 16, padding: 16, backgroundColor: "#FEF2F2", borderRadius: 8, border: "1px solid #FECACA" }}>
                        <label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 6 }}>Rejection reason</label>
                        <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Explain why this organization is being rejected..." style={{ width: "100%", minHeight: 70, padding: 10, fontSize: 13, border: "1px solid #E2E8F0", borderRadius: 6, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                        <div className="flex gap-2" style={{ marginTop: 10, justifyContent: "flex-end" }}>
                          <button onClick={() => { setRejectingId(null); setRejectReason(""); }} style={btnStyle("#fff", "#64748B", "1px solid #E2E8F0")}>Cancel</button>
                          <button onClick={() => handleReject(org.id)} disabled={!rejectReason.trim()} style={btnStyle(rejectReason.trim() ? "#EF4444" : "#FCA5A5", "#fff")}>Confirm Reject</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Volunteers tab ── */}
        {mainTab === "volunteers" && (
          <>
            <div className="flex gap-3" style={{ marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={volSearch}
                onChange={(e) => setVolSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadVolunteers()}
                style={{ flex: 1, height: 38, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none" }}
              />
              <select
                value={volStatusFilter}
                onChange={(e) => setVolStatusFilter(e.target.value)}
                style={{ height: 38, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 10px", fontSize: 14, outline: "none", backgroundColor: "#fff", color: "#1E293B" }}
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Suspended">Suspended</option>
              </select>
              <button onClick={loadVolunteers} style={btnStyle(GREEN, "#fff")}>Search</button>
            </div>

            {volLoading ? (
              <EmptyState message="Loading volunteers..." />
            ) : volunteers.length === 0 ? (
              <EmptyState message="No volunteers found." />
            ) : (
              <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
                {/* Table header */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 80px 120px 160px", padding: "12px 20px", backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                  {["Name", "Email", "Status", "Orgs", "Activities", "Actions"].map((h) => (
                    <div key={h} style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
                  ))}
                </div>
                {volunteers.map((vol, idx) => (
                  <div
                    key={vol.id}
                    style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 80px 120px 160px", padding: "14px 20px", alignItems: "center", borderBottom: idx < volunteers.length - 1 ? "1px solid #F1F5F9" : "none" }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{vol.name}</div>
                    <div style={{ fontSize: 13, color: "#64748B" }}>{vol.email}</div>
                    <div><VolStatusBadge status={vol.status} /></div>
                    <div style={{ fontSize: 13, color: "#64748B", textAlign: "center" }}>{vol.active_orgs ?? 0}</div>
                    <div style={{ fontSize: 13, color: "#64748B", textAlign: "center" }}>{vol.activity_count ?? 0}</div>
                    <div className="flex gap-2">
                      {vol.status !== "Active" && (
                        <button onClick={() => handleVolStatus(vol.id, "Active")} style={{ ...btnStyle(GREEN, "#fff"), fontSize: 11, height: 28, padding: "0 10px" }}>Activate</button>
                      )}
                      {vol.status !== "Suspended" && (
                        <button onClick={() => handleVolStatus(vol.id, "Suspended")} style={{ ...btnStyle("#fff", "#EF4444", "1px solid #FECACA"), fontSize: 11, height: 28, padding: "0 10px" }}>Suspend</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Admins tab ── */}
        {mainTab === "admins" && (
          <>
            {/* Add admin form */}
            <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", margin: "0 0 16px 0" }}>Add Platform Admin</h3>
              <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 14px 0" }}>Enter the email of an existing user to grant them platform admin access.</p>
              {adminError && <div style={{ fontSize: 13, color: "#B91C1C", backgroundColor: "#FEE2E2", padding: "8px 12px", borderRadius: 6, marginBottom: 10 }}>{adminError}</div>}
              {adminSuccess && <div style={{ fontSize: 13, color: "#15803D", backgroundColor: "#DCFCE7", padding: "8px 12px", borderRadius: 6, marginBottom: 10 }}>{adminSuccess}</div>}
              <div className="flex gap-3">
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddAdmin()}
                  style={{ flex: 1, height: 40, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none" }}
                />
                <button onClick={handleAddAdmin} style={btnStyle(NAV, "#fff")}>Grant Access</button>
              </div>
            </div>

            {/* Platform admin list */}
            <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", marginBottom: 32 }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0", backgroundColor: "#F8FAFC" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>Current Platform Admins ({admins.length})</span>
              </div>
              {adminsLoading ? (
                <div style={{ padding: 32, textAlign: "center", color: "#94A3B8" }}>Loading...</div>
              ) : admins.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>No platform admins found.</div>
              ) : (
                admins.map((a, idx) => (
                  <div key={a.user_id} className="flex items-center justify-between" style={{ padding: "14px 20px", borderBottom: idx < admins.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{a.email}</div>
                      <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>Added {a.promoted_at?.split("T")[0] || a.created_at?.split("T")[0]}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {a.email === user?.email && (
                        <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: "#DCFCE7", color: "#15803D", borderRadius: 4, padding: "2px 8px" }}>You</span>
                      )}
                      {a.email !== user?.email && (
                        <button onClick={() => handleRemoveAdmin(a.user_id, a.email)} style={{ ...btnStyle("#fff", "#EF4444", "1px solid #FECACA"), fontSize: 12, height: 30, padding: "0 12px" }}>Remove</button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ── Organization Admin Management ── */}
            {/* Removal confirmation modal */}
            {orgAdminConfirmId !== null && (
              <>
                <div onClick={() => setOrgAdminConfirmId(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.4)", zIndex: 60 }} />
                <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 400, backgroundColor: "#fff", borderRadius: 16, zIndex: 61, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
                  <h3 style={{ fontSize: 17, fontWeight: 600, color: "#1E293B", margin: "0 0 8px 0" }}>Remove Organization Admin</h3>
                  <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 24px 0" }}>This person will lose organization admin access. You can re-add them at any time.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setOrgAdminConfirmId(null)} style={{ flex: 1, height: 40, backgroundColor: "#fff", color: "#64748B", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancel</button>
                    <button onClick={() => handleRemoveOrgAdmin(orgAdminConfirmId)} style={{ flex: 1, height: 40, backgroundColor: "#EF4444", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Remove</button>
                  </div>
                </div>
              </>
            )}

            <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", margin: "0 0 4px 0" }}>Organization Admin Management</h3>
              <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 16px 0" }}>Grant or revoke organization admin access. Admins are scoped to their organization only.</p>

              {/* Org selector */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Select Organization</label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => {
                    const val = e.target.value === "" ? "" : Number(e.target.value);
                    setSelectedOrgId(val as number | "");
                    setOrgAdminError(""); setOrgAdminSuccess("");
                    loadOrgAdmins(val ? Number(val) : undefined);
                  }}
                  style={{ width: "100%", height: 40, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", backgroundColor: "#fff", color: "#1E293B" }}
                >
                  <option value="">— All organizations —</option>
                  {allApprovedOrgs.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              {/* Email + Grant */}
              {orgAdminError   && <div style={{ fontSize: 13, color: "#B91C1C", backgroundColor: "#FEE2E2", padding: "8px 12px", borderRadius: 6, marginBottom: 10 }}>{orgAdminError}</div>}
              {orgAdminSuccess && <div style={{ fontSize: 13, color: "#15803D", backgroundColor: "#DCFCE7", padding: "8px 12px", borderRadius: 6, marginBottom: 10 }}>{orgAdminSuccess}</div>}
              <div className="flex gap-3">
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={newOrgAdminEmail}
                  onChange={(e) => setNewOrgAdminEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddOrgAdmin()}
                  disabled={!selectedOrgId}
                  style={{ flex: 1, height: 40, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", opacity: selectedOrgId ? 1 : 0.5 }}
                />
                <button
                  onClick={handleAddOrgAdmin}
                  disabled={!selectedOrgId || !newOrgAdminEmail.trim()}
                  style={{ ...btnStyle(NAV, "#fff"), opacity: (!selectedOrgId || !newOrgAdminEmail.trim()) ? 0.4 : 1 }}
                >
                  Grant Access
                </button>
              </div>
              {!selectedOrgId && (
                <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 8 }}>Select an organization above to grant access.</p>
              )}
            </div>

            {/* Org admin list */}
            <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0", backgroundColor: "#F8FAFC" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>
                  {selectedOrgId
                    ? `Organization Admins — ${allApprovedOrgs.find((o) => o.id === selectedOrgId)?.name ?? ""} (${orgAdmins.length})`
                    : `All Organization Admins (${orgAdmins.length})`
                  }
                </span>
              </div>
              {orgAdminsLoading ? (
                <div style={{ padding: 32, textAlign: "center", color: "#94A3B8" }}>Loading...</div>
              ) : orgAdmins.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
                  {selectedOrgId ? "No organization admins for this organization." : "No organization admins found across any organization."}
                </div>
              ) : (
                orgAdmins.map((a, idx) => (
                  <div key={a.id} className="flex items-center justify-between" style={{ padding: "14px 20px", borderBottom: idx < orgAdmins.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{a.email}</div>
                      <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                        {!selectedOrgId && <span style={{ fontWeight: 500, color: "#64748B" }}>{a.org_name} · </span>}
                        Added {a.created_at?.split("T")[0]}
                      </div>
                    </div>
                    <button
                      onClick={() => setOrgAdminConfirmId(a.id)}
                      style={{ ...btnStyle("#fff", "#EF4444", "1px solid #FECACA"), fontSize: 12, height: 30, padding: "0 12px" }}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Org detail modal */}
      {selectedOrg && (
        <div onClick={() => setSelectedOrg(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "#fff", borderRadius: 16, maxWidth: 640, width: "100%", maxHeight: "85vh", overflow: "auto", padding: 32 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: "#1E293B" }}>{selectedOrg.name}</div>
              <button onClick={() => setSelectedOrg(null)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94A3B8" }}>&times;</button>
            </div>
            <StatusBadge status={selectedOrg.status} />
            {selectedOrg.logo_url && (
              <div style={{ marginTop: 12 }}>
                <img src={selectedOrg.logo_url} alt="" style={{ width: 80, height: 80, borderRadius: 12, objectFit: "cover", border: "1px solid #E2E8F0" }} />
              </div>
            )}
            <Detail label="Type" value={selectedOrg.org_type} />
            <Detail label="Category" value={selectedOrg.category} />
            <Detail label="Founded Year" value={selectedOrg.founded_year} />
            <Detail label="Location" value={selectedOrg.location} />
            <Detail label="Description" value={selectedOrg.description} multiline />
            <Detail label="Login Email" value={selectedOrg.admin_email} />
            <Detail label="Official Email" value={selectedOrg.official_email} />
            <Detail label="Phone" value={selectedOrg.phone} />
            <Detail label="Website" value={selectedOrg.website} link />
            <Detail label="Social Links" value={selectedOrg.social_links} />
            <Detail label="Supporting Documents" value={selectedOrg.documents_url} link />
            <Detail label="Submitter" value={`${selectedOrg.submitter_name || "—"} (${selectedOrg.submitter_role || "—"})`} />
            <Detail label="Submitted" value={selectedOrg.created_at?.split("T")[0]} />
            {selectedOrg.rejection_reason && <Detail label="Rejection Reason" value={selectedOrg.rejection_reason} multiline />}

            {selectedOrg.status === "pending" && (
              <div className="flex gap-3" style={{ marginTop: 24, justifyContent: "flex-end" }}>
                <button onClick={() => { setRejectingId(selectedOrg.id); setSelectedOrg(null); }} style={{ ...btnStyle("#fff", "#EF4444", "1px solid #FECACA"), height: 38, padding: "0 18px" }}>Reject</button>
                <button onClick={() => handleApprove(selectedOrg.id)} style={{ ...btnStyle(GREEN, "#fff"), height: 38, padding: "0 18px" }}>Approve</button>
              </div>
            )}
            {selectedOrg.status === "rejected" && (
              <div className="flex gap-3" style={{ marginTop: 24, justifyContent: "flex-end" }}>
                <button onClick={() => handleApprove(selectedOrg.id)} style={{ ...btnStyle(GREEN, "#fff"), height: 38, padding: "0 18px" }}>Re-approve</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function btnStyle(bg: string, color: string, border?: string): React.CSSProperties {
  return {
    height: 34, padding: "0 14px", backgroundColor: bg, color, border: border || "none",
    borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
  };
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: "center", padding: 48, color: "#94A3B8", backgroundColor: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 14 }}>
      {message}
    </div>
  );
}

function StatCard({ label, value, color, onClick, active }: { label: string; value: number; color: string; onClick?: () => void; active?: boolean }) {
  return (
    <div
      onClick={onClick}
      style={{ backgroundColor: "#fff", border: active ? `2px solid ${color}` : "1px solid #E2E8F0", borderRadius: 12, padding: "16px 18px", cursor: onClick ? "pointer" : "default", transition: "all 150ms" }}
    >
      <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500, marginBottom: 6, lineHeight: 1.3 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    pending:  { bg: "#FEF3C7", color: "#B45309" },
    approved: { bg: "#DCFCE7", color: "#15803D" },
    rejected: { bg: "#FEE2E2", color: "#B91C1C" },
  };
  const s = styles[status] || styles.pending;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: s.bg, color: s.color, borderRadius: 4, padding: "2px 8px", textTransform: "capitalize" }}>
      {status || "pending"}
    </span>
  );
}

function VolStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    Active:    { bg: "#DCFCE7", color: "#15803D" },
    Pending:   { bg: "#FEF3C7", color: "#B45309" },
    Suspended: { bg: "#FEE2E2", color: "#B91C1C" },
  };
  const s = styles[status] || styles.Pending;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: s.bg, color: s.color, borderRadius: 4, padding: "2px 8px" }}>
      {status || "Pending"}
    </span>
  );
}

function Detail({ label, value, multiline, link }: { label: string; value: any; multiline?: boolean; link?: boolean }) {
  if (!value) return null;
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
      {link ? (
        <a href={value} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: GREEN, wordBreak: "break-all" }}>{value}</a>
      ) : (
        <div style={{ fontSize: 13, color: "#1E293B", lineHeight: multiline ? 1.6 : 1.4, whiteSpace: multiline ? "pre-wrap" : "normal" }}>{value}</div>
      )}
    </div>
  );
}
