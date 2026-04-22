import { ApiError } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

function getToken(): string | null {
  return sessionStorage.getItem("altruism_token");
}

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  // Demo tokens (dev-only fallback) are not real JWTs — skip Authorization.
  if (token && !token.startsWith("demo-")) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

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
