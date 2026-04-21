// ─────────────────────────────────────────────────────────────────────
// Shared volunteer-form schema. Single source of truth for both
// Registration (RegisterPage) and Profile editing (ProfilePage).
//
// Contains:
//   - Constant value lists (governorates, nationalities, skills, …)
//   - Validation helpers (one function per field)
//   - Step validators for registration multi-step flow
//   - Full-form validator for profile editing
//   - The canonical Volunteer payload shape and helper to build it
//
// Rule: any change to a volunteer field's value-set, validation rule,
// required logic, or error message MUST be made in this file.
// ─────────────────────────────────────────────────────────────────────

// ── Value lists ──────────────────────────────────────────────────────

export const GOVERNORATES = [
  "Cairo", "Alexandria", "Giza", "Qalyubia", "Sharqia", "Dakahlia", "Beheira",
  "Minya", "Asyut", "Sohag", "Qena", "Luxor", "Aswan", "Fayoum", "Beni Suef",
  "Ismailia", "Port Said", "Suez", "Damietta", "Kafr El Sheikh", "Gharbia",
  "Monufia", "Red Sea", "New Valley", "Matrouh", "North Sinai", "South Sinai",
];

export const NATIONALITIES = [
  "Egyptian",
  "Algerian", "Angolan", "Beninese", "Botswanan", "Burkinabe", "Burundian",
  "Cameroonian", "Cape Verdean", "Central African", "Chadian", "Comorian",
  "Congolese", "Djiboutian", "Equatorial Guinean", "Eritrean", "Ethiopian",
  "Gabonese", "Gambian", "Ghanaian", "Guinean", "Guinea-Bissauan", "Ivorian",
  "Kenyan", "Lesothan", "Liberian", "Libyan", "Malagasy", "Malawian", "Malian",
  "Mauritanian", "Mauritian", "Moroccan", "Mozambican", "Namibian", "Nigerien",
  "Nigerian", "Rwandan", "Senegalese", "Sierra Leonean", "Somali",
  "South African", "South Sudanese", "Sudanese", "Swazi", "Tanzanian",
  "Togolese", "Tunisian", "Ugandan", "Zambian", "Zimbabwean",
  "Bahraini", "Emirati", "Iranian", "Iraqi", "Israeli", "Jordanian",
  "Kuwaiti", "Lebanese", "Omani", "Palestinian", "Qatari", "Saudi", "Syrian",
  "Yemeni",
  "Afghan", "Armenian", "Azerbaijani", "Bangladeshi", "Bhutanese", "Bruneian",
  "Cambodian", "Chinese", "Filipino", "Georgian", "Indian", "Indonesian",
  "Japanese", "Kazakh", "North Korean", "South Korean", "Kyrgyz", "Lao",
  "Malaysian", "Maldivian", "Mongolian", "Myanmarese", "Nepali", "Pakistani",
  "Singaporean", "Sri Lankan", "Tajik", "Thai", "Timorese", "Turkmen",
  "Uzbek", "Vietnamese",
  "Albanian", "Andorran", "Austrian", "Belarusian", "Belgian", "Bosnian",
  "British", "Bulgarian", "Croatian", "Cypriot", "Czech", "Danish", "Dutch",
  "Estonian", "Finnish", "French", "German", "Greek", "Hungarian", "Icelandic",
  "Irish", "Italian", "Kosovar", "Latvian", "Lithuanian", "Luxembourgish",
  "Macedonian", "Maltese", "Moldovan", "Montenegrin", "Norwegian", "Polish",
  "Portuguese", "Romanian", "Russian", "Serbian", "Slovak", "Slovenian",
  "Spanish", "Swedish", "Swiss", "Turkish", "Ukrainian",
  "American", "Argentinian", "Bahamian", "Barbadian", "Belizean", "Bolivian",
  "Brazilian", "Canadian", "Chilean", "Colombian", "Costa Rican", "Cuban",
  "Dominican", "Ecuadorian", "Grenadian", "Guatemalan", "Guyanese", "Haitian",
  "Honduran", "Jamaican", "Mexican", "Nicaraguan", "Panamanian", "Paraguayan",
  "Peruvian", "Salvadoran", "Surinamese", "Trinidadian", "Uruguayan",
  "Venezuelan",
  "Australian", "Fijian", "New Zealander", "Papua New Guinean", "Samoan",
  "Tongan",
  "Other",
];

