import { createBrowserRouter, Navigate, Outlet } from "react-router";
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

function RootLayout() {
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },

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

      // Supervisor routes
      { path: "/supervisor", element: <ProtectedRoute allowedRoles={["supervisor"]}><SupervisorDashboard /></ProtectedRoute> },
      { path: "/supervisor/volunteer/:id", element: <ProtectedRoute allowedRoles={["supervisor"]}><VolunteerDetail /></ProtectedRoute> },

      // Volunteer routes
      { path: "/dashboard", element: <Navigate to="/dashboard/profile" replace /> },
      { path: "/dashboard/profile", element: <ProtectedRoute allowedRoles={["volunteer"]}><ProfilePage /></ProtectedRoute> },
      { path: "/dashboard/orgs", element: <ProtectedRoute allowedRoles={["volunteer"]}><BrowseOrganizations /></ProtectedRoute> },
      { path: "/dashboard/org/:orgId", element: <ProtectedRoute allowedRoles={["volunteer"]}><VolunteerOrgDashboard /></ProtectedRoute> },
      { path: "/dashboard/feed", element: <ProtectedRoute allowedRoles={["volunteer"]}><NewsFeed /></ProtectedRoute> },

      // Catch-all
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
