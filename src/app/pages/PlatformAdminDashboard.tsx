import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { Logo } from "../components/Logo";
import type { AdminStats, OrgFilterTab } from "./admin/adminTypes";
import { GREEN, NAV } from "./admin/adminShared";
import { OrganizationsTab } from "./admin/OrganizationsTab";
import { ProfileChangesTab } from "./admin/ProfileChangesTab";
import { VolunteersTab } from "./admin/VolunteersTab";
import { AdminsTab } from "./admin/AdminsTab";

type MainTab = "organizations" | "profile_changes" | "volunteers" | "admins";

export function PlatformAdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [mainTab, setMainTab] = useState<MainTab>("organizations");
  const [orgFilter, setOrgFilter] = useState<OrgFilterTab>("pending");
  const [stats, setStats] = useState<AdminStats>({});

  const loadStats = useCallback(async (): Promise<void> => {
    try {
      const s = await api.adminPlatformStats();
      setStats(s);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <nav className="w-full flex items-center justify-between px-8" style={{ backgroundColor: NAV, height: 64, flexShrink: 0 }}>
        <div className="flex items-center gap-3">
          <Logo size={24} color="#FFFFFF" />
          <span style={{ fontSize: 11, fontWeight: 600, color: "#FCD34D", backgroundColor: "rgba(252,211,77,0.15)", borderRadius: 4, padding: "2px 8px", marginLeft: 8 }}>
            PLATFORM ADMIN
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 13, color: "#94A3B8" }}>{user?.email}</span>
          <button
            onClick={() => { logout(); navigate("/"); }}
            style={{ backgroundColor: "transparent", color: "#94A3B8", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, height: 32, padding: "0 12px", fontSize: 13, cursor: "pointer" }}
          >
            Log out
          </button>
        </div>
      </nav>

      <div className="flex-1 px-8 py-6" style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1E293B", margin: "0 0 20px 0" }}>Platform Administration</h1>

        {/* Stats grid */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", marginBottom: 24 }}>
          <StatCard label="Pending Review"   value={stats.pending_organizations ?? 0}   color="#F59E0B" onClick={() => { setMainTab("organizations"); setOrgFilter("pending");  }} active={mainTab === "organizations" && orgFilter === "pending"} />
          <StatCard label="Approved Orgs"    value={stats.approved_organizations ?? 0}  color={GREEN}   onClick={() => { setMainTab("organizations"); setOrgFilter("approved"); }} active={mainTab === "organizations" && orgFilter === "approved"} />
          <StatCard label="Rejected Orgs"    value={stats.rejected_organizations ?? 0}  color="#EF4444" onClick={() => { setMainTab("organizations"); setOrgFilter("rejected"); }} active={mainTab === "organizations" && orgFilter === "rejected"} />
          <StatCard label="Profile Changes"  value={stats.pending_profile_changes ?? 0} color="#F97316" onClick={() => setMainTab("profile_changes")} active={mainTab === "profile_changes"} />
          <StatCard label="Total Volunteers" value={stats.total_volunteers ?? 0}         color="#8B5CF6" onClick={() => setMainTab("volunteers")}      active={mainTab === "volunteers"} />
          <StatCard label="Total Users"      value={stats.total_users ?? 0}              color="#3B82F6" />
          <StatCard label="Platform Admins"  value={stats.total_platform_admins ?? 0}   color="#EC4899" onClick={() => setMainTab("admins")}           active={mainTab === "admins"} />
        </div>

        {/* Main tab bar */}
        <div className="flex gap-1" style={{ marginBottom: 20, borderBottom: "2px solid #E2E8F0" }}>
          {([
            { id: "organizations",   label: "Organizations",   badge: stats.pending_organizations,   badgeColor: "#F59E0B" },
            { id: "profile_changes", label: "Profile Changes", badge: stats.pending_profile_changes, badgeColor: "#F97316" },
            { id: "volunteers",      label: "Volunteers" },
            { id: "admins",          label: "Admins" },
          ] as { id: MainTab; label: string; badge?: number; badgeColor?: string }[]).map(({ id, label, badge, badgeColor }) => (
            <button
              key={id}
              onClick={() => setMainTab(id)}
              style={{
                padding: "10px 22px", background: "none", border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: mainTab === id ? 600 : 400,
                color: mainTab === id ? GREEN : "#64748B",
                borderBottom: mainTab === id ? `2px solid ${GREEN}` : "2px solid transparent",
                marginBottom: -2,
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {label}
              {(badge ?? 0) > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", backgroundColor: badgeColor, borderRadius: 10, padding: "1px 6px", lineHeight: "16px" }}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {mainTab === "organizations" && (
          <OrganizationsTab filter={orgFilter} onFilterChange={setOrgFilter} onStatsRefresh={loadStats} />
        )}
        {mainTab === "profile_changes" && (
          <ProfileChangesTab pendingCount={stats.pending_profile_changes ?? 0} onStatsRefresh={loadStats} />
        )}
        {mainTab === "volunteers" && (
          <VolunteersTab onStatsRefresh={loadStats} />
        )}
        {mainTab === "admins" && (
          <AdminsTab currentUserEmail={user?.email} onStatsRefresh={loadStats} />
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, onClick, active }: {
  label: string; value: number; color: string; onClick?: () => void; active?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        backgroundColor: "#fff",
        border: "1px solid #E2E8F0",
        boxShadow: active
          ? `inset 0 0 0 2px ${color}`
          : onClick && hover ? "0 4px 12px rgba(15,23,42,0.08)" : "none",
        borderRadius: 12,
        padding: "16px 18px",
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow 150ms, transform 150ms",
        transform: onClick && hover && !active ? "translateY(-1px)" : "none",
      }}
    >
      <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500, marginBottom: 6, lineHeight: 1.3 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
