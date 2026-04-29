// ─────────────────────────────────────────────────────────────────────
// Shared organization-form schema. Single source of truth for both
// Registration (RegisterPage) and Profile editing (OrgProfilePage).
//
// Any change to an org field's value-set, validation rule, required
// logic, or error message MUST be made in this file.
// ─────────────────────────────────────────────────────────────────────

import {
  GOVERNORATES,
  validateEmail,
  validateOrgPhone,
  validateOrgCity,
  validateSubmitterName,
  validateSubmitterRole,
} from "./volunteerFormSchema";

export { GOVERNORATES };

// ── Value lists ──────────────────────────────────────────────────────

export const ORG_TYPES: { value: string; label: string }[] = [
  { value: "NGO",                       label: "NGO / Non-profit" },
  { value: "Foundation",                label: "Foundation" },
  { value: "Community Group",           label: "Community Group / Cooperative" },
  { value: "Religious",                 label: "Religious Organization" },
  { value: "Student Activity",          label: "Student / Academic Organization" },
  { value: "Government",                label: "Government / Public Body" },
  { value: "Professional Association",  label: "Professional / Trade Association" },
  { value: "Social Enterprise",         label: "Social Enterprise" },
  { value: "International Organization",label: "International Organization" },
];

export const ORG_SIZES: { value: string; label: string }[] = [
  { value: "Small",  label: "Small (1–50 members)" },
  { value: "Medium", label: "Medium (51–200 members)" },
  { value: "Large",  label: "Large (200+ members)" },
];

export const ORG_CATEGORY_GROUPS: { label: string; items: string[] }[] = [
  {
    label: "People & Society",
    items: [
      "Social Welfare", "Children & Family Services", "Youth Development",
      "Gender Equality & Women's Empowerment", "Disability Support",
      "Human Rights", "Legal Aid & Justice",
    ],
  },
  {
    label: "Health & Well-being",
    items: ["Healthcare", "Food Security & Nutrition", "Mental Health"],
  },
  {
    label: "Environment & Planet",
    items: ["Environment", "Animal Welfare", "Climate & Sustainability"],
  },
  {
    label: "Knowledge & Culture",
    items: [
      "Education", "Arts & Culture", "Media & Communications",
      "Research & Innovation",
    ],
  },
  {
    label: "Economy & Community",
    items: [
      "Economic Empowerment / Livelihoods", "Community Development",
      "Emergency & Disaster Relief",
    ],
  },
];

export const ORG_CATEGORY_MAX = 5;
export const ORG_DESCRIPTION_MIN = 20;
export const ORG_DESCRIPTION_MAX = 500;

// ── Editable state shape (single source of truth) ────────────────────

export type OrgEditableState = {
  orgName: string;
  officialEmail: string;
  phone: string;
  orgType: string;
  foundedYear: string;
  orgSize: string;
  categories: string[];
  hqGovernorate: string;
  hqCity: string;
  branches: string[];
  website: string;
  description: string;
  logoDataUri: string;
  submitterName: string;
  submitterRole: string;
  additionalNotes: string;
};

export const EMPTY_ORG_STATE: OrgEditableState = {
  orgName: "", officialEmail: "", phone: "",
  orgType: "", foundedYear: "", orgSize: "",
  categories: [],
  hqGovernorate: "", hqCity: "", branches: [],
  website: "",
  description: "",
  logoDataUri: "",
  submitterName: "", submitterRole: "", additionalNotes: "",
};

// ── Validators ───────────────────────────────────────────────────────

export function validateOrgName(v: string): string {
  return v.trim() ? "" : "Organization name is required.";
}

export function validateOrgType(v: string): string {
  return v ? "" : "Please select an organization type.";
}

export function validateFoundedYear(v: string): string {
  return v ? "" : "Please select a founded year.";
}

export function validateOrgSize(v: string): string {
  return v ? "" : "Please select an organization size.";
}

export function validateCategories(v: string[]): string {
  return v.length === 0 ? "Please select at least one category." : "";
}

export function validateHqGovernorate(v: string): string {
  return v ? "" : "Please select a governorate.";
}

export function validateOfficialEmail(v: string): string {
  return validateEmail(v);
}

export function validateDescription(v: string): string {
  if (!v.trim()) return "Please describe your organization.";
  if (v.trim().length < ORG_DESCRIPTION_MIN)
    return `Description must be at least ${ORG_DESCRIPTION_MIN} characters.`;
  if (v.length > ORG_DESCRIPTION_MAX)
    return `Description must be no more than ${ORG_DESCRIPTION_MAX} characters.`;
  return "";
}

export function validateWebsite(v: string): string {
  if (!v.trim()) return "Website is required.";
  if (!/^https?:\/\/.+/.test(v.trim()))
    return "Please enter a valid URL starting with http:// or https://.";
  return "";
}

// ── Errors map ───────────────────────────────────────────────────────

export type OrgErrors = Record<string, string>;

export function computeOrgErrors(s: OrgEditableState): OrgErrors {
  return {
    orgName:        validateOrgName(s.orgName),
    officialEmail:  validateOfficialEmail(s.officialEmail),
    phone:          validateOrgPhone(s.phone),
    orgType:        validateOrgType(s.orgType),
    foundedYear:    validateFoundedYear(s.foundedYear),
    orgSize:        validateOrgSize(s.orgSize),
    categories:     validateCategories(s.categories),
    hqGovernorate:  validateHqGovernorate(s.hqGovernorate),
    hqCity:         validateOrgCity(s.hqCity),
    website:        validateWebsite(s.website),
    description:    validateDescription(s.description),
    submitterName:  validateSubmitterName(s.submitterName),
    submitterRole:  validateSubmitterRole(s.submitterRole),
  };
}

