import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Navbar } from "../components/Navbar";
import { BackButton } from "../components/BackButton";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { OrgLogoByName } from "../components/OrgLogos";
import { ORG_TYPES, ORG_SIZES } from "../data/orgFormSchema";

const GREEN     = "#16A34A";
const BORDER    = "#E5E7EB";
const TEXT      = "#0F172A";
const TEXT_SOFT = "#334155";
const MUTED     = "#64748B";
const SURFACE   = "#FFFFFF";
const BG        = "#F8FAFC";

const ORG_TYPE_LABEL = Object.fromEntries(ORG_TYPES.map((t) => [t.value, t.label]));
const ORG_SIZE_LABEL = Object.fromEntries(ORG_SIZES.map((s) => [s.value, s.label]));

export function VolunteerOrgProfile() {
  const { orgId } = useParams<{ orgId: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [org, setOrg] = useState<any>(null);
  const [myOrgIds, setMyOrgIds] = useState<Set<number>>(new Set());
  const [pendingOrgIds, setPendingOrgIds] = useState<Set<number>>(new Set());
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [orgRes, volRes] = await Promise.all([
          api.getOrganization(Number(orgId)),
          api.getVolunteerMe(),
        ]);
        setOrg(orgRes);
        const volOrgs: any[] = volRes.organizations || [];
        setMyOrgIds(new Set(volOrgs.filter((o: any) => o.membership_status === "Active").map((o: any) => o.id)));
        setPendingOrgIds(new Set(volOrgs.filter((o: any) => o.membership_status === "Pending").map((o: any) => o.id)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [orgId]);

  const handleJoin = async () => {
    if (!org) return;
    setJoining(true);
    try {
      await api.joinOrganization(org.id);
      setPendingOrgIds((prev) => new Set([...prev, org.id]));
    } catch (e: any) {
      if (e.message?.includes("Already")) setPendingOrgIds((prev) => new Set([...prev, org.id]));
    }
    setJoining(false);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", backgroundColor: BG, fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="volunteer" />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <p style={{ color: MUTED, fontSize: 14 }}>Loading…</p>
      </div>
    </div>
  );

  if (!org) return (
    <div style={{ minHeight: "100vh", backgroundColor: BG, fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="volunteer" />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <p style={{ color: MUTED, fontSize: 14 }}>Organization not found.</p>
      </div>
    </div>
  );

  const isMember  = myOrgIds.has(org.id);
  const isPending = pendingOrgIds.has(org.id);
  const isBlocked = !!org.student_only && profile?.education_level !== "University Student";
  const orgName   = org.name || "Organization";
  const accent    = org.color || GREEN;
  const accent2   = org.secondary_color || "#22C55E";

  const foundedYear = org.founded_year || (org.founded ? new Date(org.founded).getFullYear() : null);
  const location    = org.hq_city && org.location ? `${org.hq_city}, ${org.location}` : (org.location || org.hq_city || null);

  const categories: string[] = Array.isArray(org.categories)
    ? org.categories
    : typeof org.categories === "string" && org.categories
      ? JSON.parse(org.categories)
      : org.category ? [org.category] : [];

  const branches: string[] = Array.isArray(org.branches)
    ? org.branches
    : typeof org.branches === "string" && org.branches
      ? JSON.parse(org.branches)
      : [];


  return (
    <div style={{ minHeight: "100vh", backgroundColor: BG, fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="volunteer" />

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 24px 64px" }}>
        <BackButton to="/dashboard/orgs" label="Organizations" />

        {/* ── Single profile card ── */}
        <div style={{
          backgroundColor: SURFACE, borderRadius: 18, overflow: "hidden",
          boxShadow: "0 4px 24px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04)",
          border: `1px solid ${BORDER}`,
        }}>
          {/* Slim accent bar */}
          <div style={{ height: 4, background: `linear-gradient(90deg, ${accent} 0%, ${accent2} 100%)` }} />

          {/* Header */}
          <div style={{ padding: "32px 36px 0", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
              <div style={{ width: 84, height: 84, borderRadius: 16, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: SURFACE, border: `1px solid ${BORDER}`, flexShrink: 0 }}>
                <OrgLogoByName name={orgName} size={76} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: TEXT, lineHeight: 1.2, letterSpacing: "-0.01em" }}>
                  {orgName}
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                  {org.org_type && (
                    <span style={{ fontSize: 13, color: TEXT_SOFT, fontWeight: 500 }}>
                      {ORG_TYPE_LABEL[org.org_type] || org.org_type}
                    </span>
                  )}
                  {!!org.student_only && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#3B82F6", backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 999, padding: "3px 10px" }}>
                      University Students Only
                    </span>
                  )}
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                {isMember ? (
                  <button
                    onClick={() => navigate(`/dashboard/org/${org.id}`)}
                    style={{ height: 40, padding: "0 22px", backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                  >
                    View Dashboard
                  </button>
                ) : isPending ? (
                  <div style={{ height: 40, padding: "0 18px", display: "flex", alignItems: "center", backgroundColor: "#FEF9C3", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#A16207" }}>
                    Application Pending
                  </div>
                ) : isBlocked ? (
                  <div style={{ height: 40, padding: "0 18px", display: "flex", alignItems: "center", backgroundColor: "#F1F5F9", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#94A3B8" }}>
                    Students Only
                  </div>
                ) : (
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    style={{ height: 40, padding: "0 22px", backgroundColor: joining ? "#86EFAC" : accent, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: joining ? "not-allowed" : "pointer", boxShadow: `0 2px 8px ${accent}40` }}
                  >
                    {joining ? "Submitting…" : "Join Organization"}
                  </button>
                )}
              </div>
            </div>

            {/* Quick meta row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              {categories.slice(0, 4).map((c) => (
                <span key={c} style={{ fontSize: 12, fontWeight: 500, color: GREEN, backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 999, padding: "4px 11px" }}>
                  {c}
                </span>
              ))}
              {location && (
                <span style={{ fontSize: 12, fontWeight: 500, color: TEXT_SOFT, backgroundColor: "#F1F5F9", borderRadius: 999, padding: "4px 11px" }}>
                  {location}
                </span>
              )}
              {foundedYear && (
                <span style={{ fontSize: 12, fontWeight: 500, color: TEXT_SOFT, backgroundColor: "#F1F5F9", borderRadius: 999, padding: "4px 11px" }}>
                  Est. {foundedYear}
                </span>
              )}
              {org.org_size && (
                <span style={{ fontSize: 12, fontWeight: 500, color: TEXT_SOFT, backgroundColor: "#F1F5F9", borderRadius: 999, padding: "4px 11px" }}>
                  {ORG_SIZE_LABEL[org.org_size] || org.org_size}
                </span>
              )}
            </div>

            {/* Description */}
            {org.description && (
              <div style={{ marginBottom: 24 }}>
                <SectionTitle>About</SectionTitle>
                <p style={{ margin: 0, fontSize: 14.5, color: TEXT_SOFT, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                  {org.description}
                </p>
              </div>
            )}


            {/* Two-column info grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, paddingTop: 20, borderTop: `1px solid ${BORDER}` }}>
              <div>
                <SectionTitle>Contact</SectionTitle>
                <InfoRow label="Website" value={org.website} link />
                <InfoRow label="Phone"   value={org.phone} />
                <InfoRow label="City"    value={org.hq_city} />
                <InfoRow label="Region"  value={org.location} />
              </div>
              <div>
                <SectionTitle>Details</SectionTitle>
                <InfoRow label="Type"     value={ORG_TYPE_LABEL[org.org_type] || org.org_type} />
                <InfoRow label="Size"     value={ORG_SIZE_LABEL[org.org_size] || org.org_size} />
                <InfoRow label="Founded"  value={foundedYear ? String(foundedYear) : null} />
                <InfoRow label="Branches" value={branches.length ? branches.join(", ") : null} />
              </div>
            </div>

            {/* Categories & Branches pills (full lists at bottom) */}
            {(categories.length > 0 || branches.length > 0) && (
              <div style={{ paddingTop: 24, paddingBottom: 32, marginTop: 24, borderTop: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", gap: 16 }}>
                {categories.length > 0 && (
                  <PillRow label="Categories" items={categories} color={GREEN} bg="#F0FDF4" border="#BBF7D0" />
                )}
                {branches.length > 0 && (
                  <PillRow label="Branches" items={branches} color="#1E40AF" bg="#EFF6FF" border="#BFDBFE" />
                )}
              </div>
            )}

            {!(categories.length > 0 || branches.length > 0) && (
              <div style={{ paddingBottom: 32 }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
      {children}
    </div>
  );
}

function InfoRow({ label, value, link }: { label: string; value?: string | null; link?: boolean }) {
  const empty = !value || !String(value).trim();
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "7px 0", borderBottom: `1px dashed #F1F5F9` }}>
      <span style={{ fontSize: 12, color: MUTED, minWidth: 70, fontWeight: 500 }}>{label}</span>
      {empty ? (
        <span style={{ fontSize: 13, color: "#CBD5E1", fontStyle: "italic" }}>—</span>
      ) : link ? (
        <a href={String(value)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: GREEN, textDecoration: "none", fontWeight: 500, wordBreak: "break-all" }}>
          {String(value)}
        </a>
      ) : (
        <span style={{ fontSize: 13, color: TEXT_SOFT, fontWeight: 500, wordBreak: "break-word" }}>{String(value)}</span>
      )}
    </div>
  );
}


function PillRow({ label, items, color, bg, border }: {
  label: string; items: string[]; color: string; bg: string; border: string;
}) {
  return (
    <div>
      <SectionTitle>{label}</SectionTitle>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((it) => (
          <span key={it} style={{ fontSize: 12, fontWeight: 500, color, backgroundColor: bg, border: `1px solid ${border}`, borderRadius: 999, padding: "4px 12px" }}>
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}