export const SKILLS_LIST = [
  "Teaching / Tutoring", "Medical / First Aid", "Photography & Videography",
  "Event Planning", "Social Media Management", "Translation",
  "Software Development", "Graphic Design", "Fundraising",
  "Administrative Support", "Environmental Work", "Community Outreach", "Other",
];

export const AVAILABILITY_SPECIFIC = [
  "Weekday mornings", "Weekday afternoons", "Weekday evenings", "Weekends",
];

export const PROFICIENCY_LEVELS = ["Basic", "Conversational", "Fluent", "Native"];

export const EDUCATION_LEVELS = [
  "High School Student",
  "High School Graduate",
  "University Student",
  "University Graduate",
  "Postgraduate (Diploma / Master / PhD)",
  "Other",
];

export const STUDY_YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year+"];

export const DEPARTMENT_GROUPS: { label: string; options: string[] }[] = [
  { label: "Communications & Outreach", options: ["PR", "Media", "Content Creation"] },
  { label: "Operations", options: ["HR", "Event Management", "Logistics", "Fundraising", "Partnerships"] },
  { label: "Other", options: ["Emergencies", "General"] },
];

export const CAUSE_GROUPS: { label: string; causes: string[] }[] = [
  { label: "Social & Humanitarian",  causes: ["Poverty Alleviation", "Food & Clothing Distribution", "Refugee & Migrant Support", "Disability Support", "Elderly Care", "Child Protection & Orphan Care", "Women Empowerment"] },
  { label: "Children & Youth",       causes: ["Youth Development", "Street Children Outreach", "Child Education Support", "After-School Programs"] },
  { label: "Education & Skills",     causes: ["Education & Tutoring", "Literacy Programs", "Career Mentorship", "Youth Entrepreneurship", "Awareness Campaigns"] },
  { label: "Health & Emergency",     causes: ["Healthcare Access", "Blood Donation", "Emergency & Disaster Relief", "Mental Health Support", "First Aid & Safety"] },
  { label: "Environment",            causes: ["Environmental Cleanup", "Climate Action", "Animal Welfare", "Sustainability"] },
  { label: "Community & Events",     causes: ["Community Engagement", "Event Planning & Coordination", "Fundraising", "Arts & Culture", "Sports & Recreation", "Ramadan & Seasonal Programs"] },
  { label: "Professional & General", causes: ["Administrative Support", "Media & Content Creation", "Translation & Interpretation", "General Volunteering"] },
];

export const ALL_PREDEFINED_CAUSES = new Set(CAUSE_GROUPS.flatMap((g) => g.causes));

export const MAX_SKILLS = 5;
export const MAX_CAUSES = 5;
export const MAX_HEALTH_NOTES = 300;
export const MAX_EDUCATION_OTHER = 100;
export const MAX_EXP_DESCRIPTION = 300;
export const MAX_LANGUAGE = 50;
export const MIN_HOURS = 1;
export const MAX_HOURS = 40;

// ── Field-key list (canonical order — matches Registration steps) ────

export const VOLUNTEER_FIELD_ORDER = [
  // Step 1
  "fullName", "email", "password", "confirmPassword",
  // Step 2
  "nationality", "nationalId", "dateOfBirth", "governorate", "phone",
  "city", "gender", "healthNotes",
  "educationLevel", "educationOther",
  "universityName", "faculty", "studyYear", "fieldOfStudy",
  // Step 3
  "department", "skills", "customSkill", "availability", "hoursPerWeek",
  "languages", "priorExperience", "experiences", "causeAreas",
] as const;

export type VolunteerFieldKey = typeof VOLUNTEER_FIELD_ORDER[number];

