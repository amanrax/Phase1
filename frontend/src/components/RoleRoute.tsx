// src/components/RoleRoute.tsx
import { Navigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";

type RoleRouteProps = {
  children: React.ReactNode;
  requiredRole: string | string[];
};

export const RoleRoute = ({ children, requiredRole }: RoleRouteProps) => {
  const { user } = useAuthStore();

  // Normalize required roles to array and compare case-insensitively
  const allowedRoles = Array.isArray(requiredRole)
    ? requiredRole.map((r) => r.toUpperCase())
    : [requiredRole.toUpperCase()];

  const userRoles = user?.roles?.map((role: string) => role.toUpperCase()) ?? [];

  // Check if user has one of the required roles
  const hasRole = userRoles.some((role: string) => allowedRoles.includes(role));

  if (!hasRole) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
