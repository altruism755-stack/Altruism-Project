import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface User {
  id: number;
  email: string;
  role: "volunteer" | "supervisor" | "org_admin";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  profile: any;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: any) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// Fallback demo credentials when backend is unavailable
const DEMO_USERS: Record<string, { password: string; role: User["role"]; name: string }> = {
  "admin@example.com": { password: "admin", role: "org_admin", name: "Resala" },
  "supervisor@example.com": { password: "supervisor", role: "supervisor", name: "Dr. Amira Khalil" },
  "volunteer@example.com": { password: "volunteer", role: "volunteer", name: "Test Volunteer" },
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
  const [isLoading, setIsLoading] = useState(false);

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

  const login = async (email: string, password: string): Promise<boolean> => {
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
        setIsLoading(false);
        return true;
      }
    } catch {
      // Backend unavailable — use demo fallback
    }

    // Demo fallback
    const demo = DEMO_USERS[email];
    if (demo && demo.password === password) {
      const u: User = { id: 1, email, role: demo.role };
      setUser(u);
      setToken("demo-token");
      setProfile({ name: demo.name });
      setIsLoading(false);
      return true;
    }

    setIsLoading(false);
    return false;
  };

  const register = async (data: any): Promise<boolean> => {
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
        setIsLoading(false);
        return true;
      }
    } catch {
      // Fallback — just simulate
    }

    const role = data.role === "org_admin" ? "org_admin" : "volunteer";
    setUser({ id: Date.now(), email: data.email, role });
    setToken("demo-token");
    setIsLoading(false);
    return true;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setProfile(null);
    sessionStorage.removeItem("altruism_user");
    sessionStorage.removeItem("altruism_token");
    sessionStorage.removeItem("altruism_profile");
  };

  return (
    <AuthContext.Provider value={{ user, token, profile, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
