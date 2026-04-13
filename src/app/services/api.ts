const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

function getToken(): string | null {
  return sessionStorage.getItem("altruism_token");
}

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token && token !== "demo-token") {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
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
  getVolunteer: (id: number) => request(`/volunteers/${id}`),
  updateVolunteer: (id: number, data: any) =>
    request(`/volunteers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  updateVolunteerStatus: (id: number, status: string) =>
    request(`/volunteers/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),

  // Supervisors
  getSupervisors: () => request("/supervisors"),
  createSupervisor: (data: any) =>
    request("/supervisors", { method: "POST", body: JSON.stringify(data) }),
  deleteSupervisor: (id: number) =>
    request(`/supervisors/${id}`, { method: "DELETE" }),

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
  approveOrgMember: (orgId: number, volId: number, data: any) =>
    request(`/organizations/${orgId}/members/${volId}/approve`, { method: "PUT", body: JSON.stringify(data) }),

  // Reports
  getReportSummary: () => request("/reports/summary"),
  getVolunteerHoursReport: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/reports/volunteer-hours${qs}`);
  },
  exportCSV: () => request("/reports/export-csv"),
};
