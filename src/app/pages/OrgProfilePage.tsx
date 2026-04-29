import { useEffect, useMemo, useState } from "react";
import { Navbar } from "../components/Navbar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { OrgFormFields } from "../components/OrgFormFields";
import {
  EMPTY_ORG_STATE,
  computeOrgProfileErrors,
  isOrgFormValid,
  buildOrgProfilePayload,
  orgStateFromRow,
  createOrgEmptyTouched,
  createOrgAllTouched,
  type OrgEditableState,
} from "../data/orgFormSchema";

const GREEN = "#16A34A";
const GREEN_HOVER = "#15803D";
const BORDER = "#E2E8F0";
const TEXT = "#1E293B";
const MUTED = "#64748B";

// Fields that route through the approval queue on the backend.
// They are always EDITABLE — changes are just held for review, not blocked.
// Mirrors SENSITIVE_FIELDS in routes/organizations.py.
const SENSITIVE_FRONTEND_FIELDS: ReadonlySet<keyof OrgEditableState> = new Set([
  "orgName", "officialEmail", "orgType", "foundedYear", "orgSize",
  "hqGovernorate", "hqCity",
]);

// Backend column → frontend state key
const BACKEND_TO_FRONTEND: Record<string, keyof OrgEditableState> = {
  name: "orgName",
  official_email: "officialEmail",
  org_type: "orgType",
  founded_year: "foundedYear",
  org_size: "orgSize",
  location: "hqGovernorate",
  hq_city: "hqCity",
};

const FIELD_LABELS: Record<string, string> = {
  orgName: "Organization Name",
  officialEmail: "Official Email",
  orgType: "Organization Type",
  foundedYear: "Founded Year",
  orgSize: "Organization Size",
  hqGovernorate: "Governorate",
  hqCity: "City / District",
  phone: "Phone",
  website: "Website",
  description: "Description",
  categories: "Categories",
};

// ── Section definitions ────────────────────────────────────────────────

interface Section {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  fields: (keyof OrgEditableState)[];
}

const SECTIONS: Section[] = [
  {
    id: "verified",
    title: "Verified Information",
    subtitle: "Core identity and location — changes are held for platform review before going live.",
    badge: "Requires Approval",
    badgeColor: "#B45309",
    badgeBg: "#FEF3C7",
    fields: ["orgName", "officialEmail", "orgType", "hqGovernorate", "hqCity"],
  },
  {
    id: "public",
    title: "Public Profile",
    subtitle: "Visible to volunteers browsing your organization — changes apply instantly.",
    badge: "Instant Update",
    badgeColor: "#15803D",
    badgeBg: "#DCFCE7",
    fields: ["description", "logoDataUri", "website", "phone"],
  },
  {
    id: "classification",
    title: "Classification",
    subtitle: "Category and branches update instantly. Size and founded year require approval.",
    badge: "Some Changes Require Review",
    badgeColor: "#6D28D9",
    badgeBg: "#EDE9FE",
    fields: ["categories", "orgSize", "foundedYear", "branches"],
  },
];

// All view-mode fields locked (read-only display). In edit mode: nothing locked.
const ALL_FIELDS_LOCKED = new Set<string>([
  "orgName", "officialEmail", "phone", "orgType", "foundedYear", "orgSize",
  "categories", "hqGovernorate", "hqCity", "branches", "website",
  "description", "logo", "logoDataUri", "submitterName", "submitterRole", "additionalNotes",
]);
const NO_FIELDS_LOCKED = new Set<string>();

// ── Component ──────────────────────────────────────────────────────────