export function isOrgFormValid(errors: OrgErrors): boolean {
  return Object.values(errors).every((e) => !e);
}

// Profile-edit variant: skips submitter fields (hidden in OrgProfilePage).
export function computeOrgProfileErrors(s: OrgEditableState): OrgErrors {
  return {
    ...computeOrgErrors(s),
    submitterName: "",
    submitterRole: "",
  };
}

export const ORG_FIELD_LABELS: Record<string, string> = {
  orgName: "Organization Name",
  officialEmail: "Official Organization Email",
  phone: "Primary Phone Number",
  orgType: "Organization Type",
  foundedYear: "Founded Year",
  orgSize: "Organization Size",
  categories: "Category",
  hqGovernorate: "Governorate",
  hqCity: "City / District",
  website: "Website",
  description: "Description",
  submitterName: "Submitter Name",
  submitterRole: "Your Role",
};

export const ORG_TOUCHABLE_FIELDS: (keyof OrgErrors)[] = [
  "orgName", "officialEmail", "phone", "orgType", "foundedYear", "orgSize",
  "categories", "hqGovernorate", "hqCity", "website", "description",
  "submitterName", "submitterRole",
];

export function createOrgEmptyTouched(): Record<string, boolean> {
  const obj: Record<string, boolean> = {};
  for (const f of ORG_TOUCHABLE_FIELDS) obj[f as string] = false;
  return obj;
}

export function createOrgAllTouched(): Record<string, boolean> {
  const obj: Record<string, boolean> = {};
  for (const f of ORG_TOUCHABLE_FIELDS) obj[f as string] = true;
  return obj;
}

// ── Org → server payload builders ────────────────────────────────────

/**
 * Registration payload (camelCase keys; consumed by /api/auth/register).
 * Account-credential fields (email/password) are passed in separately.
 */
export function buildOrgRegisterPayload(
  s: OrgEditableState,
  accountEmail: string,
  password: string,
  documentsFileName: string,
) {
  return {
    role: "org_admin" as const,
    email: accountEmail,
    password,
    orgName: s.orgName,
    phone: s.phone,
    officialEmail: s.officialEmail,
    orgType: s.orgType,
    foundedYear: s.foundedYear,
    orgSize: s.orgSize,
    location: s.hqGovernorate,   // governorate (legacy column name)
    hqCity: s.hqCity,
    branches: s.branches,
    website: s.website,
    description: s.description,
    categories: s.categories,
    category: s.categories.join(", "),  // legacy single-string column
    logoUrl: s.logoDataUri,
    documentsUrl: documentsFileName,
    submitterName: s.submitterName,
    submitterRole: s.submitterRole,
    additionalNotes: s.additionalNotes,
  };
}

/**
 * Profile-update payload (snake_case keys; consumed by PUT
 * /api/organizations/me/profile). Only fields that changed should
 * actually be sent — caller diffs against the loaded org.
 */
export function buildOrgProfilePayload(s: OrgEditableState): Record<string, any> {
  return {
    name: s.orgName,
    official_email: s.officialEmail,
    phone: s.phone,
    org_type: s.orgType,
    founded_year: s.foundedYear,
    org_size: s.orgSize,
    categories: s.categories,
    category: s.categories.join(", "),
    location: s.hqGovernorate,
    hq_city: s.hqCity,
    branches: s.branches,
    website: s.website,
    description: s.description,
    logo_url: s.logoDataUri,
    submitter_name: s.submitterName,
    submitter_role: s.submitterRole,
    additional_notes: s.additionalNotes,
  };
}

/** Hydrate an OrgEditableState from a backend organization row. */
export function orgStateFromRow(o: any): OrgEditableState {
  const cats: string[] = (() => {
    if (Array.isArray(o?.categories)) return o.categories;
    if (typeof o?.categories === "string" && o.categories.trim()) {
      try {
        const parsed = JSON.parse(o.categories);
        if (Array.isArray(parsed)) return parsed;
      } catch {/* fall through to legacy */}
    }
    if (typeof o?.category === "string" && o.category.trim()) {
      return o.category.split(",").map((c: string) => c.trim()).filter(Boolean);
    }
    return [];
  })();

  const branches: string[] = (() => {
    if (Array.isArray(o?.branches)) return o.branches;
    if (typeof o?.branches === "string" && o.branches.trim()) {
      try {
        const parsed = JSON.parse(o.branches);
        if (Array.isArray(parsed)) return parsed;
      } catch {/* ignore */}
    }
    return [];
  })();

  return {
    orgName:       String(o?.name ?? ""),
    officialEmail: String(o?.official_email ?? ""),
    phone:         String(o?.phone ?? ""),
    orgType:       String(o?.org_type ?? ""),
    foundedYear:   String(o?.founded_year ?? o?.founded ?? ""),
    orgSize:       String(o?.org_size ?? ""),
    categories:    cats,
    hqGovernorate: String(o?.location ?? ""),
    hqCity:        String(o?.hq_city ?? ""),
    branches,
    website:       String(o?.website ?? ""),
    description:   String(o?.description ?? ""),
    logoDataUri:   String(o?.logo_url ?? ""),
    submitterName: String(o?.submitter_name ?? ""),
    submitterRole: String(o?.submitter_role ?? ""),
    additionalNotes: String(o?.additional_notes ?? ""),
  };
}
