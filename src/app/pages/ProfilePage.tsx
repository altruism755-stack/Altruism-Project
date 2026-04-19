import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router";
import { Navbar } from "../components/Navbar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { OrgLogo } from "../components/OrgLogos";
import {
  GOVERNORATES, NATIONALITIES, SKILLS_LIST, AVAILABILITY_SPECIFIC,
  PROFICIENCY_LEVELS, EDUCATION_LEVELS, STUDY_YEARS,
  DEPARTMENT_GROUPS, CAUSE_GROUPS, ALL_PREDEFINED_CAUSES,
  MAX_SKILLS, MAX_CAUSES, MAX_HEALTH_NOTES, MAX_EXP_DESCRIPTION,
  MIN_HOURS, MAX_HOURS,
  type ExperienceEntry, type VolunteerEditableState, type VolunteerErrors,
  buildVolunteerPayload, buildVolunteerRegisterPayload,
  computeVolunteerErrors, getExperienceFieldError,
  isProfileFormValid, getFirstProfileError, getFirstProfileErrorField,
  createEmptyTouched, createAllTouched, shouldShowError,
} from "../data/volunteerFormSchema";


const GREEN = "#16A34A";
const RED = "#DC2626";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

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

const certTypeColors: Record<string, { bg: string; text: string }> = {
  Participation: { bg: "#DBEAFE", text: "#1D4ED8" },
  Achievement: { bg: "#FEF3C7", text: "#B45309" },
  Completion: { bg: "#DCFCE7", text: "#15803D" },
};