export function OrgProfilePage() {
  const { profile: authProfile } = useAuth();

  const [org, setOrg] = useState<any>(null);
  const [state, setState] = useState<OrgEditableState>(EMPTY_ORG_STATE);
  const [pendingChanges, setPendingChanges] = useState<any[]>([]);
  const [pendingDict, setPendingDict] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "info" | "success" | "review"; text: string } | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>(() => createOrgEmptyTouched());
  const [focused, setFocused] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const errors = useMemo(() => computeOrgProfileErrors(state), [state]);
  const formValid = useMemo(() => isOrgFormValid(errors), [errors]);

  // In edit mode every field is unlocked — approval routing is handled server-side.
  // In view mode every field is locked (read-only display).
  const lockedFields = editing ? NO_FIELDS_LOCKED : ALL_FIELDS_LOCKED;

  // True when the user has changed at least one sensitive field in the current edit session.
  const sensitiveDirty = useMemo(() => {
    if (!org || !editing) return false;
    const original = orgStateFromRow(org);
    return Array.from(SENSITIVE_FRONTEND_FIELDS).some((f) => {
      const a = state[f];
      const b = original[f];
      return Array.isArray(a) && Array.isArray(b)
        ? a.length !== b.length || a.some((v, i) => v !== b[i])
        : a !== b;
    });
  }, [state, org, editing]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await api.getMyOrgProfile();
      const o = res.current || res.organization || {};
      setOrg(o);
      setState(orgStateFromRow(o));
      setPendingChanges(res.pending_changes || []);
      setPendingDict(res.pending || {});
    } catch (e) {
      console.error("Failed to load org profile", e);
      if (authProfile && !authProfile._demo) {
        setOrg(authProfile);
        setState(orgStateFromRow(authProfile));
      } else if (authProfile?._demo) {
        setOrg(authProfile);
        setState({ ...EMPTY_ORG_STATE, orgName: authProfile.name || "" });
      } else {
        setNotice({ kind: "info", text: "Could not load profile. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const orgName = authProfile?.name || org?.name || state.orgName || "Organization";

  const onChange = (patch: Partial<OrgEditableState>) =>
    setState((s) => ({ ...s, ...patch }));
  const onTouch = (f: string) => setTouched((t) => ({ ...t, [f]: true }));
  const onFocus = (f: string) => setFocused(f);
  const onBlur = (f: string) => { setFocused(null); setTouched((t) => ({ ...t, [f]: true })); };

  const onEdit = () => {
    // Always start editing from the current approved state.
    if (org) setState(orgStateFromRow(org));
    setTouched(createOrgEmptyTouched());
    setSubmitAttempted(false);
    setNotice(null);
    setEditing(true);
  };

  const onCancel = () => {
    if (org) setState(orgStateFromRow(org));
    setTouched(createOrgEmptyTouched());
    setSubmitAttempted(false);
    setEditing(false);
    setNotice(null);
  };

  const onSave = async () => {
    if (!org) return;
    setSubmitAttempted(true);
    if (!formValid) {
      setTouched(createOrgAllTouched());
      setNotice({ kind: "info", text: "Please fix the highlighted fields before saving." });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const fullPayload = buildOrgProfilePayload(state);
      const originalPayload = buildOrgProfilePayload(orgStateFromRow(org));

      // Only send fields that actually changed.
      const payload: Record<string, any> = {};
      for (const k of Object.keys(fullPayload)) {
        const a = fullPayload[k];
        const b = originalPayload[k];
        if (a === undefined) continue;
        const equal = Array.isArray(a) && Array.isArray(b)
          ? a.length === b.length && a.every((v, i) => v === b[i])
          : a === b;
        if (!equal) payload[k] = a;
      }

      if (Object.keys(payload).length === 0) {
        setNotice({ kind: "info", text: "No changes to save." });
        setSaving(false);
        return;
      }

      const res = await api.updateMyOrgProfile(payload);
      const updatedOrg = res.current || res.organization;
      setOrg(updatedOrg);
      setState(orgStateFromRow(updatedOrg));
      setPendingChanges(res.pending_changes || []);
      setPendingDict(res.pending || {});

      const queued = (res.queued || []).length > 0;
      const applied = (res.applied || []).length > 0;
      if (queued && applied) {
        setNotice({ kind: "review", text: "Saved. Some updates are under review and will go live once approved." });
      } else if (queued) {
        setNotice({ kind: "review", text: "Submitted for review. Current information stays live until approved." });
      } else {
        setNotice({ kind: "success", text: "Profile updated successfully." });
      }
      setTouched(createOrgEmptyTouched());
      setSubmitAttempted(false);
      setEditing(false);
    } catch (e: any) {
      console.error(e);
      setNotice({ kind: "info", text: e?.message || "Failed to save. Please try again." });
    } finally {
      setSaving(false);
    }
  };

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

  const hasPending = pendingChanges.length > 0;
  const saveLabel = saving ? "Saving…" : sensitiveDirty ? "Submit Changes for Review" : "Save Changes";

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="org" userName={orgName} />

      <div className="flex-1 px-8 py-8" style={{ maxWidth: 960, margin: "0 auto", width: "100%" }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 600, color: TEXT, margin: 0 }}>Organization Profile</h1>
            <p style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
              Manage how your organization appears to volunteers and the public.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hasPending && !editing && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 12, fontWeight: 600, color: "#B45309",
                backgroundColor: "#FEF3C7", border: "1px solid #FDE68A",
                borderRadius: 20, padding: "4px 12px",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#F59E0B", display: "inline-block" }} />
                Update under review
              </span>
            )}
            {!editing ? (
              <button
                onClick={onEdit}
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
                    border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 14,
                    cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={onSave}
                  disabled={saving}
                  style={{
                    height: 38, padding: "0 18px",
                    backgroundColor: saving ? "#86EFAC" : sensitiveDirty ? "#D97706" : GREEN,
                    color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600,
                    cursor: saving ? "wait" : "pointer", transition: "background-color 200ms",
                  }}
                >
                  {saveLabel}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Global notice ── */}
        {notice && (
          <div style={{
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
          }}>
            {notice.text}
          </div>
        )}

        {/* ── Pending changes summary (view mode only) ── */}
        {hasPending && !editing && (
          <PendingBanner pendingChanges={pendingChanges} org={org} />
        )}

        {/* ── Edit-mode review reminder ── */}
        {editing && sensitiveDirty && (
          <div style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: 16,
            backgroundColor: "#FFF7ED", border: "1px solid #FED7AA",
            fontSize: 13, color: "#C2410C",
            display: "flex", alignItems: "flex-start", gap: 8,
          }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>ℹ</span>
            <span>
              You've changed one or more fields that require platform review.
              They'll be submitted for approval — current live values stay unchanged until approved.
            </span>
          </div>
        )}

        {/* ── Sections ── */}
        {SECTIONS.map((section) => (
          <ProfileSection
            key={section.id}
            section={section}
            state={state}
            errors={errors}
            touched={submitAttempted
              ? Object.fromEntries(Object.keys(errors).map((k) => [k, true]))
              : touched}
            focused={focused}
            onChange={onChange}
            onTouch={onTouch}
            onFocus={onFocus}
            onBlur={onBlur}
            lockedFields={lockedFields}
            pendingDict={pendingDict}
            org={org}
            editing={editing}
          />
        ))}

      </div>
    </div>
  );
}

