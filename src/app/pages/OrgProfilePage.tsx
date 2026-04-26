import { useEffect, useMemo, useState } from "react";
import { Navbar } from "../components/Navbar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const GREEN = "#16A34A";
const GREEN_HOVER = "#15803D";
const BORDER = "#E2E8F0";
const TEXT = "#1E293B";
const MUTED = "#64748B";
const LOCK = "#94A3B8";

const inputStyle: React.CSSProperties = {
  width: "100%", height: 42, border: `1.5px solid ${BORDER}`, borderRadius: 8,
  padding: "0 12px", fontSize: 14, outline: "none", boxSizing: "border-box",
  backgroundColor: "#fff", color: TEXT,
};
const lockedStyle: React.CSSProperties = {
  ...inputStyle, backgroundColor: "#F1F5F9", color: MUTED, cursor: "not-allowed",
};
const labelStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 500, color: TEXT, display: "block", marginBottom: 6,
};

const EDITABLE = ["description", "logo_url", "category", "location", "phone", "website"] as const;
const SENSITIVE = ["name", "official_email"] as const;

type FormState = {
  name: string;
  official_email: string;
  description: string;
  logo_url: string;
  category: string;
  location: string;
  phone: string;
  website: string;
};

const EMPTY: FormState = {
  name: "", official_email: "", description: "", logo_url: "",
  category: "", location: "", phone: "", website: "",
};

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function OrgProfilePage() {
  const { profile: authProfile } = useAuth();

  const [org, setOrg] = useState<any>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [pendingChanges, setPendingChanges] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "info" | "success" | "review"; text: string } | null>(null);
  const [sensitiveTouched, setSensitiveTouched] = useState<Record<string, boolean>>({});

  const orgFromData = (o: any): FormState => ({
    name: o.name || "",
    official_email: o.official_email || "",
    description: o.description || "",
    logo_url: o.logo_url || "",
    category: o.category || "",
    location: o.location || "",
    phone: o.phone || "",
    website: o.website || "",
  });

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await api.getMyOrgProfile();
      const o = res.organization || {};
      setOrg(o);
      setForm(orgFromData(o));
      setPendingChanges(res.pending_changes || []);
    } catch (e) {
      console.error("Failed to load org profile", e);
      // Fall back to the cached auth profile (populated at login) so the
      // page is still usable without a live backend call (e.g. demo mode).
      if (authProfile && !authProfile._demo) {
        setOrg(authProfile);
        setForm(orgFromData(authProfile));
      } else if (authProfile?._demo) {
        // Demo profiles only carry id + name — show what we have.
        setOrg(authProfile);
        setForm({ ...EMPTY, name: authProfile.name || "" });
      } else {
        setNotice({ kind: "info", text: "Could not load profile. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const orgName = authProfile?.name || org?.name || "Organization";

  const sensitiveDirty = useMemo(
    () => SENSITIVE.some((f) => (form[f] || "") !== (org?.[f] || "")),
    [form, org],
  );

  const onCancel = () => {
    if (!org) return;
    setForm({
      name: org.name || "",
      official_email: org.official_email || "",
      description: org.description || "",
      logo_url: org.logo_url || "",
      category: org.category || "",
      location: org.location || "",
      phone: org.phone || "",
      website: org.website || "",
    });
    setSensitiveTouched({});
    setEditing(false);
    setNotice(null);
  };

  const onSave = async () => {
    if (!org) return;
    setSaving(true);
    setNotice(null);
    try {
      const payload: Record<string, any> = {};
      for (const f of EDITABLE) {
        if ((form[f] || "") !== (org[f] || "")) payload[f] = form[f];
      }
      for (const f of SENSITIVE) {
        if ((form[f] || "") !== (org[f] || "")) payload[f] = form[f];
      }
      if (Object.keys(payload).length === 0) {
        setNotice({ kind: "info", text: "No changes to save." });
        setSaving(false);
        return;
      }
      const res = await api.updateMyOrgProfile(payload);
      setOrg(res.organization);
      setPendingChanges(res.pending_changes || []);
      const queued = (res.queued || []).length > 0;
      const applied = (res.applied || []).length > 0;
      if (queued && applied) {
        setNotice({ kind: "review", text: "Saved. Changes to sensitive fields were submitted for review." });
      } else if (queued) {
        setNotice({ kind: "review", text: "This change requires review." });
      } else {
        setNotice({ kind: "success", text: "Profile updated." });
      }
      setSensitiveTouched({});
      setEditing(false);
    } catch (e: any) {
      console.error(e);
      setNotice({ kind: "info", text: e?.message || "Failed to save." });
    } finally {
      setSaving(false);
    }
  };

  const onLogoUpload = async (file: File | null) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setNotice({ kind: "info", text: "Logo must be 2 MB or less." });
      return;
    }
    try {
      const data = await fileToDataUri(file);
      setForm((f) => ({ ...f, logo_url: data }));
    } catch {
      setNotice({ kind: "info", text: "Could not read image file." });
    }
  };

  const pendingFor = (field: string) =>
    pendingChanges.find((p) => p.field === field);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
        <Navbar role="org" userName={orgName} />
        <div className="flex-1 flex items-center justify-center">
          <p style={{ color: MUTED }}>Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="org" userName={orgName} />

      <div className="flex-1 px-8 py-8" style={{ maxWidth: 960, margin: "0 auto", width: "100%" }}>
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 600, color: TEXT, margin: 0 }}>Organization Profile</h1>
            <p style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
              View and manage your public organization details.
            </p>
          </div>
          {!editing ? (
            <button
              onClick={() => { setEditing(true); setNotice(null); }}
              style={{
                height: 38, padding: "0 18px", backgroundColor: GREEN, color: "#fff",
                border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = GREEN_HOVER)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = GREEN)}
            >
              Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                disabled={saving}
                style={{
                  height: 38, padding: "0 16px", backgroundColor: "#fff", color: MUTED,
                  border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 14, cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                style={{
                  height: 38, padding: "0 18px",
                  backgroundColor: saving ? "#86EFAC" : GREEN, color: "#fff",
                  border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600,
                  cursor: saving ? "wait" : "pointer",
                }}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          )}
        </div>

        {/* Notice */}
        {notice && (
          <div
            style={{
              padding: "12px 14px", borderRadius: 10, marginBottom: 20, fontSize: 13,
              backgroundColor:
                notice.kind === "success" ? "#F0FDF4" :
                notice.kind === "review"  ? "#FFFBEB" : "#F1F5F9",
              border: `1px solid ${
                notice.kind === "success" ? "#BBF7D0" :
                notice.kind === "review"  ? "#FDE68A" : BORDER
              }`,
              color:
                notice.kind === "success" ? "#15803D" :
                notice.kind === "review"  ? "#B45309" : MUTED,
            }}
          >
            {notice.text}
          </div>
        )}

        {/* Pending review banner */}
        {pendingChanges.length > 0 && (
          <div
            style={{
              padding: "12px 14px", borderRadius: 10, marginBottom: 20,
              backgroundColor: "#FFFBEB", border: "1px solid #FDE68A",
              fontSize: 13, color: "#92400E",
            }}
          >
            <strong>Pending review:</strong>{" "}
            {pendingChanges.map((p) => p.field.replace("_", " ")).join(", ")}.
            These changes will apply once approved.
          </div>
        )}

        {/* Card */}
        <div style={{ backgroundColor: "#fff", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28 }}>
          {/* Logo + name row */}
          <div className="flex items-center gap-5" style={{ marginBottom: 28 }}>
            <div
              style={{
                width: 84, height: 84, borderRadius: 16, overflow: "hidden",
                backgroundColor: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center",
                border: `1px solid ${BORDER}`, flexShrink: 0,
              }}
            >
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 26, fontWeight: 700, color: GREEN }}>
                  {orgName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: TEXT }}>{orgName}</div>
              <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>
                {org?.org_type || "Organization"}
                {org?.founded_year ? ` · Founded ${org.founded_year}` : ""}
              </div>
              {editing && (
                <label
                  style={{
                    display: "inline-block", marginTop: 10, cursor: "pointer",
                    fontSize: 13, color: GREEN, fontWeight: 500,
                  }}
                >
                  Change logo
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) => onLogoUpload(e.target.files?.[0] || null)}
                    style={{ display: "none" }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Sensitive section */}
          <SectionTitle>Identity</SectionTitle>
          <p style={{ fontSize: 12, color: MUTED, margin: "0 0 14px 0" }}>
            These fields require platform-admin review before changes take effect.
          </p>

          <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 24 }}>
            <SensitiveField
              label="Organization Name"
              field="name"
              value={form.name}
              editing={editing}
              touched={!!sensitiveTouched.name}
              pending={pendingFor("name")}
              onChange={(v) => {
                setForm((f) => ({ ...f, name: v }));
                setSensitiveTouched((t) => ({ ...t, name: true }));
              }}
            />
            <SensitiveField
              label="Public Email"
              field="official_email"
              value={form.official_email}
              editing={editing}
              touched={!!sensitiveTouched.official_email}
              pending={pendingFor("official_email")}
              onChange={(v) => {
                setForm((f) => ({ ...f, official_email: v }));
                setSensitiveTouched((t) => ({ ...t, official_email: true }));
              }}
            />
          </div>

          {/* Editable section */}
          <SectionTitle>Public Details</SectionTitle>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={form.description}
              disabled={!editing}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={4}
              style={{
                ...inputStyle,
                height: "auto", padding: "10px 12px", resize: "vertical",
                backgroundColor: editing ? "#fff" : "#F8FAFC",
              }}
              placeholder="Tell volunteers what your organization does."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Categories</label>
              <input
                value={form.category}
                disabled={!editing}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                style={{ ...inputStyle, backgroundColor: editing ? "#fff" : "#F8FAFC" }}
                placeholder="e.g. Education, Health"
              />
            </div>
            <div>
              <label style={labelStyle}>Locations</label>
              <input
                value={form.location}
                disabled={!editing}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                style={{ ...inputStyle, backgroundColor: editing ? "#fff" : "#F8FAFC" }}
                placeholder="e.g. Cairo, Alexandria"
              />
            </div>
            <div>
              <label style={labelStyle}>Phone Number</label>
              <input
                value={form.phone}
                disabled={!editing}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                style={{ ...inputStyle, backgroundColor: editing ? "#fff" : "#F8FAFC" }}
                placeholder="+20 ..."
              />
            </div>
            <div>
              <label style={labelStyle}>Website</label>
              <input
                value={form.website}
                disabled={!editing}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                style={{ ...inputStyle, backgroundColor: editing ? "#fff" : "#F8FAFC" }}
                placeholder="https://..."
              />
            </div>
          </div>

          {editing && sensitiveDirty && (
            <div
              style={{
                marginTop: 20, padding: "10px 12px", borderRadius: 8,
                backgroundColor: "#FFFBEB", border: "1px solid #FDE68A",
                fontSize: 12, color: "#92400E",
              }}
            >
              You changed a sensitive field. This change requires review and won't apply instantly.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 15, fontWeight: 600, color: TEXT, margin: "0 0 6px 0" }}>{children}</h2>
  );
}

