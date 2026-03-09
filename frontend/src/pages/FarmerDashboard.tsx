// src/pages/FarmerDashboard.tsx — Mobile-first modern farmer dashboard (matches AdminDashboard)
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { safeNavigate } from "@/config/navigation";
import useAuthStore from "@/store/authStore";
import { farmerService } from "@/services/farmer.service";
import { useNotification } from "@/contexts/NotificationContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { Theme } from "@/contexts/ThemeContext";
import FarmerIDCardPreview from "@/components/FarmerIDCardPreview";
import FarmerBottomNav from "@/components/FarmerBottomNav";
import { logger } from "@/utils/logger";
import { loadFeedbackPrefs, saveFeedbackPrefs } from "@/utils/feedback";
import { APP_VERSION, PHASE } from "@/utils/version";
import { notificationsService } from "@/services/notifications.service";

const COMPONENT = "FarmerDashboard";

// ─── Types ────────────────────────────────────────────────────────────────────
type NavTab = "home" | "idcard" | "supplies" | "notifications" | "settings";

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-2xl ${className}`} />;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, loading, onClick }: {
  icon: string; label: string; value: number | string; sub?: string; color: string; loading?: boolean; onClick?: () => void;
}) {
  if (loading) return <Skeleton className="h-24" />;
  const inner = (
    <>
      <div className="flex justify-between items-start">
        <span className="text-2xl">{icon}</span>
        <span className="text-3xl font-extrabold tracking-tight leading-none">{value}</span>
      </div>
      <div className="mt-2">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-90">{label}</p>
        {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
      </div>
    </>
  );
  if (!onClick) {
    return <div className={`relative flex flex-col justify-between p-4 rounded-2xl text-left w-full ${color} text-white shadow-lg select-none`}>{inner}</div>;
  }
  return (
    <button onClick={onClick} className={`relative flex flex-col justify-between p-4 rounded-2xl text-left w-full ${color} text-white shadow-lg active:scale-95 transition-transform duration-150 select-none`}>
      {inner}
    </button>
  );
}

// ─── Quick Action Tile ────────────────────────────────────────────────────────
function QuickAction({ icon, label, bg, onPress }: { icon: string; label: string; bg: string; onPress: () => void }) {
  return (
    <button onClick={onPress} className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl ${bg} text-white shadow-md active:scale-95 transition-transform duration-150 select-none`}>
      <span className="text-2xl leading-none">{icon}</span>
      <span className="text-[11px] font-semibold text-center leading-tight">{label}</span>
    </button>
  );
}

