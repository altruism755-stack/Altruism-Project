import { createBrowserRouter, Navigate } from "react-router";
import { LandingPage } from "./pages/LandingPage";
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
import { NewsFeed } from "./pages/NewsFeed";
import { BrowseOrganizations } from "./pages/BrowseOrganizations";
import { OrgPendingPage } from "./pages/OrgPendingPage";
import { PlatformAdminDashboard } from "./pages/PlatformAdminDashboard";
import { ProtectedRoute } from "./components/ProtectedRoute";

function ErrorPage() {
  return (
    <div style={{ padding: 32, fontFamily: "Inter, system-ui, sans-serif" }}>
      <h1 style={{ color: "#DC2626" }}>Page Error</h1>
      <p>Something went wrong loading this page.</p>
      <a href="/" style={{ color: "#16A34A" }}>Go Home</a>
    </div>
  );
}

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage />, errorElement: <ErrorPage /> },
  { path: "/login", element: <LoginPage />, errorElement: <ErrorPage /> },
  { path: "/register", element: <RegisterPage />, errorElement: <ErrorPage /> },

  // Platform admin
  { path: "/platform-admin", element: <ProtectedRoute requirePlatformAdmin><PlatformAdminDashboard /></ProtectedRoute>, errorElement: <ErrorPage /> },

  // Organization admin routes — all gated on organization approval
  { path: "/org", element: <ProtectedRoute allowedRoles={["org_admin"]} requireApprovedOrg><OrgDashboard /></ProtectedRoute>, errorElement: <ErrorPage /> },
  { path: "/org/pending", element: <ProtectedRoute allowedRoles={["org_admin"]}><OrgPendingPage /></ProtectedRoute>, errorElement: <ErrorPage /> },
  { path: "/org/volunteers", element: <ProtectedRoute allowedRoles={["org_admin"]} requireApprovedOrg><VolunteerManagement /></ProtectedRoute>, errorElement: <ErrorPage /> },
  { path: "/org/supervisors", element: <ProtectedRoute allowedRoles={["org_admin"]} requireApprovedOrg><SupervisorManagement /></ProtectedRoute>, errorElement: <ErrorPage /> },
  { path: "/org/activities", element: <ProtectedRoute allowedRoles={["org_admin"]} requireApprovedOrg><EventManagement /></ProtectedRoute>, errorElement: <ErrorPage /> },
  { path: "/org/events", element: <Navigate to="/org/activities" replace /> },
  { path: "/org/reports", element: <ProtectedRoute allowedRoles={["org_admin"]} requireApprovedOrg><ReportsPage /></ProtectedRoute>, errorElement: <ErrorPage /> },

  // Supervisor routes
  { path: "/supervisor", element: <ProtectedRoute allowedRoles={["supervisor"]}><SupervisorDashboard /></ProtectedRoute>, errorElement: <ErrorPage /> },
  { path: "/supervisor/volunteer/:id", element: <ProtectedRoute allowedRoles={["supervisor"]}><VolunteerDetail /></ProtectedRoute>, errorElement: <ErrorPage /> },

  // Volunteer routes
  { path: "/dashboard", element: <Navigate to="/dashboard/profile" replace /> },
  { path: "/dashboard/profile", element: <ProtectedRoute allowedRoles={["volunteer"]}><ProfilePage /></ProtectedRoute>, errorElement: <ErrorPage /> },
  { path: "/dashboard/orgs", element: <ProtectedRoute allowedRoles={["volunteer"]}><BrowseOrganizations /></ProtectedRoute>, errorElement: <ErrorPage /> },
  { path: "/dashboard/org/:orgId", element: <ProtectedRoute allowedRoles={["volunteer"]}><VolunteerOrgDashboard /></ProtectedRoute>, errorElement: <ErrorPage /> },
  { path: "/dashboard/feed", element: <ProtectedRoute allowedRoles={["volunteer"]}><NewsFeed /></ProtectedRoute>, errorElement: <ErrorPage /> },

  // Catch-all
  { path: "*", element: <Navigate to="/" replace /> },
]);
