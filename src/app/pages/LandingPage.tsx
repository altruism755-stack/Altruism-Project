import { useNavigate } from "react-router";
import { useState } from "react";
import { ResalaLogo, RedCrescentLogo, EnactusLogo } from "../components/OrgLogos";
import { Logo } from "../components/Logo";
import heroBg from "../assets/hero-bg.png";

const C = {
  navBg: "#0F172A",
  primary: "#16A34A",
  primaryHover: "#15803D",
  primaryLight: "#DCFCE7",
  danger: "#DC2626",
  warning: "#D97706",
  surface: "#F8FAFC",
  card: "#FFFFFF",
  nav: "#0F172A",
  gray950: "#0F172A",
  gray900: "#1E293B",
  gray700: "#334155",
  gray500: "#64748B",
  gray400: "#94A3B8",
  gray200: "#E2E8F0",
  gray50: "#F8FAFC",
  white: "#FFFFFF",
  teal: "#06B6D4",
};


const features = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    gradient: "linear-gradient(135deg,#16A34A,#22C55E)",
    title: "Volunteer Management",
    body: "Volunteers sign up, apply to organizations, and manage their activities, certificates, and personal profiles.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" />
        <path d="M8 18h.01" /><path d="M12 18h.01" />
      </svg>
    ),
    gradient: "linear-gradient(135deg,#2563EB,#3B82F6)",
    title: "Activity & Event Coordination",
    body: "Organizations create activities, supervisors approve participation, and volunteers track their hours — all in one place.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M9 15l2 2 4-4" />
      </svg>
    ),
    gradient: "linear-gradient(135deg,#0891B2,#06B6D4)",
    title: "Certificates & Reporting",
    body: "Issue certificates, generate reports, and recognize volunteer contributions with verified records.",
  },
];

const steps = [
  { num: "1", title: "Register on the platform", body: "Organizations and volunteers sign up easily. Supervisors are added by their organization." },
  { num: "2", title: "Apply & connect", body: "Volunteers browse and apply to organizations, join activities, and get matched with opportunities that fit them." },
  { num: "3", title: "Manage & certify", body: "Track hours, approve activities, issue certificates, and celebrate impact." },
];

