import type { User } from "../types";

export const DEMO_USERS: Record<string, {
  password: string;
  role: User["role"];
  name: string;
  is_platform_admin?: boolean;
  orgStatus?: "pending" | "approved" | "rejected";
  id?: number;
}> = {
  "admin@resala.org":      { password: "admin",      role: "org_admin",  name: "Resala",                  orgStatus: "approved", id: 1 },
  "admin@redcrescent.org": { password: "admin",      role: "org_admin",  name: "Egyptian Red Crescent",   orgStatus: "approved", id: 2 },
  "admin@enactus.org":     { password: "admin",      role: "org_admin",  name: "Enactus Egypt",           orgStatus: "approved", id: 3 },
  "pending@org.com":       { password: "pending",    role: "org_admin",  name: "Demo Pending Org",        orgStatus: "pending",  id: 4 },
  "rejected@org.com":      { password: "rejected",   role: "org_admin",  name: "Demo Rejected Org",       orgStatus: "rejected", id: 5 },
  "amira@resala.org":      { password: "supervisor", role: "supervisor", name: "Dr. Amira Khalil" },
  "volunteer@example.com": { password: "volunteer",  role: "volunteer",  name: "Yara Hassan" },
  "platform@altruism.org": { password: "platform",  role: "volunteer",  name: "Platform Admin", is_platform_admin: true },
};
