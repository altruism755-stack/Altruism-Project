import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Navbar } from "../components/Navbar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { OrgLogoByName } from "../components/OrgLogos";

const GREEN = "#16A34A";

export function BrowseOrganizations() {
  const { profile } = useAuth();
  const volName = profile?.name || "Volunteer";

  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [myOrgIds, setMyOrgIds] = useState<Set<number>>(new Set());
  const [pendingOrgIds, setPendingOrgIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [orgsRes, volRes] = await Promise.all([
          api.getOrganizations(),
          api.getVolunteerMe(),
        ]);
        setOrgs(orgsRes.organizations || []);

        const volOrgs: any[] = volRes.organizations || [];
        const activeIds = new Set<number>(
          volOrgs.filter((o: any) => o.membership_status === "Active").map((o: any) => o.id)
        );
        const pendingIds = new Set<number>(
          volOrgs.filter((o: any) => o.membership_status === "Pending").map((o: any) => o.id)
        );
        setMyOrgIds(activeIds);
        setPendingOrgIds(pendingIds);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const handleJoin = async (orgId: number) => {
    setJoining(orgId);
    try {
      await api.joinOrganization(orgId);
      setPendingOrgIds((prev) => new Set([...prev, orgId]));
    } catch (e: any) {
      if (e.message?.includes("Already")) {
        setPendingOrgIds((prev) => new Set([...prev, orgId]));
      }
    }
    setJoining(null);
  };

  const filtered = orgs.filter((o) =>
    !search || o.name.toLowerCase().includes(search.toLowerCase()) ||
    (o.category || "").toLowerCase().includes(search.toLowerCase())
  );

  const getMemberStatus = (orgId: number) => {
    if (myOrgIds.has(orgId)) return "active";
    if (pendingOrgIds.has(orgId)) return "pending";
    return "none";
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="volunteer" />
      <div className="flex-1 flex items-center justify-center"><p style={{ color: "#94A3B8" }}>Loading...</p></div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar role="volunteer" />

      <div className="flex-1 px-8 py-6" style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: "#1E293B", margin: 0 }}>Organizations</h1>
          <span style={{ fontSize: 13, color: "#94A3B8" }}>{filtered.length} organization{filtered.length !== 1 ? "s" : ""}</span>
        </div>
        <p style={{ fontSize: 14, color: "#64748B", margin: "0 0 24px 0" }}>
          Browse and join organizations to start volunteering.
        </p>

        {/* Search */}
        <div style={{ marginBottom: 24 }}>
          <input
            type="text"
            placeholder="Search by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", maxWidth: 400, height: 42, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 12px 0 40px", fontSize: 14, outline: "none", boxSizing: "border-box", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "12px center" }}
          />
        </div>

        {/* Org cards grid */}
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
          {filtered.map((org) => {
            const status = getMemberStatus(org.id);
            const accentColor = org.color || GREEN;
            const accentSecondary = org.secondary_color || "#22C55E";
            return (
              <div
                key={org.id}
                onClick={() => navigate(`/dashboard/org/${org.id}`)}
                style={{
                  backgroundColor: "#fff",
                  border: "1px solid #E2E8F0",
                  borderRadius: 16,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  cursor: "pointer",
                  transition: "box-shadow 0.15s, transform 0.15s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.10)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                {/* Card top accent bar */}
                <div style={{ height: 5, background: `linear-gradient(90deg, ${accentColor}, ${accentSecondary})` }} />

                <div style={{ padding: 22, flex: 1, display: "flex", flexDirection: "column" }}>
                  {/* Header: logo + name + category + arrow */}
                  <div className="flex items-start gap-3" style={{ marginBottom: 14 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 12, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #F1F5F9", backgroundColor: "#F8FAFC" }}>
                      <OrgLogoByName name={org.name} size={52} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#1E293B", marginBottom: 4, lineHeight: 1.2 }}>{org.name}</div>
                      {org.category && (
                        <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: "#F1F5F9", color: "#64748B", borderRadius: 20, padding: "3px 10px", display: "inline-block" }}>{org.category}</span>
                      )}
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>

                  {org.description && (
                    <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, margin: "0 0 14px 0", flex: 1 }}>
                      {org.description.length > 110 ? org.description.slice(0, 110) + "…" : org.description}
                    </p>
                  )}

                  {/* Stats row */}
                  <div style={{ display: "flex", gap: 0, backgroundColor: "#F8FAFC", borderRadius: 10, padding: "10px 0", marginBottom: 16 }}>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#1E293B" }}>{org.total_volunteers ?? 0}</div>
                      <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>Volunteers</div>
                    </div>
                    <div style={{ width: 1, backgroundColor: "#E2E8F0", margin: "4px 0" }} />
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#1E293B" }}>{org.active_activities ?? 0}</div>
                      <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>Activities</div>
                    </div>
                    {org.founded && (
                      <>
                        <div style={{ width: 1, backgroundColor: "#E2E8F0", margin: "4px 0" }} />
                        <div style={{ flex: 1, textAlign: "center" }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: "#1E293B" }}>{new Date(org.founded).getFullYear()}</div>
                          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>Founded</div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Join / status button */}
                  {status === "active" ? (
                    <div style={{ height: 38, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#DCFCE7", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#15803D" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                      Member · View Dashboard
                    </div>
                  ) : status === "pending" ? (
                    <div style={{ height: 38, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#FEF3C7", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#B45309" }}>
                      Application Pending
                    </div>
                  ) : org.student_only && profile?.education_level !== "University Student" ? (
                    <div>
                      <button
                        disabled
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: "100%", height: 38, backgroundColor: "#E2E8F0", color: "#94A3B8", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "not-allowed" }}
                      >
                        Join Organization
                      </button>
                      <div style={{ fontSize: 11, color: "#EF4444", marginTop: 5, lineHeight: 1.4 }}>
                        Only available for current university students.
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleJoin(org.id); }}
                      disabled={joining === org.id}
                      style={{
                        width: "100%", height: 38,
                        backgroundColor: joining === org.id ? "#86EFAC" : accentColor,
                        color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
                        cursor: joining === org.id ? "not-allowed" : "pointer",
                        transition: "opacity 0.15s",
                      }}
                    >
                      {joining === org.id ? "Submitting…" : "Join Organization"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 48, color: "#94A3B8" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 15 }}>No organizations match your search.</div>
          </div>
        )}
      </div>
    </div>
  );
}
