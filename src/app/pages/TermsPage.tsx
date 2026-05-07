import { Link } from "react-router";
import { Logo } from "../components/Logo";

export function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <nav style={{ backgroundColor: "#0F172A", borderBottom: "1px solid #1E293B", padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link to="/" style={{ textDecoration: "none" }}>
          <Logo size={22} color="#fff" />
        </Link>
        <Link to="/" style={{ fontSize: 13, color: "#64748B", textDecoration: "none" }}>← Back to Home</Link>
      </nav>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "56px 32px 80px" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: "#1E293B", marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ fontSize: 13, color: "#94A3B8", marginBottom: 48 }}>Last updated: January 1, 2026</p>

        {[
          {
            title: "1. Acceptance of Terms",
            body: "By creating an account and using Altruism, you agree to these Terms of Service. If you do not agree, please do not use the platform.",
          },
          {
            title: "2. Eligibility",
            body: "You must be at least 16 years old to use Altruism. Organizations registering on the platform must be legitimate non-profit or student activity groups.",
          },
          {
            title: "3. User Responsibilities",
            body: "You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate information and to update it as needed. You must not use the platform for any unlawful purpose.",
          },
          {
            title: "4. Organization Accounts",
            body: "Organization admins are responsible for managing their volunteers, activity records, and certificates. Altruism reserves the right to suspend organizations that violate these terms or misuse the platform.",
          },
          {
            title: "5. Volunteer Hours and Certificates",
            body: "Volunteer hours are recorded and approved by organization supervisors. Certificates are issued by organizations, not by Altruism. Altruism is not liable for errors in hours or certificates issued by organizations.",
          },
          {
            title: "6. Intellectual Property",
            body: "The Altruism name, logo, and platform design are the property of Altruism. You may not reproduce or use them without written permission.",
          },
          {
            title: "7. Termination",
            body: "We may suspend or terminate accounts that violate these Terms. You may delete your account at any time by contacting altruism755@gmail.com.",
          },
          {
            title: "8. Limitation of Liability",
            body: "Altruism is provided as-is. We are not liable for any indirect or consequential damages arising from your use of the platform.",
          },
          {
            title: "9. Changes to Terms",
            body: "We may revise these Terms at any time. Continued use of the platform after changes constitutes acceptance of the updated Terms.",
          },
        ].map(({ title, body }) => (
          <div key={title} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: "#1E293B", marginBottom: 10 }}>{title}</h2>
            <p style={{ fontSize: 15, color: "#475569", lineHeight: 1.75, margin: 0 }}>{body}</p>
          </div>
        ))}

        <div style={{ marginTop: 56, borderTop: "1px solid #E2E8F0", paddingTop: 28 }}>
          <p style={{ fontSize: 14, color: "#64748B" }}>
            Questions? Contact us at{" "}
            <a href="mailto:altruism755@gmail.com" style={{ color: "#16A34A" }}>altruism755@gmail.com</a>
            {" "}or{" "}
            <a href="tel:01208212210" style={{ color: "#16A34A" }}>01208212210</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
