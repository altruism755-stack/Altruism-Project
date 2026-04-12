import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";

interface Props {
  children: React.ReactNode;
  allowedRoles?: ("volunteer" | "supervisor" | "org_admin")[];
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
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

  return <>{children}</>;
}
