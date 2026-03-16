// src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import ErrorBoundary from "@/components/ErrorBoundary";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { token, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Route-scoped boundary prevents one crashing protected page
  // from collapsing the whole app shell.
  return <ErrorBoundary>{children}</ErrorBoundary>;
};
