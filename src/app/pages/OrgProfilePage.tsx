import { useEffect, useMemo, useState } from "react";
import { Navbar } from "../components/Navbar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { OrgFormFields } from "../components/OrgFormFields";
import { OrgLogoByName } from "../components/OrgLogos";
import {
  EMPTY_ORG_STATE,
  computeOrgProfileErrors,
  isOrgFormValid,
  buildOrgProfilePayload,
  orgStateFromRow,
  createOrgEmptyTouched,
  createOrgAllTouched,
  ORG_TYPES,
  ORG_SIZES,
  type OrgEditableState,
} from "../data/orgFormSchema";

const GREEN       = "#16A34A";
const GREEN_HOVER = "#15803D";
const BORDER      = "#E5E7EB";
const TEXT        = "#0F172A";
const TEXT_SOFT   = "#334155";
const MUTED       = "#64748B";
const SURFACE     = "#FFFFFF";
const BG          = "#F8FAFC";
const CARD_SHADOW = "0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.03)";

const SENSITIVE_FRONTEND_FIELDS: ReadonlySet<keyof OrgEditableState> = new Set([
  "orgName", "officialEmail", "orgType", "foundedYear", "orgSize",
  "hqGovernorate", "hqCity",
]);

const BACKEND_TO_FRONTEND: Record<string, keyof OrgEditableState> = {
  name: "orgName",  official_email: "officialEmail",
  org_type: "orgType", founded_year: "foundedYear", org_size: "orgSize",
  location: "hqGovernorate", hq_city: "hqCity",
};

const FIELD_LABELS: Record<string, string> = {
  orgName: "Organization Name", officialEmail: "Official Email",
  orgType: "Organization Type", foundedYear: "Founded Year",
  orgSize: "Organization Size", hqGovernorate: "Governorate",
  hqCity: "City / District",    phone: "Phone",
  website: "Website", description: "Description", categories: "Categories",
};

const ORG_TYPE_LABEL = Object.fromEntries(ORG_TYPES.map((t) => [t.value, t.label]));
const ORG_SIZE_LABEL = Object.fromEntries(ORG_SIZES.map((s) => [s.value, s.label]));

const ALL_LOCKED = new Set<string>([
  "orgName", "officialEmail", "phone", "orgType", "foundedYear", "orgSize",
  "categories", "hqGovernorate", "hqCity", "branches", "website",
  "description", "logo", "logoDataUri", "submitterName", "submitterRole", "additionalNotes",
]);
const NONE_LOCKED = new Set<string>();

interface Section {
  id: string;
  title: string;
  subtitle: string;
  approvalRequired: boolean;
  fields: (keyof OrgEditableState)[];
}

const SECTIONS: Section[] = [
  {
    id: "verified", title: "Verified Information",
    subtitle: "Core identity fields. Changes are reviewed before going live.",
    approvalRequired: true,
    fields: ["orgName", "officialEmail", "orgType", "hqGovernorate", "hqCity"],
  },
  {
    id: "public", title: "Public Profile",
    subtitle: "What volunteers see when they browse your page.",
    approvalRequired: false,
    fields: ["description", "logoDataUri", "website", "phone"],
  },
  {
    id: "details", title: "Organization Details",
    subtitle: "Categories and branches update instantly. Size and founded year require approval.",
    approvalRequired: false,
    fields: ["categories", "orgSize", "foundedYear", "branches"],
  },
];

// ── Page ───────────────────────────────────────────────────────────────────