// Fields that are required (when their conditional context is active).
// Profile editing must enforce the same required rules.
export const REQUIRED_FIELDS: VolunteerFieldKey[] = [
  "fullName", "email", "password", "confirmPassword",
  "nationality", "nationalId", "dateOfBirth", "governorate", "phone",
  "city", "gender", "educationLevel",
];

// ── Step field lists (Registration multi-step flow) ──────────────────

/** Step 1: Account credentials + personal identity */
export const STEP1_FIELDS = [
  "fullName", "email", "password", "confirmPassword",
  "nationality", "nationalId", "dateOfBirth",
  "governorate", "phone", "city", "gender",
] as const;

/** Step 2: Education details (base field + conditionals) */
export const STEP2_FIELDS = [
  "educationLevel",
] as const;

/** Extra education fields that must be checked depending on educationLevel */
export const STEP2_CONDITIONAL_FIELDS = [
  "universityName", "faculty", "studyYear", "fieldOfStudy", "educationOther",
] as const;

/** Step 3: Skills, languages, experience, causes (validated together) */
export const STEP3_FIELDS = [
  "skills", "languages", "priorExperiences",
] as const;

// ── Validators (each returns "" when valid, else an error message) ───

export function validateFullName(v: string): string {
  if (!v.trim()) return "Full name is required.";
  if (!/^[\u0600-\u06FFa-zA-Z\s]+$/.test(v))
    return "Full name must contain letters only — no numbers or special characters.";
  if (v.trim().split(/\s+/).length < 3)
    return "Full name must include at least 3 words.";
  return "";
}

export function validateSubmitterName(v: string): string {
  if (!v.trim()) return "Submitter name is required.";
  if (!/^[\u0600-\u06FFa-zA-Z\s]+$/.test(v.trim()))
    return "Name must contain letters only — no numbers or special characters.";
  if (v.trim().split(/\s+/).length < 2)
    return "Please enter your first and last name.";
  return "";
}

export function validateSubmitterRole(v: string): string {
  if (!v.trim()) return "Your role is required.";
  if (v.trim().length < 2) return "Role must be at least 2 characters.";
  if (v.trim().length > 60) return "Role must be no more than 60 characters.";
  if (!/^[\u0600-\u06FFa-zA-Z\s\-\/\.]+$/.test(v.trim()))
    return "Role must contain letters only — no numbers or special characters.";
  return "";
}

export function validateOrgCity(v: string): string {
  if (!v.trim()) return "City or district is required.";
  if (v.trim().length < 2) return "City must be at least 2 characters.";
  if (v.trim().length > 60) return "City must be no more than 60 characters.";
  if (!/^[\u0600-\u06FFa-zA-Z\s\-\.]+$/.test(v.trim()))
    return "City must contain letters only — no numbers or special characters.";
  return "";
}

export function validateEmail(v: string): string {
  if (!v.trim()) return "Email address is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
    return "Please enter a valid email.";
  return "";
}

export function validatePassword(v: string): string {
  if (!v) return "Password is required.";
  if (v.length < 8) return "Password must be at least 8 characters long.";
  if (v.length > 64) return "Password must be no more than 64 characters.";
  if (!/[A-Z]/.test(v)) return "Add at least one uppercase letter (A–Z).";
  if (!/[a-z]/.test(v)) return "Add at least one lowercase letter (a–z).";
  if (!/[0-9]/.test(v)) return "Add at least one number (0–9).";
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(v))
    return "Add at least one special character (e.g., @, #, $, !).";
  return "";
}

export function validateConfirmPassword(confirm: string, password: string): string {
  if (!confirm) return "Please confirm your password.";
  if (confirm !== password) return "Passwords do not match.";
  return "";
}

export function validateNationalId(v: string): string {
  if (!v) return "National ID is required.";
  if (!/^\d+$/.test(v)) return "National ID must contain numbers only — no letters or symbols.";
  if (v.length !== 14) return "National ID must be exactly 14 digits.";
  if (!["2", "3"].includes(v[0])) return "Please enter a valid national ID.";
  return "";
}

