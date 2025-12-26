// src/App.tsx
import React, { useEffect } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleRoute } from "@/components/RoleRoute";
import { NotificationProvider } from "@/contexts/NotificationContext";
import ToastContainer from "@/components/ToastContainer";
import SessionTimeout from "@/components/SessionTimeout";

// Pages
import Login from "@/pages/Login";
import AdminDashboard from "@/pages/AdminDashboard";
import OperatorDashboard from "@/pages/OperatorDashboard";
import Dashboard from "@/pages/Dashboard";
import FarmerRegistration from "@/pages/FarmerRegistration";
import FarmersList from "@/pages/FarmersList";
import EditFarmer from "@/pages/EditFarmer";
import OperatorManagement from "@/pages/OperatorManagement";
import OperatorDetails from "@/pages/OperatorDetails";
import OperatorEdit from "@/pages/OperatorEdit";
import FarmerDashboard from "@/pages/FarmerDashboard";
import FarmerDetails from "@/pages/FarmerDetails";
import FarmerIDCard from "@/pages/FarmerIDCard";
import AdminReports from "@/pages/AdminReports";
import AdminSettings from "@/pages/AdminSettings";
import AdminSupplyRequests from "@/pages/AdminSupplyRequests";
import FarmerSupplyRequests from "@/pages/FarmerSupplyRequests";
import LogViewer from "@/pages/LogViewer";

function App() {
  const { loadUser, token, user } = useAuthStore();

  useEffect(() => {
    if (token) {
      loadUser();
    }
  }, [token, loadUser]);

  // Determine dashboard route based on user role
  const getDashboardRoute = () => {
    if (!user) return "/login";
    const role = user.roles?.[0]?.toLowerCase();
    if (role === "admin") return "/admin-dashboard";
    if (role === "operator") return "/operator-dashboard";
    if (role === "farmer") return "/farmer-dashboard";
    return "/login";
  };
  return (
    <NotificationProvider>
      <HashRouter>
        <SessionTimeout />
        <ToastContainer />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

        {/* Admin Routes */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute>
              <RoleRoute requiredRole="admin">
                <AdminDashboard />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/operators/manage"
          element={
            <ProtectedRoute>
              <RoleRoute requiredRole="admin">
                <OperatorManagement />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/operators/:operatorId"
          element={
            <ProtectedRoute>
              <RoleRoute requiredRole="admin">
                <OperatorDetails />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/operators/:operatorId/edit"
          element={
            <ProtectedRoute>
              <RoleRoute requiredRole="admin">
                <OperatorEdit />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute>
              <RoleRoute requiredRole="admin">
                <AdminReports />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute>
              <RoleRoute requiredRole="admin">
                <AdminSettings />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/supply-requests"
          element={
            <ProtectedRoute>
              <RoleRoute requiredRole="admin">
                <AdminSupplyRequests />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/logs"
          element={
            <ProtectedRoute>
              <RoleRoute requiredRole="admin">
                <LogViewer />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* Operator Routes */}
        <Route
          path="/operator-dashboard"
          element={
            <ProtectedRoute>
              <RoleRoute requiredRole="operator">
                <OperatorDashboard />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* Shared Admin + Operator Routes */}
        <Route
          path="/farmers/*"
          element={
            <ProtectedRoute>
              <RoleRoute requiredRole={["admin", "operator"]}>
                <FarmersList />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/farmers/create"
          element={
            <ProtectedRoute>
              <RoleRoute requiredRole={["admin", "operator"]}>
                <FarmerRegistration />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/farmers/edit/:farmerId"
          element={
            <ProtectedRoute>
              <RoleRoute requiredRole={["admin", "operator", "farmer"]}>
                <EditFarmer />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/farmers/:farmerId"
          element={
            <ProtectedRoute>
              <RoleRoute requiredRole={["admin", "operator", "farmer"]}>
                <FarmerDetails />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* Farmer Routes */}
        <Route
          path="/farmer-dashboard"
          element={
            <ProtectedRoute>
              <RoleRoute requiredRole="farmer">
                <FarmerDashboard />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/farmer-idcard"
          element={
            <ProtectedRoute>
              <RoleRoute requiredRole="farmer">
                <FarmerIDCard />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/farmer/supply-requests"
          element={
            <ProtectedRoute>
              <RoleRoute requiredRole="farmer">
                <FarmerSupplyRequests />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* Default Route */}
        <Route
          path="/"
          element={
            token ? (
              <Navigate to={getDashboardRoute()} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
    </NotificationProvider>
  );
}

export default App;