export function OrgProfilePage() {
  const { profile: authProfile } = useAuth();

  const [org, setOrg]                       = useState<any>(null);
  const [state, setState]                   = useState<OrgEditableState>(EMPTY_ORG_STATE);
  const [pendingChanges, setPendingChanges] = useState<any[]>([]);
  const [pendingDict, setPendingDict]       = useState<Record<string, string>>({});
  const [editing, setEditing]               = useState(false);
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [showPendingDetail, setShowPendingDetail] = useState(false);
  const [notice, setNotice]                 = useState<{ kind: "info" | "success" | "review"; text: string } | null>(null);
  const [touched, setTouched]               = useState<Record<string, boolean>>(() => createOrgEmptyTouched());
  const [focused, setFocused]               = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const errors    = useMemo(() => computeOrgProfileErrors(state), [state]);
  const formValid = useMemo(() => isOrgFormValid(errors), [errors]);
  const lockedFields = editing ? NONE_LOCKED : ALL_LOCKED;

  const sensitiveDirty = useMemo(() => {
    if (!org || !editing) return false;
    const original = orgStateFromRow(org);
    return Array.from(SENSITIVE_FRONTEND_FIELDS).some((f) => {
      const a = state[f]; const b = original[f];
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

  const onChange = (patch: Partial<OrgEditableState>) => setState((s) => ({ ...s, ...patch }));
  const onTouch  = (f: string) => setTouched((t) => ({ ...t, [f]: true }));
  const onFocus  = (f: string) => setFocused(f);
  const onBlur   = (f: string) => { setFocused(null); setTouched((t) => ({ ...t, [f]: true })); };

  const onEdit = () => {
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
      const fullPayload     = buildOrgProfilePayload(state);
      const originalPayload = buildOrgProfilePayload(orgStateFromRow(org));
      const payload: Record<string, any> = {};
      for (const k of Object.keys(fullPayload)) {
        const a = fullPayload[k]; const b = originalPayload[k];
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
      if (queued && applied)        setNotice({ kind: "review",  text: "Saved. Some updates are under review and will go live once approved." });
      else if (queued)              setNotice({ kind: "review",  text: "Submitted for review. Your current information stays live until approved." });
      else                          setNotice({ kind: "success", text: "Profile updated successfully." });
      setTouched(createOrgEmptyTouched());
      setSubmitAttempted(false);
      setEditing(false);
    } catch (e: any) {
      setNotice({ kind: "info", text: e?.message || "Failed to save. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: BG, fontFamily: "Inter, system-ui, sans-serif" }}>
        <Navbar role="org" userName={orgName} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
          <p style={{ color: MUTED, fontSize: 14 }}>Loading…</p>
        </div>
      </div>
    );
  }

  const hasPending = pendingChanges.length > 0;
  const saveLabel  = saving ? "Saving…" : sensitiveDirty ? "Submit for Review" : "Save Changes";
  const logoSrc    = org?.logo_url || state.logoDataUri || null;
  const initials   = orgName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  // Header meta items: location · founded · size
  const metaParts: string[] = [];
  if (org?.location)     metaParts.push(org.hq_city ? `${org.hq_city}, ${org.location}` : org.location);
  if (org?.founded_year) metaParts.push(`Founded ${org.founded_year}`);
  if (org?.org_size)     metaParts.push(ORG_SIZE_LABEL[org.org_size] || org.org_size);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: BG, fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="org" userName={orgName} />

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "32px 24px 64px" }}>

        {/* ── Profile header card ── */}
        <div style={{
          backgroundColor: SURFACE, borderRadius: 16, padding: "28px 32px",
          marginBottom: 20, boxShadow: CARD_SHADOW, border: `1px solid ${BORDER}`,
          display: "flex", alignItems: "center", gap: 22,
        }}>
          <div style={{ flexShrink: 0 }}>
            {(() => {
              const brand = OrgLogoByName({ name: orgName, size: 72 });
              if (brand) return brand;
              return (
                <div style={{
                  width: 72, height: 72, borderRadius: 16,
                  overflow: "hidden", backgroundColor: "#F0FDF4",
                  border: `1px solid ${BORDER}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {logoSrc
                    ? <img src={logoSrc} alt={orgName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: 26, fontWeight: 700, color: GREEN }}>{initials}</span>}
                </div>
              );
            })()}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: TEXT, lineHeight: 1.2, letterSpacing: "-0.01em" }}>
              {orgName}
            </h1>
            {(org?.org_type) && (
              <p style={{ margin: "5px 0 0", fontSize: 13, color: TEXT_SOFT, fontWeight: 500 }}>
                {ORG_TYPE_LABEL[org.org_type] || org.org_type}
              </p>
            )}
            {metaParts.length > 0 && (
              <p style={{ margin: "8px 0 0", fontSize: 12, color: MUTED, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {metaParts.map((m, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    {i > 0 && <span style={{ color: "#CBD5E1" }}>·</span>}
                    {m}
                  </span>
                ))}
              </p>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {!editing ? (
              <button
                onClick={onEdit}
                style={{
                  height: 38, padding: "0 22px", backgroundColor: GREEN, color: "#fff",
                  border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
                  transition: "background-color 200ms",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = GREEN_HOVER)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = GREEN)}
              >
                Edit Profile
              </button>
            ) : (
              <>
                <button onClick={onCancel} disabled={saving} style={{
                  height: 38, padding: "0 16px", backgroundColor: SURFACE, color: TEXT_SOFT,
                  border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 14, fontWeight: 500,
                  cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
                }}>Cancel</button>
                <button onClick={onSave} disabled={saving} style={{
                  height: 38, padding: "0 22px",
                  backgroundColor: saving ? "#86EFAC" : sensitiveDirty ? "#D97706" : GREEN,
                  color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600,
                  cursor: saving ? "wait" : "pointer", whiteSpace: "nowrap",
                  transition: "background-color 200ms",
                }}>{saveLabel}</button>
              </>
            )}
          </div>
        </div>

        {/* ── Pending banner (single, top-level, view mode only) ── */}
        {hasPending && !editing && (
          <PendingBanner
            pendingChanges={pendingChanges}
            org={org}
            expanded={showPendingDetail}
            onToggle={() => setShowPendingDetail((v) => !v)}
          />
        )}

        {/* ── Edit-mode review reminder ── */}
        {editing && sensitiveDirty && (
          <div style={{
            backgroundColor: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 12,
            padding: "12px 16px", marginBottom: 20,
            display: "flex", alignItems: "flex-start", gap: 10,
            fontSize: 13, color: "#C2410C",
          }}>
            <span style={{ flexShrink: 0, marginTop: 1 }}>ℹ</span>
            <span>You've changed fields that require platform review. They'll be queued for approval — your live values stay unchanged until approved.</span>
          </div>
        )}

        {/* ── Notice ── */}
        {notice && (
          <div style={{
            padding: "12px 16px", borderRadius: 12, marginBottom: 20, fontSize: 13,
            backgroundColor:
              notice.kind === "success" ? "#F0FDF4" :
              notice.kind === "review"  ? "#FFFBEB" : "#F8FAFC",
            border: `1px solid ${
              notice.kind === "success" ? "#BBF7D0" :
              notice.kind === "review"  ? "#FDE68A" : BORDER}`,
            color:
              notice.kind === "success" ? "#15803D" :
              notice.kind === "review"  ? "#B45309" : MUTED,
          }}>{notice.text}</div>
        )}

        {/* ── Section cards ── */}
        {SECTIONS.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            state={state}
            org={org}
            errors={errors}
            touched={submitAttempted ? Object.fromEntries(Object.keys(errors).map((k) => [k, true])) : touched}
            focused={focused}
            onChange={onChange}
            onTouch={onTouch}
            onFocus={onFocus}
            onBlur={onBlur}
            lockedFields={lockedFields}
            pendingDict={pendingDict}
            editing={editing}
          />
        ))}
      </div>
    </div>
  );
}

// ── SectionCard ────────────────────────────────────────────────────────────

interface SectionCardProps {
  section: Section;
  state: OrgEditableState;
  org: any;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  focused: string | null;
  onChange: (p: Partial<OrgEditableState>) => void;
  onTouch: (f: string) => void;
  onFocus: (f: string) => void;
  onBlur: (f: string) => void;
  lockedFields: ReadonlySet<string>;
  pendingDict: Record<string, string>;
  editing: boolean;
}

function SectionCard(props: SectionCardProps) {
  const { section, state, org, pendingDict, editing } = props;

  const sectionPendingRows = section.fields.flatMap((f) => {
    const bk = Object.entries(BACKEND_TO_FRONTEND).find(([, fe]) => fe === f)?.[0];
    if (!bk || pendingDict[bk] === undefined) return [];
    return [{
      label:   FIELD_LABELS[f as string] || String(f),
      current: org?.[bk] || "—",
      pending: pendingDict[bk],
    }];
  });
  const hasSectionPending = sectionPendingRows.length > 0;

  return (
    <div style={{
      backgroundColor: SURFACE, borderRadius: 16, padding: "28px 32px",
      marginBottom: 20, boxShadow: CARD_SHADOW, border: `1px solid ${BORDER}`,
    }}>
      {/* Card header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: TEXT, letterSpacing: "-0.01em" }}>
            {section.title}
          </h2>
          {section.approvalRequired && (
            <span style={{
              fontSize: 11, fontWeight: 500, color: "#92400E",
              backgroundColor: "#FEF3C7", borderRadius: 20, padding: "2px 9px",
            }}>Requires approval</span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 12, color: MUTED }}>
          {section.subtitle}
        </p>
      </div>

      {/* Inline pending strip (view mode only) */}
      {hasSectionPending && !editing && (
        <div style={{
          marginBottom: 18, padding: "10px 14px",
          backgroundColor: "#FFFBEB", borderRadius: 10,
          border: "1px solid #FEF3C7",
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          {sectionPendingRows.map((r) => (
            <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, flexWrap: "wrap" }}>
              <span style={{ color: TEXT_SOFT, fontWeight: 500, minWidth: 130 }}>{r.label}</span>
              <span style={{ color: "#9CA3AF", textDecoration: "line-through" }}>{r.current}</span>
              <span style={{ color: "#D97706", fontSize: 11 }}>→</span>
              <span style={{ color: "#B45309", fontWeight: 500 }}>{r.pending}</span>
              <span style={{ fontSize: 10, color: "#B45309", backgroundColor: "#FEF9C3", borderRadius: 4, padding: "1px 5px" }}>pending</span>
            </div>
          ))}
        </div>
      )}

      {/* View vs edit mode */}
      {editing ? (
        <OrgFormFields
          mode="profile" showSubmitter={false}
          state={props.state} errors={props.errors} touched={props.touched} focused={props.focused}
          onChange={props.onChange} onTouch={props.onTouch} onFocus={props.onFocus} onBlur={props.onBlur}
          lockedFields={props.lockedFields}
          sectionFilter={section.fields as string[]}
        />
      ) : (
        <SectionView section={section} state={state} org={org} />
      )}
    </div>
  );
}

// ── Read-only view rendering ───────────────────────────────────────────────

function SectionView({ section, state, org }: { section: Section; state: OrgEditableState; org: any }) {
  if (section.id === "verified") {
    return (
      <FieldGrid columns={2}>
        <Field label="Organization Name" value={state.orgName} />
        <Field label="Official Email"    value={state.officialEmail} />
        <Field label="Organization Type" value={ORG_TYPE_LABEL[state.orgType] || state.orgType} />
        <Field label="Governorate"       value={state.hqGovernorate} />
        <Field label="City / District"   value={state.hqCity} fullRow />
      </FieldGrid>
    );
  }

  if (section.id === "public") {
    const logoSrc = org?.logo_url || state.logoDataUri || null;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Field label="Description" value={state.description} multiline />
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <FieldLabel>Logo</FieldLabel>
            {(() => {
              const brand = OrgLogoByName({ name: org?.name || state.orgName, size: 96 });
              if (brand) return brand;
              return (
                <div style={{
                  width: 96, height: 96, borderRadius: 12, overflow: "hidden",
                  border: `1px solid ${BORDER}`, backgroundColor: "#F0FDF4",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {logoSrc
                    ? <img src={logoSrc} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: 11, color: MUTED }}>No logo</span>}
                </div>
              );
            })()}
          </div>
          <div style={{ flex: 1, minWidth: 240, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px" }}>
            <Field label="Website" value={state.website} link />
            <Field label="Phone"   value={state.phone} />
          </div>
        </div>
      </div>
    );
  }

  // details
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <FieldLabel>Categories</FieldLabel>
        <PillList items={state.categories} emptyText="No categories selected" color={GREEN} bg="#F0FDF4" border="#BBF7D0" />
      </div>
      <FieldGrid columns={2}>
        <Field label="Organization Size" value={ORG_SIZE_LABEL[state.orgSize] || state.orgSize} />
        <Field label="Founded Year"      value={state.foundedYear} />
      </FieldGrid>
      <div>
        <FieldLabel>Branches</FieldLabel>
        <PillList items={state.branches} emptyText="No branches added" color="#1E40AF" bg="#EFF6FF" border="#BFDBFE" />
      </div>
    </div>
  );
}

function FieldGrid({ columns, children }: { columns: number; children: React.ReactNode }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: "18px 24px",
    }}>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, color: MUTED, fontWeight: 500, marginBottom: 6, letterSpacing: "0.02em" }}>
      {children}
    </div>
  );
}

function Field({
  label, value, multiline, link, fullRow,
}: { label: string; value: string; multiline?: boolean; link?: boolean; fullRow?: boolean }) {
  const empty = !value || !value.trim();
  return (
    <div style={fullRow ? { gridColumn: "1 / -1" } : undefined}>
      <FieldLabel>{label}</FieldLabel>
      {empty ? (
        <span style={{ fontSize: 14, color: "#94A3B8", fontStyle: "italic" }}>Not provided</span>
      ) : link ? (
        <a href={value} target="_blank" rel="noopener noreferrer" style={{
          fontSize: 14, color: GREEN, textDecoration: "none", fontWeight: 500,
          wordBreak: "break-all",
        }}>{value}</a>
      ) : multiline ? (
        <p style={{ margin: 0, fontSize: 14, color: TEXT_SOFT, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {value}
        </p>
      ) : (
        <span style={{ fontSize: 14, color: TEXT_SOFT, fontWeight: 500 }}>{value}</span>
      )}
    </div>
  );
}

function PillList({ items, emptyText, color, bg, border }: {
  items: string[]; emptyText: string; color: string; bg: string; border: string;
}) {
  if (!items || items.length === 0) {
    return <span style={{ fontSize: 13, color: "#94A3B8", fontStyle: "italic" }}>{emptyText}</span>;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {items.map((it) => (
        <span key={it} style={{
          fontSize: 12, fontWeight: 500, color, backgroundColor: bg,
          border: `1px solid ${border}`, borderRadius: 999, padding: "4px 11px",
        }}>{it}</span>
      ))}
    </div>
  );
}

// ── PendingBanner ──────────────────────────────────────────────────────────

function PendingBanner({ pendingChanges, org, expanded, onToggle }: {
  pendingChanges: any[]; org: any; expanded: boolean; onToggle: () => void;
}) {
  return (
    <div style={{
      backgroundColor: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12,
      padding: "14px 18px", marginBottom: 20,
      display: "flex", alignItems: "flex-start", gap: 12,
    }}>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#92400E" }}>
          Some updates are under review. Your current information is still live.
        </p>
        {expanded && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {pendingChanges.map((change) => {
              const feField = BACKEND_TO_FRONTEND[change.field];
              const label   = FIELD_LABELS[feField || ""] || change.field.replace(/_/g, " ");
              const current = org?.[change.field] || "—";
              return (
                <div key={change.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, flexWrap: "wrap" }}>
                  <span style={{ color: "#92400E", fontWeight: 500, minWidth: 130 }}>{label}</span>
                  <span style={{ color: "#9CA3AF", textDecoration: "line-through" }}>{current}</span>
                  <span style={{ color: "#D97706" }}>→</span>
                  <span style={{ color: "#B45309", fontWeight: 500 }}>{change.new_value}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <button onClick={onToggle} style={{
        background: "none", border: "1px solid #FDE68A", borderRadius: 6,
        padding: "4px 12px", fontSize: 12, fontWeight: 500, color: "#B45309",
        cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
      }}>{expanded ? "Hide" : "View Changes"}</button>
    </div>
  );
}

export { SENSITIVE_FRONTEND_FIELDS, BACKEND_TO_FRONTEND };
