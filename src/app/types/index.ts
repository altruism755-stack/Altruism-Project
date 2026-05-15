export type UserRole = "volunteer" | "supervisor" | "org_admin";

export type OrgStatus = "pending" | "approved" | "rejected";

export interface User {
  id: number;
  email: string;
  role: UserRole;
  is_platform_admin?: boolean;
}

export type AcceptanceMode = "manual" | "auto";
export type EventStatus = "upcoming" | "active" | "completed";
export type ApplicationStatus = "pending" | "approved" | "rejected" | "waitlisted";
export type AttendanceStatus = "attended" | "absent";

/** Status of a volunteer's membership in an org (org_volunteers.status). */
export type OrgMemberStatus = "pending" | "active" | "inactive" | "rejected";

/** Simplified membership indicator returned on org list endpoints. */
export type MembershipStatus = "active" | "pending";

/** Status of a logged activity/hour submission. "completed" is used for participation-only logs. */
export type ActivityStatus = "pending" | "approved" | "rejected" | "completed";

/** Status of a supervisor record. */
export type SupervisorStatus = "active" | "pending";

/**
 * Canonical status constants — import these instead of inline string literals so
 * TypeScript catches drift if the backend ever renames a value.
 *
 * Usage:  import { EVENT_STATUS } from "../types";
 *         if (e.status === EVENT_STATUS.Active) { ... }
 */
export const EVENT_STATUS = {
  Upcoming:  "upcoming",
  Active:    "active",
  Completed: "completed",
} as const satisfies Record<string, EventStatus>;

export const ATTENDANCE_STATUS = {
  Attended: "attended",
  Absent:   "absent",
} as const satisfies Record<string, AttendanceStatus>;

export const APP_STATUS = {
  Pending:    "pending",
  Approved:   "approved",
  Rejected:   "rejected",
  Waitlisted: "waitlisted",
} as const satisfies Record<string, ApplicationStatus>;

export const MEMBER_STATUS = {
  Pending:  "pending",
  Active:   "active",
  Inactive: "inactive",
  Rejected: "rejected",
} as const satisfies Record<string, OrgMemberStatus>;

export const ACTIVITY_STATUS = {
  Pending:   "pending",
  Approved:  "approved",
  Rejected:  "rejected",
  Completed: "completed",
} as const satisfies Record<string, ActivityStatus>;

export const MEMBERSHIP_STATUS = {
  Active:  "active",
  Pending: "pending",
} as const satisfies Record<string, MembershipStatus>;

export const SUPERVISOR_STATUS = {
  Active:  "active",
  Pending: "pending",
} as const satisfies Record<string, SupervisorStatus>;

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
  registration_open: boolean;
  is_full: number;
  created_at: string;
  org_name?: string;
  org_student_only?: number;
  org_initials?: string;
  org_color?: string;
  created_by_supervisor_id?: number | null;
}

export interface EventApplicant {
  app_id: number;
  volunteer_id: number;
  status: ApplicationStatus;
  applied_date: string;
  attendance_status: AttendanceStatus | null;
  volunteer_name: string;
  volunteer_email: string;
}

export interface EventDetail extends Event {
  applicants: EventApplicant[];
  tracks_hours?: boolean;
}

export interface EventApplication {
  id: number;
  volunteer_id: number;
  event_id: number;
  org_id: number;
  status: ApplicationStatus;
  attendance_status?: AttendanceStatus | null;
  applied_date: string;
  cancelled_at?: string | null;
  acceptance_mode?: AcceptanceMode;
  registration_open?: boolean;
  event_name?: string;
  event_date?: string;
  event_time?: string;
  location?: string;
  event_description?: string;
  org_name?: string;
  volunteer_name?: string;
  volunteer_email?: string;
  approved_count?: number;
  max_volunteers?: number;
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
