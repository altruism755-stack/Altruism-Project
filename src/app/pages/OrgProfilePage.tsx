import { useEffect, useMemo, useState } from "react";
import { Navbar } from "../components/Navbar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { OrgFormFields } from "../components/OrgFormFields";
import {
  EMPTY_ORG_STATE,
  computeOrgErrors,
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

// Sensitive fields are gated behind platform-admin review.
// Editing these on the profile page sends a change request rather than
// applying directly. Mirrors backend SENSITIVE_FIELDS in routes/organizations.py.
const SENSITIVE_FRONTEND_FIELDS: ReadonlySet<keyof OrgEditableState> = new Set([
  "orgName", "officialEmail",
]);
// Backend column names for the same two sensitive fields.
const SENSITIVE_BACKEND_FIELDS = ["name", "official_email"] as const;
const FRONTEND_TO_BACKEND: Record<string, string> = {
  orgName: "name",
  officialEmail: "official_email",
};

export function OrgProfilePage() {
  const { profile: authProfile } = useAuth();

  const [org, setOrg] = useState<any>(null);
  const [state, setState] = useState<OrgEditableState>(EMPTY_ORG_STATE);
  const [pendingChanges, setPendingChanges] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "info" | "success" | "review"; text: string } | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>(() => createOrgEmptyTouched());
  const [focused, setFocused] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const errors = useMemo(() => computeOrgErrors(state), [state]);
  const formValid = useMemo(() => isOrgFormValid(errors), [errors]);

  const lockedFields = useMemo<ReadonlySet<string>>(
    () => editing
      ? new Set<string>(Array.from(SENSITIVE_FRONTEND_FIELDS))
      : new Set<string>([
          // In view mode, every field is read-only.
          "orgName", "officialEmail", "phone", "orgType", "foundedYear", "orgSize",
          "categories", "hqGovernorate", "hqCity", "branches", "website",
          "description", "logo", "submitterName", "submitterRole", "additionalNotes",
        ]),
    [editing],
  );

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await api.getMyOrgProfile();
      const o = res.organization || {};
      setOrg(o);
      setState(orgStateFromRow(o));
      setPendingChanges(res.pending_changes || []);
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

  const onCancel = () => {
    if (org) setState(orgStateFromRow(org));
    setTouched(createOrgEmptyTouched());
    setSubmitAttempted(false);
    setEditing(false);
    setNotice(null);
  };

  const sensitiveDirty = useMemo(() => {
    if (!org) return false;
    const original = orgStateFromRow(org);
    return Array.from(SENSITIVE_FRONTEND_FIELDS).some(
      (f) => state[f] !== original[f],
    );
  }, [state, org]);

  const onSave = async () => {
    if (!org) return;
    setSubmitAttempted(true);
    if (!formValid) {
      setTouched(createOrgAllTouched());
      setNotice({ kind: "info", text: "Please fix the highlighted fields." });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const fullPayload = buildOrgProfilePayload(state);
      const original = orgStateFromRow(org);
      const originalPayload = buildOrgProfilePayload(original);

      // Diff: only send fields that actually changed. Backend further
      // routes sensitive ones through the review queue.
      const payload: Record<string, any> = {};
      for (const k of Object.keys(fullPayload)) {
        const a = fullPayload[k];
        const b = originalPayload[k];
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
      setOrg(res.organization);
      setState(orgStateFromRow(res.organization));
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
      setTouched(createOrgEmptyTouched());
      setSubmitAttempted(false);
      setEditing(false);
    } catch (e: any) {
      console.error(e);
      setNotice({ kind: "info", text: e?.message || "Failed to save." });
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

  // Pending review banner — list field labels for sensitive fields awaiting approval.
  const pendingFieldLabels = pendingChanges.map((p) => {
    if (p.field === "name") return "Organization Name";
    if (p.field === "official_email") return "Official Organization Email";
    return p.field.replace(/_/g, " ");
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="org" userName={orgName} />

      <div className="flex-1 px-8 py-8" style={{ maxWidth: 960, margin: "0 auto", width: "100%" }}>
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 600, color: TEXT, margin: 0 }}>Organization Profile</h1>
            <p style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
              View and manage your organization's registration details.
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

        {pendingChanges.length > 0 && (
          <div
            style={{
              padding: "12px 14px", borderRadius: 10, marginBottom: 20,
              backgroundColor: "#FFFBEB", border: "1px solid #FDE68A",
              fontSize: 13, color: "#92400E",
            }}
          >
            <strong>Pending review:</strong>{" "}
            {pendingFieldLabels.join(", ")}.
            These changes will apply once approved.
          </div>
        )}

        {/* Card */}
        <div style={{
          backgroundColor: "#fff", border: `1px solid ${BORDER}`,
          borderRadius: 16, padding: 28, display: "flex", flexDirection: "column", gap: 16,
        }}>
          <OrgFormFields
            mode="profile"
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
          />

          {editing && sensitiveDirty && (
            <div
              style={{
                marginTop: 4, padding: "10px 12px", borderRadius: 8,
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

// Re-exported for code-readers tracing the sensitive-field policy.
export { SENSITIVE_BACKEND_FIELDS, FRONTEND_TO_BACKEND };
