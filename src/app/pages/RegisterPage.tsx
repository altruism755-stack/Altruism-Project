import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { DatePicker } from "../components/DatePicker";
import { Logo } from "../components/Logo";

const GREEN = "#16A34A";
const GREEN_HOVER = "#15803D";
const RED = "#DC2626";
const BLUE = "#2563EB";

type Role = "Volunteer" | "Organization";

const GOVERNORATES = [
  "Cairo", "Alexandria", "Giza", "Qalyubia", "Sharqia", "Dakahlia", "Beheira",
  "Minya", "Asyut", "Sohag", "Qena", "Luxor", "Aswan", "Fayoum", "Beni Suef",
  "Ismailia", "Port Said", "Suez", "Damietta", "Kafr El Sheikh", "Gharbia",
  "Monufia", "Red Sea", "New Valley", "Matrouh", "North Sinai", "South Sinai",
];

const SKILLS_LIST = [
  "Teaching / Tutoring", "Medical / First Aid", "Photography & Videography",
  "Event Planning", "Social Media Management", "Translation",
  "Software Development", "Graphic Design", "Fundraising",
  "Administrative Support", "Environmental Work", "Community Outreach", "Other",
];

const AVAILABILITY_SPECIFIC = ["Weekday mornings", "Weekday afternoons", "Weekday evenings", "Weekends"];

const CAUSE_AREAS = [
  "Children & Youth", "Elderly", "Environment", "Education", "Health",
  "Disability", "Refugees", "Animal Welfare", "Others",
];

const EDUCATION_LEVELS = [
  "Below secondary", "Secondary", "Diploma", "Bachelor's", "Master's", "PhD",
];

const PROFICIENCY_LEVELS = ["Basic", "Conversational", "Fluent", "Native"];

const DEPARTMENT_GROUPS: { label: string; options: string[] }[] = [
  { label: "Communications & Outreach", options: ["PR", "Media", "Content Creation"] },
  { label: "Operations", options: ["HR", "Event Management", "Logistics", "Fundraising", "Partnerships"] },
  { label: "Other", options: ["Emergencies", "General", "Other"] },
];
const DEPARTMENT_OTHER_MAX = 50;

const STEP1_FIELDS = ["fullName", "email", "password", "confirmPassword"];
const STEP2_FIELDS = ["nationalId", "dateOfBirth", "governorate", "phone", "city", "gender"];

const MAX_SKILLS = 5;

// ── SVG Icons ────────────────────────────────────────────────────────

function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Validation helpers ────────────────────────────────────────────────

function validateFullName(v: string): string {
  if (!v.trim()) return "Full name is required.";
  if (!/^[\u0600-\u06FFa-zA-Z\s]+$/.test(v))
    return "Full name must contain letters only — no numbers or special characters.";
  if (v.trim().split(/\s+/).length < 3)
    return "Full name must include at least 3 words.";
  return "";
}

function validateEmail(v: string): string {
  if (!v.trim()) return "Email address is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
    return "Please enter a valid email.";
  return "";
}

function validatePassword(v: string): string {
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

function validateNationalId(v: string): string {
  if (!v) return "National ID is required.";
  if (!/^\d+$/.test(v)) return "National ID must contain numbers only — no letters or symbols.";
  if (v.length !== 14) return "National ID must be exactly 14 digits.";
  if (!["2", "3"].includes(v[0])) return "Please enter a valid national ID.";
  return "";
}

function validateDob(v: string): string {
  if (!v) return "Date of birth is required.";
  const dob = new Date(v);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dob > today) return "Date of birth cannot be a future date.";
  const y = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  const age = m < 0 || (m === 0 && today.getDate() < dob.getDate()) ? y - 1 : y;
  if (age < 16) return "You must be at least 16 years old to register.";
  return "";
}

function validatePhone(v: string): string {
  if (!v) return "Phone number is required.";
  if (!/^\d+$/.test(v)) return "Phone number must contain numbers only.";
  if (!["010", "011", "012", "015"].some((p) => v.startsWith(p)))
    return "Please enter a valid phone number.";
  if (v.length !== 11) return "Phone number must be exactly 11 digits.";
  return "";
}

function validateCity(v: string): string {
  if (!v.trim()) return "City is required.";
  if (!/^[\u0600-\u06FFa-zA-Z\s]+$/.test(v.trim()))
    return "City name must contain letters only — no numbers or special characters.";
  return "";
}

function validateSkills(selected: string[], custom: string): string {
  if (selected.length === 0) return "Please select at least one skill.";
  if (selected.includes("Other")) {
    if (!custom.trim()) return "Please describe your other skill.";
    if (custom.trim().length < 2) return "Custom skill must be at least 2 characters.";
  }
  return "";
}

