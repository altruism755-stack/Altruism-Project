import { createBrowserRouter, Navigate, Outlet, useRouteError, useLocation } from "react-router";
import { useEffect } from "react";
import { LandingPage } from "./pages/LandingPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { TermsPage } from "./pages/TermsPage";
import { CookiesPage } from "./pages/CookiesPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { OrgDashboard } from "./pages/OrgDashboard";
import { VolunteerManagement } from "./pages/VolunteerManagement";
import { SupervisorManagement } from "./pages/SupervisorManagement";
import { EventManagement } from "./pages/EventManagement";
import { ReportsPage } from "./pages/ReportsPage";
import { SupervisorDashboard } from "./pages/SupervisorDashboard";
import { VolunteerDetail } from "./pages/VolunteerDetail";
import { ProfilePage } from "./pages/ProfilePage";
import { VolunteerOrgDashboard } from "./pages/VolunteerOrgDashboard";
import { VolunteerOrgProfile } from "./pages/VolunteerOrgProfile";
import { NewsFeed } from "./pages/NewsFeed";
import { BrowseOrganizations } from "./pages/BrowseOrganizations";
import { OrgPendingPage } from "./pages/OrgPendingPage";
import { OrgProfilePage } from "./pages/OrgProfilePage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { PlatformAdminDashboard } from "./pages/PlatformAdminDashboard";
import { AcceptInvitePage } from "./pages/AcceptInvitePage";
import { ProtectedRoute } from "./components/ProtectedRoute";

function ErrorPage() {
  const error = useRouteError() as any;
  const msg = error?.message || error?.statusText || String(error) || "Unknown error";
  const stack = error?.stack;
  return (
    <div style={{ padding: 32, fontFamily: "Inter, system-ui, sans-serif" }}>
      <h1 style={{ color: "#DC2626" }}>Page Error</h1>
      <p>Something went wrong loading this page.</p>
      <pre style={{ background: "#FEF2F2", padding: 16, borderRadius: 8, fontSize: 13, color: "#991B1B", whiteSpace: "pre-wrap", wordBreak: "break-all", marginBottom: 16 }}>{msg}</pre>
      {stack && <pre style={{ background: "#F1F5F9", padding: 12, borderRadius: 8, fontSize: 11, color: "#64748B", whiteSpace: "pre-wrap", wordBreak: "break-all", marginBottom: 16 }}>{stack}</pre>}
      <a href="/" style={{ color: "#16A34A" }}>Go Home</a>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function RootLayout() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
    </>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/privacy", element: <PrivacyPage /> },
      { path: "/terms", element: <TermsPage /> },
      { path: "/cookies", element: <CookiesPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/accept-invite", element: <AcceptInvitePage /> },

      // Platform admin
      { path: "/platform-admin", element: <ProtectedRoute requirePlatformAdmin><PlatformAdminDashboard /></ProtectedRoute> },

      // Organization admin routes — all gated on organization approval
      { path: "/org", element: <ProtectedRoute allowedRoles={["org_admin"]} requireApprovedOrg><OrgDashboard /></ProtectedRoute> },
      { path: "/org/pending", element: <ProtectedRoute allowedRoles={["org_admin"]}><OrgPendingPage /></ProtectedRoute> },
      { path: "/org/volunteers", element: <ProtectedRoute allowedRoles={["org_admin"]} requireApprovedOrg><VolunteerManagement /></ProtectedRoute> },
      { path: "/org/supervisors", element: <ProtectedRoute allowedRoles={["org_admin"]} requireApprovedOrg><SupervisorManagement /></ProtectedRoute> },
      { path: "/org/activities", element: <ProtectedRoute allowedRoles={["org_admin"]} requireApprovedOrg><EventManagement /></ProtectedRoute> },
      { path: "/org/events", element: <Navigate to="/org/activities" replace /> },
      { path: "/org/reports", element: <ProtectedRoute allowedRoles={["org_admin"]} requireApprovedOrg><ReportsPage /></ProtectedRoute> },
      { path: "/org/profile", element: <ProtectedRoute allowedRoles={["org_admin"]} requireApprovedOrg><OrgProfilePage /></ProtectedRoute> },
      { path: "/org/notifications", element: <ProtectedRoute allowedRoles={["org_admin"]} requireApprovedOrg><NotificationsPage /></ProtectedRoute> },

      // Supervisor routes
      { path: "/supervisor", element: <ProtectedRoute allowedRoles={["supervisor"]}><SupervisorDashboard /></ProtectedRoute> },
      { path: "/supervisor/volunteer/:id", element: <ProtectedRoute allowedRoles={["supervisor"]}><VolunteerDetail /></ProtectedRoute> },
      { path: "/supervisor/notifications", element: <ProtectedRoute allowedRoles={["supervisor"]}><NotificationsPage /></ProtectedRoute> },

      // Volunteer routes
      { path: "/dashboard", element: <Navigate to="/dashboard/profile" replace /> },
      { path: "/dashboard/profile", element: <ProtectedRoute allowedRoles={["volunteer"]}><ProfilePage /></ProtectedRoute> },
      { path: "/dashboard/orgs", element: <ProtectedRoute allowedRoles={["volunteer"]}><BrowseOrganizations /></ProtectedRoute> },
      { path: "/dashboard/org/:orgId", element: <ProtectedRoute allowedRoles={["volunteer"]}><VolunteerOrgDashboard /></ProtectedRoute> },
      { path: "/dashboard/org/:orgId/profile", element: <ProtectedRoute allowedRoles={["volunteer"]}><VolunteerOrgProfile /></ProtectedRoute> },
      { path: "/dashboard/feed", element: <ProtectedRoute allowedRoles={["volunteer"]}><NewsFeed /></ProtectedRoute> },
{ path: "/dashboard/notifications", element: <ProtectedRoute allowedRoles={["volunteer"]}><NotificationsPage /></ProtectedRoute> },

      // Catch-all
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
