import { Link } from "react-router";
import { Logo } from "../components/Logo";

export function CookiesPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <nav style={{ backgroundColor: "#0F172A", borderBottom: "1px solid #1E293B", padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link to="/" style={{ textDecoration: "none" }}>
          <Logo size={22} color="#fff" />
        </Link>
        <Link to="/" style={{ fontSize: 13, color: "#64748B", textDecoration: "none" }}>← Back to Home</Link>
      </nav>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "56px 32px 80px" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: "#1E293B", marginBottom: 8 }}>Cookie Policy</h1>
        <p style={{ fontSize: 13, color: "#94A3B8", marginBottom: 48 }}>Last updated: January 1, 2026</p>

        {[
          {
            title: "1. What Are Cookies",
            body: "Cookies are small text files placed on your device when you visit a website. They help the site remember your preferences and improve your experience.",
          },
          {
            title: "2. Cookies We Use",
            body: "We use strictly necessary cookies to keep you logged in and maintain your session. We also use functional cookies to remember your preferences such as language and display settings.",
          },
          {
            title: "3. Authentication Cookies",
            body: "When you log in to Altruism, we store a session token in a cookie to authenticate your requests. This cookie expires when you log out or after a period of inactivity.",
          },
          {
            title: "4. Analytics",
            body: "We may use anonymized analytics data to understand how the platform is used and to improve it. This data is not linked to individual user identities.",
          },
          {
            title: "5. Third-Party Cookies",
            body: "We do not use third-party advertising cookies. Any third-party services we integrate (such as email delivery) have their own cookie policies.",
          },
          {
            title: "6. Managing Cookies",
            body: "You can control cookies through your browser settings. Disabling necessary cookies may prevent you from logging in or using core platform features.",
          },
          {
            title: "7. Changes to This Policy",
            body: "We may update this Cookie Policy from time to time. Changes will be posted on this page with an updated date.",
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
