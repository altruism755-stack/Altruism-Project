export type UserRole = "volunteer" | "supervisor" | "org_admin";

export type OrgStatus = "pending" | "approved" | "rejected";

export interface User {
  id: number;
  email: string;
  role: UserRole;
  is_platform_admin?: boolean;
}

export type AcceptanceMode = "manual" | "auto";
export type EventStatus = "Upcoming" | "Active" | "Completed";
export type ApplicationStatus = "Pending" | "Approved" | "Rejected";

export interface Event {
  id: number;
  org_id: number;
  name: string;
  description?: string;
  location?: string;
  date: string;
  time?: string;
  duration?: number;
  max_volunteers: number;
  current_volunteers: number;
  required_skills?: string;
  status: EventStatus;
  acceptance_mode: AcceptanceMode;
  is_full: number;
  created_at: string;
  org_name?: string;
  org_student_only?: number;
  org_initials?: string;
  org_color?: string;
}

export interface EventApplication {
  id: number;
  volunteer_id: number;
  event_id: number;
  org_id: number;
  status: ApplicationStatus;
  applied_date: string;
  cancelled_at?: string | null;
  acceptance_mode?: AcceptanceMode;
  event_name?: string;
  event_date?: string;
  event_time?: string;
  location?: string;
  event_description?: string;
  org_name?: string;
  volunteer_name?: string;
  volunteer_email?: string;
}

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(message: string, status: number, body: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}