export function validatePassportNumber(v: string): string {
  const trimmed = v.trim();
  if (!trimmed) return "Passport number is required.";
  if (trimmed.length < 5) return "Passport number must be at least 5 characters.";
  if (trimmed.length > 20) return "Passport number must be no more than 20 characters.";
  if (!/^[A-Z0-9][A-Z0-9-]{3,18}[A-Z0-9]$/.test(trimmed))
    return "Passport number may contain uppercase letters, digits, and hyphens only.";
  if (/--/.test(trimmed)) return "Passport number cannot contain consecutive hyphens.";
  return "";
}

export function validateNationalIdOrPassport(v: string, nationality: string): string {
  return nationality === "Egyptian" ? validateNationalId(v) : validatePassportNumber(v);
}

export function validateDob(v: string): string {
  if (!v) return "Date of birth is required.";
  const dob = new Date(v);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dob > today) return "Date of birth cannot be a future date.";
  const y = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  const age = m < 0 || (m === 0 && today.getDate() < dob.getDate()) ? y - 1 : y;
  if (age < 15) return "You must be at least 15 years old to register.";
  return "";
}

export function validatePhone(v: string): string {
  if (!v) return "Phone number is required.";
  if (!/^\d+$/.test(v)) return "Phone number must contain numbers only.";
  if (!["010", "011", "012", "015"].some((p) => v.startsWith(p)))
    return "Please enter a valid phone number.";
  if (v.length !== 11) return "Phone number must be exactly 11 digits.";
  return "";
}

export function validateOrgPhone(v: string): string {
  if (!v) return "Phone number is required.";
  if (!/^\d+$/.test(v)) return "Phone number must contain numbers only.";
  const isMobile   = ["010", "011", "012", "015"].some((p) => v.startsWith(p));
  const isLandline = /^0[2-9]/.test(v) && !isMobile;
  if (isMobile)   return v.length === 11 ? "" : "Mobile numbers must be exactly 11 digits (e.g. 01XXXXXXXXX).";
  if (isLandline) return v.length === 10 ? "" : "Landline numbers must be exactly 10 digits (e.g. 0XXXXXXXXX).";
  return "Enter a valid mobile (01XXXXXXXXX) or landline (0XXXXXXXXX) number.";
}

export function validateCity(v: string): string {
  if (!v.trim()) return "City is required.";
  if (!/^[\u0600-\u06FFa-zA-Z\s]+$/.test(v.trim()))
    return "City name must contain letters only — no numbers or special characters.";
  return "";
}

export function validateGovernorate(v: string): string {
  return v ? "" : "Please select a governorate.";
}

export function validateGender(v: string): string {
  return v ? "" : "Please select your gender.";
}

export function validateEducationLevel(v: string): string {
  return v ? "" : "Please select your education level.";
}

export function validateUniversityName(v: string, level: string): string {
  return level === "University Student" && !v.trim()
    ? "Please enter your university name." : "";
}

export function validateFaculty(v: string, level: string): string {
  return level === "University Student" && !v.trim()
    ? "Please enter your faculty or major." : "";
}

export function validateStudyYear(v: string, level: string): string {
  return level === "University Student" && !v
    ? "Please select your academic year." : "";
}

export function validateFieldOfStudy(v: string, level: string): string {
  return (level === "University Graduate" || level === "Postgraduate (Diploma / Master / PhD)") && !v.trim()
    ? "Please enter your field of study." : "";
}

export function validateEducationOther(v: string, level: string): string {
  return level === "Other" && !v.trim()
    ? "Please describe your education background." : "";
}

export function validateSkills(skills: string[], customSkill: string): string {
  if (!skills.includes("Other")) return "";
  if (!customSkill.trim()) return "Please describe your other skill.";
  if (customSkill.trim().length < 2) return "Custom skill must be at least 2 characters.";
  return "";
}

