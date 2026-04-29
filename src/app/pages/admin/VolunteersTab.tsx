import { useState, useEffect, useCallback } from "react";
import { api } from "../../services/api";
import { useToast } from "../../components/Toast";
import type { Volunteer } from "./adminTypes";
import { GREEN, btnStyle, EmptyState, Badge } from "./adminShared";

interface Props {
  onStatsRefresh: () => Promise<void>;
}

export function VolunteersTab({ onStatsRefresh }: Props) {
  const { showToast } = useToast();
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadVolunteers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminListVolunteers({
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setVolunteers(res.volunteers || []);
    } catch (err: any) {
      showToast(err?.message ?? "Failed to load volunteers", "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, showToast]);

  useEffect(() => {
    const t = setTimeout(() => { loadVolunteers(); }, 400);
    return () => clearTimeout(t);
  }, [loadVolunteers]);

  const handleStatus = async (volId: number, status: string) => {
    setUpdatingId(volId);
    try {
      await api.adminUpdateVolunteerStatus(volId, status);
      await Promise.all([loadVolunteers(), onStatsRefresh()]);
    } catch (err: any) {
      showToast(err?.message ?? "Failed to update volunteer status", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      <div className="flex gap-3" style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, height: 38, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none" }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ height: 38, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 10px", fontSize: 14, outline: "none", backgroundColor: "#fff", color: "#1E293B" }}
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Suspended">Suspended</option>
        </select>
      </div>

      {loading ? (
        <EmptyState message="Loading volunteers…" />
      ) : volunteers.length === 0 ? (
        <EmptyState message="No volunteers found." />
      ) : (
        <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 80px 120px 160px", padding: "12px 20px", backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
            {["Name", "Email", "Status", "Orgs", "Activities", "Actions"].map((h) => (
              <div key={h} style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
            ))}
          </div>
          {volunteers.map((vol, idx) => (
            <div
              key={vol.id}
              style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 100px 80px 120px 160px",
                padding: "14px 20px", alignItems: "center",
                borderBottom: idx < volunteers.length - 1 ? "1px solid #F1F5F9" : "none",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{vol.name}</div>
              <div style={{ fontSize: 13, color: "#64748B" }}>{vol.email}</div>
              <div><Badge status={vol.status} /></div>
              <div style={{ fontSize: 13, color: "#64748B", textAlign: "center" }}>{vol.active_orgs ?? 0}</div>
              <div style={{ fontSize: 13, color: "#64748B", textAlign: "center" }}>{vol.activity_count ?? 0}</div>
              <div className="flex gap-2">
                {vol.status !== "Active" && (
                  <button
                    onClick={() => handleStatus(vol.id, "Active")}
                    disabled={updatingId === vol.id}
                    style={{ ...btnStyle(GREEN, "#fff"), fontSize: 11, height: 28, padding: "0 10px", opacity: updatingId === vol.id ? 0.6 : 1 }}
                  >
                    Activate
                  </button>
                )}
                {vol.status !== "Suspended" && (
                  <button
                    onClick={() => handleStatus(vol.id, "Suspended")}
                    disabled={updatingId === vol.id}
                    style={{ ...btnStyle("#fff", "#EF4444", "1px solid #FECACA"), fontSize: 11, height: 28, padding: "0 10px", opacity: updatingId === vol.id ? 0.6 : 1 }}
                  >
                    Suspend
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
