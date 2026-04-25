import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { DatePicker } from "../components/DatePicker";
import { Logo } from "../components/Logo";
import { EyeIcon, EyeOffIcon, CheckIcon } from "../components/icons/PasswordIcons";
import { StepIndicator } from "./register/StepIndicator";
import { LegalModal, SectionHeader } from "./register/LegalModal";
import {
  GOVERNORATES, NATIONALITIES, SKILLS_LIST, AVAILABILITY_SPECIFIC,
  PROFICIENCY_LEVELS, EDUCATION_LEVELS, STUDY_YEARS,
  DEPARTMENT_GROUPS, CAUSE_GROUPS,
  MAX_SKILLS, MAX_CAUSES,
  validateFullName, validateEmail, validatePassword,
  validateNationalIdOrPassport, validateDob, validatePhone, validateOrgPhone, validateCity,
  validateSubmitterName, validateSubmitterRole, validateOrgCity,
  validateEducationLevel, validateUniversityName, validateFaculty,
  validateStudyYear, validateFieldOfStudy, validateEducationOther,
  validateCauseAreas,
  buildErrorSummary, STEP3_FIELDS,
  MAX_EDUCATION_OTHER,
  type ExperienceEntry,
  type VolunteerEditableState,
  buildVolunteerRegisterPayload,
} from "../data/volunteerFormSchema";

const GREEN = "#16A34A";
const GREEN_HOVER = "#15803D";
const RED = "#DC2626";
const BLUE = "#2563EB";

type Role = "Volunteer" | "Organization";

