import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router";
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

const POLL_INTERVAL_MS = 30_000;

const TYPE_ICON: Record<string, string> = {
  org_approved: "✓",
  org_rejected: "✕",
  profile_change_approved: "✓",
  profile_change_rejected: "✕",
  volunteer_joined: "👤",
};

const TYPE_COLOR: Record<string, string> = {
  org_approved: "#16A34A",
  org_rejected: "#DC2626",
  profile_change_approved: "#16A34A",
  profile_change_rejected: "#DC2626",
  volunteer_joined: "#2563EB",
};

function relativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications({ limit: 5 });
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unread_count ?? 0);
    } catch {
      // silently ignore — bell should never crash the navbar
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function handleClickNotification(n: Notification) {
    if (!n.is_read) {
      try {
        await api.markNotificationRead(n.id);
        setNotifications((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, is_read: 1 } : x))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch { /* ignore */ }
    }
    setOpen(false);
    if (n.action_url) navigate(n.action_url);
  }

  async function handleMarkAllRead() {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((x) => ({ ...x, is_read: 1 })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  }

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        style={{
          position: "relative",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "#94A3B8",
          width: 36,
          height: 36,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          transition: "color 150ms",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: "#DC2626",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 3px",
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 340,
            backgroundColor: "#1E293B",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <span style={{ fontWeight: 600, color: "#F1F5F9", fontSize: 14 }}>
              Notifications
              {unreadCount > 0 && (
                <span
                  style={{
                    marginLeft: 8,
                    backgroundColor: "#DC2626",
                    color: "#fff",
                    borderRadius: 10,
                    padding: "1px 7px",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: "none",
                  border: "none",
                  color: "#16A34A",
                  fontSize: 12,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  color: "#64748B",
                  fontSize: 13,
                }}
              >
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    width: "100%",
                    padding: "12px 16px",
                    background: n.is_read ? "transparent" : "rgba(22,163,74,0.07)",
                    border: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 120ms",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = n.is_read
                      ? "transparent"
                      : "rgba(22,163,74,0.07)")
                  }
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      backgroundColor: `${TYPE_COLOR[n.type] ?? "#64748B"}22`,
                      color: TYPE_COLOR[n.type] ?? "#64748B",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    {TYPE_ICON[n.type] ?? "•"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 3,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: n.is_read ? 400 : 600,
                          color: "#F1F5F9",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {n.title}
                      </span>
                      <span style={{ fontSize: 11, color: "#64748B", flexShrink: 0 }}>
                        {relativeTime(n.created_at)}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        color: "#94A3B8",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {n.message}
                    </span>
                  </div>
                  {!n.is_read && (
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        backgroundColor: "#16A34A",
                        flexShrink: 0,
                        marginTop: 6,
                      }}
                    />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "10px 16px",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              textAlign: "center",
            }}
          >
            <button
              onClick={() => { setOpen(false); navigate("/org/notifications"); }}
              style={{
                background: "none",
                border: "none",
                color: "#16A34A",
                fontSize: 13,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