function SensitiveField({
  label, value, editing, touched, pending, onChange,
}: {
  label: string;
  field: string;
  value: string;
  editing: boolean;
  touched: boolean;
  pending: any | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label style={labelStyle}>
        <span>{label}</span>
        <LockBadge />
      </label>
      <input
        value={value}
        disabled={!editing}
        onChange={(e) => onChange(e.target.value)}
        style={editing ? { ...inputStyle, paddingRight: 36 } : lockedStyle}
        placeholder={label}
      />
      {pending && (
        <p style={{ fontSize: 12, color: "#92400E", margin: "6px 0 0 0" }}>
          Pending review → <strong>{pending.new_value}</strong>
        </p>
      )}
      {editing && touched && (
        <p style={{ fontSize: 12, color: "#B45309", margin: "6px 0 0 0" }}>
          This change requires review.
        </p>
      )}
      {!editing && !pending && (
        <p style={{ fontSize: 11, color: MUTED, margin: "6px 0 0 0" }}>
          Editing this field requires platform-admin approval.
        </p>
      )}
    </div>
  );
}

function LockBadge() {
  return (
    <span
      title="Sensitive — change requires review"
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        marginLeft: 8, fontSize: 11, fontWeight: 500, color: LOCK,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      review required
    </span>
  );
}
