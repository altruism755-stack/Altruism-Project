// ─── Organization Logo Components ───────────────────────────────────────────
// Real logo images for Resala, Egyptian Red Crescent, and Enactus Egypt

import resalaLogo from "../assets/logos/resala.png";
import redCrescentLogo from "../assets/logos/red-crescent.png";
import enactusLogo from "../assets/logos/enactus.jpg";

interface LogoProps {
  size?: number;
}

/** Resala — Egyptian charity */
export function ResalaLogo({ size = 48 }: LogoProps) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "white" }}>
      <img src={resalaLogo} alt="Resala" style={{ width: "85%", height: "85%", objectFit: "contain" }} />
    </div>
  );
}

/** Egyptian Red Crescent */
export function RedCrescentLogo({ size = 48 }: LogoProps) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "white" }}>
      <img src={redCrescentLogo} alt="Egyptian Red Crescent" style={{ width: "85%", height: "85%", objectFit: "contain" }} />
    </div>
  );
}

/** Enactus Egypt */
export function EnactusLogo({ size = 48 }: LogoProps) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "white" }}>
      <img src={enactusLogo} alt="Enactus" style={{ width: "85%", height: "85%", objectFit: "contain" }} />
    </div>
  );
}

/** Unified helper — returns the correct logo for a given org ID */
export function OrgLogo({ orgId, size = 48 }: { orgId: string; size?: number }) {
  if (orgId === "org1") return <ResalaLogo size={size} />;
  if (orgId === "org2") return <RedCrescentLogo size={size} />;
  if (orgId === "org3") return <EnactusLogo size={size} />;
  return null;
}
