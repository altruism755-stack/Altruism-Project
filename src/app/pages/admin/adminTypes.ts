export type OrgStatus = "pending" | "approved" | "rejected";
export type ChangeStatus = "pending" | "approved" | "rejected";
export type VolStatus = "Active" | "Pending" | "Suspended";
export type OrgFilterTab = "pending" | "approved" | "rejected" | "all";

export interface Organization {
  id: number;
  name: string;
  status: OrgStatus;
  org_type?: string;
  category?: string;
  location?: string;
  description?: string;
  admin_email?: string;
  official_email?: string;
  phone?: string;
  website?: string;
  social_links?: string;
  documents_url?: string;
  logo_url?: string;
  color?: string;
  initials?: string;
  founded_year?: number;
  submitter_name?: string;
  submitter_role?: string;
  rejection_reason?: string;
  created_at?: string;
}

export interface Volunteer {
  id: number;
  name: string;
  email: string;
  status: VolStatus;
  active_orgs?: number;
  activity_count?: number;
}

export interface ProfileChange {
  id: number;
  org_name: string;
  org_logo?: string;
  field_label: string;
  current_value?: string;
  new_value: string;
  status: ChangeStatus;
  requested_by_email: string;
  created_at?: string;
}

export interface PlatformAdmin {
  user_id: number;
  email: string;
  promoted_at?: string;
  created_at?: string;
}

export interface OrgAdmin {
  id: number;
  email: string;
  org_name?: string;
  created_at?: string;
}

export interface AdminStats {
  pending_organizations?: number;
  approved_organizations?: number;
  rejected_organizations?: number;
  pending_profile_changes?: number;
  total_volunteers?: number;
  total_users?: number;
  total_platform_admins?: number;
}
