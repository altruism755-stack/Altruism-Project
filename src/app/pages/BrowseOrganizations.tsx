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
                style={{
                  backgroundColor: "#fff",
                  border: "1px solid #E2E8F0",
                  borderRadius: 14,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                }}
              >
                {/* Accent bar */}
                <div style={{ height: 4, background: `linear-gradient(90deg, ${accentColor}, ${accentSecondary})` }} />

                <div style={{ padding: 24, flex: 1, display: "flex", flexDirection: "column" }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 10, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #E2E8F0", backgroundColor: "#fff" }}>
                      <OrgLogoByName name={org.name} size={48} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", marginBottom: 5, lineHeight: 1.3 }}>{org.name}</div>
                      {org.category && (
                        <span style={{ fontSize: 11, fontWeight: 500, backgroundColor: "#F1F5F9", color: "#475569", borderRadius: 4, padding: "2px 8px", display: "inline-block", letterSpacing: "0.01em" }}>{org.category}</span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {org.description && (
                    <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.7, margin: "0 0 20px 0", flex: 1 }}>
                      {org.description.length > 115 ? org.description.slice(0, 115) + "…" : org.description}
                    </p>
                  )}

                  {/* Divider */}
                  <div style={{ height: 1, backgroundColor: "#F1F5F9", marginBottom: 16 }} />

                  {/* Membership status badge */}
                  {status === "active" && (
                    <div style={{ marginBottom: 10, height: 28, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#DCFCE7", borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#15803D", letterSpacing: "0.01em" }}>
                      Member
                    </div>
                  )}
                  {status === "pending" && (
                    <div style={{ marginBottom: 10, height: 28, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#FEF9C3", borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#A16207", letterSpacing: "0.01em" }}>
                      Application Pending
                    </div>
                  )}
                  {status === "none" && org.student_only && profile?.education_level !== "University Student" && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ height: 28, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9", borderRadius: 6, fontSize: 12, fontWeight: 500, color: "#94A3B8" }}>
                        University Students Only
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 8 }}>
                    {/* View Profile button — always visible */}
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/org/${org.id}`); }}
                      style={{
                        flex: 1, height: 38, backgroundColor: "#fff",
                        color: "#334155", border: "1.5px solid #E2E8F0", borderRadius: 8,
                        fontSize: 13, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      View Profile
                    </button>

                    {/* Join / blocked button */}
                    {status === "none" && !(org.student_only && profile?.education_level !== "University Student") && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleJoin(org.id); }}
                        disabled={joining === org.id}
                        style={{
                          flex: 1, height: 38,
                          backgroundColor: joining === org.id ? "#86EFAC" : accentColor,
                          color: "#fff", border: "none", borderRadius: 8,
                          fontSize: 13, fontWeight: 600,
                          cursor: joining === org.id ? "not-allowed" : "pointer",
                        }}
                      >
                        {joining === org.id ? "Submitting…" : "Join"}
                      </button>
                    )}
                  </div>
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
