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
import { VolunteerDashboard } from "./pages/VolunteerDashboard";
import { LogActivityPage } from "./pages/LogActivityPage";
import { ProfilePage } from "./pages/ProfilePage";
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
  // Organization routes (org_admin only)
  { path: "/org", element: <ProtectedRoute allowedRoles={["org_admin"]}><OrgDashboard /></ProtectedRoute>, errorElement: <ErrorPage /> },
  { path: "/org/volunteers", element: <ProtectedRoute allowedRoles={["org_admin"]}><VolunteerManagement /></ProtectedRoute>, errorElement: <ErrorPage /> },
  { path: "/org/supervisors", element: <ProtectedRoute allowedRoles={["org_admin"]}><SupervisorManagement /></ProtectedRoute>, errorElement: <ErrorPage /> },
  { path: "/org/events", element: <ProtectedRoute allowedRoles={["org_admin"]}><EventManagement /></ProtectedRoute>, errorElement: <ErrorPage /> },
  { path: "/org/reports", element: <ProtectedRoute allowedRoles={["org_admin"]}><ReportsPage /></ProtectedRoute>, errorElement: <ErrorPage /> },
  // Supervisor routes
  { path: "/supervisor", element: <ProtectedRoute allowedRoles={["supervisor"]}><SupervisorDashboard /></ProtectedRoute>, errorElement: <ErrorPage /> },
  { path: "/supervisor/volunteer/:id", element: <ProtectedRoute allowedRoles={["supervisor"]}><VolunteerDetail /></ProtectedRoute>, errorElement: <ErrorPage /> },
  // Volunteer routes
  { path: "/dashboard", element: <ProtectedRoute allowedRoles={["volunteer"]}><VolunteerDashboard /></ProtectedRoute>, errorElement: <ErrorPage /> },
  { path: "/dashboard/log-activity", element: <ProtectedRoute allowedRoles={["volunteer"]}><LogActivityPage /></ProtectedRoute>, errorElement: <ErrorPage /> },
  { path: "/dashboard/profile", element: <ProtectedRoute allowedRoles={["volunteer"]}><ProfilePage /></ProtectedRoute>, errorElement: <ErrorPage /> },
  // Catch-all
  { path: "*", element: <Navigate to="/" replace /> },
]);
