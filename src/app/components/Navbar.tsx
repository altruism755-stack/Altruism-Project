import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import { Logo } from "./Logo";
import { NotificationBell } from "./NotificationBell";

interface NavbarProps {
  role?: "org" | "supervisor" | "volunteer" | "guest";
  hideNavLinks?: boolean;
  hideUserMenu?: boolean;
}

const NAV = "#0F172A";
const GREEN = "#16A34A";
const GREEN_HOVER = "#15803D";

export function Navbar({ role = "guest", hideNavLinks = false, hideUserMenu = false }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const navLinks: { label: string; to: string }[] =
    role === "org"
      ? [
          { label: "Dashboard", to: "/org" },
          { label: "Reports",   to: "/org/reports" },
          { label: "Profile",   to: "/org/profile" },
        ]
      : role === "supervisor"
      ? [
          { label: "Dashboard",     to: "/supervisor" },
          { label: "My Volunteers", to: "/supervisor" },
        ]
      : role === "volunteer"
      ? [
          { label: "My Profile",    to: "/dashboard/profile" },
          { label: "Organizations", to: "/dashboard/orgs" },
          { label: "News Feed",     to: "/dashboard/feed" },
        ]
      : [];

  const isActive = (to: string) => location.pathname === to;

  return (
    <>
    <nav
      className="w-full flex items-center justify-between px-8"
      style={{ backgroundColor: NAV, height: 64, minHeight: 64 }}
    >
      <div className="flex items-center gap-8">
        <Link
          to="/"
          className="flex items-center gap-2 no-underline"
        >
          <Logo size={24} color="#FFFFFF" />
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {!hideNavLinks && navLinks.map((link) => (
            <Link
              key={link.to + link.label}
              to={link.to}
              className="no-underline"
              style={{
                fontSize: 14,
                fontWeight: isActive(link.to) ? 600 : 400,
                color: isActive(link.to) ? "#FFFFFF" : "#94A3B8",
                borderBottom: isActive(link.to) ? `2px solid ${GREEN}` : "2px solid transparent",
                paddingBottom: 2,
                transition: "color 150ms",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {role === "org" && <NotificationBell />}
        {!hideUserMenu && (role === "guest" ? (
          <>
            <button
              onClick={() => navigate("/login")}
              style={{
                backgroundColor: "transparent",
                color: "#94A3B8",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 8,
                height: 36,
                padding: "0 16px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Login
            </button>
            <button
              onClick={() => navigate("/register")}
              style={{
                backgroundColor: GREEN,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                height: 36,
                padding: "0 18px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = GREEN_HOVER)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = GREEN)}
            >
              Get Started
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setShowLogoutModal(true)}
              style={{
                backgroundColor: "transparent",
                color: "#94A3B8",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 8,
                height: 32,
                padding: "0 12px",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </>
        ))}
      </div>
    </nav>

    {showLogoutModal && (
      <div
        onClick={() => setShowLogoutModal(false)}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#fff",
            borderRadius: 14,
            padding: "28px 28px 24px",
            width: 360,
            maxWidth: "calc(100% - 32px)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#0F172A" }}>
            Log Out
          </h2>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: "#64748B", lineHeight: 1.6 }}>
            Are you sure you want to log out? You'll need to sign in again to access your account.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              onClick={() => setShowLogoutModal(false)}
              style={{
                height: 38,
                padding: "0 18px",
                borderRadius: 8,
                border: "1.5px solid #E2E8F0",
                backgroundColor: "#fff",
                color: "#64748B",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => { logout(); navigate("/"); }}
              style={{
                height: 38,
                padding: "0 18px",
                borderRadius: 8,
                border: "none",
                backgroundColor: "#DC2626",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
}