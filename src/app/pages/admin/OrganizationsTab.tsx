import { useState, useEffect, useCallback } from "react";
import { api } from "../../services/api";
import { useToast } from "../../components/Toast";
import type { Organization, OrgFilterTab } from "./adminTypes";
import { GREEN, btnStyle, EmptyState, Badge, Detail, ConfirmModal } from "./adminShared";

interface Props {
  filter: OrgFilterTab;
  onFilterChange: (t: OrgFilterTab) => void;
  onStatsRefresh: () => Promise<void>;
}

export function OrganizationsTab({ filter, onFilterChange, onStatsRefresh }: Props) {
  const { showToast } = useToast();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingLoading, setRejectingLoading] = useState(false);

  const loadOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminListOrganizations(filter === "all" ? undefined : filter);
      setOrgs(res.organizations || []);
    } catch (err: any) {
      showToast(err?.message ?? "Failed to load organizations", "error");
    } finally {
      setLoading(false);
    }
  }, [filter, showToast]);

  useEffect(() => { loadOrgs(); }, [loadOrgs]);

  const handleApprove = async (orgId: number) => {
    setApprovingId(orgId);
    try {
      await api.adminApproveOrganization(orgId);
      showToast("Organization approved.", "success");
      setSelectedOrg(null);
      await Promise.all([loadOrgs(), onStatsRefresh()]);
    } catch (err: any) {
      showToast(err?.message ?? "Failed to approve organization", "error");
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (orgId: number) => {
    if (!rejectReason.trim()) return;
    setRejectingLoading(true);
    try {
      await api.adminRejectOrganization(orgId, rejectReason);
      showToast("Organization rejected.", "success");
      setRejectingId(null);
      setRejectReason("");
      setSelectedOrg(null);
      await Promise.all([loadOrgs(), onStatsRefresh()]);
    } catch (err: any) {
      showToast(err?.message ?? "Failed to reject organization", "error");
    } finally {
      setRejectingLoading(false);
    }
  };

  return (
    <>
      <div className="flex gap-1" style={{ marginBottom: 16 }}>
        {(["pending", "approved", "rejected", "all"] as OrgFilterTab[]).map((t) => (
          <button
            key={t}
            onClick={() => onFilterChange(t)}
            style={{
              padding: "6px 16px", borderRadius: 20, border: "1px solid",
              borderColor: filter === t ? GREEN : "#E2E8F0",
              backgroundColor: filter === t ? "#DCFCE7" : "#fff",
              color: filter === t ? "#15803D" : "#64748B",
              fontSize: 13, fontWeight: filter === t ? 600 : 400,
              cursor: "pointer", textTransform: "capitalize",
            }}
          >{t}</button>
        ))}
      </div>

      {loading ? (
        <EmptyState message="Loading…" />
      ) : orgs.length === 0 ? (
        <EmptyState message={`No ${filter === "all" ? "" : filter} organizations.`} />
      ) : (
        <div className="flex flex-col gap-3">
          {orgs.map((org) => (
            <OrgCard
              key={org.id}
              org={org}
              approvingId={approvingId}
              rejectingId={rejectingId}
              rejectReason={rejectReason}
              rejectingLoading={rejectingLoading}
              onViewDetails={() => setSelectedOrg(org)}
              onApprove={handleApprove}
              onStartReject={(id) => { setRejectingId(id); setRejectReason(""); }}
              onCancelReject={() => { setRejectingId(null); setRejectReason(""); }}
              onRejectReasonChange={setRejectReason}
              onConfirmReject={handleReject}
            />
          ))}
        </div>
      )}

      {selectedOrg && (
        <OrgDetailModal
          org={selectedOrg}
          approvingId={approvingId}
          onClose={() => setSelectedOrg(null)}
          onApprove={handleApprove}
          onStartReject={(id) => { setRejectingId(id); setSelectedOrg(null); }}
        />
      )}
    </>
  );
}

function OrgCard({
  org, approvingId, rejectingId, rejectReason, rejectingLoading,
  onViewDetails, onApprove, onStartReject, onCancelReject, onRejectReasonChange, onConfirmReject,
}: {
  org: Organization;
  approvingId: number | null;
  rejectingId: number | null;
  rejectReason: string;
  rejectingLoading: boolean;
  onViewDetails: () => void;
  onApprove: (id: number) => void;
  onStartReject: (id: number) => void;
  onCancelReject: () => void;
  onRejectReasonChange: (v: string) => void;
  onConfirmReject: (id: number) => void;
}) {
  const isApprovingThis = approvingId === org.id;

  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20 }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3" style={{ flex: 1 }}>
          {org.logo_url ? (
            <img src={org.logo_url} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", border: "1px solid #E2E8F0", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: org.color || "#E2E8F0", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
              {org.initials || "?"}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div className="flex items-center gap-2">
              <div style={{ fontSize: 16, fontWeight: 600, color: "#1E293B" }}>{org.name}</div>
              <Badge status={org.status} />
            </div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
              {[org.org_type, org.category, org.location, org.founded_year ? `Founded ${org.founded_year}` : null].filter(Boolean).join(" · ")}
            </div>
            <div style={{ fontSize: 13, color: "#64748B", marginTop: 6, lineHeight: 1.5 }}>
              {org.description?.slice(0, 140)}{(org.description?.length ?? 0) > 140 ? "…" : ""}
            </div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 8 }}>
              Submitted by {org.submitter_name || "—"} ({org.submitter_role || "—"}) &middot; {org.admin_email}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2" style={{ minWidth: 130 }}>
          <button onClick={onViewDetails} style={btnStyle("#F1F5F9", "#475569")}>View Details</button>
          {org.status === "pending" && (
            <>
              <button
                onClick={() => onApprove(org.id)}
                disabled={isApprovingThis}
                style={{ ...btnStyle(GREEN, "#fff"), opacity: isApprovingThis ? 0.6 : 1 }}
              >
                {isApprovingThis ? "Approving…" : "Approve"}
              </button>
              <button onClick={() => onStartReject(org.id)} style={{ ...btnStyle("#fff", "#EF4444"), border: "1px solid #FECACA" }}>Reject</button>
            </>
          )}
          {org.status === "rejected" && (
            <button
              onClick={() => onApprove(org.id)}
              disabled={isApprovingThis}
              style={{ ...btnStyle(GREEN, "#fff"), opacity: isApprovingThis ? 0.6 : 1 }}
            >
              {isApprovingThis ? "Approving…" : "Re-approve"}
            </button>
          )}
        </div>
      </div>

      {rejectingId === org.id && (
        <div style={{ marginTop: 16, padding: 16, backgroundColor: "#FEF2F2", borderRadius: 8, border: "1px solid #FECACA" }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 6 }}>Rejection reason</label>
          <textarea
            value={rejectReason}
            onChange={(e) => onRejectReasonChange(e.target.value)}
            placeholder="Explain why this organization is being rejected..."
            style={{ width: "100%", minHeight: 70, padding: 10, fontSize: 13, border: "1px solid #E2E8F0", borderRadius: 6, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
          />
          <div className="flex gap-2" style={{ marginTop: 10, justifyContent: "flex-end" }}>
            <button onClick={onCancelReject} style={btnStyle("#fff", "#64748B", "1px solid #E2E8F0")}>Cancel</button>
            <button
              onClick={() => onConfirmReject(org.id)}
              disabled={!rejectReason.trim() || rejectingLoading}
              style={btnStyle(rejectReason.trim() && !rejectingLoading ? "#EF4444" : "#FCA5A5", "#fff")}
            >
              {rejectingLoading ? "Rejecting…" : "Confirm Reject"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OrgDetailModal({ org, approvingId, onClose, onApprove, onStartReject }: {
  org: Organization;
  approvingId: number | null;
  onClose: () => void;
  onApprove: (id: number) => void;
  onStartReject: (id: number) => void;
}) {
  const isApproving = approvingId === org.id;
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="org-modal-title"
        style={{ backgroundColor: "#fff", borderRadius: 16, maxWidth: 640, width: "100%", maxHeight: "85vh", overflow: "auto", padding: 32 }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <div id="org-modal-title" style={{ fontSize: 20, fontWeight: 600, color: "#1E293B" }}>{org.name}</div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94A3B8", lineHeight: 1 }}>&times;</button>
        </div>
        <Badge status={org.status} />
        {org.logo_url && (
          <div style={{ marginTop: 12 }}>
            <img src={org.logo_url} alt="" style={{ width: 80, height: 80, borderRadius: 12, objectFit: "cover", border: "1px solid #E2E8F0" }} />
          </div>
        )}
        <Detail label="Type" value={org.org_type} />
        <Detail label="Category" value={org.category} />
        <Detail label="Founded Year" value={org.founded_year} />
        <Detail label="Location" value={org.location} />
        <Detail label="Description" value={org.description} multiline />
        <Detail label="Login Email" value={org.admin_email} />
        <Detail label="Official Email" value={org.official_email} />
        <Detail label="Phone" value={org.phone} />
        <Detail label="Website" value={org.website} link />
        <Detail label="Social Links" value={org.social_links} />
        <Detail label="Supporting Documents" value={org.documents_url} link />
        <Detail label="Submitter" value={`${org.submitter_name || "—"} (${org.submitter_role || "—"})`} />
        <Detail label="Submitted" value={org.created_at?.split("T")[0]} />
        {org.rejection_reason && <Detail label="Rejection Reason" value={org.rejection_reason} multiline />}

        {org.status === "pending" && (
          <div className="flex gap-3" style={{ marginTop: 24, justifyContent: "flex-end" }}>
            <button onClick={() => onStartReject(org.id)} style={{ ...btnStyle("#fff", "#EF4444", "1px solid #FECACA"), height: 38, padding: "0 18px" }}>Reject</button>
            <button
              onClick={() => onApprove(org.id)}
              disabled={isApproving}
              style={{ ...btnStyle(GREEN, "#fff"), height: 38, padding: "0 18px", opacity: isApproving ? 0.6 : 1 }}
            >
              {isApproving ? "Approving…" : "Approve"}
            </button>
          </div>
        )}
        {org.status === "rejected" && (
          <div className="flex gap-3" style={{ marginTop: 24, justifyContent: "flex-end" }}>
            <button
              onClick={() => onApprove(org.id)}
              disabled={isApproving}
              style={{ ...btnStyle(GREEN, "#fff"), height: 38, padding: "0 18px", opacity: isApproving ? 0.6 : 1 }}
            >
              {isApproving ? "Approving…" : "Re-approve"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
