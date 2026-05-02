import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { Navbar } from "../components/Navbar";
import { BackButton } from "../components/BackButton";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: number;
  action_url: string | null;
  created_at: string;
}

type FilterTab = "all" | "unread" | "approvals" | "volunteers";

const APPROVAL_TYPES = new Set([
  "org_approved",
  "org_rejected",
  "profile_change_approved",
  "profile_change_rejected",
]);

const TYPE_COLOR: Record<string, string> = {
  org_approved: "#16A34A",
  org_rejected: "#DC2626",
  profile_change_approved: "#16A34A",
  profile_change_rejected: "#DC2626",
  volunteer_joined: "#2563EB",
};

const TYPE_ICON: Record<string, string> = {
  org_approved: "✓",
  org_rejected: "✕",
  profile_change_approved: "✓",
  profile_change_rejected: "✕",
  volunteer_joined: "👤",
};

function relativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoStr).toLocaleDateString();
}

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "approvals", label: "Approvals" },
  { key: "volunteers", label: "Volunteers" },
];

export function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications({ limit: 100 });
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unread_count ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const displayed = notifications.filter((n) => {
    if (activeTab === "unread") return !n.is_read;
    if (activeTab === "approvals") return APPROVAL_TYPES.has(n.type);
    if (activeTab === "volunteers") return n.type === "volunteer_joined";
    return true;
  });

  async function handleMarkAllRead() {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    setUnreadCount(0);
  }

  async function handleClickNotification(n: Notification) {
    if (!n.is_read) {
      await api.markNotificationRead(n.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: 1 } : x))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (n.action_url) navigate(n.action_url);
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0F172A" }}>
      <Navbar role="org" />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
        <BackButton to="/org" label="Dashboard" />
        {/* Page header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#F1F5F9" }}>
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748B" }}>
                {unreadCount} unread
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              style={{
                backgroundColor: "transparent",
                border: "1px solid rgba(22,163,74,0.4)",
                color: "#16A34A",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 20,
            backgroundColor: "#1E293B",
            borderRadius: 10,
            padding: 4,
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: "7px 0",
                borderRadius: 7,
                border: "none",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                backgroundColor: activeTab === tab.key ? "#16A34A" : "transparent",
                color: activeTab === tab.key ? "#fff" : "#94A3B8",
                transition: "background 150ms, color 150ms",
              }}
            >
              {tab.label}
              {tab.key === "unread" && unreadCount > 0 && (
                <span
                  style={{
                    marginLeft: 6,
                    backgroundColor: activeTab === "unread" ? "rgba(255,255,255,0.25)" : "#DC2626",
                    color: "#fff",
                    borderRadius: 8,
                    padding: "1px 6px",
                    fontSize: 11,
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 64, color: "#64748B" }}>
            Loading...
          </div>
        ) : displayed.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "64px 16px",
              color: "#64748B",
              backgroundColor: "#1E293B",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: "#94A3B8" }}>
              {activeTab === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748B" }}>
              {activeTab === "unread"
                ? "You're all caught up!"
                : "Notifications about your organization will appear here."}
            </p>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "#1E293B",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
            {displayed.map((n, idx) => (
              <button
                key={n.id}
                onClick={() => handleClickNotification(n)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  width: "100%",
                  padding: "16px 20px",
                  background: n.is_read ? "transparent" : "rgba(22,163,74,0.06)",
                  border: "none",
                  borderBottom:
                    idx < displayed.length - 1
                      ? "1px solid rgba(255,255,255,0.05)"
                      : "none",
                  cursor: n.action_url ? "pointer" : "default",
                  textAlign: "left",
                  transition: "background 120ms",
                }}
                onMouseEnter={(e) => {
                  if (n.action_url)
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = n.is_read
                    ? "transparent"
                    : "rgba(22,163,74,0.06)";
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    backgroundColor: `${TYPE_COLOR[n.type] ?? "#64748B"}22`,
                    color: TYPE_COLOR[n.type] ?? "#64748B",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  {TYPE_ICON[n.type] ?? "•"}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: n.is_read ? 400 : 600,
                        color: "#F1F5F9",
                      }}
                    >
                      {n.title}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "#64748B",
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {relativeTime(n.created_at)}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: "#94A3B8",
                      lineHeight: 1.5,
                    }}
                  >
                    {n.message}
                  </p>
                </div>

                {/* Unread dot */}
                {!n.is_read && (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: "#16A34A",
                      flexShrink: 0,
                      marginTop: 6,
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