// ── Component ─────────────────────────────────────────────────────────

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [role, setRole] = useState<Role>("Volunteer");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [focused, setFocused] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [legalModal, setLegalModal] = useState<"terms" | "privacy" | null>(null);

  // ── Volunteer field state ──
  const [volForm, setVolForm] = useState({
    fullName: "", email: "", password: "", confirmPassword: "",
    nationalId: "", dateOfBirth: "", governorate: "",
    phone: "", city: "", gender: "", department: "", healthNotes: "",
    about: "", educationLevel: "", priorExperience: false, priorOrg: "",
    hoursPerWeek: 5,
  });
  const [volSkills, setVolSkills] = useState<string[]>([]);
  const [volCustomSkill, setVolCustomSkill] = useState("");
  const [availability, setAvailability] = useState<string[]>([]);
  const [causeAreas, setCauseAreas] = useState<string[]>([]);
  const [causeOtherText, setCauseOtherText] = useState("");
  const [departmentOther, setDepartmentOther] = useState("");
  const [languages, setLanguages] = useState<{ language: string; proficiency: string }[]>([
    { language: "", proficiency: "Native" },
  ]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // ── Profile picture ──
  const [volPicPreview, setVolPicPreview] = useState("");
  const [volPicData, setVolPicData] = useState("");
  const [volPicError, setVolPicError] = useState("");
  const volPicRef = useRef<HTMLInputElement>(null);
  const departmentOtherRef = useRef<HTMLInputElement>(null);

  // ── Organization form ──
  const [orgForm, setOrgForm] = useState({
    orgName: "", email: "", password: "", phone: "",
    officialEmail: "", orgType: "", foundedYear: "", location: "",
    website: "", socialLinks: "", description: "", category: "",
    submitterName: "", submitterRole: "", logoDataUri: "", documentsUrl: "",
  });

  // ── Errors (live) ──
  const errors = useMemo(() => ({
    fullName:        validateFullName(volForm.fullName),
    email:           validateEmail(volForm.email),
    password:        validatePassword(volForm.password),
    confirmPassword: !volForm.confirmPassword
      ? "Please confirm your password."
      : volForm.confirmPassword !== volForm.password
        ? "Passwords do not match."
        : "",
    nationalId:      validateNationalId(volForm.nationalId),
    dateOfBirth:     validateDob(volForm.dateOfBirth),
    governorate:     volForm.governorate ? "" : "Please select a governorate.",
    phone:           validatePhone(volForm.phone),
    city:            validateCity(volForm.city),
    gender:          volForm.gender ? "" : "Please select your gender.",
    departmentOther: volForm.department === "Other" && departmentOther.trim().length < 2
      ? "Please enter your department (min 2 characters)."
      : "",
    skills:          validateSkills(volSkills, volCustomSkill),
    availability:    availability.length === 0 ? "Please select at least one availability option." : "",
    educationLevel:  volForm.educationLevel ? "" : "Please select your education level.",
    languages:       languages.length === 0
      ? "Please add at least one language."
      : languages.some((l) => !l.language.trim())
        ? "All language fields must be filled in."
        : new Set(languages.map((l) => l.language.trim().toLowerCase())).size !== languages.length
          ? "Duplicate languages are not allowed."
          : "",
  }), [volForm, volSkills, volCustomSkill, availability, departmentOther, languages]);

  const step1Valid = STEP1_FIELDS.every((f) => !errors[f as keyof typeof errors]);
  const step2Valid = STEP2_FIELDS.every((f) => !errors[f as keyof typeof errors]) && !errors.departmentOther;
  const step3Valid = !errors.skills && !errors.availability && !errors.educationLevel && !errors.languages && termsAccepted;

  // ── Helpers ──
  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const touch = (field: string) => setTouched((t) => ({ ...t, [field]: true }));
  const onFocus = (field: string) => setFocused(field);
  const onBlur  = (field: string) => { setFocused(null); touch(field); };

  const borderColor = (field: string) => {
    if (!touched[field]) return focused === field ? BLUE : "#E2E8F0";
    return errors[field as keyof typeof errors] ? RED : GREEN;
  };

  const fieldStyle = (field: string, h = 42): React.CSSProperties => ({
    width: "100%", height: h, outline: "none", boxSizing: "border-box",
    border: `1.5px solid ${borderColor(field)}`,
    borderRadius: 8, padding: h === 42 ? "0 12px" : "10px 12px",
    fontSize: 14, backgroundColor: "#FFFFFF", transition: "border-color 150ms",
    resize: h > 42 ? ("vertical" as const) : undefined,
    fontFamily: "inherit",
  });

  const labelStyle: React.CSSProperties = {
    fontSize: 13, color: "#1E293B", fontWeight: 500, marginBottom: 4, display: "block",
  };

const checkboxCardStyle = (active: boolean, disabled = false): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 8,
    cursor: disabled ? "default" : "pointer",
    fontSize: 13, color: disabled ? "#CBD5E1" : "#1E293B", padding: "7px 10px", borderRadius: 7,
    border: `1.5px solid ${active ? GREEN : disabled ? "#F1F5F9" : "#E2E8F0"}`,
    backgroundColor: active ? "#F0FDF4" : disabled ? "#FAFAFA" : "#FAFAFA",
    transition: "all 150ms", userSelect: "none",
    opacity: disabled ? 0.45 : 1,
    pointerEvents: disabled ? "none" : "auto",
  });

  const toggleSkill = (skill: string) => {
    setVolSkills((prev) => {
      if (prev.includes(skill)) return prev.filter((s) => s !== skill);
      if (prev.length >= MAX_SKILLS) return prev;
      return [...prev, skill];
    });
    touch("skills");
  };

  const toggleAvailability = (opt: string) => {
    setAvailability((prev) => {
      if (opt === "Flexible") return prev.includes("Flexible") ? [] : ["Flexible"];
      const without = prev.filter((a) => a !== "Flexible");
      const next = without.includes(opt) ? without.filter((a) => a !== opt) : [...without, opt];
      const allSpecificSelected = AVAILABILITY_SPECIFIC.every((s) => next.includes(s));
      return allSpecificSelected ? ["Flexible"] : next;
    });
    touch("availability");
  };

  const toggleCause = (c: string) => {
    setCauseAreas((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  };

  const addLanguage = () => {
    setLanguages((prev) => [...prev, { language: "", proficiency: "Conversational" }]);
  };

  const removeLanguage = (idx: number) => {
    setLanguages((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateLanguage = (idx: number, field: "language" | "proficiency", value: string) => {
    setLanguages((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
    touch("languages");
  };

  const handleVolPicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVolPicError("");
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      setVolPicError("Only JPG and PNG files are allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setVolPicError("Image must be under 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const uri = reader.result as string;
      setVolPicPreview(uri);
      setVolPicData(uri);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setOrgForm((f) => ({ ...f, logoDataUri: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
    if (step === 1 && step1Valid) { setStep(2); scrollTop(); }
    else if (step === 2 && step2Valid) { setStep(3); scrollTop(); }
  };

  const handleBack = () => {
    setStep((s) => (s - 1) as 1 | 2 | 3);
    scrollTop();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    const allSkills = volSkills.includes("Other")
      ? [...volSkills.filter((s) => s !== "Other"), volCustomSkill.trim()]
      : volSkills;

    const allCauses = causeAreas.includes("Others") && causeOtherText.trim()
      ? [...causeAreas.filter((c) => c !== "Others"), causeOtherText.trim()]
      : causeAreas;

    const data =
      role === "Organization"
        ? {
            role: "org_admin",
            email: orgForm.email, password: orgForm.password,
            orgName: orgForm.orgName, phone: orgForm.phone,
            website: orgForm.website, description: orgForm.description,
            category: orgForm.category, officialEmail: orgForm.officialEmail,
            orgType: orgForm.orgType, foundedYear: orgForm.foundedYear,
            location: orgForm.location, socialLinks: orgForm.socialLinks,
            logoUrl: orgForm.logoDataUri, documentsUrl: orgForm.documentsUrl,
            submitterName: orgForm.submitterName, submitterRole: orgForm.submitterRole,
          }
        : {
            role: "volunteer",
            email: volForm.email, password: volForm.password,
            name: volForm.fullName, phone: volForm.phone,
            city: volForm.city, skills: allSkills,
            dateOfBirth: volForm.dateOfBirth, governorate: volForm.governorate,
            nationalId: volForm.nationalId, aboutMe: volForm.about,
            gender: volForm.gender,
            department: volForm.department === "Other" ? departmentOther.trim() : volForm.department,
            healthNotes: volForm.healthNotes,
            availability, hoursPerWeek: volForm.hoursPerWeek,
            languages, educationLevel: volForm.educationLevel,
            priorExperience: volForm.priorExperience, priorOrg: volForm.priorOrg,
            causeAreas: allCauses,
            ...(volPicData ? { profilePicture: volPicData } : {}),
          };

    const result = await register(data);
    setIsSubmitting(false);

    if (!result.ok) {
      setSubmitError("Registration failed. Please check your details and try again.");
      return;
    }
    navigate(role === "Organization" ? "/org/pending" : "/dashboard/profile");
  };

  // ── Sub-components scoped to this render ──

  const Err = ({ field }: { field: string }) => {
    const msg = errors[field as keyof typeof errors];
    if (!msg || !touched[field]) return null;
    return (
      <div style={{ display: "flex", gap: 4, marginTop: 5, alignItems: "flex-start" }}>
        <span style={{ color: RED, fontSize: 13, lineHeight: 1, marginTop: 1 }}>⚠</span>
        <span style={{ fontSize: 12, color: RED, lineHeight: 1.45 }}>{msg}</span>
      </div>
    );
  };

  const orgInputStyle = (f: string): React.CSSProperties => ({
    width: "100%", height: 42, border: focused === f ? `1.5px solid ${BLUE}` : "1.5px solid #E2E8F0",
    borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none",
    boxSizing: "border-box", backgroundColor: "#FFFFFF",
  });

  const currentStepValid = step === 1 ? step1Valid : step === 2 ? step2Valid : step3Valid;
  const skillsAtLimit = volSkills.length >= MAX_SKILLS;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <nav style={{ backgroundColor: "#0F172A", height: 64, display: "flex", alignItems: "center", padding: "0 32px" }}>
        <a onClick={() => navigate("/")} style={{ cursor: "pointer", textDecoration: "none" }}>
          <Logo size={24} color="#FFFFFF" />
        </a>
      </nav>

      <div className="flex-1 flex items-start justify-center py-10 px-4">
        <div style={{ width: role === "Organization" ? 640 : 560, backgroundColor: "#FFFFFF", borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.08)", padding: 40 }}>
          <h2 className="text-center" style={{ fontSize: 20, fontWeight: 700, color: "#1E293B", margin: "0 0 24px 0" }}>Create your account</h2>

          {/* Role toggle */}
          <div className="flex gap-2" style={{ marginBottom: 28, backgroundColor: "#F1F5F9", borderRadius: 10, padding: 4 }}>
            {(["Volunteer", "Organization"] as Role[]).map((r) => (
              <button key={r} type="button" onClick={() => { setRole(r); setStep(1); scrollTop(); }}
                style={{ flex: 1, height: 36, borderRadius: 8, border: "none", backgroundColor: role === r ? GREEN : "transparent", color: role === r ? "#fff" : "#64748B", fontSize: 13, fontWeight: role === r ? 600 : 500, cursor: "pointer", transition: "all 150ms" }}>
                {r}
              </button>
            ))}
          </div>

          <div style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "10px 14px", marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: "#15803D", margin: 0, lineHeight: 1.5 }}>
              {role === "Volunteer"
                ? "Sign up and apply to available organizations. You can join multiple organizations and manage all activities from one profile."
                : "Register your organization for platform review. Our admins will verify your details and approve access within 1–2 business days."}
            </p>
          </div>

          {submitError && (
            <div style={{ backgroundColor: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#B91C1C", fontSize: 13 }}>
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

            {/* ══ VOLUNTEER FORM ══════════════════════════════════════════ */}
            {role === "Volunteer" && (
              <>
                {/* Step indicator */}
                <StepIndicator step={step} step1Valid={step1Valid} step2Valid={step2Valid} />

                {/* ── STEP 1: ACCOUNT ───────────────────────────────── */}
                {step === 1 && (
                  <>
                    <SectionHeader>Account</SectionHeader>

                    {/* Profile picture */}
                    <div className="flex flex-col items-center gap-2" style={{ marginBottom: 4 }}>
                      <div
                        onClick={() => volPicRef.current?.click()}
                        style={{ width: 88, height: 88, borderRadius: "50%", border: `2px dashed ${volPicPreview ? GREEN : "#CBD5E1"}`, overflow: "hidden", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC" }}
                        title="Upload profile picture"
                        role="button"
                        aria-label="Upload profile picture"
                      >
                        {volPicPreview
                          ? <img src={volPicPreview} alt="Profile preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <div style={{ textAlign: "center", color: "#94A3B8" }}><div style={{ fontSize: 24 }}>📷</div><div style={{ fontSize: 10, marginTop: 2 }}>Photo</div></div>
                        }
                      </div>
                      <div className="flex gap-2">
                        <label htmlFor="vol-pic-input" style={{ fontSize: 12, color: GREEN, cursor: "pointer", fontWeight: 500 }}>
                          {volPicPreview ? "Change photo" : "Upload photo (optional)"}
                        </label>
                        <input id="vol-pic-input" ref={volPicRef} type="file" accept="image/jpeg,image/jpg,image/png" onChange={handleVolPicUpload} style={{ display: "none" }} />
                        {volPicPreview && (
                          <button type="button" onClick={() => { setVolPicPreview(""); setVolPicData(""); }}
                            style={{ fontSize: 12, color: RED, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                            Remove
                          </button>
                        )}
                      </div>
                      {volPicError && <div style={{ fontSize: 12, color: RED }}>{volPicError}</div>}
                    </div>

                    {/* Full Name */}
                    <div>
                      <label htmlFor="fullName" style={labelStyle}>Full Name <span style={{ color: RED }}>*</span></label>
                      <input id="fullName"
                        value={volForm.fullName}
                        onChange={(e) => setVolForm((f) => ({ ...f, fullName: e.target.value }))}
                        onFocus={() => onFocus("fullName")}
                        onBlur={() => onBlur("fullName")}
                        style={fieldStyle("fullName")}
                        placeholder="e.g. Ahmed Mohamed Ibrahim"
                        autoComplete="name"
                      />
                      <Err field="fullName" />
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="email" style={labelStyle}>Email Address <span style={{ color: RED }}>*</span></label>
                      <input id="email" type="email"
                        value={volForm.email}
                        onChange={(e) => setVolForm((f) => ({ ...f, email: e.target.value }))}
                        onFocus={() => onFocus("email")}
                        onBlur={() => onBlur("email")}
                        style={fieldStyle("email")}
                        placeholder="e.g. ahmed@example.com"
                        autoComplete="email"
                      />
                      <Err field="email" />
                    </div>

                    {/* Password */}
                    <div>
                      <label htmlFor="password" style={labelStyle}>Password <span style={{ color: RED }}>*</span></label>
                      <div style={{ position: "relative" }}>
                        <input id="password"
                          type={showPassword ? "text" : "password"}
                          value={volForm.password}
                          onChange={(e) => setVolForm((f) => ({ ...f, password: e.target.value }))}
                          onFocus={() => onFocus("password")}
                          onBlur={() => onBlur("password")}
                          style={{ ...fieldStyle("password"), paddingRight: 44 }}
                          autoComplete="new-password"
                          placeholder="Min. 8 characters"
                          maxLength={64}
                        />
                        <button type="button" onClick={() => setShowPassword((s) => !s)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8", display: "flex", alignItems: "center", padding: 0 }}>
                          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </div>
                      <Err field="password" />
                      {volForm.password.length > 0 && (
                        <div style={{ marginTop: 7, display: "flex", flexWrap: "wrap", gap: "4px 6px" }}>
                          {[
                            { label: "8+ chars",      ok: volForm.password.length >= 8 },
                            { label: "Uppercase",     ok: /[A-Z]/.test(volForm.password) },
                            { label: "Lowercase",     ok: /[a-z]/.test(volForm.password) },
                            { label: "Number",        ok: /[0-9]/.test(volForm.password) },
                            { label: "Special (@#!)", ok: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(volForm.password) },
                          ].map(({ label, ok }) => (
                            <span key={label} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, backgroundColor: ok ? "#DCFCE7" : "#F1F5F9", color: ok ? GREEN : "#94A3B8", fontWeight: ok ? 500 : 400 }}>
                              {ok ? "✓" : "○"} {label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label htmlFor="confirmPassword" style={labelStyle}>Confirm Password <span style={{ color: RED }}>*</span></label>
                      <div style={{ position: "relative" }}>
                        <input id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={volForm.confirmPassword}
                          onChange={(e) => setVolForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                          onFocus={() => onFocus("confirmPassword")}
                          onBlur={() => onBlur("confirmPassword")}
                          style={{ ...fieldStyle("confirmPassword"), paddingRight: 44 }}
                          autoComplete="new-password"
                          placeholder="Re-enter your password"
                          maxLength={64}
                        />
                        <button type="button" onClick={() => setShowConfirmPassword((s) => !s)}
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                          style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8", display: "flex", alignItems: "center", padding: 0 }}>
                          {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </div>
                      <Err field="confirmPassword" />
                    </div>
                  </>
                )}

                {/* ── STEP 2: PROFILE ───────────────────────────────── */}
                {step === 2 && (
                  <>
                    <SectionHeader>Profile</SectionHeader>

                    {/* National ID */}
                    <div>
                      <label htmlFor="nationalId" style={labelStyle}>National ID <span style={{ color: RED }}>*</span></label>
                      <input id="nationalId"
                        value={volForm.nationalId}
                        onChange={(e) => setVolForm((f) => ({ ...f, nationalId: e.target.value.replace(/\D/g, "").slice(0, 14) }))}
                        onFocus={() => onFocus("nationalId")}
                        onBlur={() => onBlur("nationalId")}
                        style={fieldStyle("nationalId")}
                        placeholder="14-digit national ID number"
                        inputMode="numeric"
                        maxLength={14}
                      />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
                        <Err field="nationalId" />
                        <span style={{ fontSize: 11, color: "#94A3B8", marginLeft: "auto" }}>{volForm.nationalId.length}/14</span>
                      </div>
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label htmlFor="dateOfBirth" style={labelStyle}>Date of Birth <span style={{ color: RED }}>*</span></label>
                      <DatePicker
                        value={volForm.dateOfBirth}
                        onChange={(v) => { setVolForm((f) => ({ ...f, dateOfBirth: v })); touch("dateOfBirth"); }}
                        required
                        focusedKey="dateOfBirth"
                        currentFocused={focused}
                        onFocus={() => onFocus("dateOfBirth")}
                        onBlur={() => onBlur("dateOfBirth")}
                        inputStyleBase={fieldStyle("dateOfBirth")}
                      />
                      <Err field="dateOfBirth" />
                    </div>

                    {/* Governorate */}
                    <div>
                      <label htmlFor="governorate" style={labelStyle}>Governorate <span style={{ color: RED }}>*</span></label>
                      <select id="governorate"
                        value={volForm.governorate}
                        onChange={(e) => { setVolForm((f) => ({ ...f, governorate: e.target.value })); touch("governorate"); }}
                        onFocus={() => onFocus("governorate")}
                        onBlur={() => onBlur("governorate")}
                        style={fieldStyle("governorate")}
                      >
                        <option value="">Select governorate…</option>
                        {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                      <Err field="governorate" />
                    </div>

                    {/* Phone */}
                    <div>
                      <label htmlFor="phone" style={labelStyle}>Phone Number <span style={{ color: RED }}>*</span></label>
                      <input id="phone"
                        value={volForm.phone}
                        onChange={(e) => setVolForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 11) }))}
                        onFocus={() => onFocus("phone")}
                        onBlur={() => onBlur("phone")}
                        style={fieldStyle("phone")}
                        placeholder="e.g. 01012345678"
                        inputMode="numeric"
                        maxLength={11}
                      />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
                        <Err field="phone" />
                        <span style={{ fontSize: 11, color: "#94A3B8", marginLeft: "auto" }}>{volForm.phone.length}/11</span>
                      </div>
                    </div>

                    {/* City */}
                    <div>
                      <label htmlFor="city" style={labelStyle}>City / District <span style={{ color: RED }}>*</span></label>
                      <input id="city"
                        value={volForm.city}
                        onChange={(e) => setVolForm((f) => ({ ...f, city: e.target.value }))}
                        onFocus={() => onFocus("city")}
                        onBlur={() => onBlur("city")}
                        style={fieldStyle("city")}
                        placeholder="e.g. Nasr City, Zamalek, Mohandessin"
                      />
                      <Err field="city" />
                    </div>

                    {/* Gender */}
                    <div>
                      <label style={labelStyle}>Gender <span style={{ color: RED }}>*</span></label>
                      <div style={{ display: "flex", gap: 10 }} role="group" aria-label="Gender">
                        {["Male", "Female"].map((g) => (
                          <button key={g} type="button"
                            onClick={() => { setVolForm((f) => ({ ...f, gender: g })); touch("gender"); }}
                            aria-pressed={volForm.gender === g}
                            style={{
                              flex: 1, height: 42, borderRadius: 8,
                              border: `1.5px solid ${volForm.gender === g ? GREEN : "#E2E8F0"}`,
                              backgroundColor: volForm.gender === g ? "#F0FDF4" : "#FAFAFA",
                              color: volForm.gender === g ? GREEN : "#64748B",
                              fontWeight: volForm.gender === g ? 600 : 400,
                              fontSize: 14, cursor: "pointer", transition: "all 150ms",
                            }}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                      <Err field="gender" />
                    </div>

                    {/* Department (optional) */}
                    <div>
                      <label htmlFor="department" style={labelStyle}>
                        Department{" "}
                        <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: 12 }}>(optional)</span>
                      </label>
                      <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 6px 0" }}>
                        Pick the area you'd most like to contribute to — you can change it later.
                      </p>
                      <select id="department"
                        value={volForm.department}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVolForm((f) => ({ ...f, department: val }));
                          if (val !== "Other") {
                            setDepartmentOther("");
                            setTouched((t) => ({ ...t, departmentOther: false }));
                          } else {
                            setTimeout(() => departmentOtherRef.current?.focus(), 0);
                          }
                        }}
                        onFocus={() => onFocus("department")}
                        onBlur={() => setFocused(null)}
                        style={fieldStyle("department")}
                      >
                        <option value="">Select a department…</option>
                        {DEPARTMENT_GROUPS.map((group) => (
                          <optgroup key={group.label} label={group.label}>
                            {group.options.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      {volForm.department === "Other" && (
                        <div style={{ marginTop: 10 }}>
                          <label htmlFor="departmentOther" style={{ ...labelStyle, fontSize: 12 }}>
                            Specify your department <span style={{ color: RED }}>*</span>
                          </label>
                          <input
                            id="departmentOther"
                            ref={departmentOtherRef}
                            value={departmentOther}
                            onChange={(e) => setDepartmentOther(e.target.value.slice(0, DEPARTMENT_OTHER_MAX))}
                            onFocus={() => onFocus("departmentOther")}
                            onBlur={() => onBlur("departmentOther")}
                            placeholder="e.g. Research, Legal, IT…"
                            maxLength={DEPARTMENT_OTHER_MAX}
                            style={fieldStyle("departmentOther")}
                          />
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 3, gap: 8 }}>
                            <Err field="departmentOther" />
                            <span style={{ fontSize: 11, color: "#94A3B8", marginLeft: "auto", flexShrink: 0 }}>
                              {departmentOther.length}/{DEPARTMENT_OTHER_MAX}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Health / Mobility Notes */}
                    <div>
                      <label htmlFor="healthNotes" style={labelStyle}>
                        Health or Mobility Notes{" "}
                        <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: 12 }}>(optional)</span>
                      </label>
                      <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 6px 0" }}>Any physical limitations organizations should know about for field activities?</p>
                      <textarea id="healthNotes"
                        value={volForm.healthNotes}
                        onChange={(e) => setVolForm((f) => ({ ...f, healthNotes: e.target.value.slice(0, 300) }))}
                        onFocus={() => setFocused("healthNotes")}
                        onBlur={() => setFocused(null)}
                        placeholder="e.g. Uses wheelchair, limited standing time..."
                        style={{
                          width: "100%", height: 80, outline: "none", boxSizing: "border-box",
                          border: `1.5px solid ${focused === "healthNotes" ? BLUE : "#E2E8F0"}`,
                          borderRadius: 8, padding: "10px 12px", fontSize: 14, resize: "vertical",
                          fontFamily: "inherit", backgroundColor: "#FFFFFF",
                        }}
                      />
                      <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "right", marginTop: 2 }}>
                        {volForm.healthNotes.length}/300
                      </div>
                    </div>
                  </>
                )}

                {/* ── STEP 3: PREFERENCES & SKILLS ──────────────────── */}
                {step === 3 && (
                  <>
                    <SectionHeader>Preferences & Skills</SectionHeader>

                    {/* Skills */}
                    <div>
                      <label style={labelStyle}>Skills <span style={{ color: RED }}>*</span></label>
                      <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 10px 0" }}>Select 1–5 skills that apply:</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
                        {SKILLS_LIST.map((skill) => {
                          const checked = volSkills.includes(skill);
                          const disabled = !checked && skillsAtLimit;
                          return (
                            <label key={skill} style={checkboxCardStyle(checked, disabled)}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => !disabled && toggleSkill(skill)}
                                disabled={disabled}
                                style={{ accentColor: GREEN, width: 14, height: 14, flexShrink: 0 }}
                              />
                              {skill}
                            </label>
                          );
                        })}
                      </div>
                      {volSkills.includes("Other") && (
                        <div style={{ marginTop: 10 }}>
                          <label htmlFor="customSkill" style={{ ...labelStyle, fontSize: 12 }}>Describe your other skill <span style={{ color: RED }}>*</span></label>
                          <input id="customSkill"
                            value={volCustomSkill}
                            onChange={(e) => { setVolCustomSkill(e.target.value); touch("skills"); }}
                            onFocus={() => setFocused("skills_custom")}
                            onBlur={() => { setFocused(null); touch("skills"); }}
                            placeholder="e.g. Sign Language, Pottery, Carpentry…"
                            style={{
                              width: "100%", height: 40, outline: "none", boxSizing: "border-box",
                              border: `1.5px solid ${focused === "skills_custom" ? BLUE : "#E2E8F0"}`,
                              borderRadius: 8, padding: "0 12px", fontSize: 13, backgroundColor: "#FFFFFF",
                            }}
                          />
                        </div>
                      )}
                      <Err field="skills" />
                    </div>

                    {/* About You */}
                    <div>
                      <label htmlFor="about" style={labelStyle}>
                        About You{" "}
                        <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: 12 }}>(optional)</span>
                      </label>
                      <textarea id="about"
                        value={volForm.about}
                        onChange={(e) => setVolForm((f) => ({ ...f, about: e.target.value.slice(0, 500) }))}
                        onFocus={() => setFocused("about")}
                        onBlur={() => setFocused(null)}
                        placeholder="Tell organizations about your motivation, experience, and goals…"
                        style={{
                          width: "100%", height: 90, outline: "none", boxSizing: "border-box",
                          border: `1.5px solid ${focused === "about" ? BLUE : "#E2E8F0"}`,
                          borderRadius: 8, padding: "10px 12px", fontSize: 14, resize: "vertical",
                          fontFamily: "inherit", backgroundColor: "#FFFFFF",
                        }}
                      />
                      <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "right", marginTop: 2 }}>
                        {volForm.about.length}/500
                      </div>
                    </div>

                    {/* Availability */}
                    <div>
                      <label style={labelStyle}>Availability <span style={{ color: RED }}>*</span></label>
                      <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 10px 0" }}>When can you volunteer?</p>

                      {/* Specific time slots — muted when Flexible is active */}
                      <div
                        style={{
                          display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px",
                          opacity: availability.includes("Flexible") ? 0.5 : 1,
                          transition: "opacity 200ms ease",
                        }}
                      >
                        {AVAILABILITY_SPECIFIC.map((opt) => (
                          <label key={opt} style={checkboxCardStyle(availability.includes(opt))}>
                            <input
                              type="checkbox"
                              checked={availability.includes(opt)}
                              onChange={() => toggleAvailability(opt)}
                              style={{ accentColor: GREEN, width: 14, height: 14, flexShrink: 0 }}
                            />
                            {opt}
                          </label>
                        ))}
                      </div>

                      {/* OR divider */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 10px 0" }}>
                        <div style={{ flex: 1, height: 1, backgroundColor: "#E2E8F0" }} />
                        <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, letterSpacing: "0.08em" }}>OR</span>
                        <div style={{ flex: 1, height: 1, backgroundColor: "#E2E8F0" }} />
                      </div>

                      {/* Flexible — meta option, full width */}
                      <label
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 10,
                          cursor: "pointer", padding: "12px 14px", borderRadius: 8,
                          border: `1.5px solid ${availability.includes("Flexible") ? GREEN : "#E2E8F0"}`,
                          backgroundColor: availability.includes("Flexible") ? "#F0FDF4" : "#FAFAFA",
                          transition: "all 150ms", userSelect: "none",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={availability.includes("Flexible")}
                          onChange={() => toggleAvailability("Flexible")}
                          style={{ accentColor: GREEN, width: 16, height: 16, flexShrink: 0, marginTop: 2 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: 14, fontWeight: 600,
                            color: availability.includes("Flexible") ? GREEN : "#1E293B",
                          }}>
                            Flexible
                          </div>
                          <div style={{ fontSize: 12, color: "#64748B", marginTop: 2, lineHeight: 1.45 }}>
                            I'm open to any time slot — this overrides the options above.
                          </div>
                        </div>
                      </label>

                      <Err field="availability" />
                    </div>

                    {/* Hours per week — number input */}
                    <div>
                      <label htmlFor="hoursPerWeek" style={labelStyle}>
                        Estimated hours per week{" "}
                        <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: 12 }}>(optional)</span>
                      </label>
                      <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 8px 0" }}>Helps us assign suitable tasks. </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input id="hoursPerWeek"
                          type="number"
                          min={1} max={40} step={1}
                          value={volForm.hoursPerWeek}
                          onChange={(e) => {
                            const v = Math.min(40, Math.max(1, parseInt(e.target.value) || 1));
                            setVolForm((f) => ({ ...f, hoursPerWeek: v }));
                          }}
                          style={{
                            width: 120, height: 42, outline: "none", boxSizing: "border-box",
                            border: `1.5px solid ${focused === "hoursPerWeek" ? BLUE : "#E2E8F0"}`,
                            borderRadius: 8, padding: "0 12px", fontSize: 14,
                            backgroundColor: "#FFFFFF", transition: "border-color 150ms",
                          }}
                          onFocus={() => setFocused("hoursPerWeek")}
                          onBlur={() => setFocused(null)}
                        />
                        <span style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>hrs / week</span>
                      </div>
                    </div>

                    {/* Languages */}
                    <div>
                      <label style={labelStyle}>Languages Spoken <span style={{ color: RED }}>*</span></label>
                      <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 10px 0" }}>Add languages you can communicate in. </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {languages.map((lang, idx) => {
                          const isDuplicate = languages.some(
                            (l, i) => i !== idx && l.language.trim().toLowerCase() === lang.language.trim().toLowerCase() && lang.language.trim() !== ""
                          );
                          return (
                            <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <input
                                value={lang.language}
                                onChange={(e) => updateLanguage(idx, "language", e.target.value)}
                                onFocus={() => setFocused(`lang_${idx}`)}
                                onBlur={() => { setFocused(null); touch("languages"); }}
                                placeholder="e.g. Arabic, English, French…"
                                aria-label={`Language ${idx + 1}`}
                                style={{
                                  flex: 1, height: 40, outline: "none", boxSizing: "border-box",
                                  border: `1.5px solid ${isDuplicate ? RED : focused === `lang_${idx}` ? BLUE : "#E2E8F0"}`,
                                  borderRadius: 8, padding: "0 12px", fontSize: 14,
                                  backgroundColor: "#FFFFFF", transition: "border-color 150ms",
                                }}
                              />
                              <select
                                value={lang.proficiency}
                                onChange={(e) => updateLanguage(idx, "proficiency", e.target.value)}
                                aria-label={`Proficiency for language ${idx + 1}`}
                                style={{
                                  height: 40, border: "1.5px solid #E2E8F0", borderRadius: 8,
                                  padding: "0 8px", fontSize: 13, outline: "none",
                                  backgroundColor: "#FFFFFF", color: "#1E293B", flexShrink: 0,
                                }}
                              >
                                {PROFICIENCY_LEVELS.map((p) => <option key={p} value={p}>{p}</option>)}
                              </select>
                              {languages.length > 1 && (
                                <button type="button" onClick={() => removeLanguage(idx)}
                                  aria-label={`Remove language ${idx + 1}`}
                                  style={{
                                    width: 34, height: 34, borderRadius: 8, border: "1.5px solid #E2E8F0",
                                    background: "#fff", color: "#94A3B8", cursor: "pointer", fontSize: 17,
                                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                    transition: "border-color 150ms, color 150ms",
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = RED; e.currentTarget.style.color = RED; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.color = "#94A3B8"; }}>
                                  ×
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <Err field="languages" />
                      <button type="button" onClick={addLanguage}
                        style={{
                          marginTop: 10, height: 38, padding: "0 16px", borderRadius: 8,
                          border: `1.5px solid ${GREEN}`, backgroundColor: "#F0FDF4",
                          color: GREEN, fontSize: 13, fontWeight: 600, cursor: "pointer",
                        }}>
                        + Add Language
                      </button>
                    </div>

                    {/* Education Level */}
                    <div>
                      <label htmlFor="educationLevel" style={labelStyle}>Education Level <span style={{ color: RED }}>*</span></label>
                      <select id="educationLevel"
                        value={volForm.educationLevel}
                        onChange={(e) => { setVolForm((f) => ({ ...f, educationLevel: e.target.value })); touch("educationLevel"); }}
                        onFocus={() => onFocus("educationLevel")}
                        onBlur={() => onBlur("educationLevel")}
                        style={fieldStyle("educationLevel")}
                      >
                        <option value="">Select your highest qualification…</option>
                        {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <Err field="educationLevel" />
                    </div>

                    {/* Prior Volunteer Experience */}
                    <div>
                      <label style={labelStyle}>Prior Volunteer Experience</label>
                      <div style={{ display: "flex", gap: 10 }} role="group" aria-label="Prior volunteer experience">
                        {([false, true] as const).map((val) => (
                          <button key={String(val)} type="button"
                            onClick={() => setVolForm((f) => ({ ...f, priorExperience: val }))}
                            aria-pressed={volForm.priorExperience === val}
                            style={{
                              flex: 1, height: 42, borderRadius: 8,
                              border: `1.5px solid ${volForm.priorExperience === val ? GREEN : "#E2E8F0"}`,
                              backgroundColor: volForm.priorExperience === val ? "#F0FDF4" : "#FAFAFA",
                              color: volForm.priorExperience === val ? GREEN : "#64748B",
                              fontWeight: volForm.priorExperience === val ? 600 : 400,
                              fontSize: 14, cursor: "pointer", transition: "all 150ms",
                            }}>
                            {val ? "Yes" : "No"}
                          </button>
                        ))}
                      </div>
                      {volForm.priorExperience && (
                        <div style={{ marginTop: 10 }}>
                          <label htmlFor="priorOrg" style={{ ...labelStyle, fontSize: 12 }}>Organization name(s)</label>
                          <input id="priorOrg"
                            value={volForm.priorOrg}
                            onChange={(e) => setVolForm((f) => ({ ...f, priorOrg: e.target.value.slice(0, 200) }))}
                            onFocus={() => setFocused("priorOrg")}
                            onBlur={() => setFocused(null)}
                            placeholder="e.g. Resala, Egyptian Red Crescent…"
                            style={{
                              width: "100%", height: 42, outline: "none", boxSizing: "border-box",
                              border: `1.5px solid ${focused === "priorOrg" ? BLUE : "#E2E8F0"}`,
                              borderRadius: 8, padding: "0 12px", fontSize: 14, backgroundColor: "#FFFFFF",
                            }}
                          />
                          <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "right", marginTop: 2 }}>
                            {volForm.priorOrg.length}/200
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Cause Areas */}
                    <div>
                      <label style={labelStyle}>
                        Cause Areas / Interests{" "}
                        <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: 12 }}>(optional)</span>
                      </label>
                      <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 10px 0" }}>What causes are you most passionate about?</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px 10px" }}>
                        {CAUSE_AREAS.map((c) => (
                          <label key={c} style={checkboxCardStyle(causeAreas.includes(c))}>
                            <input
                              type="checkbox"
                              checked={causeAreas.includes(c)}
                              onChange={() => toggleCause(c)}
                              style={{ accentColor: GREEN, width: 14, height: 14, flexShrink: 0 }}
                            />
                            <span style={{ fontSize: 12 }}>{c}</span>
                          </label>
                        ))}
                      </div>
                      {causeAreas.includes("Others") && (
                        <div style={{ marginTop: 10 }}>
                          <label htmlFor="causeOther" style={{ ...labelStyle, fontSize: 12 }}>Describe your interest</label>
                          <input id="causeOther"
                            value={causeOtherText}
                            onChange={(e) => setCauseOtherText(e.target.value)}
                            onFocus={() => setFocused("causeOther")}
                            onBlur={() => setFocused(null)}
                            placeholder="e.g. Street children, Arts education…"
                            style={{
                              width: "100%", height: 40, outline: "none", boxSizing: "border-box",
                              border: `1.5px solid ${focused === "causeOther" ? BLUE : "#E2E8F0"}`,
                              borderRadius: 8, padding: "0 12px", fontSize: 13, backgroundColor: "#FFFFFF",
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Terms & Privacy consent */}
                    <div style={{ backgroundColor: "#F8FAFC", borderRadius: 8, padding: "14px 16px", border: `1.5px solid ${termsAccepted ? GREEN : "#E2E8F0"}` }}>
                      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          style={{ accentColor: GREEN, width: 16, height: 16, marginTop: 2, flexShrink: 0 }}
                        />
                        <span style={{ fontSize: 13, color: "#1E293B", lineHeight: 1.6 }}>
                          I agree to the{" "}
                          <button type="button" onClick={() => setLegalModal("terms")}
                            style={{ color: BLUE, fontWeight: 500, background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 13, textDecoration: "underline" }}>
                            Terms of Service
                          </button>
                          {" "}and the{" "}
                          <button type="button" onClick={() => setLegalModal("privacy")}
                            style={{ color: BLUE, fontWeight: 500, background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 13, textDecoration: "underline" }}>
                            Privacy Policy
                          </button>
                          . <span style={{ color: RED }}>*</span>
                        </span>
                      </label>
                    </div>
                  </>
                )}

                {/* ── Navigation ────────────────────────────────────── */}
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  {step > 1 && (
                    <button type="button" onClick={handleBack}
                      style={{ height: 44, padding: "0 20px", borderRadius: 8, border: "1.5px solid #E2E8F0", backgroundColor: "#fff", color: "#64748B", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                      ← Back
                    </button>
                  )}
                  {step < 3 && (
                    <button type="button" onClick={handleNext}
                      disabled={!currentStepValid}
                      style={{
                        flex: 1, height: 44, borderRadius: 8, border: "none",
                        backgroundColor: currentStepValid ? GREEN : "#CBD5E1",
                        color: "#fff", fontSize: 15, fontWeight: 600,
                        cursor: currentStepValid ? "pointer" : "not-allowed",
                        transition: "background-color 200ms",
                      }}
                      onMouseEnter={(e) => { if (currentStepValid) e.currentTarget.style.backgroundColor = GREEN_HOVER; }}
                      onMouseLeave={(e) => { if (currentStepValid) e.currentTarget.style.backgroundColor = GREEN; }}
                    >
                      Next →
                    </button>
                  )}
                  {step === 3 && (
                    <button type="submit"
                      disabled={!step3Valid || isSubmitting}
                      style={{
                        flex: 1, height: 44, borderRadius: 8, border: "none",
                        backgroundColor: step3Valid ? GREEN : "#CBD5E1",
                        color: "#fff", fontSize: 15, fontWeight: 600,
                        cursor: (step3Valid && !isSubmitting) ? "pointer" : "not-allowed",
                        transition: "background-color 200ms",
                      }}
                      onMouseEnter={(e) => { if (step3Valid) e.currentTarget.style.backgroundColor = GREEN_HOVER; }}
                      onMouseLeave={(e) => { if (step3Valid) e.currentTarget.style.backgroundColor = GREEN; }}
                    >
                      {isSubmitting ? "Creating Account…" : "Create Account"}
                    </button>
                  )}
                </div>
              </>
            )}

            {/* ══ ORGANIZATION FORM ════════════════════════════════════════ */}
            {role === "Organization" && (
              <>
                <SectionHeader>Organization Details</SectionHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>Organization Name *</label>
                    <input required value={orgForm.orgName} onChange={(e) => setOrgForm((f) => ({ ...f, orgName: e.target.value }))} onFocus={() => setFocused("on")} onBlur={() => setFocused(null)} style={orgInputStyle("on")} />
                  </div>
                  <div>
                    <label style={labelStyle}>Organization Type *</label>
                    <select required value={orgForm.orgType} onChange={(e) => setOrgForm((f) => ({ ...f, orgType: e.target.value }))} onFocus={() => setFocused("otype")} onBlur={() => setFocused(null)} style={orgInputStyle("otype")}>
                      <option value="">Select type…</option>
                      <option value="NGO">NGO / Non-profit</option>
                      <option value="Company">Company / Corporate</option>
                      <option value="Student Activity">Student Activity</option>
                      <option value="Government">Government</option>
                      <option value="Religious">Religious Organization</option>
                      <option value="Foundation">Foundation</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>Category *</label>
                    <select required value={orgForm.category} onChange={(e) => setOrgForm((f) => ({ ...f, category: e.target.value }))} onFocus={() => setFocused("oc")} onBlur={() => setFocused(null)} style={orgInputStyle("oc")}>
                      <option value="">Select category…</option>
                      <option value="Social Welfare">Social Welfare</option>
                      <option value="Environment">Environment</option>
                      <option value="Education">Education</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Student Activity">Student Activity</option>
                      <option value="Media & Communications">Media & Communications</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Founded Year *</label>
                    <input required type="number" min="1900" max="2100" value={orgForm.foundedYear} onChange={(e) => setOrgForm((f) => ({ ...f, foundedYear: e.target.value }))} onFocus={() => setFocused("oyear")} onBlur={() => setFocused(null)} style={orgInputStyle("oyear")} placeholder="e.g. 2015" />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Description *</label>
                  <textarea required value={orgForm.description} onChange={(e) => setOrgForm((f) => ({ ...f, description: e.target.value }))} onFocus={() => setFocused("od")} onBlur={() => setFocused(null)} placeholder="Tell us about your organization, its mission, and impact…" style={{ ...orgInputStyle("od"), height: 90, padding: "10px 12px", resize: "vertical" as const }} />
                </div>

                <div>
                  <label style={labelStyle}>Logo (optional)</label>
                  <div className="flex items-center gap-3">
                    {orgForm.logoDataUri
                      ? <img src={orgForm.logoDataUri} alt="Organization logo" style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover", border: "1px solid #E2E8F0" }} />
                      : <div style={{ width: 64, height: 64, borderRadius: 12, border: "1px dashed #CBD5E1", display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", fontSize: 20 }}>+</div>
                    }
                    <label style={{ cursor: "pointer", padding: "8px 14px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, color: "#64748B" }}>
                      {orgForm.logoDataUri ? "Change Logo" : "Upload Logo"}
                      <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
                    </label>
                  </div>
                </div>

                <SectionHeader>Contact & Location</SectionHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div><label style={labelStyle}>Login Email *</label><input required type="email" value={orgForm.email} onChange={(e) => setOrgForm((f) => ({ ...f, email: e.target.value }))} onFocus={() => setFocused("oe")} onBlur={() => setFocused(null)} style={orgInputStyle("oe")} /></div>
                  <div><label style={labelStyle}>Password *</label><input required type="password" value={orgForm.password} onChange={(e) => setOrgForm((f) => ({ ...f, password: e.target.value }))} onFocus={() => setFocused("op")} onBlur={() => setFocused(null)} style={orgInputStyle("op")} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label style={labelStyle}>Official Email</label><input type="email" value={orgForm.officialEmail} onChange={(e) => setOrgForm((f) => ({ ...f, officialEmail: e.target.value }))} onFocus={() => setFocused("oemail")} onBlur={() => setFocused(null)} style={orgInputStyle("oemail")} placeholder="contact@organization.org" /></div>
                  <div><label style={labelStyle}>Phone Number *</label><input required value={orgForm.phone} onChange={(e) => setOrgForm((f) => ({ ...f, phone: e.target.value }))} onFocus={() => setFocused("oph")} onBlur={() => setFocused(null)} style={orgInputStyle("oph")} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>Governorate *</label>
                    <select required value={orgForm.location} onChange={(e) => setOrgForm((f) => ({ ...f, location: e.target.value }))} onFocus={() => setFocused("oloc")} onBlur={() => setFocused(null)} style={orgInputStyle("oloc")}>
                      <option value="">Select governorate…</option>
                      {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Website</label><input value={orgForm.website} onChange={(e) => setOrgForm((f) => ({ ...f, website: e.target.value }))} onFocus={() => setFocused("ow")} onBlur={() => setFocused(null)} style={orgInputStyle("ow")} placeholder="https://…" /></div>
                </div>
                <div>
                  <label style={labelStyle}>Social Media Links</label>
                  <input value={orgForm.socialLinks} onChange={(e) => setOrgForm((f) => ({ ...f, socialLinks: e.target.value }))} onFocus={() => setFocused("osocial")} onBlur={() => setFocused(null)} style={orgInputStyle("osocial")} placeholder="Facebook, Instagram, LinkedIn URLs (comma-separated)" />
                </div>

                <SectionHeader>Verification</SectionHeader>
                <div>
                  <label style={labelStyle}>Supporting Documents URL (optional)</label>
                  <input value={orgForm.documentsUrl} onChange={(e) => setOrgForm((f) => ({ ...f, documentsUrl: e.target.value }))} onFocus={() => setFocused("odocs")} onBlur={() => setFocused(null)} style={orgInputStyle("odocs")} placeholder="Link to registration certificate, proof of activity, etc." />
                  <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>Upload to Google Drive or Dropbox and paste a shareable link.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label style={labelStyle}>Submitter Name *</label><input required value={orgForm.submitterName} onChange={(e) => setOrgForm((f) => ({ ...f, submitterName: e.target.value }))} onFocus={() => setFocused("osname")} onBlur={() => setFocused(null)} style={orgInputStyle("osname")} placeholder="Your full name" /></div>
                  <div><label style={labelStyle}>Your Role *</label><input required value={orgForm.submitterRole} onChange={(e) => setOrgForm((f) => ({ ...f, submitterRole: e.target.value }))} onFocus={() => setFocused("osrole")} onBlur={() => setFocused(null)} style={orgInputStyle("osrole")} placeholder="e.g. Founder, Director" /></div>
                </div>

                <button type="submit" disabled={isSubmitting}
                  style={{ width: "100%", height: 44, backgroundColor: GREEN, color: "#FFFFFF", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: isSubmitting ? "wait" : "pointer", marginTop: 8, opacity: isSubmitting ? 0.7 : 1, transition: "background-color 150ms" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = GREEN_HOVER)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = GREEN)}>
                  {isSubmitting ? "Submitting…" : "Submit for Review"}
                </button>
              </>
            )}

            <div className="text-center">
              <span style={{ fontSize: 14, color: "#64748B" }}>Already registered? </span>
              <a onClick={() => navigate("/login")} style={{ fontSize: 14, color: GREEN, fontWeight: 500, cursor: "pointer", textDecoration: "none" }}>Log in →</a>
            </div>
          </form>
        </div>
      </div>

      {/* Legal modals */}
      {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}
    </div>
  );
}

// ── Step indicator ────────────────────────────────────────────────────

function StepIndicator({ step, step1Valid, step2Valid }: { step: 1 | 2 | 3; step1Valid: boolean; step2Valid: boolean }) {
  const steps = [
    { n: 1 as const, label: "Account" },
    { n: 2 as const, label: "Profile" },
    { n: 3 as const, label: "Preferences & Skills" },
  ];

  const seg1Complete = step > 1 && step1Valid;
  const seg2Complete = step > 2 && step2Valid;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", position: "relative", alignItems: "flex-start" }}>
        {/* Connecting line — segment 1 (between steps 1 and 2) */}
        <div style={{ position: "absolute", top: 17, left: "16.667%", width: "33.333%", height: 2, backgroundColor: "#E5E7EB", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: seg1Complete ? "100%" : "0%", backgroundColor: "#16A34A", borderRadius: 2, transition: "width 0.4s ease" }} />
        </div>
        {/* Connecting line — segment 2 (between steps 2 and 3) */}
        <div style={{ position: "absolute", top: 17, left: "50%", width: "33.333%", height: 2, backgroundColor: "#E5E7EB", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: seg2Complete ? "100%" : "0%", backgroundColor: "#16A34A", borderRadius: 2, transition: "width 0.4s ease" }} />
        </div>

        {steps.map((s) => {
          const done = step > s.n;
          const active = step === s.n;

          return (
            <div key={s.n} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, position: "relative", zIndex: 1 }}>
              {/* Circle */}
              <div style={{
                width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                backgroundColor: done ? "#16A34A" : "#FFFFFF",
                color: done ? "#FFFFFF" : active ? "#16A34A" : "#9CA3AF",
                border: done
                  ? "2px solid #16A34A"
                  : active
                    ? "2px solid #16A34A"
                    : "1.5px solid #D1D5DB",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700,
                transition: "all 300ms ease",
                boxShadow: active ? "0 0 0 4px rgba(22,163,74,0.12)" : "none",
                boxSizing: "border-box",
              }}>
                {done ? <CheckIcon /> : s.n}
              </div>
              {/* Label */}
              <span style={{
                fontSize: 12, whiteSpace: "nowrap", textAlign: "center", fontWeight: 500,
                color: active ? "#16A34A" : done ? "#374151" : "#9CA3AF",
                transition: "color 300ms ease",
              }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Legal Modal ───────────────────────────────────────────────────────

function LegalModal({ type, onClose }: { type: "terms" | "privacy"; onClose: () => void }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={type === "terms" ? "Terms of Service" : "Privacy Policy"}
    >
      <div
        style={{ backgroundColor: "#FFFFFF", borderRadius: 14, padding: "32px 36px", maxWidth: 520, width: "100%", maxHeight: "80vh", overflowY: "auto", position: "relative", boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label="Close"
          style={{ position: "absolute", top: 16, right: 18, background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94A3B8", lineHeight: 1 }}>
          ×
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1E293B", margin: "0 0 20px 0" }}>
          {type === "terms" ? "Terms of Service" : "Privacy Policy"}
        </h2>
        {type === "terms" ? (
          <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.8 }}>
            <p style={{ marginBottom: 14 }}>By registering on Altruism, you agree to use the platform responsibly and in accordance with its purpose of facilitating community volunteerism.</p>
            <p style={{ marginBottom: 14 }}>You agree not to misrepresent your identity, qualifications, or availability. You commit to fulfilling volunteer obligations made through the platform to the best of your ability.</p>
            <p style={{ marginBottom: 14 }}>Altruism reserves the right to suspend or remove accounts that violate community guidelines, engage in fraudulent activity, or harm other users or organizations.</p>
            <p>These terms may be updated periodically. Continued use of the platform constitutes acceptance of the current terms.</p>
          </div>
        ) : (
          <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.8 }}>
            <p style={{ marginBottom: 14 }}>Altruism collects personal information you provide during registration — including your name, contact details, skills, and preferences — to match you with volunteering opportunities.</p>
            <p style={{ marginBottom: 14 }}>Your data is stored securely and is never sold to third parties. Organizations you apply to will be able to view relevant profile information to assess your suitability for their activities.</p>
            <p style={{ marginBottom: 14 }}>Sensitive fields such as your National ID are stored encrypted and are only accessible to authorized platform administrators for identity verification purposes.</p>
            <p>You may request the deletion of your account and all associated personal data at any time by contacting our support team.</p>
          </div>
        )}
        <button onClick={onClose}
          style={{ marginTop: 24, width: "100%", height: 42, backgroundColor: "#16A34A", color: "#FFFFFF", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          I understand
        </button>
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 8, borderBottom: "1px solid #F1F5F9", paddingBottom: 6 }}>
      {children}
    </div>
  );
}