export function validateLanguages(
  languages: { language: string; proficiency: string }[],
): string {
  if (languages.length === 0) return "";
  if (languages.some((l) => !l.language.trim()))
    return "All language fields must be filled in.";
  if (languages.some((l) => l.language.trim().length > 0 && !/^[\u0600-\u06FFa-zA-Z\s\-]+$/.test(l.language.trim())))
    return "Language names must contain letters only — no numbers or special characters.";
  if (new Set(languages.map((l) => l.language.trim().toLowerCase())).size !== languages.length)
    return "Duplicate languages are not allowed.";
  return "";
}

export type ExperienceEntry = {
  orgName: string; department: string;
  role: string; duration: string; description: string;
};

export function validatePriorExperiences(
  priorHasExperience: boolean | null,
  experiences: ExperienceEntry[],
): string {
  if (priorHasExperience !== true) return "";
  if (experiences.length === 0)
    return "Please add at least one experience or select 'No'.";
  if (experiences.some((e) => !e.orgName.trim() || !e.department))
    return "Please complete all required fields in each experience entry.";
  return "";
}

export function getExperienceFieldError(
  e: ExperienceEntry, field: "orgName" | "department",
): string {
  if (field === "orgName" && !e.orgName.trim()) return "Organization name is required.";
  if (field === "department" && !e.department) return "Please select a department.";
  return "";
}

// ── Canonical volunteer payload shape (frontend → backend) ───────────

export type VolunteerEditableState = {
  fullName: string;
  email: string;
  nationality: string;
  nationalId: string;
  dateOfBirth: string;
  governorate: string;
  phone: string;
  city: string;
  gender: string;
  healthNotes: string;
  educationLevel: string;
  educationOther: string;
  universityName: string;
  faculty: string;
  studyYear: string;
  fieldOfStudy: string;
  department: string;
  hoursPerWeek: number | null;
  skills: string[];
  customSkill: string;
  availability: string[];
  languages: { language: string; proficiency: string }[];
  priorHasExperience: boolean | null;
  experiences: ExperienceEntry[];
  causeAreas: string[];
};

export function resolveSkills(skills: string[], customSkill: string): string[] {
  return skills.includes("Other")
    ? [...skills.filter((s) => s !== "Other"),
       ...customSkill.split(",").map((s) => s.trim()).filter(Boolean)]
    : skills;
}

export function resolveEducationLevel(level: string, other: string): string {
  return level === "Other" ? other.trim() : level;
}

// Build the canonical backend payload (keys, types and order match
// what /volunteers PUT/POST endpoints accept).
export function buildVolunteerPayload(s: VolunteerEditableState) {
  const skills = resolveSkills(s.skills, s.customSkill);
  return {
    name: s.fullName,
    email: s.email,
    nationality: s.nationality,
    national_id: s.nationalId,
    date_of_birth: s.dateOfBirth,
    governorate: s.governorate,
    phone: s.phone,
    city: s.city,
    gender: s.gender,
    health_notes: s.healthNotes,
    education_level: resolveEducationLevel(s.educationLevel, s.educationOther),
    university_name: s.universityName,
    faculty: s.faculty,
    study_year: s.studyYear,
    field_of_study: s.fieldOfStudy,
    department: s.department,
    hours_per_week: s.hoursPerWeek,
    skills,
    availability: s.availability,
    languages: s.languages,
    prior_experience: s.priorHasExperience === true ? 1 : 0,
    prior_org: s.priorHasExperience === true
      ? s.experiences.map((e) => e.orgName.trim()).filter(Boolean).join(", ")
      : "",
    experiences: s.priorHasExperience === true ? s.experiences.map((e) => ({
      orgName: e.orgName.trim(),
      department: e.department,
      role: e.role.trim(),
      duration: e.duration.trim(),
      description: e.description.trim(),
    })) : [],
    cause_areas: s.causeAreas,
  };
}

