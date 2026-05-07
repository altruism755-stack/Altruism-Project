import { Link } from "react-router";
import { Logo } from "../components/Logo";

export function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <nav style={{ backgroundColor: "#0F172A", borderBottom: "1px solid #1E293B", padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link to="/" style={{ textDecoration: "none" }}>
          <Logo size={22} color="#fff" />
        </Link>
        <Link to="/" style={{ fontSize: 13, color: "#64748B", textDecoration: "none" }}>← Back to Home</Link>
      </nav>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "56px 32px 80px" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: "#1E293B", marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ fontSize: 13, color: "#94A3B8", marginBottom: 48 }}>Last updated: January 1, 2026</p>

        {[
          {
            title: "1. Information We Collect",
            body: "We collect information you provide directly, such as your name, email address, and organization details when you register. We also collect usage data to improve our services, including pages visited and features used.",
          },
          {
            title: "2. How We Use Your Information",
            body: "We use your information to operate and improve Altruism, to communicate with you about your account and activities, and to match volunteers with organizations. We do not sell your personal data to third parties.",
          },
          {
            title: "3. Data Sharing",
            body: "Your profile information is shared with organizations you choose to join. Volunteer hours and activity records are visible to your organization admins and supervisors. We do not share your data with unaffiliated third parties.",
          },
          {
            title: "4. Data Retention",
            body: "We retain your account data for as long as your account is active. You may request deletion of your account and associated data at any time by contacting us at altruism755@gmail.com.",
          },
          {
            title: "5. Security",
            body: "We implement industry-standard security measures to protect your data, including encrypted connections (HTTPS) and secure password storage. No method of transmission over the internet is 100% secure.",
          },
          {
            title: "6. Your Rights",
            body: "You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at altruism755@gmail.com or 01208212210.",
          },
          {
            title: "7. Changes to This Policy",
            body: "We may update this Privacy Policy from time to time. We will notify you of significant changes via email or a notice on the platform.",
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
