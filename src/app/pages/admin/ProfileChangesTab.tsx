import { useState, useEffect, useCallback } from "react";
import { api } from "../../services/api";
import { useToast } from "../../components/Toast";
import type { ProfileChange } from "./adminTypes";
import { GREEN, btnStyle, EmptyState, Badge } from "./adminShared";

type Filter = "pending" | "approved" | "rejected" | "all";

interface Props {
  pendingCount: number;
  onStatsRefresh: () => Promise<void>;
}

export function ProfileChangesTab({ pendingCount, onStatsRefresh }: Props) {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<Filter>("pending");
  const [changes, setChanges] = useState<ProfileChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingLoading, setRejectingLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const loadChanges = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminListProfileChanges(filter === "all" ? undefined : filter);
      setChanges(res.changes || []);
    } catch (err: any) {
      showToast(err?.message ?? "Failed to load profile changes", "error");
    } finally {
      setLoading(false);
    }
  }, [filter, showToast]);

  useEffect(() => { loadChanges(); }, [loadChanges]);

  const handleApprove = async (changeId: number) => {
    setApprovingId(changeId);
    try {
      await api.adminApproveProfileChange(changeId);
      showToast("Change approved.", "success");
      await Promise.all([loadChanges(), onStatsRefresh()]);
    } catch (err: any) {
      showToast(err?.message ?? "Failed to approve change", "error");
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (changeId: number) => {
    setRejectingLoading(true);
    try {
      await api.adminRejectProfileChange(changeId, rejectReason);
      showToast("Change rejected.", "success");
      setRejectingId(null);
      setRejectReason("");
      await Promise.all([loadChanges(), onStatsRefresh()]);
    } catch (err: any) {
      showToast(err?.message ?? "Failed to reject change", "error");
    } finally {
      setRejectingLoading(false);
    }
  };

  return (
    <>
      <div className="flex gap-1" style={{ marginBottom: 16 }}>
        {(["pending", "approved", "rejected", "all"] as Filter[]).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            style={{
              padding: "6px 16px", borderRadius: 20, border: "1px solid",
              borderColor: filter === t ? GREEN : "#E2E8F0",
              backgroundColor: filter === t ? "#DCFCE7" : "#fff",
              color: filter === t ? "#15803D" : "#64748B",
              fontSize: 13, fontWeight: filter === t ? 600 : 400,
              cursor: "pointer", textTransform: "capitalize",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {t}
            {t === "pending" && pendingCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", backgroundColor: "#F97316", borderRadius: 10, padding: "1px 6px" }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <EmptyState message="Loading…" />
      ) : changes.length === 0 ? (
        <EmptyState message={`No ${filter === "all" ? "" : filter} profile change requests.`} />
      ) : (
        <div className="flex flex-col gap-3">
          {changes.map((change) => (
            <div key={change.id} style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20 }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3" style={{ flex: 1 }}>
                  {change.org_logo ? (
                    <img src={change.org_logo} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", border: "1px solid #E2E8F0", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#64748B", flexShrink: 0 }}>
                      {(change.org_name || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#1E293B", marginBottom: 4 }}>{change.org_name}</div>
                    <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 8 }}>
                      Requested by {change.requested_by_email} · {change.created_at?.split("T")[0]}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#64748B", backgroundColor: "#F1F5F9", borderRadius: 4, padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {change.field_label}
                      </span>
                      <span style={{ fontSize: 13, color: "#64748B" }}>{change.current_value || "—"}</span>
                      <span style={{ color: "#94A3B8" }}>→</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>{change.new_value}</span>
                      <Badge status={change.status} />
                    </div>
                  </div>
                </div>
                {change.status === "pending" && (
                  <div className="flex flex-col gap-2" style={{ minWidth: 120, flexShrink: 0 }}>
                    <button
                      onClick={() => handleApprove(change.id)}
                      disabled={approvingId === change.id}
                      style={{ ...btnStyle(GREEN, "#fff"), opacity: approvingId === change.id ? 0.6 : 1 }}
                    >
                      {approvingId === change.id ? "Approving…" : "Approve"}
                    </button>
                    <button
                      onClick={() => { setRejectingId(change.id); setRejectReason(""); }}
                      style={{ ...btnStyle("#fff", "#EF4444"), border: "1px solid #FECACA" }}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>

              {rejectingId === change.id && (
                <div style={{ marginTop: 14, padding: 14, backgroundColor: "#FEF2F2", borderRadius: 8, border: "1px solid #FECACA" }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 6 }}>
                    Rejection reason (optional)
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Explain why this change is being rejected…"
                    style={{ width: "100%", minHeight: 60, padding: 10, fontSize: 13, border: "1px solid #E2E8F0", borderRadius: 6, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                  />
                  <div className="flex gap-2" style={{ marginTop: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => { setRejectingId(null); setRejectReason(""); }} style={btnStyle("#fff", "#64748B", "1px solid #E2E8F0")}>Cancel</button>
                    <button
                      onClick={() => handleReject(change.id)}
                      disabled={rejectingLoading}
                      style={{ ...btnStyle("#EF4444", "#fff"), opacity: rejectingLoading ? 0.6 : 1 }}
                    >
                      {rejectingLoading ? "Rejecting…" : "Confirm Reject"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
