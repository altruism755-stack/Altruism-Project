import { useState, useEffect } from "react";
import { Navbar } from "../components/Navbar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { OrgLogo } from "../components/OrgLogos";

const GREEN = "#16A34A";

export function BrowseOrganizations() {
  const { profile } = useAuth();
  const volName = profile?.name || "Volunteer";

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
            return (
              <div key={org.id} style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {/* Card top bar */}
                <div style={{ height: 6, background: `linear-gradient(90deg, ${org.color || GREEN}, ${org.secondary_color || "#22C55E"})` }} />

                <div style={{ padding: 24, flex: 1 }}>
                  <div className="flex items-start gap-4" style={{ marginBottom: 16 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 12, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <OrgLogo orgId={org.id} size={52} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 17, fontWeight: 600, color: "#1E293B", marginBottom: 2 }}>{org.name}</div>
                      {org.category && (
                        <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: "#F1F5F9", color: "#64748B", borderRadius: 12, padding: "2px 8px" }}>{org.category}</span>
                      )}
                    </div>
                  </div>

                  {org.description && (
                    <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, margin: "0 0 16px 0" }}>
                      {org.description.length > 120 ? org.description.slice(0, 120) + "…" : org.description}
                    </p>
                  )}

                  {/* Stats row */}
                  <div className="flex gap-4" style={{ marginBottom: 20 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#1E293B" }}>{org.total_volunteers ?? 0}</div>
                      <div style={{ fontSize: 11, color: "#94A3B8" }}>Volunteers</div>
                    </div>
                    <div style={{ width: 1, backgroundColor: "#E2E8F0" }} />
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#1E293B" }}>{org.active_activities ?? 0}</div>
                      <div style={{ fontSize: 11, color: "#94A3B8" }}>Activities</div>
                    </div>
                    {org.founded && (
                      <>
                        <div style={{ width: 1, backgroundColor: "#E2E8F0" }} />
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 20, fontWeight: 700, color: "#1E293B" }}>{new Date(org.founded).getFullYear()}</div>
                          <div style={{ fontSize: 11, color: "#94A3B8" }}>Founded</div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Join button */}
                  {status === "active" ? (
                    <div style={{ height: 38, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#DCFCE7", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#15803D" }}>
                      ✓ Member
                    </div>
                  ) : status === "pending" ? (
                    <div style={{ height: 38, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#FEF3C7", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#B45309" }}>
                      ⏳ Application Pending
                    </div>
                  ) : org.student_only && profile?.education_level !== "University Student" ? (
                    <div>
                      <button
                        disabled
                        style={{
                          width: "100%", height: 38, backgroundColor: "#E2E8F0",
                          color: "#94A3B8", border: "none", borderRadius: 8, fontSize: 13,
                          fontWeight: 600, cursor: "not-allowed",
                        }}
                      >
                        Join Organization
                      </button>
                      <div style={{ fontSize: 11, color: "#EF4444", marginTop: 6, lineHeight: 1.4 }}>
                        Sorry, Enactus opportunities are only available for current university students.
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleJoin(org.id)}
                      disabled={joining === org.id}
                      style={{
                        width: "100%", height: 38, backgroundColor: joining === org.id ? "#86EFAC" : GREEN,
                        color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
                        cursor: joining === org.id ? "not-allowed" : "pointer",
                      }}
                    >
                      {joining === org.id ? "Submitting..." : "Join Organization"}
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