// ── ProfileSection ─────────────────────────────────────────────────────

interface ProfileSectionProps {
  section: Section;
  state: OrgEditableState;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  focused: string | null;
  onChange: (p: Partial<OrgEditableState>) => void;
  onTouch: (f: string) => void;
  onFocus: (f: string) => void;
  onBlur: (f: string) => void;
  lockedFields: ReadonlySet<string>;
  pendingDict: Record<string, string>;
  org: any;
  editing: boolean;
}

function ProfileSection({
  section, state, errors, touched, focused,
  onChange, onTouch, onFocus, onBlur,
  lockedFields, pendingDict, org, editing,
}: ProfileSectionProps) {
  const sectionHasPending = section.fields.some((f) => {
    const bk = Object.entries(BACKEND_TO_FRONTEND).find(([, fe]) => fe === f)?.[0];
    return bk ? pendingDict[bk] !== undefined : false;
  });

  return (
    <div style={{
      backgroundColor: "#fff",
      border: `1px solid ${sectionHasPending ? "#FDE68A" : BORDER}`,
      borderRadius: 16, padding: 24, marginBottom: 20,
    }}>
      {/* Section header */}
      <div className="flex items-start justify-between" style={{ marginBottom: sectionHasPending ? 12 : 16 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: TEXT, margin: "0 0 4px 0" }}>
            {section.title}
          </h2>
          <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>{section.subtitle}</p>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, color: section.badgeColor,
          backgroundColor: section.badgeBg, borderRadius: 20,
          padding: "3px 10px", whiteSpace: "nowrap", marginLeft: 12, flexShrink: 0,
        }}>
          {section.badge}
        </span>
      </div>

      {/* Pending value preview — shown in both view and edit modes */}
      {sectionHasPending && (
        <PendingSectionRows
          fields={section.fields}
          pendingDict={pendingDict}
          org={org}
          editing={editing}
        />
      )}

      {/* Form fields */}
      <OrgFormFields
        mode="profile"
        showSubmitter={false}
        state={state}
        errors={errors}
        touched={touched}
        focused={focused}
        onChange={onChange}
        onTouch={onTouch}
        onFocus={onFocus}
        onBlur={onBlur}
        lockedFields={lockedFields}
        sectionFilter={section.fields as string[]}
      />
    </div>
  );
}

