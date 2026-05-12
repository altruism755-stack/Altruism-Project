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
export type ApplicationStatus = "Pending" | "Approved" | "Rejected" | "Waitlisted";
export type AttendanceStatus = "Attended" | "Absent";

/** Status of a volunteer's membership in an org (org_volunteers.status). */
export type OrgMemberStatus = "Pending" | "Active" | "Inactive" | "Rejected";

/** Simplified membership indicator returned on org list endpoints. */
export type MembershipStatus = "Active" | "Pending";

/** Status of a logged activity/hour submission. "Completed" is used for participation-only logs. */
export type ActivityStatus = "Pending" | "Approved" | "Rejected" | "Completed";

/** Status of a supervisor record. */
export type SupervisorStatus = "Active" | "Pending";

/**
 * Canonical status constants — import these instead of inline string literals so
 * TypeScript catches drift if the backend ever renames a value.
 *
 * Usage:  import { EVENT_STATUS } from "../types";
 *         if (e.status === EVENT_STATUS.Active) { ... }
 */
export const EVENT_STATUS = {
  Upcoming:  "Upcoming",
  Active:    "Active",
  Completed: "Completed",
} as const satisfies Record<string, EventStatus>;

export const ATTENDANCE_STATUS = {
  Attended: "Attended",
  Absent:   "Absent",
} as const satisfies Record<string, AttendanceStatus>;

export const APP_STATUS = {
  Pending:    "Pending",
  Approved:   "Approved",
  Rejected:   "Rejected",
  Waitlisted: "Waitlisted",
} as const satisfies Record<string, ApplicationStatus>;

export const MEMBER_STATUS = {
  Pending:  "Pending",
  Active:   "Active",
  Inactive: "Inactive",
  Rejected: "Rejected",
} as const satisfies Record<string, OrgMemberStatus>;

export const ACTIVITY_STATUS = {
  Pending:   "Pending",
  Approved:  "Approved",
  Rejected:  "Rejected",
  Completed: "Completed",
} as const satisfies Record<string, ActivityStatus>;

export const MEMBERSHIP_STATUS = {
  Active:  "Active",
  Pending: "Pending",
} as const satisfies Record<string, MembershipStatus>;

export const SUPERVISOR_STATUS = {
  Active:  "Active",
  Pending: "Pending",
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
