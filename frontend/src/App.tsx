import { useEffect, useState, lazy, Suspense } from "react";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleRoute } from "@/components/RoleRoute";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import ToastContainer from "@/components/ToastContainer";
import SessionTimeout from "@/components/SessionTimeout";
import { useBackButton } from "@/hooks/useBackButton";
import { useKeyboardAvoidance } from "@/hooks/useKeyboardAvoidance";
import { useOrientationClass } from "@/hooks/useOrientationClass";
import PermissionRequest from "@/components/PermissionRequest";
import { updateService, type UpdatePrompt } from "@/services/update.service";
import { offlineRegistrationQueueService } from "@/services/offlineRegistrationQueue.service";

// Pages — lazy-loaded for code splitting (P8)
const Login                = lazy(() => import("@/pages/Login"));
const AdminDashboard       = lazy(() => import("@/pages/AdminDashboard"));
const OperatorDashboard    = lazy(() => import("@/pages/OperatorDashboard"));
const FarmerRegistration   = lazy(() => import("@/pages/FarmerRegistration"));
const FarmersList          = lazy(() => import("@/pages/FarmersList"));
const EditFarmer           = lazy(() => import("@/pages/EditFarmer"));
const OperatorManagement   = lazy(() => import("@/pages/OperatorManagement"));
const OperatorDetails      = lazy(() => import("@/pages/OperatorDetails"));
const OperatorEdit         = lazy(() => import("@/pages/OperatorEdit"));
const FarmerDashboard      = lazy(() => import("@/pages/FarmerDashboard"));
const FarmerDetails        = lazy(() => import("@/pages/FarmerDetails"));
const FarmerIDCard         = lazy(() => import("@/pages/FarmerIDCard"));
const IDCardViewer         = lazy(() => import("@/pages/IDCardViewer"));
const DocumentViewer       = lazy(() => import("@/pages/DocumentViewer"));
const AdminReports         = lazy(() => import("@/pages/AdminReports"));
const AnalyticsDashboard   = lazy(() => import("@/pages/AnalyticsDashboard"));
const AdminSettings        = lazy(() => import("@/pages/AdminSettings"));
const AdminSupplyRequests  = lazy(() => import("@/pages/AdminSupplyRequests"));
const FarmerSupplyRequests = lazy(() => import("@/pages/FarmerSupplyRequests"));
const LogViewer            = lazy(() => import("@/pages/LogViewer"));
const QRScanner            = lazy(() => import("@/pages/QRScanner"));
const AdminGeoManagement   = lazy(() => import("@/pages/AdminGeoManagement"));
const NotificationCentre   = lazy(() => import("@/pages/NotificationCentre"));
const ChangeRequests       = lazy(() => import("@/pages/ChangeRequests"));
const AdminChangeRequests  = lazy(() => import("@/pages/AdminChangeRequests"));
const FarmerDocumentWallet = lazy(() => import("@/pages/FarmerDocumentWallet"));

/** Full-page spinner shown while a lazy chunk is loading */
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 dark:border-gray-700 border-t-green-600" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading…</p>
      </div>
    </div>
  );
}