// ── PendingBanner (top-level, view mode) ──────────────────────────────

function PendingBanner({ pendingChanges, org }: { pendingChanges: any[]; org: any }) {
  if (!pendingChanges.length) return null;
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 10, marginBottom: 20,
      backgroundColor: "#FFFBEB", border: "1px solid #FDE68A", fontSize: 13,
    }}>
      <div style={{ fontWeight: 600, color: "#92400E", marginBottom: 8 }}>
        Some updates are under review. Current information is still live.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {pendingChanges.map((change) => {
          const feField = BACKEND_TO_FRONTEND[change.field];
          const label = FIELD_LABELS[feField || ""] || change.field.replace(/_/g, " ");
          const current = org?.[change.field] || "—";
          return (
            <div key={change.id} style={{ fontSize: 12 }}>
              <span style={{ color: "#92400E", fontWeight: 600 }}>{label}: </span>
              <span style={{ color: "#64748B" }}>{current}</span>
              <span style={{ color: "#94A3B8", margin: "0 6px" }}>→</span>
              <span style={{
                color: "#B45309", fontStyle: "italic",
                backgroundColor: "#FEF9C3", borderRadius: 4, padding: "1px 6px",
              }}>
                {change.new_value}
              </span>
              <span style={{
                marginLeft: 6, fontSize: 10, fontWeight: 600,
                color: "#B45309", backgroundColor: "#FEF3C7", borderRadius: 4, padding: "1px 5px",
              }}>
                PENDING
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ color: "#92400E", fontSize: 11, marginTop: 10, opacity: 0.7 }}>
        Approved values will replace current ones automatically.
      </div>
    </div>
  );
}

// ── PendingSectionRows (per-section, both modes) ───────────────────────

function PendingSectionRows({ fields, pendingDict, org, editing }: {
  fields: (keyof OrgEditableState)[];
  pendingDict: Record<string, string>;
  org: any;
  editing: boolean;
}) {
  const rows = fields.flatMap((f) => {
    const bk = Object.entries(BACKEND_TO_FRONTEND).find(([, fe]) => fe === f)?.[0];
    if (!bk || pendingDict[bk] === undefined) return [];
    return [{ label: FIELD_LABELS[f as string] || String(f), current: org?.[bk] || "—", pending: pendingDict[bk] }];
  });
  if (!rows.length) return null;

  return (
    <div style={{
      marginBottom: 14, padding: "10px 12px", borderRadius: 8,
      backgroundColor: "#FFFBEB", border: "1px solid #FDE68A",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#92400E", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {editing ? "Pending changes (will be overwritten if you edit these fields)" : "Pending changes in this section"}
      </div>
      {rows.map((r) => (
        <div key={r.label} style={{ fontSize: 12, marginBottom: 5, display: "flex", flexWrap: "wrap", gap: "3px 8px", alignItems: "center" }}>
          <span style={{ color: "#92400E", fontWeight: 600, minWidth: 110 }}>{r.label}</span>
          <span style={{ color: "#64748B", textDecoration: "line-through", opacity: 0.8 }}>{r.current}</span>
          <span style={{ color: "#94A3B8" }}>→</span>
          <span style={{ color: "#B45309", fontStyle: "italic" }}>
            {r.pending}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#B45309", backgroundColor: "#FEF3C7", borderRadius: 4, padding: "1px 5px" }}>
            ⏳ pending
          </span>
        </div>
      ))}
    </div>
  );
}

export { SENSITIVE_FRONTEND_FIELDS, BACKEND_TO_FRONTEND };