// ─── Info Card ────────────────────────────────────────────────────────────────
function InfoCard({ icon, label, value, borderColor }: { icon: string; label: string; value: string; borderColor: string }) {
  return (
    <div className={`p-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-l-4 ${borderColor}`}>
      <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{icon} {label}</p>
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{value}</p>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex justify-between items-center px-4 mb-2">
      <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">{title}</h2>
      {action && (
        <button onClick={onAction} className="text-xs font-semibold text-green-600 dark:text-green-400 active:opacity-70">
          {action} →
        </button>
      )}
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────
function SettingsPanel() {
  const { theme, setTheme, isDark } = useTheme();
  const { logout, user } = useAuthStore();
  const [feedbackPrefs, setFeedbackPrefs] = useState(loadFeedbackPrefs);
  function toggleSound() {
    const next = { ...feedbackPrefs, soundEnabled: !feedbackPrefs.soundEnabled };
    setFeedbackPrefs(next); saveFeedbackPrefs(next);
  }
  function toggleHaptics() {
    const next = { ...feedbackPrefs, hapticsEnabled: !feedbackPrefs.hapticsEnabled };
    setFeedbackPrefs(next); saveFeedbackPrefs(next);
  }
  const themeOptions: { value: Theme; icon: string; label: string }[] = [
    { value: "light", icon: "☀️", label: "Light" },
    { value: "dark", icon: "🌙", label: "Dark" },
    { value: "system", icon: "🖥️", label: "System" },
  ];

  return (
    <div className="px-4 space-y-4">
      {/* Theme */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">🎨 Appearance</h3>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setTheme(opt.value);
                logger.info(COMPONENT, `Theme changed to ${opt.value}`);
              }}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                theme === opt.value
                  ? "border-green-500 bg-green-50 dark:bg-green-900/30"
                  : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
              }`}
            >
              <span className="text-xl">{opt.icon}</span>
              <span className="text-[10px] font-bold text-gray-700 dark:text-gray-200">{opt.label}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 text-center">
          Currently: <strong>{isDark ? "Dark" : "Light"}</strong> mode
        </p>
      </div>

      {/* Account */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">👤 Account</h3>
        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">Email</span>
            <span className="font-semibold text-gray-700 dark:text-gray-300 truncate ml-2">{user?.email || "—"}</span>
          </div>
        </div>
        <button
          onClick={() => { logger.info(COMPONENT, "Logout pressed"); logout(); }}
          className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold active:scale-95 transition-all"
        >
          🚪 Logout
        </button>
      </div>

      {/* Sound & Vibration */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">🔔 Sound &amp; Vibration</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer select-none">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">🔊 Sound Effects</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Chimes on QR scan and actions</p>
            </div>
            <button role="switch" aria-checked={feedbackPrefs.soundEnabled} onClick={toggleSound}
              className={`relative w-11 h-6 rounded-full transition-colors ${feedbackPrefs.soundEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${feedbackPrefs.soundEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </label>
          <label className="flex items-center justify-between cursor-pointer select-none">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">📳 Vibration</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Haptic feedback — mobile only</p>
            </div>
            <button role="switch" aria-checked={feedbackPrefs.hapticsEnabled} onClick={toggleHaptics}
              className={`relative w-11 h-6 rounded-full transition-colors ${feedbackPrefs.hapticsEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${feedbackPrefs.hapticsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </label>
        </div>
      </div>

      {/* App Info */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">ℹ️ About</h3>
        <div className="space-y-1">
          {[
            { k: "Version", v: `v${APP_VERSION} (${PHASE})` },
            { k: "Role", v: "Farmer" },
            { k: "Environment", v: "Development" },
          ].map(({ k, v }) => (
            <div key={k} className="flex justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">{k}</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Main Component ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function FarmerDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const notify = useNotification();

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    const tab = searchParams.get("tab") as NavTab | null;
    return tab === "settings" || tab === "idcard" || tab === "supplies" ? tab : "home";
  });
  const [farmerData, setFarmerData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [qrError, setQrError] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [photoError, setPhotoError] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const hasLoadedRef = useRef(false);
  const loadingRef = useRef(false);

  // ─── Load Data ────────────────────────────────────────────────────────────
  const loadFarmerData = useCallback(async (isRefresh = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      if (!user?.farmer_id) {
        logger.error(COMPONENT, "No farmer_id in JWT");
        notify.error("Authentication error. Please login again.", 5000);
        setFarmerData(null);
        return;
      }

      const start = performance.now();
      logger.info(COMPONENT, "loadFarmerData start", { farmer_id: user.farmer_id });
      const fullData = await farmerService.getFarmer(user.farmer_id);
      const elapsed = Math.round(performance.now() - start);
      logger.info(COMPONENT, `loadFarmerData success (${elapsed}ms)`);
      setFarmerData(fullData);
      hasLoadedRef.current = true;
      if (isRefresh) notify.success("Profile refreshed.");
    } catch (error: any) {
      logger.error(COMPONENT, "loadFarmerData failed", { error: error?.message });
      if (error?.response?.status === 401) {
        notify.error("Session expired. Please login again.");
        logout();
        return;
      }
      notify.error("Failed to load profile. Please retry.", 5000);
      setFarmerData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
      loadingRef.current = false;
    }
  }, [user?.farmer_id, notify, logout]);

  useEffect(() => {
    if (!hasLoadedRef.current) loadFarmerData();
  }, [loadFarmerData]);

  // ─── Load Notification Count ──────────────────────────────────────────
  useEffect(() => {
    const start = performance.now();
    notificationsService.getUnreadCount()
      .then((count) => {
        setUnreadNotifCount(count);
        logger.info(COMPONENT, `Notification count loaded: ${count} (${Math.round(performance.now() - start)}ms)`);
      })
      .catch((err) => {
        logger.warn(COMPONENT, "Notification count failed", { error: (err as Error)?.message });
      });
  }, []);

  // ─── Load Photo ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!farmerData) return;
    let cancelled = false;
    const loadPhoto = async () => {
      try {
        setPhotoError(false);
        const start = performance.now();
        logger.info(COMPONENT, "Photo loading start");
        const url = await farmerService.getPhotoUrl(farmerData);
        const elapsed = Math.round(performance.now() - start);
        if (cancelled) return;
        if (url) {
          setPhotoUrl(url);
          logger.info(COMPONENT, `Photo loaded in ${elapsed}ms`);
        } else {
          logger.warn(COMPONENT, `Photo not available (${elapsed}ms)`);
          setPhotoError(true);
        }
      } catch (err) {
        if (!cancelled) {
          logger.error(COMPONENT, "Photo load failed", { error: (err as Error)?.message });
          setPhotoError(true);
        }
      }
    };
    loadPhoto();
    return () => { cancelled = true; };
  }, [farmerData]);

  // ─── Load QR Code ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!farmerData) return;
    let cancelled = false;
    const loadQR = async () => {
      try {
        setQrError(false);
        const start = performance.now();
        logger.info(COMPONENT, "QR loading start");
        const url = await farmerService.getQRCodeBlobUrl(farmerData);
        const elapsed = Math.round(performance.now() - start);
        if (cancelled) return;
        if (url) {
          setQrCodeUrl(url);
          logger.info(COMPONENT, `QR loaded in ${elapsed}ms`);
        } else {
          logger.warn(COMPONENT, "QR not available");
          setQrError(true);
        }
      } catch (err) {
        if (!cancelled) {
          logger.error(COMPONENT, "QR load failed", { error: (err as Error)?.message });
          setQrError(true);
        }
      }
    };
    loadQR();
    return () => { cancelled = true; };
  }, [farmerData]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleDownloadIDCard = async () => {
    let nid: string | undefined;
    try {
      const farmerId = farmerData?.farmer_id;
      if (!farmerId) { notify.error("Farmer ID not available"); return; }
      nid = notify.info("📥 Preparing download...", 8000);
      logger.info(COMPONENT, "handleDownloadIDCard", { farmerId });
      const result = await farmerService.downloadIDCard(farmerId);
      if (nid) notify.dismiss(nid);
      if (result?.savedPath) notify.success(`✅ ID card saved to:\n${result.savedPath}`, 8000);
      else if (result?.downloaded) notify.success("Downloaded to Downloads folder", 3000);
      else notify.error("Download failed. Please try again.");
    } catch (error: any) {
      logger.error(COMPONENT, "handleDownloadIDCard failed", { error: error?.message });
      if (nid) notify.dismiss(nid);
      notify.error(error?.response?.data?.detail || "ID card not available yet.", 5000);
    }
  };

  const handleTabChange = (tab: NavTab) => {
    logger.info(COMPONENT, "Tab navigation", { tab });
    if (tab === "home") { setActiveTab("home"); setSearchParams({}); return; }
    if (tab === "idcard") { safeNavigate(navigate, "/farmer-idcard"); return; }
    if (tab === "supplies") { safeNavigate(navigate, "/farmer/supply-requests"); return; }
    if (tab === "notifications") { safeNavigate(navigate, "/notifications"); return; }
    if (tab === "settings") { setActiveTab("settings"); setSearchParams({ tab: "settings" }); return; }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  const firstName = farmerData?.personal_info?.first_name || user?.full_name?.split(" ")[0] || "Farmer";

  // ─── Quick Actions ────────────────────────────────────────────────────────
  const quickActions = [
    { icon: "📄", label: "Full Profile", bg: "bg-gradient-to-br from-blue-500 to-indigo-600", onPress: () => safeNavigate(navigate, `/farmers/${farmerData?.farmer_id}`) },
    { icon: "✏️", label: "Edit Details", bg: "bg-gradient-to-br from-amber-500 to-orange-600", onPress: () => safeNavigate(navigate, `/farmers/edit/${farmerData?.farmer_id}`) },
    { icon: "🆔", label: "ID Card", bg: "bg-gradient-to-br from-emerald-500 to-green-600", onPress: () => safeNavigate(navigate, "/farmer-idcard") },
    { icon: "�", label: "Documents", bg: "bg-gradient-to-br from-teal-500 to-cyan-600", onPress: () => safeNavigate(navigate, "/farmer/documents") },
    { icon: "📝", label: "Change Request", bg: "bg-gradient-to-br from-purple-500 to-violet-600", onPress: () => safeNavigate(navigate, "/farmer/change-requests") },
    { icon: "🔔", label: "Notifications", bg: "bg-gradient-to-br from-rose-500 to-pink-600", onPress: () => safeNavigate(navigate, "/notifications") },
    { icon: "📥", label: "Download ID", bg: "bg-gradient-to-br from-cyan-500 to-teal-600", onPress: handleDownloadIDCard },
    { icon: "🛒", label: "Supplies", bg: "bg-gradient-to-br from-orange-500 to-red-600", onPress: () => safeNavigate(navigate, "/farmer/supply-requests") },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── Render ─────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="overflow-y-auto pb-24">

          {/* ── Hero Banner ──────────────────────────────────────────────── */}
          <div className="relative bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 px-5 pt-12 pb-10 overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />

            {/* Top bar */}
            <div className="relative flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-sm">🌾</span>
                </div>
                <span className="text-white/80 text-xs font-semibold tracking-widest uppercase">CEM Farmer</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => safeNavigate(navigate, "/notifications")}
                  aria-label="Notifications"
                  className="relative w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:scale-90 transition-transform"
                >
                  <span className="text-sm">🔔</span>
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => loadFarmerData(true)}
                  disabled={refreshing}
                  aria-label="Refresh"
                  className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50"
                >
                  <span className={`text-sm ${refreshing ? "animate-spin" : ""}`}>🔄</span>
                </button>
                <button
                  onClick={() => { logger.info(COMPONENT, "Logout pressed"); logout(); }}
                  aria-label="Logout"
                  className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:scale-90 transition-transform"
                >
                  <span className="text-sm">🚪</span>
                </button>
              </div>
            </div>

            {/* Greeting + Photo */}
            <div className="relative flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 overflow-hidden flex items-center justify-center flex-shrink-0">
                {photoError || !photoUrl ? (
                  <span className="text-3xl">👨‍🌾</span>
                ) : (
                  <img src={photoUrl} alt="Photo" className="w-full h-full object-cover"
                    onError={() => setPhotoError(true)} />
                )}
              </div>
              <div>
                <p className="text-white/70 text-sm font-medium">{getGreeting()},</p>
                <h1 className="text-white text-2xl font-extrabold tracking-tight mt-0.5">{firstName} 👋</h1>
                <p className="text-white/60 text-xs mt-1">
                  ID: {farmerData?.farmer_id || "Loading..."}
                </p>
              </div>
            </div>

            {/* Status pill */}
            <div className="relative mt-4 inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
              <span className={`w-1.5 h-1.5 rounded-full ${
                farmerData?.registration_status === "verified" ? "bg-green-300 animate-pulse" :
                farmerData?.registration_status === "rejected" ? "bg-red-300 animate-pulse" :
                "bg-yellow-300 animate-pulse"
              }`} />
              <span className="text-white/90 text-[11px] font-semibold">
                {farmerData?.registration_status === "verified" ? "✅ Verified" :
                 farmerData?.registration_status === "rejected" ? "❌ Rejected" :
                 "⏳ Pending Verification"}
              </span>
            </div>
          </div>

          {/* ── Loading State ──────────────────────────────────────────── */}
          {loading && (
            <div className="px-4 mt-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
              </div>
              <Skeleton className="h-40" />
            </div>
          )}

          {/* ── Error State ────────────────────────────────────────────── */}
          {!loading && !farmerData && (
            <div className="px-4 mt-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center border border-gray-100 dark:border-gray-700">
                <div className="text-5xl mb-3">⚠️</div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Unable to load profile</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Contact your operator or administrator.</p>
                <button onClick={() => { hasLoadedRef.current = false; loadFarmerData(); }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold active:scale-95 transition-all">
                  🔄 Retry
                </button>
              </div>
            </div>
          )}

          {/* ── Action Banner: prompt to upload docs if not done ─────── */}
          {!loading && farmerData && (
            farmerData.registration_status === "registered" ||
            farmerData.registration_status === "incomplete"
          ) && (
            <div className="mx-4 mt-4 rounded-xl border border-amber-400/50 bg-amber-500/20 p-4 flex items-start gap-3">
              <span className="text-2xl mt-0.5">📄</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-200">Documents Required</p>
                <p className="text-xs text-amber-300/80 mt-0.5">Your registration is missing documents. Upload your NRC, land title, or other documents to complete verification.</p>
                <button
                  onClick={() => navigate(`/farmers/${farmerData.farmer_id}`)}
                  className="mt-2 px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-white rounded-lg transition active:scale-95"
                >
                  Upload Documents →
                </button>
              </div>
            </div>
          )}

          {/* ── Rejection Banner ────────────────────────────────────────── */}
          {!loading && farmerData && farmerData.registration_status === "rejected" && (
            <div className="mx-4 mt-4 rounded-xl border border-red-400/50 bg-red-500/20 p-4 flex items-start gap-3">
              <span className="text-2xl mt-0.5">❌</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-red-200">Verification Rejected</p>
                <p className="text-xs text-red-300/80 mt-0.5">
                  {farmerData.rejection_reason || farmerData.status_history?.find((h: Record<string, string>) => h.status === "rejected")?.note || "Your profile or documents were rejected. Check your Document Wallet for details."}
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => navigate("/farmer/documents")}
                    className="px-3 py-1.5 text-xs font-bold bg-red-500 hover:bg-red-400 text-white rounded-lg transition active:scale-95"
                  >
                    View Documents →
                  </button>
                  <button
                    onClick={() => navigate("/farmer/change-requests")}
                    className="px-3 py-1.5 text-xs font-bold bg-white/20 hover:bg-white/30 text-white rounded-lg transition active:scale-95"
                  >
                    Request Change
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Settings Tab ───────────────────────────────────────────── */}
          {activeTab === "settings" && !loading && (
            <div className="mt-5">
              <div className="px-4 mb-4 flex items-center gap-2">
                <button onClick={() => setActiveTab("home")} className="text-gray-600 dark:text-gray-300 active:scale-90 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">⚙️ Settings</h2>
              </div>
              <SettingsPanel />
            </div>
          )}

          {/* ── Home Content ───────────────────────────────────────────── */}
          {activeTab === "home" && !loading && farmerData && (
            <>
              {/* Stats Grid */}
              <div className="px-4 mt-5">
                <SectionHeader title="My Farm Overview" />
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon="📋" label="Status" value={
                      farmerData?.registration_status === "verified" ? "Verified" :
                      farmerData?.registration_status === "rejected" ? "Rejected" : "Pending"
                    }
                    color={farmerData?.registration_status === "verified"
                      ? "bg-gradient-to-br from-green-500 to-emerald-600"
                      : farmerData?.registration_status === "rejected"
                      ? "bg-gradient-to-br from-red-500 to-rose-600"
                      : "bg-gradient-to-br from-amber-500 to-orange-600"}
                    loading={false}
                  />
                  <StatCard
                    icon="🌾" label="Farm Size" value={`${farmerData?.farm_info?.farm_size_hectares || 0} ha`}
                    sub={`${farmerData?.farm_info?.years_farming || farmerData?.farm_info?.farming_experience_years || 0} yrs exp`}
                    color="bg-gradient-to-br from-blue-500 to-cyan-600" loading={false}
                  />
                  <StatCard
                    icon="🌱" label="Crops" value={farmerData?.farm_info?.crops_grown?.length || 0}
                    sub={farmerData?.farm_info?.crops_grown?.slice(0, 2).join(", ") || "None"}
                    color="bg-gradient-to-br from-violet-500 to-purple-600" loading={false}
                  />
                  <StatCard
                    icon="🐄" label="Livestock" value={(farmerData?.farm_info?.livestock_types?.length || farmerData?.farm_info?.livestock?.length || 0)}
                    sub={farmerData?.farm_info?.has_irrigation ? "Irrigated" : "Rainfed"}
                    color="bg-gradient-to-br from-rose-500 to-pink-600" loading={false}
                  />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="px-4 mt-6">
                <SectionHeader title="Quick Actions" />
                <div className="grid grid-cols-4 gap-3">
                  {quickActions.map((a) => (
                    <QuickAction key={a.label} {...a} />
                  ))}
                </div>
              </div>

              {/* Personal Info */}
              <div className="px-4 mt-6">
                <SectionHeader title="Personal Information" />
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
                    <InfoCard icon="📱" label="Phone" value={farmerData?.personal_info?.phone_primary || "N/A"} borderColor="border-l-blue-500" />
                    <InfoCard icon="🆔" label="NRC" value={farmerData?.personal_info?.nrc || "N/A"} borderColor="border-l-green-500" />
                    <InfoCard icon="👤" label="Gender" value={farmerData?.personal_info?.gender || "N/A"} borderColor="border-l-purple-500" />
                    <InfoCard icon="📅" label="Date of Birth" value={farmerData?.personal_info?.date_of_birth || "N/A"} borderColor="border-l-red-500" />
                  </div>
                </div>
              </div>

              {/* Address Info */}
              <div className="px-4 mt-6">
                <SectionHeader title="Address" />
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                  <div className="grid grid-cols-2 gap-3 p-4">
                    <InfoCard icon="🏛️" label="Province" value={farmerData?.address?.province_name || "N/A"} borderColor="border-l-blue-500" />
                    <InfoCard icon="🏘️" label="District" value={farmerData?.address?.district_name || "N/A"} borderColor="border-l-green-500" />
                    <InfoCard icon="🏠" label="Chiefdom" value={farmerData?.address?.chiefdom_name || "N/A"} borderColor="border-l-purple-500" />
                    <InfoCard icon="📍" label="Village" value={farmerData?.address?.village || "N/A"} borderColor="border-l-orange-500" />
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="px-4 mt-6">
                <SectionHeader title="Your QR Code" />
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex flex-col items-center">
                  <div className="w-48 h-48 rounded-xl border-[3px] border-green-500 p-3 bg-white flex items-center justify-center shadow-md">
                    {qrError ? (
                      <div className="text-center">
                        <span className="text-4xl block mb-2">📱</span>
                        <p className="text-xs text-gray-500">QR unavailable</p>
                      </div>
                    ) : qrCodeUrl ? (
                      <img src={qrCodeUrl} alt="QR Code" className="max-w-full max-h-full object-contain"
                        onError={() => setQrError(true)} />
                    ) : (
                      <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-green-600" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                    {qrError ? "Contact your operator to generate QR" : "Present this code for quick identification"}
                  </p>
                </div>
              </div>

              {/* System Strip */}
              <div className="mx-4 mt-6 bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">System</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1.5">
                  {[
                    { k: "Version", v: `v${APP_VERSION} (${PHASE})` },
                    { k: "Role", v: "Farmer" },
                    { k: "Farmer ID", v: farmerData?.farmer_id ?? "—" },
                  ].map(({ k, v }) => (
                    <div key={k}>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">{k}: </span>
                      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

        </div>{/* end scrollable */}

        {/* ── Bottom Navigation Bar ─────────────────────────────────────── */}
        <FarmerBottomNav activeTabOverride={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* ID Card Preview Modal */}
      {showPreview && farmerData && (
        <FarmerIDCardPreview farmer={farmerData as Record<string, any> & { farmer_id: string }} onClose={() => setShowPreview(false)} />
      )}
    </>
  );
}