const statusColors: Record<string, { bg: string; text: string }> = {
  Pending: { bg: "#FEF3C7", text: "#B45309" },
  Approved: { bg: "#DCFCE7", text: "#15803D" },
  Rejected: { bg: "#FEE2E2", text: "#B91C1C" },
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function CalendarWidget({ events }: { events: { date: string; name: string }[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Map date key → events[]
  const eventsByDate = new Map<string, { date: string; name: string }[]>();
  events.forEach((e) => {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!eventsByDate.has(key)) eventsByDate.set(key, []);
    eventsByDate.get(key)!.push(e);
  });

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const today = new Date();
  const isToday = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const getDayEvents = (d: number) => eventsByDate.get(`${year}-${month}-${d}`) || [];

  const sortedEvents = [...events].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20 }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", margin: 0 }}>Upcoming Activities</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 6, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#64748B" }}
          >&#8249;</button>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", minWidth: 120, textAlign: "center" }}>{monthName}</span>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 6, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#64748B" }}
          >&#8250;</button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#94A3B8", fontWeight: 600, padding: "4px 0" }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {days.map((d, i) => {
          const dayEvents = d ? getDayEvents(d) : [];
          const count = dayEvents.length;
          const todayCell = d !== null && isToday(d);
          const isHovered = hoveredDay === d && d !== null;

          return (
            <div
              key={i}
              style={{ position: "relative" }}
              onMouseEnter={() => { if (d !== null && count > 0) setHoveredDay(d); }}
              onMouseLeave={() => setHoveredDay(null)}
            >
              <div style={{
                textAlign: "center",
                fontSize: 12,
                borderRadius: 7,
                position: "relative",
                backgroundColor: todayCell ? GREEN : (count > 0 && isHovered ? "#F0FDF4" : "transparent"),
                color: d !== null ? (todayCell ? "#fff" : "#1E293B") : "transparent",
                fontWeight: todayCell ? 700 : (count > 0 ? 600 : 400),
                cursor: count > 0 ? "pointer" : "default",
                transition: "background-color 150ms",
                minHeight: 36,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingTop: 6,
                gap: 2,
              }}>
                <span>{d ?? ""}</span>
                {d !== null && count === 1 && (
                  <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: todayCell ? "#fff" : GREEN, flexShrink: 0 }} />
                )}
                {d !== null && count > 1 && (
                  <div style={{
                    fontSize: 9, fontWeight: 700, lineHeight: "14px", minWidth: 14,
                    backgroundColor: todayCell ? "rgba(255,255,255,0.25)" : "#DCFCE7",
                    color: todayCell ? "#fff" : "#15803D",
                    borderRadius: 8, padding: "0 3px", textAlign: "center",
                  }}>{count}</div>
                )}
              </div>

              {/* Hover tooltip */}
              {d !== null && count > 0 && isHovered && (
                <div style={{
                  position: "absolute",
                  bottom: "calc(100% + 8px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  backgroundColor: "#1E293B",
                  color: "#fff",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 11,
                  zIndex: 200,
                  whiteSpace: "nowrap",
                  boxShadow: "0 6px 16px rgba(0,0,0,0.18)",
                  pointerEvents: "none",
                }}>
                  {dayEvents.map((e, idx) => (
                    <div key={idx} style={{ padding: "2px 0", display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", backgroundColor: GREEN, flexShrink: 0 }} />
                      {e.name}
                    </div>
                  ))}
                  {/* Arrow */}
                  <div style={{
                    position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                    width: 0, height: 0,
                    borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
                    borderTop: "5px solid #1E293B",
                  }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Event list */}
      <div style={{ marginTop: 16, borderTop: "1px solid #E2E8F0", paddingTop: 12 }}>
        {sortedEvents.length === 0 ? (
          <div style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", padding: "8px 0" }}>No upcoming activities.</div>
        ) : (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Scheduled</div>
            {sortedEvents.slice(0, 5).map((e, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", borderBottom: i < Math.min(sortedEvents.length, 5) - 1 ? "1px solid #F1F5F9" : "none" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: GREEN, flexShrink: 0, marginTop: 5 }} />
                <div>
                  <div style={{ fontSize: 13, color: "#1E293B", fontWeight: 500, lineHeight: 1.3 }}>{e.name}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>{e.date}</div>
                </div>
              </div>
            ))}
            {sortedEvents.length > 5 && (
              <div style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", paddingTop: 8 }}>
                +{sortedEvents.length - 5} more
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const volName = profile?.name || "Volunteer";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCauseIdx = useRef<number | null>(null);

  const [volunteer, setVolunteer] = useState<any>(null);
  const [myOrgs, setMyOrgs] = useState<any[]>([]);
  const [myCertificates, setMyCertificates] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [pendingActivities, setPendingActivities] = useState<any[]>([]);
  const [pendingApplications, setPendingApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [removingPic, setRemovingPic] = useState(false);
  const [picError, setPicError] = useState("");
  const [picSuccess, setPicSuccess] = useState("");

  const [form, setForm] = useState({
    fullName: "", phone: "", city: "", department: "",
    dateOfBirth: "", governorate: "", email: "",
    nationality: "", nationalId: "",
    gender: "", healthNotes: "", educationLevel: "", educationOther: "",
    universityName: "", faculty: "", studyYear: "", fieldOfStudy: "",
    priorExperience: null as boolean | null, priorOrg: "", hoursPerWeek: null as number | null,
  });
  
  // ── Fixed Validation State ──
  const [touched, setTouched] = useState<Record<string, boolean>>(createEmptyTouched);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const markTouched = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  
  const [formSkills, setFormSkills] = useState<string[]>([]);
  const [formCustomSkill, setFormCustomSkill] = useState("");
  const [formAvailability, setFormAvailability] = useState<string[]>([]);
  const [formLanguages, setFormLanguages] = useState<{ language: string; proficiency: string }[]>([]);
  const [formCauseAreas, setFormCauseAreas] = useState<string[]>([]);
  const [formExperiences, setFormExperiences] = useState<{ orgName: string; department: string; role: string; duration: string; description: string }[]>([]);
  const [customCauseInput, setCustomCauseInput] = useState("");
  const [formNewLang, setFormNewLang] = useState("");
  const [formNewLangProf, setFormNewLangProf] = useState("Conversational");
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fetchProfile = async () => {
    try {
      const volRes = await api.getVolunteerMe();
      console.log("[Profile] loaded volunteer data:", JSON.stringify(volRes, null, 2));
      setVolunteer(volRes);

      const orgs: any[] = volRes.organizations || [];
      setMyOrgs(orgs);
      setMyCertificates(volRes.certificates || []);

      // Fetch events only from the volunteer's ACTIVE org memberships
      const activeOrgIds = orgs
        .filter((o: any) => o.membership_status === "Active")
        .map((o: any) => o.id);

      if (activeOrgIds.length > 0) {
        try {
          const evtRes = await api.getEvents({ status: "Upcoming" });
          const filtered = (evtRes.events || []).filter((e: any) => activeOrgIds.includes(e.org_id));
          setUpcomingEvents(filtered);
        } catch { setUpcomingEvents([]); }
      }

      const allActivities = volRes.activities || [];
      setPendingActivities(allActivities.filter((a: any) => a.status === "Pending"));

      try {
        const appsRes = await api.getEventApplications();
        setPendingApplications((appsRes.applications || []).filter((a: any) => a.status === "Pending"));
      } catch { setPendingApplications([]); }

      const skills: string[] = (() => { try { return JSON.parse(volRes.skills || "[]"); } catch { return []; } })();
      const knownSkills = skills.filter((s) => SKILLS_LIST.includes(s));
      const customSkills = skills.filter((s) => !SKILLS_LIST.includes(s));
      const editSkills = customSkills.length > 0 ? [...knownSkills, "Other"] : knownSkills;
      setFormSkills(editSkills);
      setFormCustomSkill(customSkills.join(", "));

      const avail: string[] = (() => { try { return JSON.parse(volRes.availability || "[]"); } catch { return []; } })();
      setFormAvailability(avail);
      const langs: { language: string; proficiency: string }[] = (() => { try { return JSON.parse(volRes.languages || "[]"); } catch { return []; } })();
      setFormLanguages(langs.length > 0 ? langs : [{ language: "Arabic", proficiency: "Native" }]);
      const causes: string[] = (() => { try { return JSON.parse(volRes.cause_areas || "[]"); } catch { return []; } })();
      setFormCauseAreas(causes);
      const exps: { orgName: string; department: string; role: string; duration: string; description: string }[] = (() => { try { return JSON.parse(volRes.experiences || "[]"); } catch { return []; } })();
      setFormExperiences(exps);

      const rawEduLevel = volRes.education_level || "";
      const isKnownLevel = rawEduLevel === "" || (EDUCATION_LEVELS as readonly string[]).includes(rawEduLevel);
      const resolvedEduLevel = isKnownLevel ? rawEduLevel : "Other";
      const resolvedEduOther = isKnownLevel ? "" : rawEduLevel;

      setForm({
        fullName: volRes.name || "",
        phone: volRes.phone || "",
        city: volRes.city || "",
        department: volRes.department || "",
        dateOfBirth: volRes.date_of_birth || "",
        governorate: volRes.governorate || "",
        email: volRes.email || "",
        nationality: volRes.nationality || "",
        nationalId: volRes.national_id || "",
        gender: volRes.gender || "",
        healthNotes: volRes.health_notes || "",
        educationLevel: resolvedEduLevel,
        educationOther: resolvedEduOther,
        universityName: volRes.university_name || "",
        faculty: volRes.faculty || "",
        studyYear: volRes.study_year || "",
        fieldOfStudy: volRes.field_of_study || "",
        priorExperience: volRes.prior_experience === 1 ? true : volRes.prior_experience === 0 ? false : null,
        priorOrg: volRes.prior_org || "",
        hoursPerWeek: volRes.hours_per_week ?? null,
      });
    } catch (e) { console.error("Failed to load profile:", e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProfile(); }, []);

  // Use volunteer.id (volunteer record ID), NOT user.id (user table ID)
  const volRecordId = volunteer?.id || 0;

  const volunteerState: VolunteerEditableState = useMemo(() => ({
    fullName: form.fullName,
    email: form.email,
    nationality: form.nationality,
    nationalId: form.nationalId,
    dateOfBirth: form.dateOfBirth,
    governorate: form.governorate,
    phone: form.phone,
    city: form.city,
    gender: form.gender,
    healthNotes: form.healthNotes,
    educationLevel: form.educationLevel,
    educationOther: form.educationOther,
    universityName: form.universityName,
    faculty: form.faculty,
    studyYear: form.studyYear,
    fieldOfStudy: form.fieldOfStudy,
    department: form.department,
    hoursPerWeek: form.hoursPerWeek,
    skills: formSkills,
    customSkill: formCustomSkill,
    availability: formAvailability,
    languages: formLanguages,
    priorHasExperience: form.priorExperience,
    experiences: formExperiences as ExperienceEntry[],
    causeAreas: formCauseAreas,
  }), [form, formSkills, formCustomSkill, formAvailability, formLanguages, formExperiences, formCauseAreas]);

  // ── Fixed Error Logic ──
  const errors: VolunteerErrors = useMemo(() => computeVolunteerErrors(volunteerState), [volunteerState]);
  
  const showErr = (k: string) => shouldShowError(errors, touched, k, submitAttempted);
  
  const Err = ({ field }: { field: string }) => {
    const m = showErr(field);
    return m ? <div style={{ fontSize: 12, color: RED, marginTop: 4 }}>{m}</div> : null;
  };

  // Helper to apply red borders on validation error
  const getBorderStyle = (field: string) => `1.5px solid ${showErr(field) ? RED : "#E2E8F0"}`;

  const handleSave = async () => {
    // Touch every field and trigger submit state so missing-required errors surface
    setSubmitAttempted(true);
    setTouched(createAllTouched());

    if (!isProfileFormValid(errors)) {
      const msg = getFirstProfileError(errors);
      const field = getFirstProfileErrorField(errors);
      if (field) {
        document.querySelector(`[data-field="${field}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      window.alert(msg || "Please fix the highlighted errors.");
      return;
    }
    
    setSaving(true);
    try {
      const savePayload = buildVolunteerPayload(volunteerState);
      console.log("[Profile] save payload (snake_case for PUT):", JSON.stringify(savePayload, null, 2));
      console.log("[Profile] equivalent register payload (camelCase):",
        JSON.stringify(buildVolunteerRegisterPayload(volunteerState, ""), null, 2));
      const saveResult = await api.updateVolunteer(volRecordId, savePayload);
      console.log("[Profile] save response:", saveResult);
      setEditing(false);
      setSubmitAttempted(false);
      setTouched(createEmptyTouched());
      fetchProfile();
    } catch (e) { console.error("Failed to save profile:", e); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async () => {
    setPasswordError("");
    setPasswordSuccess("");
    if (passwordForm.newPass !== passwordForm.confirm) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (passwordForm.newPass.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    try {
      await api.updateVolunteer(volRecordId, {
        current_password: passwordForm.current,
        new_password: passwordForm.newPass,
      });
      setPasswordSuccess("Password updated successfully");
      setPasswordForm({ current: "", newPass: "", confirm: "" });
    } catch (e: any) {
      setPasswordError(e.message || "Failed to update password");
    }
  };

  const handleProfilePicture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPicError("");
    setPicSuccess("");
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      setPicError("Only JPG and PNG files are allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setPicError("Image must be under 2MB.");
      return;
    }
    setUploadingPic(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          await api.uploadProfilePicture(volRecordId, base64);
          setPicSuccess("Profile picture updated.");
          fetchProfile();
        } catch (err: any) {
          setPicError(err.message || "Upload failed.");
        } finally {
          setUploadingPic(false);
        }
      };
      reader.readAsDataURL(file);
    } catch { setUploadingPic(false); }
  };

  const handleRemoveProfilePicture = async () => {
    setRemovingPic(true);
    setPicError("");
    setPicSuccess("");
    try {
      await api.removeProfilePicture(volRecordId);
      setPicSuccess("Profile picture removed.");
      fetchProfile();
    } catch (err: any) {
      setPicError(err.message || "Failed to remove picture.");
    } finally {
      setRemovingPic(false);
    }
  };

  const totalHours = volunteer?.totalHours || 0;
  const totalActivities = (volunteer?.activities || []).length;
  const profilePicUrl = volunteer?.profile_picture
    ? `${API_BASE}/uploads/profiles/${volunteer.profile_picture}`
    : null;

  if (loading) return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="volunteer" userName={volName} />
      <div className="flex-1 flex items-center justify-center"><p style={{ color: "#94A3B8" }}>Loading...</p></div>
    </div>
  );

  const inputStyle = { width: "100%", height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box" as const };
  const labelStyle = { fontSize: 13, fontWeight: 500, color: "#1E293B", display: "block", marginBottom: 4 };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="volunteer" userName={volName} />

      <div className="flex-1 px-8 py-6" style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: "#1E293B", margin: 0 }}>My Profile</h1>
          {!editing && (
            <button onClick={() => setEditing(true)} style={{ height: 40, padding: "0 24px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Edit Profile
            </button>
          )}
        </div>

        <div className="flex gap-6">
          {/* Left column */}
          <div style={{ flex: "0 0 35%" }}>
            {/* Profile card */}
            <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <div className="flex flex-col items-center" style={{ marginBottom: 20 }}>
                {/* Profile picture */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <div style={{ position: "relative" }}>
                    {profilePicUrl ? (
                      <img src={profilePicUrl} alt="Profile" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: `3px solid ${GREEN}` }} />
                    ) : (
                      <div style={{ width: 80, height: 80, borderRadius: "50%", background: `linear-gradient(135deg, ${GREEN}, #22C55E)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "#fff" }}>
                        {(volunteer?.name || "").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                    )}
                    <button
                      onClick={() => { setPicError(""); setPicSuccess(""); fileInputRef.current?.click(); }}
                      style={{
                        position: "absolute", bottom: -2, right: -2, width: 28, height: 28, borderRadius: "50%",
                        backgroundColor: "#fff", border: "2px solid #E2E8F0", display: "flex", alignItems: "center",
                        justifyContent: "center", cursor: "pointer", fontSize: 14,
                      }}
                      title="Change profile picture"
                      disabled={uploadingPic}
                    >
                      {uploadingPic ? "⋯" : "✏"}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png" onChange={handleProfilePicture} style={{ display: "none" }} />
                  </div>
                  {profilePicUrl && (
                    <button
                      onClick={handleRemoveProfilePicture}
                      disabled={removingPic}
                      style={{ fontSize: 11, color: "#EF4444", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      {removingPic ? "Removing..." : "Remove photo"}
                    </button>
                  )}
                  {picError && <div style={{ fontSize: 11, color: "#DC2626", textAlign: "center" }}>{picError}</div>}
                  {picSuccess && <div style={{ fontSize: 11, color: "#15803D", textAlign: "center" }}>{picSuccess}</div>}
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, color: "#1E293B" }}>{volunteer?.name}</div>
                <div style={{ fontSize: 13, color: "#94A3B8" }}>{volunteer?.email}</div>
                {volunteer?.governorate && (
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>{volunteer.governorate}</div>
                )}
              </div>

              <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 16, marginBottom: 16 }}>
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between"><span style={{ fontSize: 13, color: "#94A3B8" }}>Total Hours</span><span style={{ fontSize: 15, fontWeight: 700, color: GREEN }}>{totalHours}</span></div>
                  <div className="flex justify-between"><span style={{ fontSize: 13, color: "#94A3B8" }}>Activities</span><span style={{ fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{totalActivities}</span></div>
                  <div className="flex justify-between"><span style={{ fontSize: 13, color: "#94A3B8" }}>Certificates</span><span style={{ fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{myCertificates.length}</span></div>
                  {volunteer?.date_of_birth && (
                    <div className="flex justify-between"><span style={{ fontSize: 13, color: "#94A3B8" }}>Date of Birth</span><span style={{ fontSize: 14, color: "#1E293B" }}>{volunteer.date_of_birth}</span></div>
                  )}
                  <div className="flex justify-between"><span style={{ fontSize: 13, color: "#94A3B8" }}>Member Since</span><span style={{ fontSize: 14, color: "#1E293B" }}>{volunteer?.created_at?.split("T")[0] || "\u2014"}</span></div>
                </div>
              </div>

              {/* My Organizations */}
              <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", marginBottom: 12 }}>
                  My Organizations ({myOrgs.filter((o: any) => o.membership_status === "Active").length} active)
                </div>
                {myOrgs.map((org: any, idx: number) => {
                  const isActive = org.membership_status === "Active";
                  return (
                    <div
                      key={org.id}
                      className="flex items-center gap-3"
                      style={{ padding: "8px 0", borderBottom: idx < myOrgs.length - 1 ? "1px solid #F1F5F9" : "none", cursor: isActive ? "pointer" : "default", borderRadius: 6, opacity: isActive ? 1 : 0.7 }}
                      onClick={() => isActive && navigate(`/dashboard/org/${org.id}`)}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 8, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <OrgLogo orgId={org.id} size={32} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#1E293B" }}>{org.name}</div>
                        <div style={{ fontSize: 11, color: "#94A3B8" }}>{org.category || "Organization"}</div>
                      </div>
                      {isActive ? (
                        <span style={{ fontSize: 10, fontWeight: 600, backgroundColor: "#DCFCE7", color: "#15803D", borderRadius: 4, padding: "2px 6px" }}>Active</span>
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 600, backgroundColor: "#FEF3C7", color: "#B45309", borderRadius: 4, padding: "2px 6px" }}>Pending</span>
                      )}
                      {isActive && <span style={{ fontSize: 16, color: "#94A3B8" }}>&rsaquo;</span>}
                    </div>
                  );
                })}
                {myOrgs.length === 0 && (
                  <div style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", padding: "12px 0" }}>
                    You haven't joined any organizations yet.{" "}
                    <a onClick={() => navigate("/dashboard/orgs")} style={{ color: GREEN, cursor: "pointer" }}>Browse organizations →</a>
                  </div>
                )}
              </div>
            </div>

            {/* Certificates */}
            <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", marginBottom: 12 }}>My Certificates ({myCertificates.length})</div>
              {myCertificates.map((cert: any, idx: number) => {
                const tc = certTypeColors[cert.type] || certTypeColors.Participation;
                return (
                  <div key={cert.id} style={{ padding: "10px 0", borderBottom: idx < myCertificates.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#1E293B" }}>{cert.event_name}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, backgroundColor: tc.bg, color: tc.text, borderRadius: 20, padding: "2px 8px" }}>{cert.type}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#94A3B8" }}>{cert.org_name} &middot; {cert.issued_date}</div>
                  </div>
                );
              })}
              {myCertificates.length === 0 && <div style={{ fontSize: 13, color: "#94A3B8" }}>No certificates yet.</div>}
            </div>

            {/* Calendar */}
            <CalendarWidget events={upcomingEvents.map((e: any) => ({ date: e.date, name: e.name }))} />
          </div>

          {/* Right column */}
          <div style={{ flex: 1 }}>
            {/* Pending Section */}
            <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, color: "#1E293B", margin: "0 0 16px 0" }}>Pending</h3>

              {pendingActivities.length === 0 && pendingApplications.length === 0 ? (
                <div style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", padding: "16px 0" }}>No pending items.</div>
              ) : (
                <>
                  {pendingActivities.length > 0 && (
                    <div style={{ marginBottom: pendingApplications.length > 0 ? 16 : 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Activity Hours</div>
                      {pendingActivities.map((a: any) => {
                        const sc = statusColors.Pending;
                        return (
                          <div key={a.id} className="flex items-center justify-between" style={{ padding: "10px 0", borderBottom: "1px solid #F1F5F9" }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{a.event_name}</div>
                              <div style={{ fontSize: 12, color: "#94A3B8" }}>{a.date} &middot; {a.hours} hrs</div>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: sc.bg, color: sc.text, borderRadius: 20, padding: "3px 10px" }}>Pending</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {pendingApplications.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Event Applications</div>
                      {pendingApplications.map((app: any) => {
                        const sc = statusColors.Pending;
                        return (
                          <div key={app.id} className="flex items-center justify-between" style={{ padding: "10px 0", borderBottom: "1px solid #F1F5F9" }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{app.event_name}</div>
                              <div style={{ fontSize: 12, color: "#94A3B8" }}>{app.org_name} &middot; {app.event_date}</div>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: sc.bg, color: sc.text, borderRadius: 20, padding: "3px 10px" }}>Pending</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Edit form - only shown when editing */}
            {editing && (
              <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, marginBottom: 20 }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 600, color: "#1E293B", margin: 0 }}>Edit Profile</h3>
                  <button onClick={() => { setEditing(false); setSubmitAttempted(false); setTouched(createEmptyTouched()); }} style={{ background: "none", border: "none", fontSize: 20, color: "#94A3B8", cursor: "pointer" }}>&times;</button>
                </div>
                
                {/* Read-only fields */}
                <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px 16px", marginBottom: 4 }}>
                  <p style={{ fontSize: 12, color: "#94A3B8", margin: "0 0 10px 0" }}>These details can only be changed by contacting the administration.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label style={{ ...labelStyle, color: "#94A3B8" }}>Full Name</label>
                      <div style={{ ...inputStyle, display: "flex", alignItems: "center", backgroundColor: "#F1F5F9", color: "#64748B", cursor: "not-allowed" }}>{volunteer?.name}</div>
                    </div>
                    <div>
                      <label style={{ ...labelStyle, color: "#94A3B8" }}>Email</label>
                      <div style={{ ...inputStyle, display: "flex", alignItems: "center", backgroundColor: "#F1F5F9", color: "#64748B", cursor: "not-allowed" }}>{volunteer?.email}</div>
                    </div>
                    <div>
                      <label style={{ ...labelStyle, color: "#94A3B8" }}>Nationality</label>
                      <div style={{ ...inputStyle, display: "flex", alignItems: "center", backgroundColor: "#F1F5F9", color: "#64748B", cursor: "not-allowed" }}>{volunteer?.nationality || "—"}</div>
                    </div>
                    <div>
                      <label style={{ ...labelStyle, color: "#94A3B8" }}>National ID</label>
                      <div style={{ ...inputStyle, display: "flex", alignItems: "center", backgroundColor: "#F1F5F9", color: "#64748B", cursor: "not-allowed", letterSpacing: "0.05em" }}>{volunteer?.national_id || "—"}</div>
                    </div>
                    <div>
                      <label style={{ ...labelStyle, color: "#94A3B8" }}>Date of Birth</label>
                      <div style={{ ...inputStyle, display: "flex", alignItems: "center", backgroundColor: "#F1F5F9", color: "#64748B", cursor: "not-allowed" }}>{volunteer?.date_of_birth || "—"}</div>
                    </div>
                  </div>
                </div>

                {/* Step 2 — Personal details */}
                <div data-field="phone" style={{ marginTop: 12 }}>
                  <label style={labelStyle}>Phone Number</label>
                  <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} onBlur={() => markTouched("phone")} style={{ ...inputStyle, border: getBorderStyle("phone") }} />
                  <Err field="phone" />
                </div>
                <div data-field="governorate" style={{ marginTop: 12 }}>
                  <label style={labelStyle}>Governorate</label>
                  <select value={form.governorate} onChange={(e) => setForm((f) => ({ ...f, governorate: e.target.value }))} onBlur={() => markTouched("governorate")} style={{ ...inputStyle, border: getBorderStyle("governorate") }}>
                    <option value="">Select Governorate</option>
                    {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <Err field="governorate" />
                </div>
                <div data-field="city" style={{ marginTop: 12 }}>
                  <label style={labelStyle}>City</label>
                  <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} onBlur={() => markTouched("city")} style={{ ...inputStyle, border: getBorderStyle("city") }} />
                  <Err field="city" />
                </div>
                
                {/* Gender */}
                <div data-field="gender" style={{ marginTop: 12 }}>
                  <label style={labelStyle}>Gender</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    {["Male", "Female"].map((g) => (
                      <button key={g} type="button" onClick={() => { setForm((f) => ({ ...f, gender: g })); markTouched("gender"); }}
                        style={{ flex: 1, height: 42, borderRadius: 8, border: `1.5px solid ${form.gender === g ? GREEN : showErr("gender") ? RED : "#E2E8F0"}`, backgroundColor: form.gender === g ? "#F0FDF4" : "#FAFAFA", color: form.gender === g ? GREEN : "#64748B", fontWeight: form.gender === g ? 600 : 400, fontSize: 14, cursor: "pointer" }}>
                        {g}
                      </button>
                    ))}
                  </div>
                  <Err field="gender" />
                </div>

                {/* Health Notes */}
                <div data-field="healthNotes" style={{ marginTop: 12 }}>
                  <label style={labelStyle}>Health / Mobility Notes <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: 12 }}>(optional)</span></label>
                  <textarea value={form.healthNotes} onChange={(e) => setForm((f) => ({ ...f, healthNotes: e.target.value.slice(0, MAX_HEALTH_NOTES) }))}
                    placeholder="Any physical limitations organizations should know about..."
                    style={{ ...inputStyle, height: 80, padding: "10px 12px", resize: "vertical" as const, border: getBorderStyle("healthNotes") }} />
                  <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "right", marginTop: 2 }}>{form.healthNotes.length}/{MAX_HEALTH_NOTES}</div>
                </div>

                {/* Education Level */}
                <div data-field="educationLevel" style={{ marginTop: 12 }}>
                  <label style={labelStyle}>Education Level</label>
                  <select value={form.educationLevel} onBlur={() => markTouched("educationLevel")} onChange={(e) => setForm((f) => ({ ...f, educationLevel: e.target.value, educationOther: "", universityName: "", faculty: "", studyYear: "", fieldOfStudy: "" }))} style={{ ...inputStyle, border: getBorderStyle("educationLevel") }}>
                    <option value="">Select education level...</option>
                    {EDUCATION_LEVELS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                  <Err field="educationLevel" />
                  {form.educationLevel === "University Student" && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div data-field="universityName">
                        <label style={labelStyle}>University Name</label>
                        <input value={form.universityName} onChange={(e) => setForm((f) => ({ ...f, universityName: e.target.value }))} onBlur={() => markTouched("universityName")} style={{ ...inputStyle, border: getBorderStyle("universityName") }} placeholder="e.g. Cairo University" />
                        <Err field="universityName" />
                      </div>
                      <div data-field="faculty">
                        <label style={labelStyle}>Faculty / Major</label>
                        <input value={form.faculty} onChange={(e) => setForm((f) => ({ ...f, faculty: e.target.value }))} onBlur={() => markTouched("faculty")} style={{ ...inputStyle, border: getBorderStyle("faculty") }} placeholder="e.g. Computer Science" />
                        <Err field="faculty" />
                      </div>
                      <div data-field="studyYear">
                        <label style={labelStyle}>Academic Year</label>
                        <select value={form.studyYear} onChange={(e) => setForm((f) => ({ ...f, studyYear: e.target.value }))} onBlur={() => markTouched("studyYear")} style={{ ...inputStyle, border: getBorderStyle("studyYear") }}>
                          <option value="">Select year...</option>
                          {STUDY_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <Err field="studyYear" />
                      </div>
                    </div>
                  )}
                  {(form.educationLevel === "University Graduate" || form.educationLevel === "Postgraduate (Diploma / Master / PhD)") && (
                    <div data-field="fieldOfStudy" style={{ marginTop: 10 }}>
                      <label style={labelStyle}>Field of Study</label>
                      <input value={form.fieldOfStudy} onChange={(e) => setForm((f) => ({ ...f, fieldOfStudy: e.target.value }))} onBlur={() => markTouched("fieldOfStudy")} style={{ ...inputStyle, border: getBorderStyle("fieldOfStudy") }} placeholder="e.g. Engineering, Medicine..." />
                      <Err field="fieldOfStudy" />
                    </div>
                  )}
                  {form.educationLevel === "Other" && (
                    <div data-field="educationOther" style={{ marginTop: 10 }}>
                      <label style={labelStyle}>Please describe your education background</label>
                      <input value={form.educationOther} onChange={(e) => setForm((f) => ({ ...f, educationOther: e.target.value }))} onBlur={() => markTouched("educationOther")} style={{ ...inputStyle, border: getBorderStyle("educationOther") }} placeholder="e.g. Self-taught, Vocational Training..." />
                      <Err field="educationOther" />
                    </div>
                  )}
                </div>

                {/* Step 3 — Preferred Department */}
                <div data-field="department" style={{ marginTop: 12 }}>
                  <label style={labelStyle}>Preferred Department <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: 12 }}>(optional)</span></label>
                  <select value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} style={{ ...inputStyle, border: getBorderStyle("department") }}>
                    <option value="">Select a department…</option>
                    {DEPARTMENT_GROUPS.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Skills */}
                <div data-field="skills" style={{ marginTop: 12 }}>
                  <label style={labelStyle}>Skills</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px", marginTop: 4 }}>
                    {SKILLS_LIST.map((skill) => (
                      <label key={skill} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#1E293B", padding: "7px 10px", borderRadius: 7, border: `1.5px solid ${formSkills.includes(skill) ? GREEN : "#E2E8F0"}`, backgroundColor: formSkills.includes(skill) ? "#F0FDF4" : "#FAFAFA", transition: "all 150ms", userSelect: "none" as const }}>
                        <input
                          type="checkbox"
                          checked={formSkills.includes(skill)}
                          onChange={() => setFormSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : (prev.length >= MAX_SKILLS ? prev : [...prev, skill]))}
                          style={{ accentColor: GREEN, width: 14, height: 14, flexShrink: 0 }}
                        />
                        {skill}
                      </label>
                    ))}
                  </div>
                  {formSkills.includes("Other") && (
                    <input
                      value={formCustomSkill}
                      onChange={(e) => setFormCustomSkill(e.target.value)}
                      onBlur={() => markTouched("skills")}
                      placeholder="Describe your skill(s), comma-separated..."
                      style={{ ...inputStyle, marginTop: 8, border: getBorderStyle("skills") }}
                    />
                  )}
                  <Err field="skills" />
                </div>

                {/* Availability */}
                <div style={{ marginTop: 16 }}>
                  <label style={labelStyle}>Availability <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: 12 }}>(optional)</span></label>
                  <p style={{ fontSize: 12, color: "#94A3B8", margin: "0 0 12px 0" }}>Select all time slots that match your availability.</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, opacity: formAvailability.includes("Flexible") ? 0.45 : 1, transition: "opacity 200ms ease" }}>
                    {AVAILABILITY_SPECIFIC.map((opt) => {
                      const active = formAvailability.includes(opt);
                      return (
                        <button key={opt} type="button"
                          onClick={() => setFormAvailability((prev) => {
                            const without = prev.filter((a) => a !== "Flexible");
                            const next = without.includes(opt) ? without.filter((a) => a !== opt) : [...without, opt];
                            const allSpecific = AVAILABILITY_SPECIFIC.every((s) => next.includes(s));
                            return allSpecific ? ["Flexible"] : next;
                          })}
                          style={{ height: 34, padding: "0 14px", borderRadius: 20, border: `1.5px solid ${active ? GREEN : "#D1D5DB"}`, backgroundColor: active ? "#DCFCE7" : "#FFFFFF", color: active ? "#15803D" : "#4B5563", fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer", transition: "all 150ms", userSelect: "none" as const, display: "flex", alignItems: "center", gap: 6 }}>
                          {active && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="#15803D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0 12px 0" }}>
                    <div style={{ flex: 1, height: 1, backgroundColor: "#F1F5F9" }} />
                    <span style={{ fontSize: 11, color: "#CBD5E1", fontWeight: 500, letterSpacing: "0.06em" }}>or</span>
                    <div style={{ flex: 1, height: 1, backgroundColor: "#F1F5F9" }} />
                  </div>
                  <button type="button"
                    onClick={() => setFormAvailability((prev) => prev.includes("Flexible") ? [] : ["Flexible"])}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 10, cursor: "pointer", border: `1.5px solid ${formAvailability.includes("Flexible") ? GREEN : "#E2E8F0"}`, backgroundColor: formAvailability.includes("Flexible") ? "#F0FDF4" : "#FFFFFF", transition: "all 150ms", textAlign: "left" as const }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, border: `2px solid ${formAvailability.includes("Flexible") ? GREEN : "#D1D5DB"}`, backgroundColor: formAvailability.includes("Flexible") ? GREEN : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 150ms" }}>
                      {formAvailability.includes("Flexible") && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: formAvailability.includes("Flexible") ? GREEN : "#1E293B" }}>Flexible</div>
                      <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 1 }}>Open to any time slot</div>
                    </div>
                  </button>
                </div>

                {/* Hours per week */}
                <div style={{ marginTop: 16 }}>
                  <label style={labelStyle}>
                    Estimated hours per week{" "}
                    <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: 12 }}>(optional)</span>
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input
                      type="number" min={MIN_HOURS} max={MAX_HOURS} step={1}
                      value={form.hoursPerWeek ?? ""}
                      placeholder="e.g., 5"
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") { setForm((f) => ({ ...f, hoursPerWeek: null })); return; }
                        const v = Math.min(MAX_HOURS, Math.max(MIN_HOURS, parseInt(raw)));
                        if (!isNaN(v)) setForm((f) => ({ ...f, hoursPerWeek: v }));
                      }}
                      style={{
                        width: 120, height: 42, outline: "none", boxSizing: "border-box" as const,
                        border: "1.5px solid #E2E8F0", borderRadius: 8,
                        padding: "0 12px", fontSize: 14, backgroundColor: "#FFFFFF",
                      }}
                    />
                    <span style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>hrs / week</span>
                  </div>
                </div>

                {/* Languages */}
                <div data-field="languages" style={{ marginTop: 16 }}>
                  <label style={labelStyle}>Languages Spoken</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                    {formLanguages.map((lang, idx) => (
                      <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={{ flex: 1, height: 38, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 14, display: "flex", alignItems: "center", backgroundColor: "#F8FAFC" }}>{lang.language}</div>
                        <select value={lang.proficiency} onChange={(e) => setFormLanguages((prev) => prev.map((l, i) => i === idx ? { ...l, proficiency: e.target.value } : l))}
                          style={{ height: 38, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 8px", fontSize: 13, outline: "none", backgroundColor: "#FFFFFF" }}>
                          {PROFICIENCY_LEVELS.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                        {formLanguages.length > 1 && (
                          <button type="button" onClick={() => setFormLanguages((prev) => prev.filter((_, i) => i !== idx))}
                            style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px solid #E2E8F0", background: "#fff", color: "#94A3B8", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={formNewLang} onChange={(e) => setFormNewLang(e.target.value)}
                      placeholder="Add a language..." style={{ flex: 1, height: 38, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px", fontSize: 13, outline: "none", boxSizing: "border-box" as const }} />
                    <select value={formNewLangProf} onChange={(e) => setFormNewLangProf(e.target.value)}
                      style={{ height: 38, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 8px", fontSize: 13, outline: "none", backgroundColor: "#FFFFFF" }}>
                      {PROFICIENCY_LEVELS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <button type="button" onClick={() => { if (!formNewLang.trim()) return; setFormLanguages((prev) => [...prev, { language: formNewLang.trim(), proficiency: formNewLangProf }]); setFormNewLang(""); }}
                      style={{ height: 38, padding: "0 14px", borderRadius: 8, border: `1.5px solid ${GREEN}`, backgroundColor: "#F0FDF4", color: GREEN, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      + Add
                    </button>
                  </div>
                  <Err field="languages" />
                </div>

                {/* Prior Volunteer Experience */}
                <div data-field="priorExperiences" style={{ marginTop: 16 }}>
                  <label style={labelStyle}>Prior Volunteer Experience <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: 12 }}>(optional)</span></label>
                  <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 8px 0" }}>Have you volunteered with any organization before?</p>
                  <div style={{ display: "flex", gap: 10 }}>
                    {([true, false] as const).map((val) => (
                      <button key={String(val)} type="button"
                        onClick={() => {
                          setForm((f) => ({ ...f, priorExperience: val }));
                          if (!val) setFormExperiences([]);
                          else if (formExperiences.length === 0) setFormExperiences([{ orgName: "", department: "", role: "", duration: "", description: "" }]);
                        }}
                        style={{ flex: 1, height: 42, borderRadius: 8, border: `1.5px solid ${form.priorExperience === val ? GREEN : "#E2E8F0"}`, backgroundColor: form.priorExperience === val ? "#F0FDF4" : "#FAFAFA", color: form.priorExperience === val ? GREEN : "#64748B", fontWeight: form.priorExperience === val ? 600 : 400, fontSize: 14, cursor: "pointer" }}>
                        {val ? "Yes" : "No"}
                      </button>
                    ))}
                  </div>
                  {form.priorExperience && (
                    <div style={{ marginTop: 14 }}>
                      <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 12px 0" }}>Please add at least one experience.</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {formExperiences.map((exp, idx) => (
                          <div key={idx} style={{ border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "16px 16px 14px", backgroundColor: "#FAFAFA" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Experience {idx + 1}</span>
                              <button type="button" onClick={() => setFormExperiences((prev) => prev.filter((_, i) => i !== idx))}
                                style={{ width: 28, height: 28, borderRadius: 6, border: "1.5px solid #E2E8F0", background: "#fff", color: "#94A3B8", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                            </div>
                            <div style={{ marginBottom: 10 }}>
                              <label style={{ ...labelStyle, fontSize: 12 }}>Organization Name <span style={{ color: "#DC2626" }}>*</span></label>
                              <input value={exp.orgName}
                                onBlur={() => markTouched(`exp_${idx}_orgName`)}
                                onChange={(e) => setFormExperiences((prev) => prev.map((x, i) => i === idx ? { ...x, orgName: e.target.value } : x))}
                                placeholder="e.g. Resala, Egyptian Red Crescent…"
                                style={inputStyle} />
                              {touched[`exp_${idx}_orgName`] && getExperienceFieldError(exp, "orgName") && (
                                <div style={{ fontSize: 12, color: RED, marginTop: 4 }}>{getExperienceFieldError(exp, "orgName")}</div>
                              )}
                            </div>
                            <div style={{ marginBottom: 10 }}>
                              <label style={{ ...labelStyle, fontSize: 12 }}>Department <span style={{ color: "#DC2626" }}>*</span></label>
                              <select value={exp.department}
                                onBlur={() => markTouched(`exp_${idx}_department`)}
                                onChange={(e) => setFormExperiences((prev) => prev.map((x, i) => i === idx ? { ...x, department: e.target.value } : x))}
                                style={inputStyle}>
                                <option value="">Select department…</option>
                                {DEPARTMENT_GROUPS.map((group) => (
                                  <optgroup key={group.label} label={group.label}>
                                    {group.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                  </optgroup>
                                ))}
                              </select>
                              {touched[`exp_${idx}_department`] && getExperienceFieldError(exp, "department") && (
                                <div style={{ fontSize: 12, color: RED, marginTop: 4 }}>{getExperienceFieldError(exp, "department")}</div>
                              )}
                            </div>
                            <div style={{ marginBottom: 10 }}>
                              <label style={{ ...labelStyle, fontSize: 12 }}>Role / Position <span style={{ color: "#94A3B8", fontWeight: 400 }}>(optional)</span></label>
                              <input value={exp.role}
                                onChange={(e) => setFormExperiences((prev) => prev.map((x, i) => i === idx ? { ...x, role: e.target.value } : x))}
                                placeholder="e.g. Team Leader, Coordinator…"
                                style={inputStyle} />
                            </div>
                            <div style={{ marginBottom: 10 }}>
                              <label style={{ ...labelStyle, fontSize: 12 }}>Duration <span style={{ color: "#94A3B8", fontWeight: 400 }}>(optional)</span></label>
                              <input value={exp.duration}
                                onChange={(e) => setFormExperiences((prev) => prev.map((x, i) => i === idx ? { ...x, duration: e.target.value } : x))}
                                placeholder="e.g. 6 months, Jan 2023 – Jun 2023…"
                                style={inputStyle} />
                            </div>
                            <div>
                              <label style={{ ...labelStyle, fontSize: 12 }}>Description <span style={{ color: "#94A3B8", fontWeight: 400 }}>(optional)</span></label>
                              <textarea value={exp.description}
                                onChange={(e) => setFormExperiences((prev) => prev.map((x, i) => i === idx ? { ...x, description: e.target.value.slice(0, MAX_EXP_DESCRIPTION) } : x))}
                                placeholder="Briefly describe what you did…"
                                style={{ ...inputStyle, height: 72, padding: "8px 12px", resize: "vertical" as const }} />
                              <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "right", marginTop: 1 }}>{exp.description.length}/{MAX_EXP_DESCRIPTION}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button type="button"
                        onClick={() => setFormExperiences((prev) => [...prev, { orgName: "", department: "", role: "", duration: "", description: "" }])}
                        style={{ marginTop: 12, height: 38, padding: "0 16px", borderRadius: 8, border: `1.5px solid ${GREEN}`, backgroundColor: "#F0FDF4", color: GREEN, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        + Add Experience
                      </button>
                    </div>
                  )}
                  <Err field="priorExperiences" />
                </div>

                {/* Cause Areas */}
                <div style={{ marginTop: 16 }}>
                  <label style={labelStyle}>Cause Areas / Interests <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: 12 }}>(optional)</span></label>
                  <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 14px 0" }}>Rank the causes based on your interest (most preferred first) — up to {MAX_CAUSES}</p>

                  {/* Ranked priority list */}
                  {formCauseAreas.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 8 }}>
                        Your Priorities ({formCauseAreas.length}/{MAX_CAUSES}) — drag to reorder
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {formCauseAreas.map((cause, idx) => {
                          const isCustom = !ALL_PREDEFINED_CAUSES.has(cause);
                          const accent = isCustom ? "#2563EB" : GREEN;
                          const bg = isCustom ? "#EFF6FF" : "#F0FDF4";
                          return (
                            <div key={cause} draggable
                              onDragStart={() => { dragCauseIdx.current = idx; }}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (dragCauseIdx.current !== null && dragCauseIdx.current !== idx) {
                                  setFormCauseAreas((prev) => {
                                    const next = [...prev];
                                    const [item] = next.splice(dragCauseIdx.current!, 1);
                                    next.splice(idx, 0, item);
                                    return next;
                                  });
                                }
                                dragCauseIdx.current = null;
                              }}
                              style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${accent}`, backgroundColor: bg, cursor: "grab", userSelect: "none" as const }}>
                              <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: accent, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{idx + 1}</div>
                              <span style={{ color: isCustom ? "#93C5FD" : "#86EFAC", fontSize: 15, lineHeight: 1, flexShrink: 0 }}>⠿</span>
                              <span style={{ flex: 1, fontSize: 13, color: isCustom ? "#1D4ED8" : "#15803D", fontWeight: 500, fontStyle: isCustom ? "italic" : "normal" }}>{cause}</span>
                              <button type="button" onClick={() => setFormCauseAreas((prev) => prev.map((c, i) => i === idx - 1 ? prev[idx] : i === idx ? prev[idx - 1] : c))}
                                disabled={idx === 0}
                                style={{ width: 26, height: 26, borderRadius: 6, border: "1.5px solid #BBF7D0", background: "#fff", color: idx === 0 ? "#D1FAE5" : GREEN, cursor: idx === 0 ? "default" : "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>↑</button>
                              <button type="button" onClick={() => setFormCauseAreas((prev) => prev.map((c, i) => i === idx + 1 ? prev[idx] : i === idx ? prev[idx + 1] : c))}
                                disabled={idx === formCauseAreas.length - 1}
                                style={{ width: 26, height: 26, borderRadius: 6, border: "1.5px solid #BBF7D0", background: "#fff", color: idx === formCauseAreas.length - 1 ? "#D1FAE5" : GREEN, cursor: idx === formCauseAreas.length - 1 ? "default" : "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>↓</button>
                              <button type="button" onClick={() => setFormCauseAreas((prev) => prev.filter((_, i) => i !== idx))}
                                style={{ width: 26, height: 26, borderRadius: 6, border: "1.5px solid #BBF7D0", background: "#fff", color: "#94A3B8", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#DC2626"; e.currentTarget.style.color = "#DC2626"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#BBF7D0"; e.currentTarget.style.color = "#94A3B8"; }}>×</button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Available cause pool */}
                  {formCauseAreas.length < MAX_CAUSES ? (
                    <div style={{ border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "14px 16px", backgroundColor: "#FAFAFA" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 12 }}>
                        {formCauseAreas.length === 0 ? "Select causes to rank" : "Add more"}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {CAUSE_GROUPS.map((group) => {
                          const available = group.causes.filter((c) => !formCauseAreas.includes(c));
                          if (available.length === 0) return null;
                          return (
                            <div key={group.label}>
                              <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginBottom: 6 }}>{group.label}</div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {available.map((cause) => (
                                  <button key={cause} type="button"
                                    onClick={() => setFormCauseAreas((prev) => prev.length < MAX_CAUSES ? [...prev, cause] : prev)}
                                    style={{ height: 30, padding: "0 12px", borderRadius: 20, border: "1.5px solid #E2E8F0", backgroundColor: "#fff", color: "#374151", fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 150ms", display: "flex", alignItems: "center", gap: 4 }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = GREEN; e.currentTarget.style.color = GREEN; e.currentTarget.style.backgroundColor = "#F0FDF4"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.color = "#374151"; e.currentTarget.style.backgroundColor = "#fff"; }}>
                                    <span style={{ fontSize: 11, opacity: 0.6 }}>+</span> {cause}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #E2E8F0" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 8 }}>Add Custom Interest</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input value={customCauseInput} onChange={(e) => setCustomCauseInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const text = customCauseInput.trim(); if (text.length >= 2 && !formCauseAreas.some((c) => c.toLowerCase() === text.toLowerCase()) && formCauseAreas.length < MAX_CAUSES) { setFormCauseAreas((prev) => [...prev, text]); setCustomCauseInput(""); } } }}
                            placeholder="e.g. Street Arts, Sports for Youth…" maxLength={60}
                            style={{ flex: 1, height: 36, padding: "0 12px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, color: "#1E293B", outline: "none", backgroundColor: "#fff" }} />
                          <button type="button"
                            onClick={() => { const text = customCauseInput.trim(); if (text.length >= 2 && !formCauseAreas.some((c) => c.toLowerCase() === text.toLowerCase()) && formCauseAreas.length < MAX_CAUSES) { setFormCauseAreas((prev) => [...prev, text]); setCustomCauseInput(""); } }}
                            disabled={customCauseInput.trim().length < 2}
                            style={{ height: 36, padding: "0 14px", borderRadius: 8, border: `1.5px solid ${customCauseInput.trim().length >= 2 ? GREEN : "#E2E8F0"}`, backgroundColor: customCauseInput.trim().length >= 2 ? "#F0FDF4" : "#F8FAFC", color: customCauseInput.trim().length >= 2 ? GREEN : "#CBD5E1", fontSize: 13, fontWeight: 600, cursor: customCauseInput.trim().length >= 2 ? "pointer" : "default", transition: "all 150ms", flexShrink: 0 }}>
                            + Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: "10px 14px", borderRadius: 9, backgroundColor: "#F0FDF4", border: "1.5px solid #BBF7D0", fontSize: 12, color: "#15803D", textAlign: "center" as const }}>
                      Maximum {MAX_CAUSES} causes selected — remove one to add another
                    </div>
                  )}
                </div>

                <div className="flex gap-3" style={{ marginTop: 20 }}>
                  <button onClick={handleSave} disabled={saving} style={{ flex: 1, height: 42, backgroundColor: saving ? "#86EFAC" : GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button onClick={() => { setEditing(false); setSubmitAttempted(false); setTouched(createEmptyTouched()); }} style={{ height: 42, padding: "0 24px", backgroundColor: "#fff", color: "#64748B", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Change Password - only in edit mode */}
            {editing && (
              <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
                <button onClick={() => setShowPasswordSection(!showPasswordSection)} className="flex items-center justify-between w-full" style={{ padding: "16px 24px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 15, fontWeight: 500, color: "#1E293B" }}>Change Password</span>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: showPasswordSection ? "rotate(180deg)" : "none", transition: "transform 200ms", flexShrink: 0 }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {showPasswordSection && (
                  <div className="px-6 pb-6 flex flex-col gap-4" style={{ borderTop: "1px solid #E2E8F0", paddingTop: 20 }}>
                    {passwordError && <div style={{ fontSize: 13, color: "#DC2626", backgroundColor: "#FEE2E2", padding: "8px 12px", borderRadius: 6 }}>{passwordError}</div>}
                    {passwordSuccess && <div style={{ fontSize: 13, color: "#15803D", backgroundColor: "#DCFCE7", padding: "8px 12px", borderRadius: 6 }}>{passwordSuccess}</div>}
                    <div>
                      <label style={labelStyle}>Current Password</label>
                      <div style={{ position: "relative" }}>
                        <input type={showCurrentPassword ? "text" : "password"} value={passwordForm.current} onChange={(e) => setPasswordForm((f) => ({ ...f, current: e.target.value }))} style={{ ...inputStyle, paddingRight: 44 }} />
                        <button type="button" onClick={() => setShowCurrentPassword((s) => !s)} aria-label={showCurrentPassword ? "Hide password" : "Show password"} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8", display: "flex", alignItems: "center", padding: 0 }}>
                          {showCurrentPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>New Password</label>
                      <div style={{ position: "relative" }}>
                        <input type={showNewPassword ? "text" : "password"} value={passwordForm.newPass} onChange={(e) => setPasswordForm((f) => ({ ...f, newPass: e.target.value }))} style={{ ...inputStyle, paddingRight: 44 }} />
                        <button type="button" onClick={() => setShowNewPassword((s) => !s)} aria-label={showNewPassword ? "Hide password" : "Show password"} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8", display: "flex", alignItems: "center", padding: 0 }}>
                          {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Confirm Password</label>
                      <div style={{ position: "relative" }}>
                        <input type={showConfirmPassword ? "text" : "password"} value={passwordForm.confirm} onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))} style={{ ...inputStyle, paddingRight: 44 }} />
                        <button type="button" onClick={() => setShowConfirmPassword((s) => !s)} aria-label={showConfirmPassword ? "Hide password" : "Show password"} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8", display: "flex", alignItems: "center", padding: 0 }}>
                          {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </div>
                    </div>
                    <button onClick={handlePasswordChange} style={{ width: "100%", height: 42, backgroundColor: "#1E293B", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Update Password</button>
                  </div>
                )}
              </div>
            )}

            {/* Profile info - shown when NOT editing */}
            {!editing && (
              <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24 }}>
                <h3 style={{ fontSize: 17, fontWeight: 600, color: "#1E293B", margin: "0 0 20px 0" }}>Personal Information</h3>
                {/* Grid order matches registration Step 1 → Step 2 → Step 3 */}
                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                  {[
                    { label: "Full Name",           value: volunteer?.name },
                    { label: "Email",               value: volunteer?.email },
                    { label: "Nationality",         value: volunteer?.nationality || "\u2014" },
                    { label: "National ID",         value: volunteer?.national_id || "\u2014" },
                    { label: "Date of Birth",       value: volunteer?.date_of_birth || "\u2014" },
                    { label: "Governorate",         value: volunteer?.governorate || "\u2014" },
                    { label: "Phone",               value: volunteer?.phone || "\u2014" },
                    { label: "City",               value: volunteer?.city || "\u2014" },
                    { label: "Gender",              value: volunteer?.gender || "\u2014" },
                    { label: "Education",           value: volunteer?.education_level || "\u2014" },
                    ...(volunteer?.university_name ? [{ label: "University",      value: volunteer.university_name }] : []),
                    ...(volunteer?.faculty         ? [{ label: "Faculty / Major", value: volunteer.faculty }] : []),
                    ...(volunteer?.study_year      ? [{ label: "Academic Year",   value: volunteer.study_year }] : []),
                    ...(volunteer?.field_of_study  ? [{ label: "Field of Study",  value: volunteer.field_of_study }] : []),
                    ...(volunteer?.department      ? [{ label: "Preferred Department", value: volunteer.department }] : []),
                    { label: "Hrs / Week",          value: volunteer?.hours_per_week ? `${volunteer.hours_per_week} hrs` : "\u2014" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {/* Health Notes — Step 2 */}
                {volunteer?.health_notes && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 4 }}>Health / Mobility Notes</div>
                    <div style={{ fontSize: 14, color: "#1E293B", lineHeight: 1.5 }}>{volunteer.health_notes}</div>
                  </div>
                )}

                {/* Skills — Step 3 */}
                {volunteer?.skills && (() => { try { return JSON.parse(volunteer.skills); } catch { return []; } })().length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 6 }}>Skills</div>
                    <div className="flex flex-wrap gap-2">
                      {((() => { try { return JSON.parse(volunteer.skills); } catch { return []; } })() as string[]).map((s: string, i: number) => (
                        <span key={i} style={{ fontSize: 12, backgroundColor: "#DCFCE7", color: "#15803D", padding: "4px 10px", borderRadius: 20, fontWeight: 500 }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Availability — Step 3 */}
                {volunteer?.availability && (() => { try { return JSON.parse(volunteer.availability); } catch { return []; } })().length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 6 }}>Availability</div>
                    <div className="flex flex-wrap gap-2">
                      {((() => { try { return JSON.parse(volunteer.availability); } catch { return []; } })() as string[]).map((a: string, i: number) => (
                        <span key={i} style={{ fontSize: 12, backgroundColor: "#EFF6FF", color: "#2563EB", padding: "4px 10px", borderRadius: 20, fontWeight: 500 }}>{a}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Languages — Step 3 */}
                {volunteer?.languages && (() => { try { return JSON.parse(volunteer.languages); } catch { return []; } })().length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 6 }}>Languages</div>
                    <div className="flex flex-wrap gap-2">
                      {((() => { try { return JSON.parse(volunteer.languages); } catch { return []; } })() as { language: string; proficiency: string }[]).map((l, i) => (
                        <span key={i} style={{ fontSize: 12, backgroundColor: "#F5F3FF", color: "#7C3AED", padding: "4px 10px", borderRadius: 20, fontWeight: 500 }}>{l.language} — {l.proficiency}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prior Experience — Step 3 */}
                {volunteer?.prior_experience === 1 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 6 }}>Prior Volunteer Experience</div>
                    {(() => {
                      const exps: { orgName: string; department: string; role: string; duration: string; description: string }[] =
                        (() => { try { return JSON.parse(volunteer.experiences || "[]"); } catch { return []; } })();
                      if (exps.length > 0) {
                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {exps.map((exp, i) => (
                              <div key={i} style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 12px" }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>{exp.orgName}</div>
                                {(exp.department || exp.role) && (
                                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                                    {[exp.department, exp.role].filter(Boolean).join(" · ")}
                                  </div>
                                )}
                                {exp.duration && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 1 }}>{exp.duration}</div>}
                                {exp.description && <div style={{ fontSize: 12, color: "#475569", marginTop: 4, lineHeight: 1.4 }}>{exp.description}</div>}
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return <div style={{ fontSize: 14, color: "#1E293B" }}>{volunteer.prior_org || "Yes"}</div>;
                    })()}
                  </div>
                )}

                {/* Cause Areas — Step 3 */}
                {volunteer?.cause_areas && (() => { try { return JSON.parse(volunteer.cause_areas); } catch { return []; } })().length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 6 }}>Cause Areas</div>
                    <div className="flex flex-wrap gap-2">
                      {((() => { try { return JSON.parse(volunteer.cause_areas); } catch { return []; } })() as string[]).map((c: string, i: number) => (
                        <span key={i} style={{ fontSize: 12, backgroundColor: "#FFF7ED", color: "#C2410C", padding: "4px 10px", borderRadius: 20, fontWeight: 500 }}>{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}