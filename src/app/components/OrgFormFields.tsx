// ─────────────────────────────────────────────────────────────────────
// Shared organization-form fields. Used by:
//   • RegisterPage  (mode = "register")  — alongside account credentials
//                                          and the verification step
//   • OrgProfilePage (mode = "profile")  — in edit mode, with `lockedFields`
//                                          gating sensitive fields behind
//                                          admin review.
// All field structure, labels, validation, and UI components live here —
// changing any of them in one place updates both pages.
// ─────────────────────────────────────────────────────────────────────

import { useMemo } from "react";
import {
  GOVERNORATES,
  ORG_TYPES, ORG_SIZES, ORG_CATEGORY_GROUPS, ORG_CATEGORY_MAX,
  ORG_DESCRIPTION_MAX,
  type OrgEditableState, type OrgErrors,
} from "../data/orgFormSchema";

const GREEN = "#16A34A";
const RED   = "#DC2626";
const BLUE  = "#2563EB";

export type OrgFieldKey =
  | "orgName" | "officialEmail" | "phone"
  | "orgType" | "foundedYear" | "orgSize" | "categories"
  | "hqGovernorate" | "hqCity" | "website" | "description" | "logo"
  | "submitterName" | "submitterRole" | "additionalNotes";

export interface OrgFormFieldsProps {
  state: OrgEditableState;
  errors: OrgErrors;
  touched: Record<string, boolean>;
  focused: string | null;

  onChange: (patch: Partial<OrgEditableState>) => void;
  onTouch: (field: string) => void;
  onFocus: (field: string) => void;
  onBlur: (field: string) => void;

  /** Fields that are read-only in the UI (e.g. profile mode, sensitive fields). */
  lockedFields?: ReadonlySet<string>;

  /** "register" shows the inline section headers; "profile" omits them
   *  (callers usually wrap sections in their own card chrome). */
  mode?: "register" | "profile";
}

const labelStyle: React.CSSProperties = {
  fontSize: 13, color: "#1E293B", fontWeight: 500, marginBottom: 4, display: "block",
};

function ErrorMessage({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div style={{ display: "flex", gap: 4, marginTop: 5, alignItems: "flex-start" }}>
      <span style={{ color: RED, fontSize: 13, lineHeight: 1, marginTop: 1 }}>⚠</span>
      <span style={{ fontSize: 12, color: RED, lineHeight: 1.45 }}>{msg}</span>
    </div>
  );
}

function LockBadge({ tooltip }: { tooltip: string }) {
  return (
    <span
      title={tooltip}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        marginLeft: 8, fontSize: 11, fontWeight: 500, color: "#94A3B8",
      }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      review required
    </span>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontSize: 14, fontWeight: 600, color: "#1E293B",
      margin: "16px 0 4px 0", paddingBottom: 6, borderBottom: "1px solid #F1F5F9",
    }}>
      {children}
    </h3>
  );
}