// Build the registration payload — same logical fields as
// `buildVolunteerPayload`, but using the camelCase keys the
// /api/auth/register Pydantic model expects, plus role + password.
export function buildVolunteerRegisterPayload(
  s: VolunteerEditableState,
  password: string,
) {
  const skills = resolveSkills(s.skills, s.customSkill);
  return {
    role: "volunteer" as const,
    email: s.email,
    password,
    name: s.fullName,
    phone: s.phone,
    city: s.city,
    skills,
    dateOfBirth: s.dateOfBirth,
    governorate: s.governorate,
    nationality: s.nationality,
    nationalId: s.nationalId,
    gender: s.gender,
    healthNotes: s.healthNotes,
    availability: s.availability,
    hoursPerWeek: s.hoursPerWeek,
    languages: s.languages,
    educationLevel: resolveEducationLevel(s.educationLevel, s.educationOther),
    universityName: s.universityName,
    faculty: s.faculty,
    studyYear: s.studyYear,
    fieldOfStudy: s.fieldOfStudy,
    department: s.department,
    priorExperience: s.priorHasExperience === true,
    priorOrg: s.priorHasExperience === true
      ? s.experiences.map((e) => e.orgName.trim()).filter(Boolean).join(", ")
      : "",
    experiences: s.priorHasExperience === true ? s.experiences.map((e) => ({
      orgName: e.orgName.trim(),
      department: e.department,
      role: e.role.trim(),
      duration: e.duration.trim(),
      description: e.description.trim(),
    })) : [],
    causeAreas: s.causeAreas,
  };
}

// ── Error computation ────────────────────────────────────────────────

/**
 * Error map type: field key → error string ("" means valid).
 */
export type VolunteerErrors = Record<string, string>;

/**
 * Compute the full set of validation errors for the editable state.
 *
 * `opts.password` is used to decide whether password fields are validated.
 * - During **registration**: pass `{ password, confirmPassword }` — both
 *   password fields are validated.
 * - During **profile editing**: call with no opts (or omit password) —
 *   password fields are skipped, which is correct because the profile
 *   page does not ask for the password.
 *
 * Both Registration and Profile pages use this single function.
 */
export function computeVolunteerErrors(
  s: VolunteerEditableState,
  opts: { confirmPassword?: string; password?: string } = {},
): VolunteerErrors {
  return {
    fullName:        validateFullName(s.fullName),
    email:           validateEmail(s.email),
    password:        opts.password !== undefined ? validatePassword(opts.password) : "",
    confirmPassword: opts.password !== undefined
      ? validateConfirmPassword(opts.confirmPassword ?? "", opts.password)
      : "",
    nationality:     s.nationality ? "" : "Please select a nationality.",
    nationalId:      validateNationalIdOrPassport(s.nationalId, s.nationality),
    dateOfBirth:     validateDob(s.dateOfBirth),
    governorate:     validateGovernorate(s.governorate),
    phone:           validatePhone(s.phone),
    city:            validateCity(s.city),
    gender:          validateGender(s.gender),
    educationLevel:  validateEducationLevel(s.educationLevel),
    universityName:  validateUniversityName(s.universityName, s.educationLevel),
    faculty:         validateFaculty(s.faculty, s.educationLevel),
    studyYear:       validateStudyYear(s.studyYear, s.educationLevel),
    fieldOfStudy:    validateFieldOfStudy(s.fieldOfStudy, s.educationLevel),
    educationOther:  validateEducationOther(s.educationOther, s.educationLevel),
    skills:          validateSkills(s.skills, s.customSkill),
    languages:       validateLanguages(s.languages),
    priorExperiences: validatePriorExperiences(s.priorHasExperience, s.experiences),
    availability:    "",
  };
}

// ── Step validators (Registration multi-step flow) ───────────────────

/**
 * Step 1 is valid when every field in STEP1_FIELDS has no error.
 */
export function isStep1Valid(errors: VolunteerErrors): boolean {
  return (STEP1_FIELDS as readonly string[]).every((f) => !errors[f]);
}

/**
 * Step 2 is valid when the base educationLevel field AND whichever
 * conditional fields are active for the selected level have no error.
 */
export function isStep2Valid(errors: VolunteerErrors): boolean {
  if (errors.educationLevel) return false;
  // Check all conditional education fields — if any has a non-empty error
  // it means the condition was active and the field failed validation.
  return (STEP2_CONDITIONAL_FIELDS as readonly string[]).every((f) => !errors[f]);
}