export function LandingPage() {
  const navigate = useNavigate();
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", backgroundColor: C.white, overflowX: "hidden" }}>
      {/* ═══ NAVBAR ═══ */}
      <nav style={{ backgroundColor: C.navBg, height: 64, width: "100%", position: "sticky", top: 0, zIndex: 100, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center justify-between" style={{ maxWidth: 1280, margin: "0 auto", height: "100%", padding: "0 32px" }}>
          <div>
            <Logo size={24} color={C.white} />
          </div>
          <div className="hidden md:flex items-center gap-8">
            {["Features", "How It Works", "For Organizations"].map((link) => (
              <a key={link} href={`#${link.toLowerCase().replace(/ /g, "-")}`} style={{ fontSize: 14, fontWeight: 500, color: C.gray400, textDecoration: "none" }}>{link}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/login")} style={{ backgroundColor: "transparent", color: C.gray400, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, height: 36, padding: "0 16px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Login</button>
            <button onClick={() => navigate("/register")} style={{ backgroundColor: C.primary, color: C.white, border: "none", borderRadius: 8, height: 36, padding: "0 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.primaryHover)} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.primary)}>Get Started</button>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section style={{ background: "linear-gradient(160deg, #0F172A 0%, #0D2818 50%, #0F172A 100%)", minHeight: 700, padding: "100px 32px 0", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Ambient glow effects */}
        <div style={{ position: "absolute", top: -200, left: "50%", transform: "translateX(-50%)", width: 800, height: 800, borderRadius: "50%", background: "radial-gradient(circle, rgba(22,163,74,0.15) 0%, transparent 60%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: -100, right: -200, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Text content */}
        <div className="flex flex-col items-center text-center" style={{ maxWidth: 780, margin: "0 auto", position: "relative", zIndex: 2 }}>
            <h1 style={{ fontSize: 56, fontWeight: 800, color: C.white, lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 24px 0" }}>
              The bridge between volunteers and the organizations that need them
            </h1>
            <p style={{ fontSize: 18, color: "rgba(148,163,184,0.9)", lineHeight: 1.7, margin: "0 0 40px 0", maxWidth: 560 }}>
              Altruism is an intermediary platform connecting non-profit organizations and volunteer-driven entities with the volunteers who power them.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <button onClick={() => navigate("/register")} style={{ backgroundColor: C.primary, color: C.white, border: "none", borderRadius: 10, height: 52, padding: "0 32px", fontSize: 16, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 24px rgba(22,163,74,0.35)" }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.primaryHover)} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.primary)}>Join as a Volunteer</button>
              <button onClick={() => navigate("/register")} style={{ backgroundColor: "rgba(255,255,255,0.06)", color: C.white, border: "1.5px solid rgba(255,255,255,0.2)", borderRadius: 10, height: 52, padding: "0 32px", fontSize: 16, fontWeight: 600, cursor: "pointer", backdropFilter: "blur(8px)" }}>Register Your Organization</button>
            </div>
        </div>

        {/* Hero illustration */}
        <img src={heroBg} alt="" style={{ position: "relative", zIndex: 1, marginTop: 32, width: "100vw", maxWidth: "none", opacity: 0.5, maskImage: "linear-gradient(to bottom, black 50%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, black 50%, transparent 100%)" }} />
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" style={{ backgroundColor: C.white, padding: "96px 32px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div className="text-center" style={{ marginBottom: 56 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.primary, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Features</div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: C.gray950, letterSpacing: "-0.02em", maxWidth: 560, margin: "0 auto", lineHeight: 1.2 }}>Everything your organization needs</h2>
            <p style={{ fontSize: 16, color: C.gray500, maxWidth: 480, margin: "16px auto 0", lineHeight: 1.6 }}>
              Powerful tools designed to streamline volunteer coordination from sign-up to certification.
            </p>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 28 }}>
            {features.map((f, i) => (
              <div key={f.title} onMouseEnter={() => setHoveredFeature(i)} onMouseLeave={() => setHoveredFeature(null)} style={{ backgroundColor: C.white, border: `1px solid ${hoveredFeature === i ? "transparent" : C.gray200}`, borderRadius: 16, padding: "32px", transition: "all 250ms cubic-bezier(0.4,0,0.2,1)", boxShadow: hoveredFeature === i ? "0 20px 48px rgba(0,0,0,0.12)" : "0 1px 3px rgba(0,0,0,0.04)", transform: hoveredFeature === i ? "translateY(-6px)" : "none" }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: f.gradient, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, boxShadow: `0 8px 20px ${i === 0 ? "rgba(22,163,74,0.25)" : i === 1 ? "rgba(37,99,235,0.25)" : "rgba(8,145,178,0.25)"}` }}>{f.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: C.gray900, marginBottom: 10 }}>{f.title}</h3>
                <p style={{ fontSize: 15, color: C.gray500, lineHeight: 1.7, margin: 0 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how-it-works" style={{ backgroundColor: C.gray50, padding: "96px 32px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div className="text-center" style={{ marginBottom: 64 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.primary, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>How It Works</div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: C.gray950, letterSpacing: "-0.02em" }}>Get started in three steps</h2>
          </div>
          <div className="grid grid-cols-3" style={{ gap: 48, position: "relative" }}>
            {/* Connector line */}
            <div style={{ position: "absolute", top: 36, left: "20%", right: "20%", height: 2, background: `linear-gradient(90deg, ${C.primary}, ${C.teal})`, opacity: 0.25, zIndex: 0 }} />
            {steps.map((step, i) => (
              <div key={step.num} className="flex flex-col items-center text-center" style={{ position: "relative", zIndex: 1 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: "50%",
                  backgroundColor: i === 1 ? C.primary : C.white,
                  border: `3px solid ${C.primary}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 26, fontWeight: 800,
                  color: i === 1 ? C.white : C.primary,
                  marginBottom: 28,
                  boxShadow: i === 1 ? "0 8px 28px rgba(22,163,74,0.35)" : "0 4px 16px rgba(0,0,0,0.06)",
                  transition: "all 200ms",
                }}>{step.num}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: C.gray900, marginBottom: 10 }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: C.gray500, lineHeight: 1.7, maxWidth: 260 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ORGANIZATIONS ═══ */}
      <section style={{ background: "linear-gradient(160deg, #0F172A 0%, #0D2818 60%, #0F172A 100%)", padding: "96px 32px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div className="text-center" style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.primary, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Potential Use Cases</div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: C.white, letterSpacing: "-0.02em" }}>Organizations Similar to Our Target Users</h2>
            <p style={{ fontSize: 16, color: C.gray400, maxWidth: 480, margin: "16px auto 0", lineHeight: 1.6 }}>
              These are examples of organizations that could use Altruism to manage volunteers.
            </p>
          </div>

          <div className="flex items-center justify-center gap-16" style={{ padding: "40px 48px", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
            {[
              { Logo: ResalaLogo, name: "Resala", tagline: "Community & Social Welfare" },
              { Logo: RedCrescentLogo, name: "Egyptian Red Crescent", tagline: "Humanitarian Aid" },
              { Logo: EnactusLogo, name: "Enactus Egypt", tagline: "Student Entrepreneurship" },
            ].map(({ Logo, name, tagline }) => (
              <div key={name} className="flex flex-col items-center gap-4">
                <div style={{ backgroundColor: "white", borderRadius: 16, padding: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
                  <Logo size={64} />
                </div>
                <div className="text-center">
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.white }}>{name}</div>
                  <div style={{ fontSize: 13, color: C.gray400 }}>{tagline}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SPLIT CTA ═══ */}
      <section id="for-organizations" style={{ backgroundColor: C.white, padding: "96px 32px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div className="text-center" style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: C.gray950, letterSpacing: "-0.02em" }}>Ready to make a difference?</h2>
            <p style={{ fontSize: 16, color: C.gray500, maxWidth: 480, margin: "12px auto 0", lineHeight: 1.6 }}>
              Whether you want to volunteer or manage a program, getting started takes less than a minute.
            </p>
          </div>
          <div className="grid grid-cols-2" style={{ gap: 32 }}>
            <div style={{ padding: "40px", borderRadius: 20, background: "linear-gradient(135deg, #16A34A, #15803D)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
              <div style={{ position: "relative" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </div>
                <h3 style={{ fontSize: 24, fontWeight: 700, color: C.white, marginBottom: 12, lineHeight: 1.3 }}>Are you a volunteer?</h3>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.8)", lineHeight: 1.7, marginBottom: 28, maxWidth: 340 }}>Join thousands of volunteers making a difference. Track your hours, join events, and build your impact story.</p>
                <button onClick={() => navigate("/register")} style={{ backgroundColor: C.white, color: C.primary, border: "none", borderRadius: 10, height: 48, padding: "0 28px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Sign Up Now</button>
              </div>
            </div>
            <div style={{ padding: "40px", borderRadius: 20, background: C.gray950, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
              <div style={{ position: "relative" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                </div>
                <h3 style={{ fontSize: 24, fontWeight: 700, color: C.white, marginBottom: 12, lineHeight: 1.3 }}>Are you an organization?</h3>
                <p style={{ fontSize: 15, color: C.gray400, lineHeight: 1.7, marginBottom: 28, maxWidth: 340 }}>Start managing your volunteer program smarter. Full dashboard, event tools, and reporting — all in one place.</p>
                <button onClick={() => navigate("/register")} style={{ backgroundColor: "transparent", color: C.white, border: "1.5px solid rgba(255,255,255,0.25)", borderRadius: 10, height: 48, padding: "0 28px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Get Started</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ backgroundColor: C.gray950, borderTop: "1px solid #1E293B", padding: "64px 32px 32px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div className="grid" style={{ gridTemplateColumns: "2.5fr 1fr 1fr 1fr", gap: 48, marginBottom: 56 }}>
            <div>
              <div style={{ marginBottom: 16 }}>
                <Logo size={26} color={C.white} tagline taglineColor={C.gray500} taglineSize={11} />
              </div>
              <p style={{ fontSize: 14, color: C.gray500, lineHeight: 1.7, maxWidth: 280 }}>A platform bridging non-profit organizations, student activities, and volunteers together.</p>
            </div>
            {[
              { title: "Platform", links: ["Features", "How It Works", "For Organizations"] },
              { title: "Resources", links: ["Help Center", "Documentation", "API"] },
              { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Cookie Policy", "Contact Us"] },
            ].map((col) => (
              <div key={col.title}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.white, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>{col.title}</div>
                {col.links.map((link) => (
                  <div key={link} style={{ marginBottom: 10 }}>
                    <a href="#" style={{ fontSize: 14, color: C.gray500, textDecoration: "none" }}>{link}</a>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #1E293B", paddingTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "#475569" }}>© 2026 Altruism. All rights reserved.</span>
            <div className="flex items-center gap-6">
              {["Privacy", "Terms", "Cookies"].map((link) => (
                <a key={link} href="#" style={{ fontSize: 12, color: "#475569", textDecoration: "none" }}>{link}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
