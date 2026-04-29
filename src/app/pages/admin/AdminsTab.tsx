import { useState, useEffect, useCallback } from "react";
import { api } from "../../services/api";
import { useToast } from "../../components/Toast";
import type { PlatformAdmin, OrgAdmin, Organization } from "./adminTypes";
import { GREEN, NAV, btnStyle, ConfirmModal } from "./adminShared";

interface Props {
  currentUserEmail?: string;
  onStatsRefresh: () => Promise<void>;
}

export function AdminsTab({ currentUserEmail, onStatsRefresh }: Props) {
  const { showToast } = useToast();

  const [admins, setAdmins] = useState<PlatformAdmin[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<{ userId: number; email: string } | null>(null);

  const [allApprovedOrgs, setAllApprovedOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | "">("");
  const [orgAdmins, setOrgAdmins] = useState<OrgAdmin[]>([]);
  const [orgAdminsLoading, setOrgAdminsLoading] = useState(false);
  const [newOrgAdminEmail, setNewOrgAdminEmail] = useState("");
  const [addingOrgAdmin, setAddingOrgAdmin] = useState(false);
  const [confirmRemoveOrgAdmin, setConfirmRemoveOrgAdmin] = useState<number | null>(null);

  const loadAdmins = useCallback(async () => {
    setAdminsLoading(true);
    try {
      const res = await api.adminListAdmins();
      setAdmins(res.admins || []);
    } catch (err: any) {
      showToast(err?.message ?? "Failed to load admins", "error");
    } finally {
      setAdminsLoading(false);
    }
  }, [showToast]);

  const loadAllApprovedOrgs = useCallback(async () => {
    try {
      const res = await api.adminListOrganizations("approved");
      setAllApprovedOrgs(res.organizations || []);
    } catch { /* non-critical */ }
  }, []);

  const loadOrgAdmins = useCallback(async (orgId?: number) => {
    setOrgAdminsLoading(true);
    try {
      const res = await api.adminListOrgAdmins(orgId);
      setOrgAdmins(res.admins || []);
    } catch (err: any) {
      showToast(err?.message ?? "Failed to load organization admins", "error");
    } finally {
      setOrgAdminsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAdmins();
    loadAllApprovedOrgs();
    loadOrgAdmins();
  }, [loadAdmins, loadAllApprovedOrgs, loadOrgAdmins]);

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) return;
    setAddingAdmin(true);
    try {
      await api.adminAddAdmin(newAdminEmail.trim());
      showToast(`${newAdminEmail.trim()} is now a platform admin.`, "success");
      setNewAdminEmail("");
      await Promise.all([loadAdmins(), onStatsRefresh()]);
    } catch (err: any) {
      showToast(err?.message ?? "Failed to add admin", "error");
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleRemoveAdmin = async () => {
    if (!confirmRemove) return;
    try {
      await api.adminRemoveAdmin(confirmRemove.userId);
      showToast(`${confirmRemove.email} removed from platform admins.`, "success");
      setConfirmRemove(null);
      await Promise.all([loadAdmins(), onStatsRefresh()]);
    } catch (err: any) {
      showToast(err?.message ?? "Failed to remove admin", "error");
      setConfirmRemove(null);
    }
  };

  const handleAddOrgAdmin = async () => {
    if (!newOrgAdminEmail.trim() || !selectedOrgId) return;
    setAddingOrgAdmin(true);
    try {
      const res = await api.adminAddOrgAdmin(newOrgAdminEmail.trim(), Number(selectedOrgId));
      showToast(res.message || "Access granted.", "success");
      setNewOrgAdminEmail("");
      await loadOrgAdmins(Number(selectedOrgId));
    } catch (err: any) {
      showToast(err?.message ?? "Failed to add organization admin", "error");
    } finally {
      setAddingOrgAdmin(false);
    }
  };

  const handleRemoveOrgAdmin = async () => {
    if (confirmRemoveOrgAdmin === null) return;
    try {
      await api.adminRemoveOrgAdmin(confirmRemoveOrgAdmin);
      showToast("Organization admin removed.", "success");
      setConfirmRemoveOrgAdmin(null);
      await loadOrgAdmins(selectedOrgId ? Number(selectedOrgId) : undefined);
    } catch (err: any) {
      showToast(err?.message ?? "Failed to remove organization admin", "error");
      setConfirmRemoveOrgAdmin(null);
    }
  };

  return (
    <>
      {confirmRemove && (
        <ConfirmModal
          title="Remove Platform Admin"
          description={<><strong style={{ color: "#1E293B" }}>{confirmRemove.email}</strong> will lose platform admin access. You can re-add them at any time.</>}
          confirmLabel="Remove"
          danger
          onConfirm={handleRemoveAdmin}
          onCancel={() => setConfirmRemove(null)}
        />
      )}
      {confirmRemoveOrgAdmin !== null && (
        <ConfirmModal
          title="Remove Organization Admin"
          description="This person will lose organization admin access. You can re-add them at any time."
          confirmLabel="Remove"
          danger
          onConfirm={handleRemoveOrgAdmin}
          onCancel={() => setConfirmRemoveOrgAdmin(null)}
        />
      )}

      {/* Add platform admin */}
      <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", margin: "0 0 6px 0" }}>Add Platform Admin</h3>
        <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 14px 0" }}>Enter the email of an existing user to grant them platform admin access.</p>
        <div className="flex gap-3">
          <input
            type="email"
            placeholder="user@example.com"
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddAdmin()}
            style={{ flex: 1, height: 40, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none" }}
          />
          <button
            onClick={handleAddAdmin}
            disabled={addingAdmin || !newAdminEmail.trim()}
            style={{ ...btnStyle(NAV, "#fff"), opacity: (!newAdminEmail.trim() || addingAdmin) ? 0.4 : 1 }}
          >
            {addingAdmin ? "Granting…" : "Grant Access"}
          </button>
        </div>
      </div>

      {/* Platform admin list */}
      <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", marginBottom: 32 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0", backgroundColor: "#F8FAFC" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>Current Platform Admins ({admins.length})</span>
        </div>
        {adminsLoading ? (
          <div style={{ padding: 32, textAlign: "center", color: "#94A3B8" }}>Loading…</div>
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
                {a.email === currentUserEmail ? (
                  <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: "#DCFCE7", color: "#15803D", borderRadius: 4, padding: "2px 8px" }}>You</span>
                ) : (
                  <button
                    onClick={() => setConfirmRemove({ userId: a.user_id, email: a.email })}
                    style={{ ...btnStyle("#fff", "#EF4444", "1px solid #FECACA"), fontSize: 12, height: 30, padding: "0 12px" }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Org admin management */}
      <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", margin: "0 0 4px 0" }}>Organization Admin Management</h3>
        <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 16px 0" }}>Grant or revoke organization admin access. Admins are scoped to their organization only.</p>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Select Organization</label>
          <select
            value={selectedOrgId}
            onChange={(e) => {
              const val = e.target.value === "" ? "" : Number(e.target.value);
              setSelectedOrgId(val as number | "");
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
            disabled={!selectedOrgId || !newOrgAdminEmail.trim() || addingOrgAdmin}
            style={{ ...btnStyle(NAV, "#fff"), opacity: (!selectedOrgId || !newOrgAdminEmail.trim() || addingOrgAdmin) ? 0.4 : 1 }}
          >
            {addingOrgAdmin ? "Granting…" : "Grant Access"}
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
              : `All Organization Admins (${orgAdmins.length})`}
          </span>
        </div>
        {orgAdminsLoading ? (
          <div style={{ padding: 32, textAlign: "center", color: "#94A3B8" }}>Loading…</div>
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
                onClick={() => setConfirmRemoveOrgAdmin(a.id)}
                style={{ ...btnStyle("#fff", "#EF4444", "1px solid #FECACA"), fontSize: 12, height: 30, padding: "0 12px" }}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