const STEP1_FIELDS = ["fullName", "email", "password", "confirmPassword"];
const STEP2_FIELDS = ["nationalId", "dateOfBirth", "governorate", "phone", "city", "gender"];

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
    nationality: "Egyptian", nationalId: "", dateOfBirth: "", governorate: "",
    phone: "", city: "", gender: "", department: "", healthNotes: "",
    educationLevel: "", educationOther: "",
    universityName: "", faculty: "", studyYear: "", fieldOfStudy: "",
    hoursPerWeek: null as number | null,
  });
  const [volSkills, setVolSkills] = useState<string[]>([]);
  const [volCustomSkill, setVolCustomSkill] = useState("");
  const [availability, setAvailability] = useState<string[]>([]);
  const [rankedCauses, setRankedCauses] = useState<string[]>([]);
  const [languages, setLanguages] = useState<{ language: string; proficiency: string }[]>([]);
  const [priorHasExperience, setPriorHasExperience] = useState<boolean | null>(null);
  const [experiences, setExperiences] = useState<ExperienceEntry[]>([]);
  const [expTouched, setExpTouched] = useState<Record<string, boolean>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [step3SubmitAttempted, setStep3SubmitAttempted] = useState(false);
  const step3BannerRef = useRef<HTMLDivElement | null>(null);

  // ── Organization form ──
  const [orgForm, setOrgForm] = useState({
    orgName: "", email: "", password: "", confirmPassword: "", phone: "",
    officialEmail: "", orgType: "", foundedYear: "", orgSize: "",
    hqGovernorate: "", hqCity: "",
    website: "",
    description: "", logoDataUri: "",
    submitterName: "", submitterRole: "", additionalNotes: "",
  });
  const [orgCategories, setOrgCategories] = useState<string[]>([]);
  const [orgBranches, setOrgBranches] = useState<string[]>([]);
  const [orgDocumentFile, setOrgDocumentFile] = useState<File | null>(null);
  const [orgTouched, setOrgTouched] = useState<Record<string, boolean>>({});
  const [orgInfoAccurate, setOrgInfoAccurate] = useState(false);
  const [orgTermsAccepted, setOrgTermsAccepted] = useState(false);
  const [showOrgPassword, setShowOrgPassword] = useState(false);
  const [showOrgConfirmPassword, setShowOrgConfirmPassword] = useState(false);

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
    nationalId:      validateNationalIdOrPassport(volForm.nationalId, volForm.nationality),
    dateOfBirth:     validateDob(volForm.dateOfBirth),
    governorate:     volForm.governorate ? "" : "Please select a governorate.",
    phone:           validatePhone(volForm.phone),
    city:            validateCity(volForm.city),
    gender:          volForm.gender ? "" : "Please select your gender.",
    skills:          volSkills.includes("Other") && !volCustomSkill.trim()
      ? "Please describe your other skill."
      : volSkills.includes("Other") && volCustomSkill.trim().length < 2
        ? "Custom skill must be at least 2 characters."
        : "",
    availability:    "",
    educationLevel:  validateEducationLevel(volForm.educationLevel),
    universityName:  validateUniversityName(volForm.universityName, volForm.educationLevel),
    faculty:         validateFaculty(volForm.faculty, volForm.educationLevel),
    studyYear:       validateStudyYear(volForm.studyYear, volForm.educationLevel),
    fieldOfStudy:    validateFieldOfStudy(volForm.fieldOfStudy, volForm.educationLevel),
    educationOther:  validateEducationOther(volForm.educationOther, volForm.educationLevel),
    languages:       languages.length === 0 ? "" :
      languages.some((l) => !l.language.trim())
        ? "All language fields must be filled in."
        : languages.some((l) => l.language.trim().length > 0 && !/^[\u0600-\u06FFa-zA-Z\s\-]+$/.test(l.language.trim()))
          ? "Language names must contain letters only — no numbers or special characters."
          : new Set(languages.map((l) => l.language.trim().toLowerCase())).size !== languages.length
            ? "Duplicate languages are not allowed."
            : "",
    priorExperiences: priorHasExperience === true
      ? experiences.length === 0
        ? "Please add at least one experience or select 'No'."
        : experiences.some(
            (e) => !e.orgName.trim() || !e.department
          )
          ? "Please complete all required fields in each experience entry."
          : ""
      : "",
    causeAreas: validateCauseAreas(rankedCauses),
  }), [volForm, volSkills, volCustomSkill, availability, languages, priorHasExperience, experiences, rankedCauses]);

  const orgErrors = useMemo(() => ({
    orgName:        !orgForm.orgName.trim() ? "Organization name is required." : "",
    email:          validateEmail(orgForm.email),
    password:       validatePassword(orgForm.password),
    confirmPassword: !orgForm.confirmPassword
      ? "Please confirm your password."
      : orgForm.confirmPassword !== orgForm.password
        ? "Passwords do not match."
        : "",
    orgType:        !orgForm.orgType ? "Please select an organization type." : "",
    orgCategories:  orgCategories.length === 0 ? "Please select at least one category." : "",
    foundedYear:    !orgForm.foundedYear ? "Please select a founded year." : "",
    description:    !orgForm.description.trim()
      ? "Please describe your organization."
      : orgForm.description.trim().length < 20
        ? "Description must be at least 20 characters."
        : orgForm.description.length > 500
          ? "Description must be no more than 500 characters."
          : "",
    officialEmail:  orgForm.officialEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orgForm.officialEmail)
      ? "Please enter a valid email address."
      : "",
    phone:          validateOrgPhone(orgForm.phone),
    orgSize:        !orgForm.orgSize ? "Please select an organization size." : "",
    hqGovernorate:  !orgForm.hqGovernorate ? "Please select a governorate." : "",
    hqCity:         validateOrgCity(orgForm.hqCity),
    website:        !orgForm.website.trim() ? "Website is required." : !/^https?:\/\/.+/.test(orgForm.website.trim()) ? "Please enter a valid URL starting with http:// or https://." : "",
    documents:      !orgDocumentFile ? "Please upload a supporting document." : "",
    submitterName:  validateSubmitterName(orgForm.submitterName),
    submitterRole:  validateSubmitterRole(orgForm.submitterRole),
  }), [orgForm, orgCategories, orgDocumentFile]);

  const orgFormValid =
    !orgErrors.orgName && !orgErrors.email && !orgErrors.password && !orgErrors.confirmPassword &&
    !orgErrors.orgType && !orgErrors.orgCategories && !orgErrors.foundedYear && !orgErrors.description &&
    !orgErrors.officialEmail && !orgErrors.phone && !orgErrors.orgSize &&
    !orgErrors.hqGovernorate && !orgErrors.hqCity && !orgErrors.website && !orgErrors.documents &&
    !orgErrors.submitterName && !orgErrors.submitterRole &&
    orgInfoAccurate && orgTermsAccepted;

  const step1Valid = STEP1_FIELDS.every((f) => !errors[f as keyof typeof errors]);
  const step2Valid = STEP2_FIELDS.every((f) => !errors[f as keyof typeof errors])
    && !errors.educationLevel && !errors.universityName && !errors.faculty
    && !errors.studyYear && !errors.fieldOfStudy && !errors.educationOther;
  const step3Valid = !errors.skills && !errors.languages && !errors.priorExperiences
    && !errors.causeAreas && termsAccepted;

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

  const toggleCause = (cause: string) => {
    const idx = rankedCauses.indexOf(cause);
    if (idx !== -1) {
      setRankedCauses((prev) => prev.filter((_, i) => i !== idx));
    } else {
      if (rankedCauses.length >= MAX_CAUSES) return;
      setRankedCauses((prev) => [...prev, cause]);
    }
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

  const addExperience = () => {
    setExperiences((prev) => [...prev, { orgName: "", department: "", role: "", duration: "", description: "" }]);
    touch("priorExperiences");
  };

  const removeExperience = (idx: number) => {
    setExperiences((prev) => prev.filter((_, i) => i !== idx));
    setExpTouched((prev) => {
      const next = { ...prev };
      Object.keys(next).filter((k) => k.startsWith(`exp_${idx}_`)).forEach((k) => delete next[k]);
      return next;
    });
    touch("priorExperiences");
  };

  const updateExperience = (idx: number, field: keyof ExperienceEntry, value: string) => {
    setExperiences((prev) => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const touchExp = (idx: number, field: string) => {
    setExpTouched((prev) => ({ ...prev, [`exp_${idx}_${field}`]: true }));
    touch("priorExperiences");
  };

  const getExpError = (idx: number, field: string): string => {
    if (!expTouched[`exp_${idx}_${field}`]) return "";
    const e = experiences[idx];
    if (!e) return "";
    if (field === "orgName" && !e.orgName.trim()) return "Organization name is required.";
    if (field === "department" && !e.department) return "Please select a department.";
    return "";
  };

  const expBorder = (idx: number, field: string, hasError: boolean) => {
    const key = `exp_${idx}_${field}`;
    if (!expTouched[key]) return focused === `exp_${idx}_${field}` ? BLUE : "#E2E8F0";
    return hasError ? RED : GREEN;
  };

  const touchOrg = (field: string) => setOrgTouched((t) => ({ ...t, [field]: true }));
  const onOrgFocus = (field: string) => setFocused(field);
  const onOrgBlur  = (field: string) => { setFocused(null); touchOrg(field); };

  const orgBorderColor = (field: string) => {
    if (!orgTouched[field]) return focused === field ? BLUE : "#E2E8F0";
    return orgErrors[field as keyof typeof orgErrors] ? RED : GREEN;
  };

  const orgFieldStyle = (field: string, h = 42): React.CSSProperties => ({
    width: "100%", height: h, outline: "none", boxSizing: "border-box",
    border: `1.5px solid ${orgBorderColor(field)}`,
    borderRadius: 8, padding: h === 42 ? "0 12px" : "10px 12px",
    fontSize: 14, backgroundColor: "#FFFFFF", transition: "border-color 150ms",
    resize: h > 42 ? "vertical" as const : undefined,
    fontFamily: "inherit",
  });

  const ORG_CATEGORY_MAX = 5;

  const toggleOrgCategory = (cat: string) => {
    setOrgCategories((prev) => {
      if (prev.includes(cat)) return prev.filter((c) => c !== cat);
      if (prev.length >= ORG_CATEGORY_MAX) return prev;
      return [...prev, cat];
    });
    touchOrg("orgCategories");
  };

  const ORG_CATEGORY_GROUPS: { label: string; items: string[] }[] = [
    {
      label: "People & Society",
      items: ["Social Welfare", "Children & Family Services", "Youth Development",
        "Gender Equality & Women's Empowerment", "Disability Support", "Human Rights", "Legal Aid & Justice"],
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
      items: ["Education", "Arts & Culture", "Media & Communications", "Research & Innovation"],
    },
    {
      label: "Economy & Community",
      items: ["Economic Empowerment / Livelihoods", "Community Development", "Emergency & Disaster Relief"],
    },
  ];

  const toggleOrgBranch = (gov: string) => {
    setOrgBranches((prev) =>
      prev.includes(gov) ? prev.filter((g) => g !== gov) : [...prev, gov]
    );
  };

  const handleOrgDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setOrgDocumentFile(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setOrgForm((f) => ({ ...f, logoDataUri: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
    if (step === 1) {
      if (step1Valid) { setStep(2); scrollTop(); }
      else setTouched((t) => ({ ...t, fullName: true, email: true, password: true, confirmPassword: true }));
    } else if (step === 2) {
      if (step2Valid) { setStep(3); scrollTop(); }
      else setTouched((t) => ({ ...t, nationalId: true, dateOfBirth: true, governorate: true, phone: true, city: true, gender: true, educationLevel: true, universityName: true, educationOther: true }));
    }
  };

  const handleBack = () => {
    setStep((s) => (s - 1) as 1 | 2 | 3);
    scrollTop();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    const volunteerState: VolunteerEditableState = {
      fullName: volForm.fullName, email: volForm.email,
      nationality: volForm.nationality, nationalId: volForm.nationalId,
      dateOfBirth: volForm.dateOfBirth, governorate: volForm.governorate,
      phone: volForm.phone, city: volForm.city, gender: volForm.gender,
      healthNotes: volForm.healthNotes,
      educationLevel: volForm.educationLevel,
      educationOther: volForm.educationOther,
      universityName: volForm.universityName,
      faculty: volForm.faculty,
      studyYear: volForm.studyYear,
      fieldOfStudy: volForm.fieldOfStudy,
      department: volForm.department,
      hoursPerWeek: volForm.hoursPerWeek,
      skills: volSkills, customSkill: volCustomSkill,
      availability, languages,
      priorHasExperience, experiences,
      causeAreas: rankedCauses,
    };

    const data =
      role === "Organization"
        ? {
            role: "org_admin",
            email: orgForm.email, password: orgForm.password,
            orgName: orgForm.orgName, phone: orgForm.phone,
            officialEmail: orgForm.officialEmail,
            orgType: orgForm.orgType,
            foundedYear: orgForm.foundedYear,
            orgSize: orgForm.orgSize,
            location: orgForm.hqGovernorate,
            hqCity: orgForm.hqCity,
            branches: orgBranches,
            website: orgForm.website,
            description: orgForm.description,
            category: orgCategories.join(", "),
            logoUrl: orgForm.logoDataUri,
            documentsFile: orgDocumentFile ? orgDocumentFile.name : "",
            submitterName: orgForm.submitterName,
            submitterRole: orgForm.submitterRole,
            additionalNotes: orgForm.additionalNotes,
          }
        : buildVolunteerRegisterPayload(volunteerState, volForm.password);

    console.log("[Register] payload:", JSON.stringify(data, null, 2));
    const result = await register(data);
    console.log("[Register] response:", result);
    setIsSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.message ?? "Registration failed. Please check your details and try again.");
      return;
    }
    if (role === "Organization") {
      navigate(result.orgStatus === "approved" ? "/org" : "/org/pending");
    } else {
      navigate("/dashboard/profile");
    }
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

                    {/* Full Name */}
                    <div>
                      <label htmlFor="fullName" style={labelStyle}>Full Name <span style={{ color: RED }}>*</span></label>
                      <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 6px 0" }}>
                        Enter your full name as it appears on your national ID — first, middle, and last name.
                      </p>
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
                          placeholder="Min. 8 characters, max. 64"
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

                    {/* Nationality */}
                    <div>
                      <label htmlFor="nationality" style={labelStyle}>Nationality <span style={{ color: RED }}>*</span></label>
                      <select id="nationality"
                        value={volForm.nationality}
                        onChange={(e) => {
                          setVolForm((f) => ({ ...f, nationality: e.target.value, nationalId: "" }));
                          touch("nationality");
                          setTouched((t) => ({ ...t, nationalId: false }));
                        }}
                        onFocus={() => onFocus("nationality")}
                        onBlur={() => onBlur("nationality")}
                        style={fieldStyle("nationality")}
                      >
                        {NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>

                    {/* National ID / Passport Number */}
                    <div>
                      <label htmlFor="nationalId" style={labelStyle}>
                        {volForm.nationality === "Egyptian" ? "National ID" : "Passport Number"}{" "}
                        <span style={{ color: RED }}>*</span>
                      </label>
                      <input id="nationalId"
                        value={volForm.nationalId}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setVolForm((f) => ({
                            ...f,
                            nationalId: volForm.nationality === "Egyptian"
                              ? raw.replace(/\D/g, "").slice(0, 14)
                              : raw.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20),
                          }));
                        }}
                        onFocus={() => onFocus("nationalId")}
                        onBlur={() => onBlur("nationalId")}
                        style={fieldStyle("nationalId")}
                        placeholder={volForm.nationality === "Egyptian" ? "14-digit national ID number" : "Passport number (6–20 characters)"}
                        inputMode={volForm.nationality === "Egyptian" ? "numeric" : "text"}
                        maxLength={volForm.nationality === "Egyptian" ? 14 : 20}
                      />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
                        <Err field="nationalId" />
                        <span style={{ fontSize: 11, color: "#94A3B8", marginLeft: "auto" }}>
                          {volForm.nationalId.length}/{volForm.nationality === "Egyptian" ? 14 : 20}
                        </span>
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

                    {/* Health / Mobility Notes */}
                    <div>
                      <label htmlFor="healthNotes" style={labelStyle}>
                        Health or Mobility Notes{" "}
                        <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: 12 }}>(optional)</span>
                      </label>
                      <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 6px 0" }}>Share any physical limitations that may affect your ability to participate in certain activities. This information is confidential and used only for activity matching.</p>
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

                    {/* Education Level */}
                    <div>
                      <label htmlFor="educationLevel" style={labelStyle}>Education Level <span style={{ color: RED }}>*</span></label>
                      <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 6px 0" }}>
                        This helps us match you with suitable opportunities.
                      </p>
                      <select id="educationLevel"
                        value={volForm.educationLevel}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVolForm((f) => ({
                            ...f,
                            educationLevel: val,
                            educationOther: "",
                            universityName: "",
                            faculty: "",
                            studyYear: "",
                            fieldOfStudy: "",
                          }));
                          touch("educationLevel");
                        }}
                        onFocus={() => onFocus("educationLevel")}
                        onBlur={() => onBlur("educationLevel")}
                        style={fieldStyle("educationLevel")}
                      >
                        <option value="">Select your education level…</option>
                        {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <Err field="educationLevel" />

                      {/* University Student — extra fields */}
                      {volForm.educationLevel === "University Student" && (
                        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px", backgroundColor: "#F8FAFC", borderRadius: 10, border: "1.5px solid #E2E8F0" }}>
                          <div>
                            <label htmlFor="universityName" style={{ ...labelStyle, fontSize: 12 }}>
                              University Name <span style={{ color: RED }}>*</span>
                            </label>
                            <p style={{ fontSize: 11, color: "#64748B", margin: "0 0 5px 0" }}>
                              If your university has multiple branches, please include your branch / campus.
                            </p>
                            <input id="universityName"
                              value={volForm.universityName}
                              onChange={(e) => setVolForm((f) => ({ ...f, universityName: e.target.value }))}
                              onFocus={() => onFocus("universityName")}
                              onBlur={() => onBlur("universityName")}
                              placeholder="e.g., Cairo University or Sadat Academy – Maadi"
                              style={fieldStyle("universityName", 40)}
                            />
                            <Err field="universityName" />
                          </div>
                          <div>
                            <label htmlFor="faculty" style={{ ...labelStyle, fontSize: 12 }}>
                              Faculty / Field <span style={{ color: "#94A3B8", fontWeight: 400 }}>(optional)</span>
                            </label>
                            <input id="faculty"
                              value={volForm.faculty}
                              onChange={(e) => setVolForm((f) => ({ ...f, faculty: e.target.value }))}
                              onFocus={() => onFocus("faculty")}
                              onBlur={() => onBlur("faculty")}
                              placeholder="e.g. Computer Science, Medicine, Law…"
                              style={fieldStyle("faculty", 40)}
                            />
                          </div>
                          <div>
                            <label htmlFor="studyYear" style={{ ...labelStyle, fontSize: 12 }}>
                              Academic Year <span style={{ color: "#94A3B8", fontWeight: 400 }}>(optional)</span>
                            </label>
                            <select id="studyYear"
                              value={volForm.studyYear}
                              onChange={(e) => { setVolForm((f) => ({ ...f, studyYear: e.target.value })); touch("studyYear"); }}
                              onFocus={() => onFocus("studyYear")}
                              onBlur={() => onBlur("studyYear")}
                              style={fieldStyle("studyYear", 40)}
                            >
                              <option value="">Select academic year…</option>
                              {STUDY_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                            </select>
                          </div>
                        </div>
                      )}

                      {/* University Graduate / Postgraduate — Field of Study (separate from faculty) */}
                      {(volForm.educationLevel === "University Graduate" || volForm.educationLevel === "Postgraduate (Diploma / Master / PhD)") && (
                        <div style={{ marginTop: 12, padding: "14px 16px", backgroundColor: "#F8FAFC", borderRadius: 10, border: "1.5px solid #E2E8F0" }}>
                          <label htmlFor="fieldOfStudy" style={{ ...labelStyle, fontSize: 12 }}>
                            Field of Study <span style={{ color: "#94A3B8", fontWeight: 400 }}>(optional)</span>
                          </label>
                          <input id="fieldOfStudy"
                            value={volForm.fieldOfStudy}
                            onChange={(e) => setVolForm((f) => ({ ...f, fieldOfStudy: e.target.value }))}
                            onFocus={() => onFocus("fieldOfStudy")}
                            onBlur={() => onBlur("fieldOfStudy")}
                            placeholder={
                              volForm.educationLevel === "Postgraduate (Diploma / Master / PhD)"
                                ? "e.g. Biomedical Engineering (MSc), Public Health (Diploma)…"
                                : "e.g. Engineering, Pharmacy, Business…"
                            }
                            style={fieldStyle("fieldOfStudy", 40)}
                          />
                        </div>
                      )}

                      {/* Other — custom input */}
                      {volForm.educationLevel === "Other" && (
                        <div style={{ marginTop: 12, padding: "14px 16px", backgroundColor: "#F8FAFC", borderRadius: 10, border: "1.5px solid #E2E8F0" }}>
                          <label htmlFor="educationOther" style={{ ...labelStyle, fontSize: 12 }}>
                            Describe your education background <span style={{ color: RED }}>*</span>
                          </label>
                          <p style={{ fontSize: 11, color: "#64748B", margin: "0 0 5px 0" }}>
                            e.g., Technical Institute, Vocational Training, Military Academy…
                          </p>
                          <input id="educationOther"
                            value={volForm.educationOther}
                            onChange={(e) => setVolForm((f) => ({ ...f, educationOther: e.target.value.slice(0, MAX_EDUCATION_OTHER) }))}
                            onFocus={() => onFocus("educationOther")}
                            onBlur={() => onBlur("educationOther")}
                            placeholder="Describe your education background…"
                            style={fieldStyle("educationOther", 40)}
                          />
                          <Err field="educationOther" />
                          <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "right", marginTop: 2 }}>
                            {volForm.educationOther.length}/{MAX_EDUCATION_OTHER}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ── STEP 3: PREFERENCES & SKILLS ──────────────────── */}
                {step === 3 && (
                  <>
                    <div ref={step3BannerRef}>
                      {step3SubmitAttempted && !step3Valid && (() => {
                        const summary = buildErrorSummary(errors, STEP3_FIELDS as readonly string[]);
                        const items: { label: string; message: string }[] = summary.map((s) => ({ label: s.label, message: s.message }));
                        if (!termsAccepted) items.push({ label: "Terms", message: "Please accept the Terms & Privacy Policy to continue." });
                        if (items.length === 0) return null;
                        return (
                          <div role="alert" style={{
                            backgroundColor: "#FEF2F2", border: "1.5px solid #FCA5A5",
                            borderRadius: 8, padding: "12px 14px", marginBottom: 12,
                          }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: "#991B1B", margin: "0 0 6px 0" }}>
                              Almost there — a few things need your attention
                            </p>
                            <ul style={{ margin: 0, paddingLeft: 18, color: "#991B1B", fontSize: 13, lineHeight: 1.6 }}>
                              {items.map((it, i) => (
                                <li key={i}><strong>{it.label}:</strong> {it.message}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      })()}
                    </div>
                    <SectionHeader>Preferences & Skills</SectionHeader>

                    {/* Preferred Department */}
                    <div>
                      <label htmlFor="department" style={labelStyle}>
                        Preferred Department{" "}
                        <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: 12 }}>(optional)</span>
                      </label>
                      <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 6px 0" }}>
                        Pick the area you'd most like to contribute to — you can change it later.
                      </p>
                      <select id="department"
                        value={volForm.department}
                        onChange={(e) => setVolForm((f) => ({ ...f, department: e.target.value }))}
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
                    </div>

                    {/* Skills */}
                    <div>
                      <label style={labelStyle}>Skills <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: 12 }}>(optional)</span></label>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <span style={{ fontSize: 12, color: "#64748B" }}>Select up to {MAX_SKILLS}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: volSkills.length === 0 ? "#94A3B8" : volSkills.length >= MAX_SKILLS ? GREEN : "#1E293B" }}>
                          {volSkills.length} / {MAX_SKILLS}
                        </span>
                      </div>
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
                          <label htmlFor="customSkill" style={{ ...labelStyle, fontSize: 12 }}>Describe your other skills <span style={{ color: RED }}>*</span></label>
                          <input id="customSkill"
                            value={volCustomSkill}
                            onChange={(e) => { setVolCustomSkill(e.target.value); touch("skills"); }}
                            onFocus={() => setFocused("skills_custom")}
                            onBlur={() => { setFocused(null); touch("skills"); }}
                            placeholder="e.g. Sign Language…"
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

                    {/* Availability */}
                    <div>
                      <label style={labelStyle}>Availability <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: 12 }}>(optional)</span></label>
                      <p style={{ fontSize: 12, color: "#94A3B8", margin: "0 0 12px 0" }}>Select all time slots that match your availability. </p>

                      {/* Pill chips — muted when Flexible is active */}
                      <div style={{
                        display: "flex", flexWrap: "wrap", gap: 8,
                        opacity: availability.includes("Flexible") ? 0.45 : 1,
                        transition: "opacity 200ms ease",
                      }}>
                        {AVAILABILITY_SPECIFIC.map((opt) => {
                          const active = availability.includes(opt);
                          return (
                            <button key={opt} type="button"
                              onClick={() => toggleAvailability(opt)}
                              style={{
                                height: 34, padding: "0 14px", borderRadius: 20,
                                border: `1.5px solid ${active ? GREEN : "#D1D5DB"}`,
                                backgroundColor: active ? "#DCFCE7" : "#FFFFFF",
                                color: active ? "#15803D" : "#4B5563",
                                fontSize: 13, fontWeight: active ? 600 : 400,
                                cursor: "pointer", transition: "all 150ms", userSelect: "none",
                                display: "flex", alignItems: "center", gap: 6,
                              }}>
                              {active && (
                                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6L5 9L10 3" stroke="#15803D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {/* OR divider */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0 12px 0" }}>
                        <div style={{ flex: 1, height: 1, backgroundColor: "#F1F5F9" }} />
                        <span style={{ fontSize: 11, color: "#CBD5E1", fontWeight: 500, letterSpacing: "0.06em" }}>or</span>
                        <div style={{ flex: 1, height: 1, backgroundColor: "#F1F5F9" }} />
                      </div>

                      {/* Flexible — full-width row */}
                      <button type="button"
                        onClick={() => toggleAvailability("Flexible")}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", gap: 12,
                          padding: "11px 14px", borderRadius: 10, cursor: "pointer",
                          border: `1.5px solid ${availability.includes("Flexible") ? GREEN : "#E2E8F0"}`,
                          backgroundColor: availability.includes("Flexible") ? "#F0FDF4" : "#FFFFFF",
                          transition: "all 150ms", textAlign: "left",
                        }}>
                        {/* Custom toggle indicator */}
                        <div style={{
                          width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                          border: `2px solid ${availability.includes("Flexible") ? GREEN : "#D1D5DB"}`,
                          backgroundColor: availability.includes("Flexible") ? GREEN : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 150ms",
                        }}>
                          {availability.includes("Flexible") && (
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <div style={{
                            fontSize: 13, fontWeight: 600,
                            color: availability.includes("Flexible") ? GREEN : "#1E293B",
                          }}>Flexible</div>
                          <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 1 }}>
                            Open to any time slot
                          </div>
                        </div>
                      </button>

                      <Err field="availability" />
                    </div>

                    {/* Hours per week — number input */}
                    <div>
                      <label htmlFor="hoursPerWeek" style={labelStyle}>
                        Preferred weekly commitment (hours){" "}
                        <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: 12 }}>(optional)</span>
                      </label>
                      <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 8px 0" }}>How many hours per week are you typically available to volunteer?</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input id="hoursPerWeek"
                          type="number"
                          min={1} max={40} step={1}
                          value={volForm.hoursPerWeek ?? ""}
                          placeholder="e.g., 5"
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") { setVolForm((f) => ({ ...f, hoursPerWeek: null })); return; }
                            const v = Math.min(40, Math.max(1, parseInt(raw)));
                            if (!isNaN(v)) setVolForm((f) => ({ ...f, hoursPerWeek: v }));
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
                      <label style={labelStyle}>Languages Spoken <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: 12 }}>(optional)</span></label>
                      <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 10px 0" }}>Add languages you can communicate in. </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {languages.map((lang, idx) => {
                          const isDuplicate = languages.some(
                            (l, i) => i !== idx && l.language.trim().toLowerCase() === lang.language.trim().toLowerCase() && lang.language.trim() !== ""
                          );
                          return (
                            <div key={idx}>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <input
                                  value={lang.language}
                                  onChange={(e) => updateLanguage(idx, "language", e.target.value)}
                                  onFocus={() => setFocused(`lang_${idx}`)}
                                  onBlur={() => { setFocused(null); touch("languages"); }}
                                  placeholder="e.g. Arabic, English, French…"
                                  aria-label={`Language ${idx + 1}`}
                                  maxLength={50}
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
                              {isDuplicate && lang.language.trim() !== "" && (
                                <div style={{ display: "flex", gap: 4, marginTop: 4, alignItems: "flex-start" }}>
                                  <span style={{ color: RED, fontSize: 12, lineHeight: 1, marginTop: 1 }}>⚠</span>
                                  <span style={{ fontSize: 12, color: RED, lineHeight: 1.45 }}>
                                    "{lang.language.trim()}" is already in your list.
                                  </span>
                                </div>
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

                    {/* Prior Volunteer Experience */}
                    <div>
                      <label style={labelStyle}>
                        Prior Volunteer Experience{" "}
                        <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: 12 }}>(optional)</span>
                      </label>
                      <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 8px 0" }}>
                        Have you volunteered with any organization before?
                      </p>

                      {/* Yes / No toggle */}
                      <div style={{ display: "flex", gap: 10 }} role="group" aria-label="Prior volunteer experience">
                        {([true, false] as const).map((val) => (
                          <button key={String(val)} type="button"
                            onClick={() => {
                              setPriorHasExperience(val);
                              if (!val) { setExperiences([]); setExpTouched({}); }
                              else if (experiences.length === 0) {
                                setExperiences([{ orgName: "", department: "", role: "", duration: "", description: "" }]);
                              }
                              touch("priorExperiences");
                            }}
                            aria-pressed={priorHasExperience === val}
                            style={{
                              flex: 1, height: 42, borderRadius: 8,
                              border: `1.5px solid ${priorHasExperience === val ? GREEN : "#E2E8F0"}`,
                              backgroundColor: priorHasExperience === val ? "#F0FDF4" : "#FAFAFA",
                              color: priorHasExperience === val ? GREEN : "#64748B",
                              fontWeight: priorHasExperience === val ? 600 : 400,
                              fontSize: 14, cursor: "pointer", transition: "all 150ms",
                            }}>
                            {val ? "Yes" : "No"}
                          </button>
                        ))}
                      </div>

                      {/* Experience entries — shown only when Yes */}
                      {priorHasExperience === true && (
                        <div style={{ marginTop: 14 }}>
                          <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 12px 0" }}>
                            Please add at least one experience
                          </p>

                          {/* Entry cards */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {experiences.map((exp, idx) => {
                              const orgErr  = getExpError(idx, "orgName");
                              const deptErr = getExpError(idx, "department");
                              return (
                                <div key={idx} style={{ border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "16px 16px 14px", backgroundColor: "#FAFAFA" }}>
                                  {/* Card header */}
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                      Experience {idx + 1}
                                    </span>
                                    <button type="button" onClick={() => removeExperience(idx)}
                                      aria-label={`Remove experience ${idx + 1}`}
                                      style={{ width: 28, height: 28, borderRadius: 6, border: "1.5px solid #E2E8F0", background: "#fff", color: "#94A3B8", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", transition: "border-color 150ms, color 150ms" }}
                                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = RED; e.currentTarget.style.color = RED; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.color = "#94A3B8"; }}>
                                      ×
                                    </button>
                                  </div>

                                  {/* Organization Name — required */}
                                  <div style={{ marginBottom: 10 }}>
                                    <label htmlFor={`exp-org-${idx}`} style={{ ...labelStyle, fontSize: 12 }}>
                                      Organization Name <span style={{ color: RED }}>*</span>
                                    </label>
                                    <input id={`exp-org-${idx}`}
                                      value={exp.orgName}
                                      onChange={(e) => updateExperience(idx, "orgName", e.target.value)}
                                      onFocus={() => setFocused(`exp_${idx}_orgName`)}
                                      onBlur={() => { setFocused(null); touchExp(idx, "orgName"); }}
                                      placeholder="e.g. Resala, Egyptian Red Crescent…"
                                      style={{ width: "100%", height: 38, outline: "none", boxSizing: "border-box", border: `1.5px solid ${expBorder(idx, "orgName", !!orgErr)}`, borderRadius: 8, padding: "0 12px", fontSize: 13, backgroundColor: "#FFFFFF", transition: "border-color 150ms" }}
                                    />
                                    {orgErr && <div style={{ display: "flex", gap: 4, marginTop: 4 }}><span style={{ color: RED, fontSize: 12 }}>⚠</span><span style={{ fontSize: 12, color: RED }}>{orgErr}</span></div>}
                                  </div>

                                  {/* Department — required */}
                                  <div style={{ marginBottom: 10 }}>
                                    <label htmlFor={`exp-dept-${idx}`} style={{ ...labelStyle, fontSize: 12 }}>
                                      Department <span style={{ color: RED }}>*</span>
                                    </label>
                                    <select id={`exp-dept-${idx}`}
                                      value={exp.department}
                                      onChange={(e) => updateExperience(idx, "department", e.target.value)}
                                      onFocus={() => setFocused(`exp_${idx}_department`)}
                                      onBlur={() => { setFocused(null); touchExp(idx, "department"); }}
                                      style={{ width: "100%", height: 38, outline: "none", boxSizing: "border-box", border: `1.5px solid ${expBorder(idx, "department", !!deptErr)}`, borderRadius: 8, padding: "0 8px", fontSize: 13, backgroundColor: "#FFFFFF", transition: "border-color 150ms" }}
                                    >
                                      <option value="">Select department…</option>
                                      {DEPARTMENT_GROUPS.map((group) => (
                                        <optgroup key={group.label} label={group.label}>
                                          {group.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                        </optgroup>
                                      ))}
                                    </select>
                                    {deptErr && <div style={{ display: "flex", gap: 4, marginTop: 4 }}><span style={{ color: RED, fontSize: 12 }}>⚠</span><span style={{ fontSize: 12, color: RED }}>{deptErr}</span></div>}
                                  </div>

                                  {/* Role — optional */}
                                  <div style={{ marginBottom: 10 }}>
                                    <label htmlFor={`exp-role-${idx}`} style={{ ...labelStyle, fontSize: 12 }}>
                                      Role / Position <span style={{ color: "#94A3B8", fontWeight: 400 }}>(optional)</span>
                                    </label>
                                    <input id={`exp-role-${idx}`}
                                      value={exp.role}
                                      onChange={(e) => updateExperience(idx, "role", e.target.value)}
                                      onFocus={() => setFocused(`exp_${idx}_role`)}
                                      onBlur={() => setFocused(null)}
                                      placeholder="e.g. Team Leader, Coordinator…"
                                      style={{ width: "100%", height: 38, outline: "none", boxSizing: "border-box", border: `1.5px solid ${focused === `exp_${idx}_role` ? BLUE : "#E2E8F0"}`, borderRadius: 8, padding: "0 12px", fontSize: 13, backgroundColor: "#FFFFFF", transition: "border-color 150ms" }}
                                    />
                                  </div>

                                  {/* Duration — optional */}
                                  <div style={{ marginBottom: 10 }}>
                                    <label htmlFor={`exp-dur-${idx}`} style={{ ...labelStyle, fontSize: 12 }}>
                                      Duration <span style={{ color: "#94A3B8", fontWeight: 400 }}>(optional)</span>
                                    </label>
                                    <input id={`exp-dur-${idx}`}
                                      value={exp.duration}
                                      onChange={(e) => updateExperience(idx, "duration", e.target.value)}
                                      onFocus={() => setFocused(`exp_${idx}_duration`)}
                                      onBlur={() => setFocused(null)}
                                      placeholder="e.g. 6 months, Jan 2023 – Jun 2023…"
                                      style={{ width: "100%", height: 38, outline: "none", boxSizing: "border-box", border: `1.5px solid ${focused === `exp_${idx}_duration` ? BLUE : "#E2E8F0"}`, borderRadius: 8, padding: "0 12px", fontSize: 13, backgroundColor: "#FFFFFF", transition: "border-color 150ms" }}
                                    />
                                  </div>

                                  {/* Description — optional */}
                                  <div>
                                    <label htmlFor={`exp-desc-${idx}`} style={{ ...labelStyle, fontSize: 12 }}>
                                      Description <span style={{ color: "#94A3B8", fontWeight: 400 }}>(optional)</span>
                                    </label>
                                    <textarea id={`exp-desc-${idx}`}
                                      value={exp.description}
                                      onChange={(e) => updateExperience(idx, "description", e.target.value.slice(0, 300))}
                                      onFocus={() => setFocused(`exp_${idx}_description`)}
                                      onBlur={() => setFocused(null)}
                                      placeholder="Briefly describe what you did…"
                                      style={{ width: "100%", height: 72, outline: "none", boxSizing: "border-box", border: `1.5px solid ${focused === `exp_${idx}_description` ? BLUE : "#E2E8F0"}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, resize: "vertical", fontFamily: "inherit", backgroundColor: "#FFFFFF", transition: "border-color 150ms" }}
                                    />
                                    <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "right", marginTop: 1 }}>{exp.description.length}/300</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Top-level error (no entries added) */}
                          {touched["priorExperiences"] && errors.priorExperiences && (
                            <div style={{ display: "flex", gap: 4, marginTop: 8, alignItems: "flex-start" }}>
                              <span style={{ color: RED, fontSize: 13, lineHeight: 1, marginTop: 1 }}>⚠</span>
                              <span style={{ fontSize: 12, color: RED, lineHeight: 1.45 }}>{errors.priorExperiences}</span>
                            </div>
                          )}

                          {/* Add Experience button */}
                          <button type="button" onClick={addExperience}
                            style={{ marginTop: 12, height: 38, padding: "0 16px", borderRadius: 8, border: `1.5px solid ${GREEN}`, backgroundColor: "#F0FDF4", color: GREEN, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                            + Add Experience
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Cause Areas — Tap-to-Rank */}
                    <div>
                      <label style={labelStyle}>
                        Cause Areas / Interests{" "}
                        <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: 12 }}>(optional)</span>
                      </label>
                      <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 2px 0" }}>
                        Tap causes in order of preference — your top choice first (up to 5)
                      </p>
                      <p style={{ fontSize: 12, color: "#94A3B8", margin: "0 0 10px 0" }}>
                        You can update your interests later from your profile
                      </p>
                      <p style={{ fontSize: 12, margin: "0 0 10px 0", color: rankedCauses.length === MAX_CAUSES ? GREEN : "#94A3B8" }}>
                        {rankedCauses.length} of {MAX_CAUSES} selected
                      </p>

                      {/* 7 selectable cause pills */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {CAUSE_GROUPS.map((label) => {
                          const rank = rankedCauses.indexOf(label);
                          const isSelected = rank !== -1;
                          const isDisabled = !isSelected && rankedCauses.length >= MAX_CAUSES;
                          return (
                            <button
                              key={label}
                              type="button"
                              onClick={() => toggleCause(label)}
                              style={{
                                height: 34,
                                padding: "0 14px",
                                borderRadius: 20,
                                border: `1.5px solid ${isSelected ? GREEN : "#D1D5DB"}`,
                                backgroundColor: isSelected ? "#DCFCE7" : "#FFFFFF",
                                color: isSelected ? "#15803D" : "#4B5563",
                                fontSize: 13,
                                fontWeight: isSelected ? 600 : 400,
                                cursor: isDisabled ? "not-allowed" : "pointer",
                                transition: "all 150ms",
                                opacity: isDisabled ? 0.45 : 1,
                                userSelect: "none",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              {isSelected && (
                                <span style={{
                                  width: 18, height: 18, borderRadius: "50%",
                                  backgroundColor: GREEN,
                                  color: "#fff",
                                  fontSize: 10, fontWeight: 700,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  flexShrink: 0,
                                }}>
                                  {rank + 1}
                                </span>
                              )}
                              {isSelected && (
                                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                                  <path d="M2 6L5 9L10 3" stroke="#15803D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      {rankedCauses.length > 0 && rankedCauses.length < MAX_CAUSES && (
                        <p style={{ fontSize: 12, color: "#F59E0B", margin: "8px 0 0 0" }}>
                          Keep going or skip this step
                        </p>
                      )}
                      <Err field="causeAreas" />
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
                    <div
                      style={{ flex: 1 }}
                      onClick={() => {
                        if (!step3Valid) {
                          setStep3SubmitAttempted(true);
                          setTouched((t) => ({ ...t, skills: true, availability: true, languages: true, priorExperiences: true, causeAreas: true }));
                          if (experiences.length > 0) {
                            setExpTouched((t) => {
                              const next = { ...t };
                              experiences.forEach((_, idx) => {
                                next[`exp_${idx}_orgName`] = true;
                                next[`exp_${idx}_department`] = true;
                                next[`exp_${idx}_deptOther`] = true;
                              });
                              return next;
                            });
                          }
                          setTimeout(() => {
                            step3BannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                          }, 0);
                        }
                      }}
                    >
                      <button type="submit"
                        disabled={!step3Valid || isSubmitting}
                        style={{
                          width: "100%", height: 44, borderRadius: 8, border: "none",
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
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ══ ORGANIZATION FORM ════════════════════════════════════════ */}
            {role === "Organization" && (
              <>
                {/* ── SECTION: Account Information ──────────────────────── */}
                <SectionHeader>Account Information</SectionHeader>

                <div>
                  <label htmlFor="orgName" style={labelStyle}>Organization Name <span style={{ color: RED }}>*</span></label>
                  <input id="orgName" value={orgForm.orgName}
                    onChange={(e) => setOrgForm((f) => ({ ...f, orgName: e.target.value }))}
                    onFocus={() => onOrgFocus("orgName")} onBlur={() => onOrgBlur("orgName")}
                    style={orgFieldStyle("orgName")} placeholder="e.g. Resala Charity Organization"
                    autoComplete="organization" />
                  {orgTouched.orgName && orgErrors.orgName && (
                    <div style={{ display: "flex", gap: 4, marginTop: 5, alignItems: "flex-start" }}>
                      <span style={{ color: RED, fontSize: 13, lineHeight: 1, marginTop: 1 }}>⚠</span>
                      <span style={{ fontSize: 12, color: RED, lineHeight: 1.45 }}>{orgErrors.orgName}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="orgEmail" style={labelStyle}>Account Email <span style={{ color: RED }}>*</span></label>
                  <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 6px 0" }}>
                    This email will be used to log in and manage your organization on the platform.
                  </p>
                  <input id="orgEmail" type="email" value={orgForm.email}
                    onChange={(e) => setOrgForm((f) => ({ ...f, email: e.target.value }))}
                    onFocus={() => onOrgFocus("email")} onBlur={() => onOrgBlur("email")}
                    style={orgFieldStyle("email")} placeholder="e.g. admin@organization.org"
                    autoComplete="email" />
                  {orgTouched.email && orgErrors.email && (
                    <div style={{ display: "flex", gap: 4, marginTop: 5, alignItems: "flex-start" }}>
                      <span style={{ color: RED, fontSize: 13, lineHeight: 1, marginTop: 1 }}>⚠</span>
                      <span style={{ fontSize: 12, color: RED, lineHeight: 1.45 }}>{orgErrors.email}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="orgPassword" style={labelStyle}>Password <span style={{ color: RED }}>*</span></label>
                  <div style={{ position: "relative" }}>
                    <input id="orgPassword"
                      type={showOrgPassword ? "text" : "password"}
                      value={orgForm.password}
                      onChange={(e) => setOrgForm((f) => ({ ...f, password: e.target.value }))}
                      onFocus={() => onOrgFocus("password")} onBlur={() => onOrgBlur("password")}
                      style={{ ...orgFieldStyle("password"), paddingRight: 44 }}
                      autoComplete="new-password" placeholder="Min. 8 characters, max. 64" />
                    <button type="button" onClick={() => setShowOrgPassword((s) => !s)}
                      aria-label={showOrgPassword ? "Hide password" : "Show password"}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8", display: "flex", alignItems: "center", padding: 0 }}>
                      {showOrgPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {orgTouched.password && orgErrors.password && (
                    <div style={{ display: "flex", gap: 4, marginTop: 5, alignItems: "flex-start" }}>
                      <span style={{ color: RED, fontSize: 13, lineHeight: 1, marginTop: 1 }}>⚠</span>
                      <span style={{ fontSize: 12, color: RED, lineHeight: 1.45 }}>{orgErrors.password}</span>
                    </div>
                  )}
                  {orgForm.password.length > 0 && (
                    <div style={{ marginTop: 7, display: "flex", flexWrap: "wrap", gap: "4px 6px" }}>
                      {[
                        { label: "8+ chars",       ok: orgForm.password.length >= 8 },
                        { label: "Uppercase",      ok: /[A-Z]/.test(orgForm.password) },
                        { label: "Lowercase",      ok: /[a-z]/.test(orgForm.password) },
                        { label: "Number",         ok: /[0-9]/.test(orgForm.password) },
                        { label: "Special (@#!)",  ok: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(orgForm.password) },
                      ].map(({ label, ok }) => (
                        <span key={label} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, backgroundColor: ok ? "#DCFCE7" : "#F1F5F9", color: ok ? GREEN : "#94A3B8", fontWeight: ok ? 500 : 400 }}>
                          {ok ? "✓" : "○"} {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="orgConfirmPassword" style={labelStyle}>Confirm Password <span style={{ color: RED }}>*</span></label>
                  <div style={{ position: "relative" }}>
                    <input id="orgConfirmPassword"
                      type={showOrgConfirmPassword ? "text" : "password"}
                      value={orgForm.confirmPassword}
                      onChange={(e) => setOrgForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                      onFocus={() => onOrgFocus("confirmPassword")} onBlur={() => onOrgBlur("confirmPassword")}
                      style={{ ...orgFieldStyle("confirmPassword"), paddingRight: 44 }}
                      autoComplete="new-password" placeholder="Re-enter your password" />
                    <button type="button" onClick={() => setShowOrgConfirmPassword((s) => !s)}
                      aria-label={showOrgConfirmPassword ? "Hide password" : "Show password"}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8", display: "flex", alignItems: "center", padding: 0 }}>
                      {showOrgConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {orgTouched.confirmPassword && orgErrors.confirmPassword && (
                    <div style={{ display: "flex", gap: 4, marginTop: 5, alignItems: "flex-start" }}>
                      <span style={{ color: RED, fontSize: 13, lineHeight: 1, marginTop: 1 }}>⚠</span>
                      <span style={{ fontSize: 12, color: RED, lineHeight: 1.45 }}>{orgErrors.confirmPassword}</span>
                    </div>
                  )}
                </div>

                {/* ── SECTION: Organization Details ──────────────────────── */}
                <SectionHeader>Organization Details</SectionHeader>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="orgType" style={labelStyle}>Organization Type <span style={{ color: RED }}>*</span></label>
                    <select id="orgType" value={orgForm.orgType}
                      onChange={(e) => setOrgForm((f) => ({ ...f, orgType: e.target.value }))}
                      onFocus={() => onOrgFocus("orgType")} onBlur={() => onOrgBlur("orgType")}
                      style={orgFieldStyle("orgType")}>
                      <option value="">Select type…</option>
                      <option value="NGO">NGO / Non-profit</option>
                      <option value="Foundation">Foundation</option>
                      <option value="Community Group">Community Group / Cooperative</option>
                      <option value="Religious">Religious Organization</option>
                      <option value="Student Activity">Student / Academic Organization</option>
                      <option value="Government">Government / Public Body</option>
                      <option value="Professional Association">Professional / Trade Association</option>
                      <option value="Social Enterprise">Social Enterprise</option>
                      <option value="International Organization">International Organization</option>
                    </select>
                    {orgTouched.orgType && orgErrors.orgType && (
                      <div style={{ display: "flex", gap: 4, marginTop: 5, alignItems: "flex-start" }}>
                        <span style={{ color: RED, fontSize: 13, lineHeight: 1, marginTop: 1 }}>⚠</span>
                        <span style={{ fontSize: 12, color: RED, lineHeight: 1.45 }}>{orgErrors.orgType}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label htmlFor="orgFoundedYear" style={labelStyle}>Founded Year <span style={{ color: RED }}>*</span></label>
                    <select id="orgFoundedYear" value={orgForm.foundedYear}
                      onChange={(e) => setOrgForm((f) => ({ ...f, foundedYear: e.target.value }))}
                      onFocus={() => onOrgFocus("foundedYear")} onBlur={() => onOrgBlur("foundedYear")}
                      style={orgFieldStyle("foundedYear")}>
                      <option value="">Select year…</option>
                      {Array.from({ length: new Date().getFullYear() - 1899 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                        <option key={y} value={String(y)}>{y}</option>
                      ))}
                    </select>
                    {orgTouched.foundedYear && orgErrors.foundedYear && (
                      <div style={{ display: "flex", gap: 4, marginTop: 5, alignItems: "flex-start" }}>
                        <span style={{ color: RED, fontSize: 13, lineHeight: 1, marginTop: 1 }}>⚠</span>
                        <span style={{ fontSize: 12, color: RED, lineHeight: 1.45 }}>{orgErrors.foundedYear}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  {/* Label row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <label style={{ ...labelStyle, margin: 0 }}>
                      Category <span style={{ color: RED }}>*</span>
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {/* Progress dots */}
                      <div style={{ display: "flex", gap: 3 }}>
                        {Array.from({ length: ORG_CATEGORY_MAX }).map((_, i) => (
                          <span key={i} style={{
                            display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                            backgroundColor: i < orgCategories.length
                              ? orgCategories.length >= ORG_CATEGORY_MAX ? "#F59E0B" : GREEN
                              : "#E2E8F0",
                            transition: "background-color 200ms",
                          }} />
                        ))}
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                        backgroundColor: orgCategories.length >= ORG_CATEGORY_MAX ? "#FEF3C7" : orgCategories.length > 0 ? "#DCFCE7" : "#F1F5F9",
                        color: orgCategories.length >= ORG_CATEGORY_MAX ? "#92400E" : orgCategories.length > 0 ? GREEN : "#94A3B8",
                        transition: "all 200ms",
                      }}>
                        {orgCategories.length}/{ORG_CATEGORY_MAX}
                      </span>
                    </div>
                  </div>

                  {/* Selected chips summary */}
                  {orgCategories.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 6px", marginBottom: 10, padding: "10px 12px", backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8 }}>
                      <span style={{ fontSize: 11, color: "#15803D", fontWeight: 600, alignSelf: "center", marginRight: 2 }}>Selected:</span>
                      {orgCategories.map((cat) => (
                        <button key={cat} type="button" onClick={() => toggleOrgCategory(cat)}
                          title={`Remove ${cat}`}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "3px 8px 3px 10px", borderRadius: 20,
                            border: "1px solid #86EFAC", backgroundColor: "#FFFFFF",
                            color: GREEN, fontSize: 12, fontWeight: 500, cursor: "pointer",
                            transition: "all 150ms",
                          }}>
                          {cat}
                          <span style={{ fontSize: 14, lineHeight: 1, color: "#4ADE80", fontWeight: 400 }}>×</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Max reached notice */}
                  {orgCategories.length >= ORG_CATEGORY_MAX && (
                    <p style={{ fontSize: 12, color: "#92400E", backgroundColor: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 6, padding: "6px 10px", margin: "0 0 10px 0" }}>
                      Limit reached — remove a selection above to pick a different one.
                    </p>
                  )}

                  {/* Grouped tag picker */}
                  <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, overflow: "hidden" }}
                    onBlur={() => touchOrg("orgCategories")}>
                    {ORG_CATEGORY_GROUPS.map((group, gi) => (
                      <div key={group.label} style={{
                        padding: "10px 14px",
                        borderTop: gi > 0 ? "1px solid #F1F5F9" : undefined,
                        backgroundColor: gi % 2 === 0 ? "#FFFFFF" : "#FAFAFA",
                      }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: "#CBD5E1", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 8px 0" }}>
                          {group.label}
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 7px" }}>
                          {group.items.map((cat) => {
                            const active = orgCategories.includes(cat);
                            const disabled = !active && orgCategories.length >= ORG_CATEGORY_MAX;
                            return (
                              <button key={cat} type="button"
                                onClick={() => { if (!disabled) toggleOrgCategory(cat); }}
                                title={disabled ? `Limit reached — remove a selection to add ${cat}` : active ? `Remove ${cat}` : `Add ${cat}`}
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: 5,
                                  padding: active ? "5px 9px 5px 11px" : "5px 12px",
                                  borderRadius: 20,
                                  border: `1.5px solid ${active ? GREEN : disabled ? "#F1F5F9" : "#E2E8F0"}`,
                                  backgroundColor: active ? "#F0FDF4" : disabled ? "#F8FAFC" : "#FFFFFF",
                                  color: active ? GREEN : disabled ? "#CBD5E1" : "#334155",
                                  fontSize: 12, fontWeight: active ? 600 : 400,
                                  cursor: disabled ? "not-allowed" : "pointer",
                                  opacity: disabled ? 0.45 : 1,
                                  transition: "all 150ms",
                                }}>
                                {cat}
                                {active && <span style={{ fontSize: 15, lineHeight: 1, color: "#4ADE80", fontWeight: 300 }}>×</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {orgTouched.orgCategories && orgErrors.orgCategories && (
                    <div style={{ display: "flex", gap: 4, marginTop: 6, alignItems: "flex-start" }}>
                      <span style={{ color: RED, fontSize: 13, lineHeight: 1, marginTop: 1 }}>⚠</span>
                      <span style={{ fontSize: 12, color: RED, lineHeight: 1.45 }}>{orgErrors.orgCategories}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="orgSize" style={labelStyle}>Organization Size <span style={{ color: RED }}>*</span></label>
                  <select id="orgSize" value={orgForm.orgSize}
                    onChange={(e) => setOrgForm((f) => ({ ...f, orgSize: e.target.value }))}
                    onFocus={() => onOrgFocus("orgSize")} onBlur={() => onOrgBlur("orgSize")}
                    style={orgFieldStyle("orgSize")}>
                    <option value="">Select size…</option>
                    <option value="Small">Small (1–50 members)</option>
                    <option value="Medium">Medium (51–200 members)</option>
                    <option value="Large">Large (200+ members)</option>
                  </select>
                  {orgTouched.orgSize && orgErrors.orgSize && (
                    <div style={{ display: "flex", gap: 4, marginTop: 5, alignItems: "flex-start" }}>
                      <span style={{ color: RED, fontSize: 13, lineHeight: 1, marginTop: 1 }}>⚠</span>
                      <span style={{ fontSize: 12, color: RED, lineHeight: 1.45 }}>{orgErrors.orgSize}</span>
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                    <label htmlFor="orgDescription" style={{ ...labelStyle, margin: 0 }}>Description <span style={{ color: RED }}>*</span></label>
                    <span style={{
                      fontSize: 11, fontWeight: 500,
                      color: orgForm.description.length > 500 ? RED : orgForm.description.length > 420 ? "#F59E0B" : "#94A3B8",
                    }}>
                      {orgForm.description.length}/500
                    </span>
                  </div>
                  <textarea id="orgDescription" value={orgForm.description}
                    onChange={(e) => { if (e.target.value.length <= 500) setOrgForm((f) => ({ ...f, description: e.target.value })); }}
                    onFocus={() => onOrgFocus("description")} onBlur={() => onOrgBlur("description")}
                    placeholder="Tell us about your organization, its mission, and impact…"
                    style={{ ...orgFieldStyle("description", 100), padding: "10px 12px" }} />
                  {orgTouched.description && orgErrors.description && (
                    <div style={{ display: "flex", gap: 4, marginTop: 5, alignItems: "flex-start" }}>
                      <span style={{ color: RED, fontSize: 13, lineHeight: 1, marginTop: 1 }}>⚠</span>
                      <span style={{ fontSize: 12, color: RED, lineHeight: 1.45 }}>{orgErrors.description}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Logo <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 400 }}>(optional)</span></label>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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

                {/* ── SECTION: Contact & Location ────────────────────────── */}
                <SectionHeader>Contact &amp; Location</SectionHeader>

                <div>
                  <label htmlFor="orgOfficialEmail" style={labelStyle}>Official Organization Email <span style={{ color: RED }}>*</span></label>
                  <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 6px 0" }}>
                    Provide your organization's public contact email.
                  </p>
                  <input id="orgOfficialEmail" type="email" value={orgForm.officialEmail}
                    onChange={(e) => setOrgForm((f) => ({ ...f, officialEmail: e.target.value }))}
                    onFocus={() => onOrgFocus("officialEmail")} onBlur={() => onOrgBlur("officialEmail")}
                    style={orgFieldStyle("officialEmail")} placeholder="contact@organization.org" />
                  {orgTouched.officialEmail && orgErrors.officialEmail && (
                    <div style={{ display: "flex", gap: 4, marginTop: 5, alignItems: "flex-start" }}>
                      <span style={{ color: RED, fontSize: 13, lineHeight: 1, marginTop: 1 }}>⚠</span>
                      <span style={{ fontSize: 12, color: RED, lineHeight: 1.45 }}>{orgErrors.officialEmail}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="orgPhone" style={labelStyle}>Primary Phone Number <span style={{ color: RED }}>*</span></label>
                  <input id="orgPhone" value={orgForm.phone}
                    onChange={(e) => setOrgForm((f) => ({ ...f, phone: e.target.value }))}
                    onFocus={() => onOrgFocus("phone")} onBlur={() => onOrgBlur("phone")}
                    style={orgFieldStyle("phone")} placeholder="01XXXXXXXXX or 0XXXXXXXXX" />
                  {orgTouched.phone && orgErrors.phone && (
                    <div style={{ display: "flex", gap: 4, marginTop: 5, alignItems: "flex-start" }}>
                      <span style={{ color: RED, fontSize: 13, lineHeight: 1, marginTop: 1 }}>⚠</span>
                      <span style={{ fontSize: 12, color: RED, lineHeight: 1.45 }}>{orgErrors.phone}</span>
                    </div>
                  )}
                </div>

                <div style={{ padding: "14px 16px", backgroundColor: "#F8FAFC", borderRadius: 10, border: "1px solid #E2E8F0" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", margin: "0 0 12px 0" }}>
                    Headquarters Location <span style={{ color: RED }}>*</span>
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="orgHqGov" style={labelStyle}>Governorate <span style={{ color: RED }}>*</span></label>
                      <select id="orgHqGov" value={orgForm.hqGovernorate}
                        onChange={(e) => setOrgForm((f) => ({ ...f, hqGovernorate: e.target.value }))}
                        onFocus={() => onOrgFocus("hqGovernorate")} onBlur={() => onOrgBlur("hqGovernorate")}
                        style={orgFieldStyle("hqGovernorate")}>
                        <option value="">Select governorate…</option>
                        {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                      {orgTouched.hqGovernorate && orgErrors.hqGovernorate && (
                        <div style={{ display: "flex", gap: 4, marginTop: 5, alignItems: "flex-start" }}>
                          <span style={{ color: RED, fontSize: 13, lineHeight: 1, marginTop: 1 }}>⚠</span>
                          <span style={{ fontSize: 12, color: RED, lineHeight: 1.45 }}>{orgErrors.hqGovernorate}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label htmlFor="orgHqCity" style={labelStyle}>City / District <span style={{ color: RED }}>*</span></label>
                      <input id="orgHqCity" value={orgForm.hqCity}
                        onChange={(e) => setOrgForm((f) => ({ ...f, hqCity: e.target.value }))}
                        onFocus={() => onOrgFocus("hqCity")} onBlur={() => onOrgBlur("hqCity")}
                        style={orgFieldStyle("hqCity")} placeholder="e.g. Nasr City" />
                      {orgTouched.hqCity && orgErrors.hqCity && (
                        <div style={{ display: "flex", gap: 4, marginTop: 5, alignItems: "flex-start" }}>
                          <span style={{ color: RED, fontSize: 13, lineHeight: 1, marginTop: 1 }}>⚠</span>
                          <span style={{ fontSize: 12, color: RED, lineHeight: 1.45 }}>{orgErrors.hqCity}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>
                    Other Branches <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 400 }}>(optional)</span>
                  </label>
                  <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 8px 0" }}>
                    Select any additional governorates where your organization operates.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 8px" }}>
                    {GOVERNORATES.filter((g) => g !== orgForm.hqGovernorate).map((gov) => {
                      const active = orgBranches.includes(gov);
                      return (
                        <button key={gov} type="button" onClick={() => toggleOrgBranch(gov)}
                          style={{
                            padding: "5px 10px", borderRadius: 6,
                            border: `1.5px solid ${active ? GREEN : "#E2E8F0"}`,
                            backgroundColor: active ? "#F0FDF4" : "#FAFAFA",
                            color: active ? GREEN : "#475569",
                            fontSize: 12, fontWeight: active ? 600 : 400,
                            cursor: "pointer", transition: "all 150ms",
                          }}>
                          {active ? "✓ " : ""}{gov}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label htmlFor="orgWebsite" style={labelStyle}>Website <span style={{ color: RED }}>*</span></label>
                  <input id="orgWebsite" value={orgForm.website}
                    onChange={(e) => setOrgForm((f) => ({ ...f, website: e.target.value }))}
                    onFocus={() => onOrgFocus("website")} onBlur={() => onOrgBlur("website")}
                    style={orgFieldStyle("website")} placeholder="https://www.organization.org" />
                  {orgTouched.website && orgErrors.website && (
                    <div style={{ display: "flex", gap: 4, marginTop: 5, alignItems: "flex-start" }}>
                      <span style={{ color: RED, fontSize: 13, lineHeight: 1, marginTop: 1 }}>⚠</span>
                      <span style={{ fontSize: 12, color: RED, lineHeight: 1.45 }}>{orgErrors.website}</span>
                    </div>
                  )}
                </div>



                {/* ── SECTION: Verification & Submit ─────────────────────── */}
                <SectionHeader>Verification &amp; Submit</SectionHeader>

                <div>
                  <label style={labelStyle}>Supporting Documents <span style={{ color: RED }}>*</span></label>
                  <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 8px 0" }}>
                    Upload your registration certificate, proof of activity, or any relevant documents.
                  </p>
                  <label style={{
                    display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                    padding: "10px 14px",
                    border: `1.5px dashed ${orgTouched.documents && orgErrors.documents ? RED : orgDocumentFile ? GREEN : "#CBD5E1"}`,
                    borderRadius: 8, backgroundColor: "#F8FAFC", transition: "border-color 150ms",
                  }}>
                    <span style={{ fontSize: 20, color: "#94A3B8" }}>📎</span>
                    <div>
                      <span style={{ fontSize: 13, color: orgDocumentFile ? "#1E293B" : "#64748B", fontWeight: orgDocumentFile ? 500 : 400 }}>
                        {orgDocumentFile ? orgDocumentFile.name : "Choose a file to upload"}
                      </span>
                      {!orgDocumentFile && <p style={{ fontSize: 12, color: "#94A3B8", margin: "2px 0 0 0" }}>PDF, JPG, or PNG accepted</p>}
                    </div>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => { handleOrgDocumentUpload(e); touchOrg("documents"); }}
                      style={{ display: "none" }} />
                  </label>
                  {orgTouched.documents && orgErrors.documents && (
                    <div style={{ display: "flex", gap: 4, marginTop: 5, alignItems: "flex-start" }}>
                      <span style={{ color: RED, fontSize: 13, lineHeight: 1, marginTop: 1 }}>⚠</span>
                      <span style={{ fontSize: 12, color: RED, lineHeight: 1.45 }}>{orgErrors.documents}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="orgSubmitterName" style={labelStyle}>Submitter Name <span style={{ color: RED }}>*</span></label>
                    <input id="orgSubmitterName" value={orgForm.submitterName}
                      onChange={(e) => setOrgForm((f) => ({ ...f, submitterName: e.target.value }))}
                      onFocus={() => onOrgFocus("submitterName")} onBlur={() => onOrgBlur("submitterName")}
                      style={orgFieldStyle("submitterName")} placeholder="e.g. Ahmed Mohamed" />
                    {orgTouched.submitterName && orgErrors.submitterName && (
                      <div style={{ display: "flex", gap: 4, marginTop: 5, alignItems: "flex-start" }}>
                        <span style={{ color: RED, fontSize: 13, lineHeight: 1, marginTop: 1 }}>⚠</span>
                        <span style={{ fontSize: 12, color: RED, lineHeight: 1.45 }}>{orgErrors.submitterName}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label htmlFor="orgSubmitterRole" style={labelStyle}>Your Role <span style={{ color: RED }}>*</span></label>
                    <input id="orgSubmitterRole" value={orgForm.submitterRole}
                      onChange={(e) => setOrgForm((f) => ({ ...f, submitterRole: e.target.value }))}
                      onFocus={() => onOrgFocus("submitterRole")} onBlur={() => onOrgBlur("submitterRole")}
                      style={orgFieldStyle("submitterRole")} placeholder="e.g. Founder, Director" />
                    {orgTouched.submitterRole && orgErrors.submitterRole && (
                      <div style={{ display: "flex", gap: 4, marginTop: 5, alignItems: "flex-start" }}>
                        <span style={{ color: RED, fontSize: 13, lineHeight: 1, marginTop: 1 }}>⚠</span>
                        <span style={{ fontSize: 12, color: RED, lineHeight: 1.45 }}>{orgErrors.submitterRole}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="orgNotes" style={labelStyle}>Additional Notes <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 400 }}>(optional)</span></label>
                  <textarea id="orgNotes" value={orgForm.additionalNotes}
                    onChange={(e) => setOrgForm((f) => ({ ...f, additionalNotes: e.target.value }))}
                    onFocus={() => onOrgFocus("additionalNotes")} onBlur={() => onOrgBlur("additionalNotes")}
                    placeholder="Any additional context or information for our review team…"
                    style={{ ...orgFieldStyle("additionalNotes", 80), padding: "10px 12px" }} />
                </div>

                {/* Agreements */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px", backgroundColor: "#F8FAFC", borderRadius: 10, border: "1px solid #E2E8F0" }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                    <input type="checkbox" checked={orgInfoAccurate} onChange={(e) => setOrgInfoAccurate(e.target.checked)}
                      style={{ marginTop: 2, accentColor: GREEN, width: 16, height: 16, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "#1E293B", lineHeight: 1.5 }}>
                      I confirm that the information provided is accurate and complete to the best of my knowledge.
                    </span>
                  </label>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                    <input type="checkbox" checked={orgTermsAccepted} onChange={(e) => setOrgTermsAccepted(e.target.checked)}
                      style={{ marginTop: 2, accentColor: GREEN, width: 16, height: 16, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "#1E293B", lineHeight: 1.5 }}>
                      I agree to the{" "}
                      <button type="button" onClick={() => setLegalModal("terms")}
                        style={{ color: GREEN, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, padding: 0, textDecoration: "underline" }}>
                        Terms of Service
                      </button>
                      {" "}and{" "}
                      <button type="button" onClick={() => setLegalModal("privacy")}
                        style={{ color: GREEN, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, padding: 0, textDecoration: "underline" }}>
                        Privacy Policy
                      </button>.
                    </span>
                  </label>
                </div>

                <button type="submit"
                  disabled={isSubmitting || !orgFormValid}
                  style={{
                    width: "100%", height: 44, backgroundColor: orgFormValid ? GREEN : "#94A3B8",
                    color: "#FFFFFF", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600,
                    cursor: isSubmitting ? "wait" : orgFormValid ? "pointer" : "not-allowed",
                    marginTop: 8, opacity: isSubmitting ? 0.7 : 1, transition: "background-color 150ms",
                  }}
                  onMouseEnter={(e) => { if (orgFormValid) e.currentTarget.style.backgroundColor = GREEN_HOVER; }}
                  onMouseLeave={(e) => { if (orgFormValid) e.currentTarget.style.backgroundColor = GREEN; }}>
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

