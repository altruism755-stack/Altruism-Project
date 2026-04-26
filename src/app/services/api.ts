import { ApiError } from "../types";
import {
  API_BASE,
  DEFAULT_TIMEOUT_MS,
  backoffDelay,
  ensureReconnectLoop,
  log,
  setConnectionState,
} from "../config";

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  retryable?: boolean; // force retry on non-GET methods
}

const MAX_RETRIES = 3;

function getToken(): string | null {
  return sessionStorage.getItem("altruism_token");
}

function isRetryable(method: string, opts: RequestOptions): boolean {
  if (opts.retryable) return true;
  return method.toUpperCase() === "GET";
}

// Single fetch with its own AbortController. Each call gets a fresh one —
// retry loops must call this again, never reuse a controller across attempts.
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const userSignal = init.signal;
  const onUserAbort = () => controller.abort();
  if (userSignal) {
    if (userSignal.aborted) controller.abort();
    else userSignal.addEventListener("abort", onUserAbort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    if (userSignal) userSignal.removeEventListener("abort", onUserAbort);
  }
}

async function request(path: string, options: RequestOptions = {}): Promise<any> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retryable, ...fetchOpts } = options;
  const token = getToken();
  const method = (fetchOpts.method || "GET").toUpperCase();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOpts.headers as Record<string, string>),
  };
  if (token && !token.startsWith("demo-")) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${path}`;
  const canRetry = isRetryable(method, { retryable });
  const maxAttempts = canRetry ? MAX_RETRIES : 1;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Fresh init + fresh AbortController per attempt — never reuse a
      // cancelled signal from the previous try.
      const res = await fetchWithTimeout(url, { ...fetchOpts, headers }, timeoutMs);
      setConnectionState("online");
      return await parseResponse(res);
    } catch (err) {
      lastErr = err;
      if (err instanceof ApiError) throw err; // 4xx/5xx — never retry
      const aborted = err instanceof DOMException && err.name === "AbortError";
      const isNetwork = aborted || err instanceof TypeError;
      if (!isNetwork) throw err;

      log.warn(`${method} ${path} failed (attempt ${attempt}/${maxAttempts})${aborted ? " — timeout" : ""}`);
      setConnectionState("reconnecting");

      if (attempt === maxAttempts) break;
      const delay = backoffDelay(attempt, 250, 2_000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  // All retries exhausted. The shared reconnect loop will flip state back to
  // "online" the moment the backend recovers — even if the user goes idle.
  void ensureReconnectLoop();
  throw new ApiError("Backend unreachable", 0, { cause: String(lastErr) });
}

async function parseResponse(res: Response): Promise<any> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body.error || body.message || `Request failed: ${res.status}`;
    throw new ApiError(message, res.status, body);
  }
  if (res.headers.get("content-type")?.includes("text/csv")) {
    return res.text();
  }
  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  register: (data: any) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(data) }),

  getMe: () => request("/auth/me"),

  // Volunteers
  getVolunteers: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/volunteers${qs}`);
  },
  getVolunteerMe: () => request("/volunteers/me"),
  getVolunteer: (id: number) => request(`/volunteers/${id}`),
  updateVolunteer: (id: number, data: any) =>
    request(`/volunteers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  updateVolunteerStatus: (id: number, status: string) =>
    request(`/volunteers/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),

  // Supervisors (org-admin)
  getSupervisors: () => request("/supervisors"),
  createSupervisor: (data: any) =>
    request("/supervisors", { method: "POST", body: JSON.stringify(data) }),
  deleteSupervisor: (id: number) =>
    request(`/supervisors/${id}`, { method: "DELETE" }),

  // Supervisor self-service
  getMyProfile: () => request("/supervisors/me"),
  getMyVolunteers: () => request("/supervisors/me/volunteers"),
  getMyPendingRequests: () => request("/supervisors/me/pending-requests"),
  getMyEvents: () => request("/supervisors/me/events"),
  getMyActivities: () => request("/supervisors/me/activities"),
  approveMyRequest: (volId: number, data: any) =>
    request(`/supervisors/me/requests/${volId}/approve`, { method: "PUT", body: JSON.stringify(data) }),
  rejectMyRequest: (volId: number) =>
    request(`/supervisors/me/requests/${volId}/reject`, { method: "PUT" }),

  // Events
  getEvents: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/events${qs}`);
  },
  getEvent: (id: number) => request(`/events/${id}`),
  createEvent: (data: any) =>
    request("/events", { method: "POST", body: JSON.stringify(data) }),
  updateEvent: (id: number, data: any) =>
    request(`/events/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteEvent: (id: number) =>
    request(`/events/${id}`, { method: "DELETE" }),

  // Activities
  getActivities: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/activities${qs}`);
  },
  logActivity: (data: any) =>
    request("/activities", { method: "POST", body: JSON.stringify(data) }),
  approveActivity: (id: number) =>
    request(`/activities/${id}/approve`, { method: "PUT" }),
  rejectActivity: (id: number) =>
    request(`/activities/${id}/reject`, { method: "PUT" }),

  // Certificates
  getCertificates: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/certificates${qs}`);
  },
  issueCertificate: (data: any) =>
    request("/certificates", { method: "POST", body: JSON.stringify(data) }),

  // Organizations
  getOrganizations: () => request("/organizations"),
  getOrganization: (id: number) => request(`/organizations/${id}`),
  joinOrganization: (id: number) =>
    request(`/organizations/${id}/join`, { method: "POST" }),
  getOrgMembers: (orgId: number) => request(`/organizations/${orgId}/members`),
  approveOrgMember: (orgId: number, volId: number, data: any) =>
    request(`/organizations/${orgId}/members/${volId}/approve`, { method: "PUT", body: JSON.stringify(data) }),
  rejectOrgMember: (orgId: number, volId: number) =>
    request(`/organizations/${orgId}/members/${volId}/reject`, { method: "PUT" }),
  removeOrgMember: (orgId: number, volId: number) =>
    request(`/organizations/${orgId}/members/${volId}`, { method: "DELETE" }),
  importVolunteersCSV: (orgId: number, csv: string) =>
    request(`/organizations/${orgId}/import-csv`, { method: "POST", body: JSON.stringify({ csv }) }),

  // Reports
  getReportSummary: () => request("/reports/summary"),
  getVolunteerHoursReport: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/reports/volunteer-hours${qs}`);
  },
  exportCSV: () => request("/reports/export-csv"),

  // Profile picture
  uploadProfilePicture: (volunteerId: number, image: string) =>
    request(`/volunteers/${volunteerId}/profile-picture`, {
      method: "PUT",
      body: JSON.stringify({ image }),
    }),
  removeProfilePicture: (volunteerId: number) =>
    request(`/volunteers/${volunteerId}/profile-picture`, { method: "DELETE" }),

  // Volunteer org dashboard
  getVolunteerOrgDashboard: (volunteerId: number, orgId: number) =>
    request(`/volunteers/${volunteerId}/org/${orgId}`),

  // Event Applications
  getEventApplications: () => request("/event-applications"),
  applyToEvent: (eventId: number) =>
    request("/event-applications", { method: "POST", body: JSON.stringify({ event_id: eventId }) }),
  approveApplication: (appId: number) =>
    request(`/event-applications/${appId}/approve`, { method: "PUT" }),
  rejectApplication: (appId: number) =>
    request(`/event-applications/${appId}/reject`, { method: "PUT" }),

  // Platform admin — organizations
  adminListOrganizations: (status?: string) => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    return request(`/admin/organizations${qs}`);
  },
  adminGetOrganization: (id: number) => request(`/admin/organizations/${id}`),
  adminApproveOrganization: (id: number) =>
    request(`/admin/organizations/${id}/approve`, { method: "PUT" }),
  adminRejectOrganization: (id: number, reason: string) =>
    request(`/admin/organizations/${id}/reject`, { method: "PUT", body: JSON.stringify({ reason }) }),
  adminPlatformStats: () => request(`/admin/stats`),

  // Platform admin — volunteers
  adminListVolunteers: (params?: { status?: string; search?: string }) => {
    const qs = params ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString() : "";
    return request(`/admin/volunteers${qs}`);
  },
  adminUpdateVolunteerStatus: (id: number, status: string) =>
    request(`/admin/volunteers/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),

  // Platform admin — admin management
  adminListAdmins: () => request(`/admin/platform-admins`),
  adminAddAdmin: (email: string) =>
    request(`/admin/platform-admins`, { method: "POST", body: JSON.stringify({ email }) }),
  adminRemoveAdmin: (userId: number) =>
    request(`/admin/platform-admins/${userId}`, { method: "DELETE" }),

  // Org admin — own organization profile
  getMyOrgProfile: () => request(`/organizations/me/profile`),
  updateMyOrgProfile: (data: Record<string, any>) =>
    request(`/organizations/me/profile`, { method: "PUT", body: JSON.stringify(data) }),

  // Org admin — managing admins for own organization (org_id from server token, never from client)
  orgListAdmins: () => request(`/organizations/me/admins`),
  orgAddAdmin: (email: string) =>
    request(`/organizations/me/admins`, { method: "POST", body: JSON.stringify({ email }) }),
  orgRemoveAdmin: (adminId: number) =>
    request(`/organizations/me/admins/${adminId}`, { method: "DELETE" }),

  // Platform admin — organization admin management (global, with org selector)
  adminListOrgAdmins: (orgId?: number) => {
    const qs = orgId ? `?org_id=${orgId}` : "";
    return request(`/admin/org-admins${qs}`);
  },
  adminAddOrgAdmin: (email: string, orgId: number) =>
    request(`/admin/org-admins`, { method: "POST", body: JSON.stringify({ email, org_id: orgId }) }),
  adminRemoveOrgAdmin: (adminId: number) =>
    request(`/admin/org-admins/${adminId}`, { method: "DELETE" }),

  // Announcements
  getAnnouncements: (orgIds?: number[]) => {
    const qs = orgIds && orgIds.length ? `?org_ids=${orgIds.join(",")}` : "";
    return request(`/announcements${qs}`);
  },
  createAnnouncement: (data: { title: string; content: string }) =>
    request("/announcements", { method: "POST", body: JSON.stringify(data) }),
};
