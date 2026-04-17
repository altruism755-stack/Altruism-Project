import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Navbar } from "../components/Navbar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { OrgLogo } from "../components/OrgLogos";

const GREEN = "#16A34A";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

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

const GOVERNORATES = [
  "Cairo", "Giza", "Alexandria", "Dakahlia", "Sharqia", "Qalyubia",
  "Beheira", "Gharbia", "Monufia", "Kafr El Sheikh", "Damietta",
  "Port Said", "Ismailia", "Suez", "North Sinai", "South Sinai",
  "Fayoum", "Beni Suef", "Minya", "Asyut", "Sohag", "Qena",
  "Luxor", "Aswan", "Red Sea", "New Valley", "Matrouh",
];

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
    fullName: "", phone: "", city: "", skills: "", aboutMe: "",
    dateOfBirth: "", governorate: "", email: "",
  });
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const fetchProfile = async () => {
    try {
      const volRes = await api.getVolunteerMe();
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

      const skills = (() => { try { return JSON.parse(volRes.skills || "[]"); } catch { return []; } })();
      setForm({
        fullName: volRes.name || "",
        phone: volRes.phone || "",
        city: volRes.city || "",
        skills: Array.isArray(skills) ? skills.join(", ") : "",
        aboutMe: volRes.about_me || "",
        dateOfBirth: volRes.date_of_birth || "",
        governorate: volRes.governorate || "",
        email: volRes.email || "",
      });
    } catch (e) { console.error("Failed to load profile:", e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProfile(); }, []);

  // Use volunteer.id (volunteer record ID), NOT user.id (user table ID)
  const volRecordId = volunteer?.id || 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      const skillsArray = form.skills.split(",").map((s) => s.trim()).filter(Boolean);
      await api.updateVolunteer(volRecordId, {
        name: form.fullName,
        phone: form.phone,
        city: form.city,
        skills: skillsArray,
        about_me: form.aboutMe,
        date_of_birth: form.dateOfBirth,
        governorate: form.governorate,
        email: form.email,
      });
      setEditing(false);
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
                  <button onClick={() => setEditing(false)} style={{ background: "none", border: "none", fontSize: 20, color: "#94A3B8", cursor: "pointer" }}>&times;</button>
                </div>
                {/* Read-only fields — set at registration, cannot be changed */}
                <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px 16px", marginBottom: 4 }}>
                  <p style={{ fontSize: 12, color: "#94A3B8", margin: "0 0 10px 0" }}>These details can only be changed by contacting the administration.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label style={{ ...labelStyle, color: "#94A3B8" }}>Full Name</label>
                      <div style={{ ...inputStyle, display: "flex", alignItems: "center", backgroundColor: "#F1F5F9", color: "#64748B", cursor: "not-allowed" }}>{volunteer?.name}</div>
                    </div>
                    <div>
                      <label style={{ ...labelStyle, color: "#94A3B8" }}>Date of Birth</label>
                      <div style={{ ...inputStyle, display: "flex", alignItems: "center", backgroundColor: "#F1F5F9", color: "#64748B", cursor: "not-allowed" }}>{volunteer?.date_of_birth || "—"}</div>
                    </div>
                    <div className="col-span-2">
                      <label style={{ ...labelStyle, color: "#94A3B8" }}>National ID</label>
                      <div style={{ ...inputStyle, display: "flex", alignItems: "center", backgroundColor: "#F1F5F9", color: "#64748B", cursor: "not-allowed", letterSpacing: "0.05em" }}>{volunteer?.national_id || "—"}</div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone Number</label>
                    <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Governorate</label>
                    <select value={form.governorate} onChange={(e) => setForm((f) => ({ ...f, governorate: e.target.value }))} style={inputStyle}>
                      <option value="">Select Governorate</option>
                      {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>City</label>
                    <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} style={inputStyle} />
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <label style={labelStyle}>Skills</label>
                  <textarea value={form.skills} onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))} style={{ ...inputStyle, height: 80, padding: "10px 12px", resize: "vertical" as const }} />
                  <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>Separate skills with commas</p>
                </div>
                <div style={{ marginTop: 12 }}>
                  <label style={labelStyle}>About Me</label>
                  <textarea value={form.aboutMe} onChange={(e) => setForm((f) => ({ ...f, aboutMe: e.target.value }))} style={{ ...inputStyle, height: 80, padding: "10px 12px", resize: "vertical" as const }} />
                </div>
                <div className="flex gap-3" style={{ marginTop: 20 }}>
                  <button onClick={handleSave} disabled={saving} style={{ flex: 1, height: 42, backgroundColor: saving ? "#86EFAC" : GREEN, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button onClick={() => setEditing(false)} style={{ height: 42, padding: "0 24px", backgroundColor: "#fff", color: "#64748B", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Cancel</button>
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
                    <div><label style={labelStyle}>Current Password</label><input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm((f) => ({ ...f, current: e.target.value }))} style={inputStyle} /></div>
                    <div><label style={labelStyle}>New Password</label><input type="password" value={passwordForm.newPass} onChange={(e) => setPasswordForm((f) => ({ ...f, newPass: e.target.value }))} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Confirm Password</label><input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))} style={inputStyle} /></div>
                    <button onClick={handlePasswordChange} style={{ width: "100%", height: 42, backgroundColor: "#1E293B", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Update Password</button>
                  </div>
                )}
              </div>
            )}

            {/* Profile info - shown when NOT editing */}
            {!editing && (
              <div style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24 }}>
                <h3 style={{ fontSize: 17, fontWeight: 600, color: "#1E293B", margin: "0 0 20px 0" }}>Personal Information</h3>
                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                  {[
                    { label: "Full Name", value: volunteer?.name },
                    { label: "Email", value: volunteer?.email },
                    { label: "Phone", value: volunteer?.phone || "\u2014" },
                    { label: "Date of Birth", value: volunteer?.date_of_birth || "\u2014" },
                    { label: "National ID", value: volunteer?.national_id || "\u2014" },
                    { label: "Governorate", value: volunteer?.governorate || "\u2014" },
                    { label: "City", value: volunteer?.city || "\u2014" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{item.value}</div>
                    </div>
                  ))}
                </div>
                {volunteer?.skills && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 6 }}>Skills</div>
                    <div className="flex flex-wrap gap-2">
                      {(() => { try { return JSON.parse(volunteer.skills); } catch { return []; } })().map((s: string, i: number) => (
                        <span key={i} style={{ fontSize: 12, backgroundColor: "#DCFCE7", color: "#15803D", padding: "4px 10px", borderRadius: 20, fontWeight: 500 }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {volunteer?.about_me && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 4 }}>About Me</div>
                    <div style={{ fontSize: 14, color: "#1E293B", lineHeight: 1.5 }}>{volunteer.about_me}</div>
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