export function OrgFormFields(props: OrgFormFieldsProps) {
  const { state, errors, touched, focused,
    onChange, onTouch, onFocus, onBlur,
    lockedFields, mode = "register" } = props;

  const isLocked = (f: string) => !!lockedFields?.has(f);

  const borderColor = (field: string) => {
    if (!touched[field]) return focused === field ? BLUE : "#E2E8F0";
    return errors[field] ? RED : GREEN;
  };

  const fieldStyle = (field: string, h = 42): React.CSSProperties => {
    const locked = isLocked(field);
    return {
      width: "100%", height: h, outline: "none", boxSizing: "border-box",
      border: `1.5px solid ${borderColor(field)}`,
      borderRadius: 8, padding: h === 42 ? "0 12px" : "10px 12px",
      fontSize: 14, transition: "border-color 150ms",
      resize: h > 42 ? ("vertical" as const) : undefined,
      fontFamily: "inherit",
      backgroundColor: locked ? "#F1F5F9" : "#FFFFFF",
      color: locked ? "#64748B" : "#1E293B",
      cursor: locked ? "not-allowed" : "auto",
    };
  };

  const showError = (field: string) =>
    touched[field] && errors[field] ? errors[field] : "";

  const toggleCategory = (cat: string) => {
    if (isLocked("categories")) return;
    const has = state.categories.includes(cat);
    const next = has
      ? state.categories.filter((c) => c !== cat)
      : state.categories.length >= ORG_CATEGORY_MAX
        ? state.categories
        : [...state.categories, cat];
    onChange({ categories: next });
    onTouch("categories");
  };

  const toggleBranch = (gov: string) => {
    if (isLocked("branches")) return;
    const has = state.branches.includes(gov);
    onChange({
      branches: has
        ? state.branches.filter((g) => g !== gov)
        : [...state.branches, gov],
    });
  };

  const onLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked("logo")) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ logoDataUri: String(reader.result || "") });
    reader.readAsDataURL(file);
  };

  // Memoise the year list — it's re-rendered every keystroke otherwise.
  const yearOptions = useMemo(() => {
    const cur = new Date().getFullYear();
    const arr: number[] = [];
    for (let y = cur; y >= 1900; y--) arr.push(y);
    return arr;
  }, []);

  // ── Render ────────────────────────────────────────────────────────

  return (
    <>
      {mode === "register" && <SectionHeader>Organization Details</SectionHeader>}

      {/* Organization Name */}
      <div>
        <label htmlFor="orgName" style={labelStyle}>
          Organization Name <span style={{ color: RED }}>*</span>
          {isLocked("orgName") && <LockBadge tooltip="Editing this field requires admin approval" />}
        </label>
        <input id="orgName"
          value={state.orgName}
          disabled={isLocked("orgName")}
          onChange={(e) => onChange({ orgName: e.target.value })}
          onFocus={() => onFocus("orgName")} onBlur={() => onBlur("orgName")}
          style={fieldStyle("orgName")}
          placeholder="e.g. Resala Charity Organization"
          autoComplete="organization" />
        <ErrorMessage msg={showError("orgName")} />
      </div>

      {/* Type + Founded Year */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="orgType" style={labelStyle}>
            Organization Type <span style={{ color: RED }}>*</span>
          </label>
          <select id="orgType" value={state.orgType}
            disabled={isLocked("orgType")}
            onChange={(e) => onChange({ orgType: e.target.value })}
            onFocus={() => onFocus("orgType")} onBlur={() => onBlur("orgType")}
            style={fieldStyle("orgType")}>
            <option value="">Select type…</option>
            {ORG_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ErrorMessage msg={showError("orgType")} />
        </div>
        <div>
          <label htmlFor="orgFoundedYear" style={labelStyle}>
            Founded Year <span style={{ color: RED }}>*</span>
          </label>
          <select id="orgFoundedYear" value={state.foundedYear}
            disabled={isLocked("foundedYear")}
            onChange={(e) => onChange({ foundedYear: e.target.value })}
            onFocus={() => onFocus("foundedYear")} onBlur={() => onBlur("foundedYear")}
            style={fieldStyle("foundedYear")}>
            <option value="">Select year…</option>
            {yearOptions.map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>
          <ErrorMessage msg={showError("foundedYear")} />
        </div>
      </div>

      {/* Categories */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <label style={{ ...labelStyle, margin: 0 }}>
            Category <span style={{ color: RED }}>*</span>
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", gap: 3 }}>
              {Array.from({ length: ORG_CATEGORY_MAX }).map((_, i) => (
                <span key={i} style={{
                  display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                  backgroundColor: i < state.categories.length
                    ? state.categories.length >= ORG_CATEGORY_MAX ? "#F59E0B" : GREEN
                    : "#E2E8F0",
                  transition: "background-color 200ms",
                }} />
              ))}
            </div>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
              backgroundColor: state.categories.length >= ORG_CATEGORY_MAX
                ? "#FEF3C7" : state.categories.length > 0 ? "#DCFCE7" : "#F1F5F9",
              color: state.categories.length >= ORG_CATEGORY_MAX
                ? "#92400E" : state.categories.length > 0 ? GREEN : "#94A3B8",
              transition: "all 200ms",
            }}>
              {state.categories.length}/{ORG_CATEGORY_MAX}
            </span>
          </div>
        </div>

        {state.categories.length > 0 && (
          <div style={{
            display: "flex", flexWrap: "wrap", gap: "5px 6px",
            marginBottom: 10, padding: "10px 12px",
            backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8,
          }}>
            <span style={{ fontSize: 11, color: "#15803D", fontWeight: 600, alignSelf: "center", marginRight: 2 }}>
              Selected:
            </span>
            {state.categories.map((cat) => (
              <button key={cat} type="button" onClick={() => toggleCategory(cat)}
                disabled={isLocked("categories")}
                title={`Remove ${cat}`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 8px 3px 10px", borderRadius: 20,
                  border: "1px solid #86EFAC", backgroundColor: "#FFFFFF",
                  color: GREEN, fontSize: 12, fontWeight: 500,
                  cursor: isLocked("categories") ? "not-allowed" : "pointer",
                  transition: "all 150ms",
                }}>
                {cat}
                <span style={{ fontSize: 14, lineHeight: 1, color: "#4ADE80", fontWeight: 400 }}>×</span>
              </button>
            ))}
          </div>
        )}

        {state.categories.length >= ORG_CATEGORY_MAX && (
          <p style={{
            fontSize: 12, color: "#92400E",
            backgroundColor: "#FFFBEB", border: "1px solid #FDE68A",
            borderRadius: 6, padding: "6px 10px", margin: "0 0 10px 0",
          }}>
            Limit reached — remove a selection above to pick a different one.
          </p>
        )}

        <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, overflow: "hidden" }}
             onBlur={() => onTouch("categories")}>
          {ORG_CATEGORY_GROUPS.map((group, gi) => (
            <div key={group.label} style={{
              padding: "10px 14px",
              borderTop: gi > 0 ? "1px solid #F1F5F9" : undefined,
              backgroundColor: gi % 2 === 0 ? "#FFFFFF" : "#FAFAFA",
            }}>
              <p style={{
                fontSize: 10, fontWeight: 700, color: "#CBD5E1",
                textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 8px 0",
              }}>{group.label}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 7px" }}>
                {group.items.map((cat) => {
                  const active = state.categories.includes(cat);
                  const reachedMax = state.categories.length >= ORG_CATEGORY_MAX;
                  const disabled = isLocked("categories") || (!active && reachedMax);
                  return (
                    <button key={cat} type="button"
                      onClick={() => { if (!disabled) toggleCategory(cat); }}
                      title={disabled
                        ? (isLocked("categories")
                          ? "Editing this field requires admin approval"
                          : `Limit reached — remove a selection to add ${cat}`)
                        : active ? `Remove ${cat}` : `Add ${cat}`}
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
        <ErrorMessage msg={showError("categories")} />
      </div>

      {/* Org Size */}
      <div>
        <label htmlFor="orgSize" style={labelStyle}>
          Organization Size <span style={{ color: RED }}>*</span>
        </label>
        <select id="orgSize" value={state.orgSize}
          disabled={isLocked("orgSize")}
          onChange={(e) => onChange({ orgSize: e.target.value })}
          onFocus={() => onFocus("orgSize")} onBlur={() => onBlur("orgSize")}
          style={fieldStyle("orgSize")}>
          <option value="">Select size…</option>
          {ORG_SIZES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ErrorMessage msg={showError("orgSize")} />
      </div>

      {/* Description */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <label htmlFor="orgDescription" style={{ ...labelStyle, margin: 0 }}>
            Description <span style={{ color: RED }}>*</span>
          </label>
          <span style={{
            fontSize: 11, fontWeight: 500,
            color: state.description.length > ORG_DESCRIPTION_MAX
              ? RED
              : state.description.length > Math.floor(ORG_DESCRIPTION_MAX * 0.84)
                ? "#F59E0B" : "#94A3B8",
          }}>
            {state.description.length}/{ORG_DESCRIPTION_MAX}
          </span>
        </div>
        <textarea id="orgDescription" value={state.description}
          disabled={isLocked("description")}
          onChange={(e) => {
            if (e.target.value.length <= ORG_DESCRIPTION_MAX)
              onChange({ description: e.target.value });
          }}
          onFocus={() => onFocus("description")} onBlur={() => onBlur("description")}
          placeholder="Tell us about your organization, its mission, and impact…"
          style={{ ...fieldStyle("description", 100), padding: "10px 12px" }} />
        <ErrorMessage msg={showError("description")} />
      </div>

      {/* Logo */}
      <div>
        <label style={labelStyle}>
          Logo <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 400 }}>(optional)</span>
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {state.logoDataUri
            ? <img src={state.logoDataUri} alt="Organization logo"
                style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover", border: "1px solid #E2E8F0" }} />
            : <div style={{
                width: 64, height: 64, borderRadius: 12, border: "1px dashed #CBD5E1",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#94A3B8", fontSize: 20,
              }}>+</div>
          }
          {!isLocked("logo") && (
            <label style={{
              cursor: "pointer", padding: "8px 14px", border: "1px solid #E2E8F0",
              borderRadius: 8, fontSize: 13, color: "#64748B",
            }}>
              {state.logoDataUri ? "Change Logo" : "Upload Logo"}
              <input type="file" accept="image/*" onChange={onLogoUpload} style={{ display: "none" }} />
            </label>
          )}
        </div>
      </div>

      {mode === "register" && <SectionHeader>Contact &amp; Location</SectionHeader>}
      {mode === "profile"  && <SectionHeader>Contact &amp; Location</SectionHeader>}

      {/* Official email */}
      <div>
        <label htmlFor="orgOfficialEmail" style={labelStyle}>
          Official Organization Email <span style={{ color: RED }}>*</span>
          {isLocked("officialEmail") && <LockBadge tooltip="Editing this field requires admin approval" />}
        </label>
        <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 6px 0" }}>
          Provide your organization's public contact email.
        </p>
        <input id="orgOfficialEmail" type="email" value={state.officialEmail}
          disabled={isLocked("officialEmail")}
          onChange={(e) => onChange({ officialEmail: e.target.value })}
          onFocus={() => onFocus("officialEmail")} onBlur={() => onBlur("officialEmail")}
          style={fieldStyle("officialEmail")} placeholder="contact@organization.org" />
        <ErrorMessage msg={showError("officialEmail")} />
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="orgPhone" style={labelStyle}>
          Primary Phone Number <span style={{ color: RED }}>*</span>
        </label>
        <input id="orgPhone" value={state.phone}
          disabled={isLocked("phone")}
          onChange={(e) => onChange({ phone: e.target.value })}
          onFocus={() => onFocus("phone")} onBlur={() => onBlur("phone")}
          style={fieldStyle("phone")} placeholder="01XXXXXXXXX or 0XXXXXXXXX" />
        <ErrorMessage msg={showError("phone")} />
      </div>

      {/* HQ */}
      <div style={{ padding: "14px 16px", backgroundColor: "#F8FAFC", borderRadius: 10, border: "1px solid #E2E8F0" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", margin: "0 0 12px 0" }}>
          Headquarters Location <span style={{ color: RED }}>*</span>
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="orgHqGov" style={labelStyle}>
              Governorate <span style={{ color: RED }}>*</span>
            </label>
            <select id="orgHqGov" value={state.hqGovernorate}
              disabled={isLocked("hqGovernorate")}
              onChange={(e) => onChange({ hqGovernorate: e.target.value })}
              onFocus={() => onFocus("hqGovernorate")} onBlur={() => onBlur("hqGovernorate")}
              style={fieldStyle("hqGovernorate")}>
              <option value="">Select governorate…</option>
              {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <ErrorMessage msg={showError("hqGovernorate")} />
          </div>
          <div>
            <label htmlFor="orgHqCity" style={labelStyle}>
              City / District <span style={{ color: RED }}>*</span>
            </label>
            <input id="orgHqCity" value={state.hqCity}
              disabled={isLocked("hqCity")}
              onChange={(e) => onChange({ hqCity: e.target.value })}
              onFocus={() => onFocus("hqCity")} onBlur={() => onBlur("hqCity")}
              style={fieldStyle("hqCity")} placeholder="e.g. Nasr City" />
            <ErrorMessage msg={showError("hqCity")} />
          </div>
        </div>
      </div>

      {/* Branches */}
      <div>
        <label style={labelStyle}>
          Other Branches <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 400 }}>(optional)</span>
        </label>
        <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 8px 0" }}>
          Select any additional governorates where your organization operates.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 8px" }}>
          {GOVERNORATES.filter((g) => g !== state.hqGovernorate).map((gov) => {
            const active = state.branches.includes(gov);
            const disabled = isLocked("branches");
            return (
              <button key={gov} type="button" onClick={() => toggleBranch(gov)}
                disabled={disabled}
                style={{
                  padding: "5px 10px", borderRadius: 6,
                  border: `1.5px solid ${active ? GREEN : "#E2E8F0"}`,
                  backgroundColor: active ? "#F0FDF4" : "#FAFAFA",
                  color: active ? GREEN : "#475569",
                  fontSize: 12, fontWeight: active ? 600 : 400,
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled && !active ? 0.6 : 1,
                  transition: "all 150ms",
                }}>
                {active ? "✓ " : ""}{gov}
              </button>
            );
          })}
        </div>
      </div>

      {/* Website */}
      <div>
        <label htmlFor="orgWebsite" style={labelStyle}>
          Website <span style={{ color: RED }}>*</span>
        </label>
        <input id="orgWebsite" value={state.website}
          disabled={isLocked("website")}
          onChange={(e) => onChange({ website: e.target.value })}
          onFocus={() => onFocus("website")} onBlur={() => onBlur("website")}
          style={fieldStyle("website")} placeholder="https://www.organization.org" />
        <ErrorMessage msg={showError("website")} />
      </div>

      {mode === "register" && <SectionHeader>Submitter Information</SectionHeader>}
      {mode === "profile"  && <SectionHeader>Submitter Information</SectionHeader>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="orgSubmitterName" style={labelStyle}>
            Submitter Name <span style={{ color: RED }}>*</span>
          </label>
          <input id="orgSubmitterName" value={state.submitterName}
            disabled={isLocked("submitterName")}
            onChange={(e) => onChange({ submitterName: e.target.value })}
            onFocus={() => onFocus("submitterName")} onBlur={() => onBlur("submitterName")}
            style={fieldStyle("submitterName")} placeholder="e.g. Ahmed Mohamed" />
          <ErrorMessage msg={showError("submitterName")} />
        </div>
        <div>
          <label htmlFor="orgSubmitterRole" style={labelStyle}>
            Your Role <span style={{ color: RED }}>*</span>
          </label>
          <input id="orgSubmitterRole" value={state.submitterRole}
            disabled={isLocked("submitterRole")}
            onChange={(e) => onChange({ submitterRole: e.target.value })}
            onFocus={() => onFocus("submitterRole")} onBlur={() => onBlur("submitterRole")}
            style={fieldStyle("submitterRole")} placeholder="e.g. Founder, Director" />
          <ErrorMessage msg={showError("submitterRole")} />
        </div>
      </div>

      <div>
        <label htmlFor="orgNotes" style={labelStyle}>
          Additional Notes <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 400 }}>(optional)</span>
        </label>
        <textarea id="orgNotes" value={state.additionalNotes}
          disabled={isLocked("additionalNotes")}
          onChange={(e) => onChange({ additionalNotes: e.target.value })}
          onFocus={() => onFocus("additionalNotes")} onBlur={() => onBlur("additionalNotes")}
          placeholder="Any additional context or information…"
          style={{ ...fieldStyle("additionalNotes", 80), padding: "10px 12px" }} />
      </div>
    </>
  );
}