function RouteBoundary({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

function App() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [showPermissions, setShowPermissions] = useState(false);
  const [updatePrompt, setUpdatePrompt] = useState<UpdatePrompt | null>(null);
  const [dismissedOptionalVersion, setDismissedOptionalVersion] = useState<string | null>(null);

  // Offline/online indicator
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);
  const OfflineBanner = () => isOnline ? null : (
    <div className="fixed top-0 inset-x-0 z-[100] bg-red-600 text-white text-center text-xs font-bold py-1.5 px-4 shadow-lg" role="alert">
      ⚠️ No internet connection — offline mode active. Queued changes will sync on reconnect.
    </div>
  );

  // ✅ Load user when token is available
  useEffect(() => {
    if (token && !user) {
      useAuthStore.getState().loadUser();
    }
  }, [token, user]);

  // Check for first-time permissions
  useEffect(() => {
    const hasRequested = localStorage.getItem('permissions_requested');
    if (!hasRequested && token) {
      setShowPermissions(true);
    }
  }, [token]);

  // Check for app updates on startup
  useEffect(() => {
    // Start periodic update checks on app launch.
    updateService.startPeriodicChecks((prompt) => {
      if (prompt.mandatory) {
        setUpdatePrompt(prompt);
        return;
      }
      if (dismissedOptionalVersion !== prompt.versionName) {
        setUpdatePrompt(prompt);
      }
    });
  }, [dismissedOptionalVersion]);

  // Start offline registration queue sync worker
  useEffect(() => {
    offlineRegistrationQueueService.startSync();
  }, []);

  const handleUpdateNow = async () => {
    if (!updatePrompt?.downloadUrl) return;
    await updateService.openDownloadUrl(updatePrompt.downloadUrl);
  };

  const dismissOptionalUpdate = () => {
    if (!updatePrompt || updatePrompt.mandatory) return;
    setDismissedOptionalVersion(updatePrompt.versionName);
    setUpdatePrompt(null);
  };

  // Determine dashboard route based on user role
  const getDashboardRoute = () => {
    if (!user) return "/login";
    const role = user.roles?.[0]?.toLowerCase();
    if (role === "admin") return "/admin-dashboard";
    if (role === "operator") return "/operator-dashboard";
    if (role === "farmer") return "/farmer-dashboard";
    return "/login";
  };

  const AppContent = () => {
    // ✅ Handle Android back button
    useBackButton();
    useKeyboardAvoidance();
    useOrientationClass();
    const location = useLocation();

    return (
      <>
        <SessionTimeout />
        <ToastContainer />
        {updatePrompt && !updatePrompt.mandatory && (
          <div className="fixed top-0 inset-x-0 z-[110] bg-amber-100 dark:bg-amber-900/30 border-b border-amber-300 dark:border-amber-700 px-3 py-2 sm:px-4">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
              <p className="text-xs sm:text-sm font-medium text-amber-900 dark:text-amber-200">
                Update available: v{updatePrompt.versionName}. Install now for the latest fixes and improvements.
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={dismissOptionalUpdate}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/70 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 transition"
                >
                  Later
                </button>
                <button
                  onClick={handleUpdateNow}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        )}
        <OfflineBanner />
        {/* P8 — keyed div restarts page-enter animation on every navigation */}
        <div key={location.pathname} className="page-enter">
        <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<RouteBoundary><Login /></RouteBoundary>} />
          <Route path="/qr-scanner" element={<RouteBoundary><QRScanner /></RouteBoundary>} />

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
            path="/admin/analytics"
            element={
              <ProtectedRoute>
                <RoleRoute requiredRole={["admin", "operator"]}>
                  <AnalyticsDashboard />
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
          <Route
            path="/admin/geo"
            element={
              <ProtectedRoute>
                <RoleRoute requiredRole="admin">
                  <AdminGeoManagement />
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
            path="/farmers"
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
                <RoleRoute requiredRole={["admin", "operator"]}>
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
            path="/farmer/idcard-view"
            element={
              <ProtectedRoute>
                <RoleRoute requiredRole="farmer">
                  <IDCardViewer />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          {/* ✅ FIXED: Changed from /document-view to /document-viewer */}
          <Route
            path="/document-viewer"
            element={
              <ProtectedRoute>
                <DocumentViewer />
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
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationCentre />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/change-requests"
            element={
              <ProtectedRoute>
                <RoleRoute requiredRole="farmer">
                  <ChangeRequests />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/change-requests/pending"
            element={
              <ProtectedRoute>
                <RoleRoute requiredRole={["admin", "operator"]}>
                  <AdminChangeRequests />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/documents"
            element={
              <ProtectedRoute>
                <RoleRoute requiredRole="farmer">
                  <FarmerDocumentWallet />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          {/* Default Routes */}
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
        </Suspense>
        </div>{/* /page-enter */}
      </>
    );
  };

  return (
    <ErrorBoundary>
    <ThemeProvider>
      <NotificationProvider>
        <HashRouter>
          {updatePrompt?.mandatory && (
            <div className="fixed inset-0 z-[130] bg-gray-950/95 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="w-full max-w-lg rounded-2xl border border-red-400/30 bg-white dark:bg-gray-900 shadow-2xl p-6 sm:p-8">
                <p className="text-xs font-bold tracking-wide uppercase text-red-600 dark:text-red-400">Update Required</p>
                <h1 className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-white">Please update to continue</h1>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                  This app version is no longer supported. Install v{updatePrompt.versionName} to keep using CEM.
                </p>
                {updatePrompt.releaseNotes && (
                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    {updatePrompt.releaseNotes}
                  </p>
                )}
                <button
                  onClick={handleUpdateNow}
                  className="mt-6 w-full min-h-[44px] rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition"
                >
                  Update Now
                </button>
              </div>
            </div>
          )}
          {showPermissions && (
            <PermissionRequest onComplete={() => setShowPermissions(false)} />
          )}
          {!updatePrompt?.mandatory && <AppContent />}
        </HashRouter>
      </NotificationProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