/**
 * Step 3 is valid when skills, languages, and priorExperiences have
 * no error AND the terms checkbox has been accepted.
 */
export function isStep3Valid(errors: VolunteerErrors, termsAccepted: boolean): boolean {
  if (!termsAccepted) return false;
  return (STEP3_FIELDS as readonly string[]).every((f) => !errors[f]);
}

// ── Profile-edit validators ──────────────────────────────────────────

/**
 * Fields that are **not** relevant during profile editing.
 * Password is never collected on the profile page.
 */
const PROFILE_EXCLUDED_FIELDS = new Set(["password", "confirmPassword"]);

/**
 * Returns `true` when the entire editable form is valid for profile saving.
 * Skips password fields since they are not part of the profile edit flow.
 */
export function isProfileFormValid(errors: VolunteerErrors): boolean {
  return (Object.keys(errors) as string[]).every(
    (k) => PROFILE_EXCLUDED_FIELDS.has(k) || !errors[k],
  );
}

/**
 * Returns the first non-empty error message that is relevant to the
 * profile edit flow (skips password fields). Useful for toast messages.
 * Returns `""` when there is no error.
 */
export function getFirstProfileError(errors: VolunteerErrors): string {
  for (const key of Object.keys(errors)) {
    if (PROFILE_EXCLUDED_FIELDS.has(key)) continue;
    if (errors[key]) return errors[key];
  }
  return "";
}

/**
 * Returns the **key** of the first field that has a profile-relevant error.
 * Useful for scrolling to the first invalid field.
 * Returns `null` when there is no error.
 */
export function getFirstProfileErrorField(errors: VolunteerErrors): string | null {
  for (const key of Object.keys(errors)) {
    if (PROFILE_EXCLUDED_FIELDS.has(key)) continue;
    if (errors[key]) return key;
  }
  return null;
}

// ── Touched-state helpers ────────────────────────────────────────────

/**
 * All field keys that participate in profile validation
 * (password fields excluded because they don't exist on the profile form).
 */
export const PROFILE_TOUCHABLE_FIELDS = [
  "fullName", "email", "nationality", "nationalId", "dateOfBirth",
  "governorate", "phone", "city", "gender", "healthNotes",
  "educationLevel", "educationOther", "universityName", "faculty",
  "studyYear", "fieldOfStudy", "department", "hoursPerWeek",
  "skills", "languages", "priorExperiences",
] as const;

/**
 * Creates an initial touched-state record where every profile-touchable
 * field is `false`. Spread into `useState`:
 *
 * ```ts
 * const [touched, setTouched] = useState<Record<string, boolean>>(
 *   () => createEmptyTouched(),
 * );
 * ```
 */
export function createEmptyTouched(): Record<string, boolean> {
  const obj: Record<string, boolean> = {};
  for (const f of PROFILE_TOUCHABLE_FIELDS) {
    obj[f] = false;
  }
  return obj;
}

/**
 * Returns a touched record where **every** profile-touchable field is
 * `true`. Call this right before validating on submit so that *all*
 * errors become visible.
 */
export function createAllTouched(): Record<string, boolean> {
  const obj: Record<string, boolean> = {};
  for (const f of PROFILE_TOUCHABLE_FIELDS) {
    obj[f] = true;
  }
  return obj;
}

/**
 * Resolves whether an error message should be displayed for a given field.
 *
 * The error is shown when:
 * - The field has been touched (blur / change), **OR**
 * - A submit attempt has been made (`submitAttempted === true`)
 *
 * and the error string for that field is non-empty.
 *
 * Usage:
 * ```tsx
 * const msg = shouldShowError(errors, touched, "phone", true);
 * return msg ? <span className="err">{msg}</span> : null;
 * ```
 */
export function shouldShowError(
  errors: VolunteerErrors,
  touched: Record<string, boolean>,
  field: string,
  submitAttempted: boolean,
): string {
  if (!errors[field]) return "";
  if (touched[field] || submitAttempted) return errors[field];
  return "";
}