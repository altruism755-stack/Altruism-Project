import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User } from "../types";
import { API_BASE } from "../config";

// Demo fallback is enabled only in dev builds. In production, an unreachable
// backend must surface as a real error rather than silently logging the user in.
const DEMO_FALLBACK_ENABLED = import.meta.env.DEV;

interface AuthContextType {
  user: User | null;
  token: string | null;
  profile: any;
  orgStatus: "pending" | "approved" | "rejected" | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; role?: string; orgStatus?: "pending" | "approved" | "rejected" | null; isPlatformAdmin?: boolean }>;
  register: (data: any) => Promise<{ ok: boolean; message?: string; orgStatus?: string }>;
  logout: () => void;
  isLoading: boolean;
  refreshOrgStatus: () => Promise<"pending" | "approved" | "rejected" | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Fallback demo credentials when backend is unavailable
const DEMO_USERS: Record<string, { password: string; role: User["role"]; name: string; is_platform_admin?: boolean; orgStatus?: "pending" | "approved" | "rejected"; id?: number }> = {
  "admin@resala.org":      { password: "admin",      role: "org_admin",  name: "Resala",                  orgStatus: "approved", id: 1 },
  "admin@redcrescent.org": { password: "admin",      role: "org_admin",  name: "Egyptian Red Crescent",   orgStatus: "approved", id: 2 },
  "admin@enactus.org":     { password: "admin",      role: "org_admin",  name: "Enactus Egypt",           orgStatus: "approved", id: 3 },
  "pending@org.com":       { password: "pending",    role: "org_admin",  name: "Demo Pending Org",        orgStatus: "pending",  id: 4 },
  "rejected@org.com":      { password: "rejected",   role: "org_admin",  name: "Demo Rejected Org",       orgStatus: "rejected", id: 5 },
  "amira@resala.org":      { password: "supervisor", role: "supervisor", name: "Dr. Amira Khalil" },
  "volunteer@example.com": { password: "volunteer",  role: "volunteer",  name: "Yara Hassan" },
  "platform@altruism.org": { password: "platform",  role: "volunteer",  name: "Platform Admin", is_platform_admin: true },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = sessionStorage.getItem("altruism_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem("altruism_token"));
  const [profile, setProfile] = useState<any>(() => {
    const stored = sessionStorage.getItem("altruism_profile");
    return stored ? JSON.parse(stored) : null;
  });
  const [orgStatus, setOrgStatus] = useState<"pending" | "approved" | "rejected" | null>(() => {
    const s = sessionStorage.getItem("altruism_org_status");
    return (s as any) || null;
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (orgStatus) sessionStorage.setItem("altruism_org_status", orgStatus);
    else sessionStorage.removeItem("altruism_org_status");
  }, [orgStatus]);

  useEffect(() => {
    if (user) sessionStorage.setItem("altruism_user", JSON.stringify(user));
    else sessionStorage.removeItem("altruism_user");
  }, [user]);

  useEffect(() => {
    if (token) sessionStorage.setItem("altruism_token", token);
    else sessionStorage.removeItem("altruism_token");
  }, [token]);

  useEffect(() => {
    if (profile) sessionStorage.setItem("altruism_profile", JSON.stringify(profile));
    else sessionStorage.removeItem("altruism_profile");
  }, [profile]);

  const login = async (email: string, password: string): Promise<{ ok: boolean; role?: User["role"]; orgStatus?: "pending" | "approved" | "rejected" | null; isPlatformAdmin?: boolean }> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setToken(data.token);
        setProfile(data.profile);
        const status = data.org_status || null;
        setOrgStatus(status);
        setIsLoading(false);
        return { ok: true, role: data.user?.role, orgStatus: status, isPlatformAdmin: data.user?.is_platform_admin };
      }
    } catch {
      // Backend unavailable — use demo fallback
    }

    // Demo fallback (dev only)
    const demo = DEMO_FALLBACK_ENABLED ? DEMO_USERS[email] : undefined;
    if (demo && demo.password === password) {
      const u: User = { id: 1, email, role: demo.role, is_platform_admin: demo.is_platform_admin };
      setUser(u);
      setToken(`demo-${Date.now()}`);
      setProfile({ id: demo.id, name: demo.name, _demo: true });
      const status = demo.orgStatus || null;
      setOrgStatus(status);
      setIsLoading(false);
      return { ok: true, role: demo.role, orgStatus: status, isPlatformAdmin: demo.is_platform_admin };
    }

    setIsLoading(false);
    return { ok: false };
  };

  const register = async (data: any): Promise<{ ok: boolean; message?: string; orgStatus?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const result = await res.json();
        setUser(result.user);
        setToken(result.token);
        setProfile(result.profile || result.volunteer || result.organization);
        const status = result.organization?.status || null;
        if (status) setOrgStatus(status);
        setIsLoading(false);
        return { ok: true, message: result.message, orgStatus: status };
      }

      // Parse error body for a raw message to inspect.
      // FastAPI returns { detail: "..." } for HTTPException; some endpoints
      // use { message } / { error }. Validation errors return detail as an array.
      let rawMessage = "";
      try {
        const errData = await res.json();
        if (typeof errData.detail === "string") rawMessage = errData.detail;
        else if (Array.isArray(errData.detail) && errData.detail[0]?.msg) rawMessage = errData.detail[0].msg;
        else rawMessage = errData.message || errData.error || "";
      } catch { /* ignore */ }

      // Map to a user-facing message based on status code + raw message keywords
      const raw = rawMessage.toLowerCase();
      let message: string;
      if (
        res.status === 409 ||
        raw.includes("already exists") ||
        raw.includes("duplicate") ||
        raw.includes("email") && raw.includes("taken")
      ) {
        message = "An account with this email already exists — try logging in instead.";
      } else if (res.status === 400) {
        message = rawMessage || "Some of your details are invalid. Please review and try again.";
      } else if (res.status === 422) {
        message = rawMessage || "Please check your details — one or more fields are invalid.";
      } else if (res.status >= 500) {
        message = "A server error occurred. Please try again in a moment.";
      } else {
        message = rawMessage || "Registration failed. Please check your details and try again.";
      }

      setIsLoading(false);
      return { ok: false, message };
    } catch {
      setIsLoading(false);
      return { ok: false, message: "Could not connect to the server. Your registration was not saved." };
    }
  };

  const refreshOrgStatus = async (): Promise<"pending" | "approved" | "rejected" | null> => {
    const currentToken = sessionStorage.getItem("altruism_token");
    if (!currentToken || currentToken.startsWith("demo-")) return orgStatus;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const status: "pending" | "approved" | "rejected" | null = data.org_status || null;
        setOrgStatus(status);
        if (data.profile) setProfile(data.profile);
        return status;
      }
    } catch { /* backend unavailable */ }
    return orgStatus;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setProfile(null);
    setOrgStatus(null);
    sessionStorage.removeItem("altruism_user");
    sessionStorage.removeItem("altruism_token");
    sessionStorage.removeItem("altruism_profile");
    sessionStorage.removeItem("altruism_org_status");
  };

  return (
    <AuthContext.Provider value={{ user, token, profile, orgStatus, login, register, logout, isLoading, refreshOrgStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
