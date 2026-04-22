import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";

interface Props {
  children: React.ReactNode;
  allowedRoles?: ("volunteer" | "supervisor" | "org_admin")[];
  requirePlatformAdmin?: boolean;
  requireApprovedOrg?: boolean;
}

export function ProtectedRoute({ children, allowedRoles, requirePlatformAdmin, requireApprovedOrg }: Props) {
  const { user, orgStatus } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requirePlatformAdmin) {
    if (!user.is_platform_admin) {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their own dashboard
    const redirectMap: Record<string, string> = {
      volunteer: "/dashboard",
      supervisor: "/supervisor",
      org_admin: "/org",
    };
    return <Navigate to={redirectMap[user.role] || "/"} replace />;
  }

  // Gate org_admin features on organization approval status.
  // Explicitly block "pending" and "rejected"; null passes through (demo / no-status backend).
  if (requireApprovedOrg && user.role === "org_admin" && (orgStatus === "pending" || orgStatus === "rejected")) {
    return <Navigate to="/org/pending" replace />;
  }

  return <>{children}</>;
}
