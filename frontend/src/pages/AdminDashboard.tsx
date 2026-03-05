// src/pages/AdminDashboard.tsx — Mobile-first modern admin dashboard
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import useAuthStore from "@/store/authStore";
import { dashboardService } from "@/services/dashboard.service";
import { operatorService } from "@/services/operator.service";
import { useNotification } from "@/contexts/NotificationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { logger } from "@/utils/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  totalFarmers: number;
  activeFarmers: number;
  pendingFarmers: number;
  docsPendingReview: number;
  totalOperators: number;
  activeOperators: number;
  totalUsers: number;
  activeUsers: number;
  totalAdmins: number;
}

interface RecentFarmer {
  farmer_id: string;
  name: string;
  district: string;
  registration_status: string;
  is_active: boolean;
  created_at: string;
}

interface Operator {
  _id: string;
  operator_id: string;
  email: string;
  full_name: string;
  phone?: string;
  assigned_district?: string;
  assigned_districts?: string[];
  is_active?: boolean;
  farmer_count?: number;
}

type NavTab = "home" | "farmers" | "operators" | "reports" | "settings";

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-2xl ${className}`} />
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  icon: string;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
  loading?: boolean;
  onClick?: () => void;
}

function StatCard({ icon, label, value, sub, color, loading, onClick }: StatCardProps) {
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
    return (
      <div className={`relative flex flex-col justify-between p-4 rounded-2xl text-left w-full ${color} text-white shadow-lg select-none`}>
        {inner}
      </div>
    );
  }
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col justify-between p-4 rounded-2xl text-left w-full ${color} text-white shadow-lg active:scale-95 transition-transform duration-150 select-none`}
    >
      {inner}
    </button>
  );
}

// ─── Quick Action Tile ────────────────────────────────────────────────────────
interface ActionTile {
  icon: string;
  label: string;
  bg: string;
  onPress: () => void;
}

function QuickAction({ icon, label, bg, onPress }: ActionTile) {
  return (
    <button
      onClick={onPress}
      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl ${bg}
        text-white shadow-md active:scale-95 transition-transform duration-150 select-none`}
    >
      <span className="text-2xl leading-none">{icon}</span>
      <span className="text-[11px] font-semibold text-center leading-tight">{label}</span>
    </button>
  );
}

// ─── Bottom Nav Item ──────────────────────────────────────────────────────────
function NavItem({
  icon, label, active, onClick,
}: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-colors duration-150
        ${active ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`}
    >
      <span className={`text-xl leading-none ${active ? "scale-110" : "scale-100"} transition-transform duration-150`}>
        {icon}
      </span>
      <span className={`text-[10px] font-semibold ${active ? "opacity-100" : "opacity-70"}`}>{label}</span>
      {active && <span className="w-1 h-1 rounded-full bg-green-500 dark:bg-green-400 mt-0.5" />}
    </button>
  );
}

// ─── Operator Card ────────────────────────────────────────────────────────────
function OperatorCard({ op, onClick }: { op: Operator; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-40 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700
        rounded-2xl p-3 text-left shadow-sm active:scale-95 transition-transform duration-150 select-none"
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600
        flex items-center justify-center text-white font-bold text-base mb-2">
        {(op.full_name || "?")[0].toUpperCase()}
      </div>
      <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">{op.full_name}</p>
      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{op.email}</p>
      <div className="mt-2 flex items-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full ${op.is_active !== false ? "bg-green-500" : "bg-red-400"}`} />
        <span className={`text-[10px] font-medium ${op.is_active !== false ? "text-green-600" : "text-red-500"}`}>
          {op.is_active !== false ? "Active" : "Inactive"}
        </span>
      </div>
    </button>
  );
}

// ─── Farmer List Item ─────────────────────────────────────────────────────────
function FarmerItem({ farmer, onClick }: { farmer: RecentFarmer; onClick: () => void }) {
  const statusColor: Record<string, string> = {
    verified: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    pending:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
    registered: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    inactive: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
  };
  const status = farmer.is_active ? (farmer.registration_status || "registered") : "inactive";
  const colorClass = statusColor[status.toLowerCase()] || statusColor.registered;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-3 bg-white dark:bg-gray-800
        border-b border-gray-100 dark:border-gray-700/60 active:bg-gray-50 dark:active:bg-gray-700
        transition-colors duration-100 text-left select-none last:border-b-0"
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600
        flex items-center justify-center text-white font-bold text-base flex-shrink-0">
        {(farmer.name || "?")[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{farmer.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">📍 {farmer.district} · {farmer.farmer_id}</p>
      </div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase whitespace-nowrap ${colorClass}`}>
        {status}
      </span>
    </button>
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const notify = useNotification();
  useTheme(); // Ensure theme context is active

  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats>({ docsPendingReview: 0,
    totalFarmers: 0, activeFarmers: 0, pendingFarmers: 0,
    totalOperators: 0, activeOperators: 0,
    totalUsers: 0, activeUsers: 0, totalAdmins: 0,
  });
  const [recentFarmers, setRecentFarmers] = useState<RecentFarmer[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadingRef = useRef(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (loadingRef.current) {
      logger.warn("AdminDashboard", "Load already in-progress, skipping duplicate call");
      return;
    }
    loadingRef.current = true;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setLoadError(null);

    logger.info("AdminDashboard", "Loading dashboard data", { isRefresh, user: user?.email });

    try {
      const [statsData, operatorsData] = await Promise.all([
        dashboardService.getStats().catch((err: any) => {
          logger.error("AdminDashboard", "Stats fetch failed", { error: err?.message, status: err?.response?.status });
          throw err;
        }),
        operatorService.getOperators(20, 0).catch((err: any) => {
          logger.error("AdminDashboard", "Operators fetch failed", { error: err?.message });
          return { results: [], count: 0 };
        }),
      ]);

      logger.info("AdminDashboard", "Stats received", {
        farmers: statsData?.farmers?.total ?? 0,
        operators: statsData?.operators?.total ?? 0,
        users: statsData?.users?.total ?? 0,
      });

      setStats({
        totalFarmers:    statsData?.farmers?.total              ?? 0,
        activeFarmers:   statsData?.farmers?.active              ?? 0,
        pendingFarmers:  statsData?.farmers?.pending             ?? 0,
        docsPendingReview: (statsData?.farmers as any)?.docs_pending_review ?? 0,
        totalOperators:  statsData?.operators?.total             ?? 0,
        activeOperators: statsData?.operators?.active ?? 0,
        totalUsers:      statsData?.users?.total      ?? 0,
        activeUsers:     statsData?.users?.active     ?? 0,
        totalAdmins:     statsData?.users?.by_role?.admin ?? 0,
      });

      const recentList: RecentFarmer[] = (statsData?.farmers?.recent || []).map((f: any) => ({
        farmer_id: f.farmer_id,
        name: f.name
          || `${f.personal_info?.first_name ?? ""} ${f.personal_info?.last_name ?? ""}`.trim()
          || "Unknown Farmer",
        district: f.district || f.personal_info?.district || "N/A",
        registration_status: f.registration_status || "registered",
        is_active: f.is_active !== false,
        created_at: f.created_at || "",
      }));
      setRecentFarmers(recentList);

      const opList: Operator[] = operatorsData?.results || operatorsData?.operators || [];
      setOperators(opList);

      logger.info("AdminDashboard", "Dashboard data loaded successfully", {
        farmers: recentList.length,
        operators: opList.length,
      });

      if (isRefresh) notify.success("Dashboard refreshed successfully.");
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.detail || err?.message || "Failed to load dashboard data";
      logger.error("AdminDashboard", "Dashboard load error", { error: msg, status });

      if (status === 401) {
        notify.error("Your session has expired. Please log in again.");
        logout();
        return;
      }
      if (status === 403) {
        notify.error("You do not have permission to view this page.");
      } else {
        setLoadError(msg);
        if (!isRefresh) notify.error(`Dashboard: ${msg}`);
        else notify.error("Refresh failed – please try again.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      loadingRef.current = false;
    }
  }, [logout, notify, user?.email]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTabChange = (tab: NavTab) => {
    logger.info("AdminDashboard", "Tab navigation", { tab, from: activeTab });
    if (tab === "home")      { setActiveTab("home"); return; }
    if (tab === "farmers")   { navigate("/farmers"); return; }
    if (tab === "operators") { navigate("/operators/manage"); return; }
    if (tab === "reports")   { navigate("/admin/reports"); return; }
    if (tab === "settings")  { navigate("/admin/settings"); return; }
  };

  // Quick actions = actions NOT already accessible via the bottom nav bar.
  // Bottom nav covers: Home, Farmers, Operators, Reports, Settings.
  const quickActions: ActionTile[] = [
    { icon: "➕", label: "Add Farmer",   bg: "bg-gradient-to-br from-emerald-500 to-green-600",  onPress: () => { logger.info("AdminDashboard", "QuickAction: Add Farmer");        navigate("/farmers/create"); } },
    { icon: "🧑‍💼", label: "Add Operator", bg: "bg-gradient-to-br from-blue-500 to-indigo-600",    onPress: () => { logger.info("AdminDashboard", "QuickAction: Add Operator"); navigate("/operators/manage", { state: { openCreate: true } }); } },
    { icon: "📈", label: "Analytics",    bg: "bg-gradient-to-br from-violet-500 to-purple-600",  onPress: () => { logger.info("AdminDashboard", "QuickAction: Analytics");          navigate("/admin/analytics"); } },
    { icon: "🛒", label: "Supply Req.",  bg: "bg-gradient-to-br from-rose-500 to-pink-600",      onPress: () => { logger.info("AdminDashboard", "QuickAction: Supply Requests");   navigate("/admin/supply-requests"); } },
    ...(Capacitor.isNativePlatform() ? [
      { icon: "📷", label: "QR Scan", bg: "bg-gradient-to-br from-amber-500 to-orange-600", onPress: () => { logger.info("AdminDashboard", "QuickAction: QR Scan"); navigate("/qr-scanner"); } },
    ] : []),
  ];

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  const firstName = user?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Admin";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="overflow-y-auto pb-24">

        {/* ── Hero Banner ──────────────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 px-5 pt-12 pb-10 overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />

          {/* Top bar */}
          <div className="relative flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-sm">🌾</span>
              </div>
              <span className="text-white/80 text-xs font-semibold tracking-widest uppercase">CEM Admin</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadData(true)}
                disabled={refreshing}
                aria-label="Refresh dashboard"
                className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50"
              >
                <span className={`text-sm ${refreshing ? "animate-spin" : ""}`}>🔄</span>
              </button>
              <button
                onClick={() => { logger.info("AdminDashboard", "Logout pressed"); logout(); }}
                aria-label="Logout"
                className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:scale-90 transition-transform"
              >
                <span className="text-sm">🚪</span>
              </button>
            </div>
          </div>

          {/* Greeting */}
          <div className="relative">
            <p className="text-white/70 text-sm font-medium">{getGreeting()},</p>
            <h1 className="text-white text-2xl font-extrabold tracking-tight mt-0.5">{firstName} 👋</h1>
            <p className="text-white/60 text-xs mt-1">Chiefdom Farmer Management System</p>
          </div>

          {/* Version pill */}
          <div className="relative mt-4 inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
            <span className="text-white/90 text-[11px] font-semibold">v2.0.0 · Live</span>
          </div>
        </div>

        {/* ── Error Banner ──────────────────────────────────────────────────── */}
        {loadError && !loading && (
          <div className="mx-4 mt-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-2xl p-4">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">⚠️ Failed to load data</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{loadError}</p>
            <button
              onClick={() => loadData()}
              className="mt-3 text-xs font-bold text-red-700 dark:text-red-400 border border-red-300 dark:border-red-600 px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ── Stats Grid ──────────────────────────────────────────────────── */}
        <div className="px-4 mt-5">
          <SectionHeader title="Overview" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard
              icon="👥" label="Total Users" value={loading ? "—" : stats.totalUsers}
              sub={`${stats.activeUsers} active · ${stats.totalAdmins} admins`}
              color="bg-gradient-to-br from-indigo-500 to-purple-600"
              loading={loading}
            />
            <StatCard
              icon="👨‍💼" label="Operators" value={loading ? "—" : stats.totalOperators}
              sub={`${stats.activeOperators} active`}
              color="bg-gradient-to-br from-blue-500 to-cyan-600"
              loading={loading}
            />
            <StatCard
              icon="👨‍🌾" label="Farmers" value={loading ? "—" : stats.totalFarmers}
              sub={`${stats.activeFarmers} active`}
              color="bg-gradient-to-br from-green-500 to-emerald-600"
              loading={loading}
            />
            <StatCard
              icon="⏳" label="Pending" value={loading ? "—" : stats.pendingFarmers}
              sub="Tap to review"
              color={stats.pendingFarmers > 0
                ? "bg-gradient-to-br from-amber-500 to-orange-600"
                : "bg-gradient-to-br from-gray-400 to-slate-500"}
              loading={loading}
              onClick={() => { logger.info("AdminDashboard", "Stat tapped: Pending"); navigate("/farmers?status=pending"); }}
            />
            <StatCard
              icon="📋" label="Docs Review" value={loading ? "—" : stats.docsPendingReview}
              sub={stats.docsPendingReview > 0 ? "Awaiting document review" : "All reviewed"}
              color={stats.docsPendingReview > 0
                ? "bg-gradient-to-br from-purple-500 to-indigo-600"
                : "bg-gradient-to-br from-gray-400 to-slate-500"}
              loading={loading}
              onClick={() => { logger.info("AdminDashboard", "Stat tapped: DocsReview"); navigate("/farmers?status=documents_uploaded"); }}
            />
          </div>
        </div>

        {/* ── Quick Actions ──────────────────────────────────────────────── */}
        <div className="px-4 mt-6">
          <SectionHeader title="Quick Actions" />
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((a) => (
              <QuickAction key={a.label} {...a} />
            ))}
          </div>
        </div>

        {/* ── Recent Operators ──────────────────────────────────────────── */}
        <div className="mt-6">
          <SectionHeader
            title="Operators"
            action="See All"
            onAction={() => { logger.info("AdminDashboard", "SeeAll: Operators"); navigate("/operators/manage"); }}
          />
          {loading ? (
            <div className="flex gap-3 px-4 overflow-x-auto pb-1">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="flex-shrink-0 w-40 h-28" />)}
            </div>
          ) : operators.length === 0 ? (
            <div className="mx-4 bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 text-center border border-gray-100 dark:border-gray-700">
              <p className="text-2xl mb-1">👨‍💼</p>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">No operators yet</p>
              <button
                onClick={() => navigate("/operators/manage")}
                className="mt-3 text-xs font-bold text-blue-600 dark:text-blue-400 active:opacity-70"
              >
                + Add First Operator
              </button>
            </div>
          ) : (
            <div className="flex gap-3 px-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {operators.slice(0, 10).map((op) => (
                <OperatorCard
                  key={op.operator_id || op._id}
                  op={op}
                  onClick={() => {
                    const id = op.operator_id || op._id;
                    logger.info("AdminDashboard", "Operator card tapped", { id });
                    if (!id) {
                      notify.error("Operator ID is missing — cannot open details.");
                      return;
                    }
                    navigate(`/operators/${id}`);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Recent Farmers ────────────────────────────────────────────── */}
        <div className="mt-6">
          <SectionHeader
            title="Recent Farmers"
            action="See All"
            onAction={() => { logger.info("AdminDashboard", "SeeAll: Farmers"); navigate("/farmers"); }}
          />
          {loading ? (
            <div className="mx-4 flex flex-col gap-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : recentFarmers.length === 0 ? (
            <div className="mx-4 bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 text-center border border-gray-100 dark:border-gray-700">
              <p className="text-2xl mb-1">🌾</p>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">No farmers registered yet</p>
              <button
                onClick={() => navigate("/farmers/create")}
                className="mt-3 text-xs font-bold text-green-600 dark:text-green-400 active:opacity-70"
              >
                + Register First Farmer
              </button>
            </div>
          ) : (
            <div className="mx-4 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm">
              {recentFarmers.slice(0, 8).map((f) => (
                <FarmerItem
                  key={f.farmer_id}
                  farmer={f}
                  onClick={() => {
                    logger.info("AdminDashboard", "Farmer tapped", { farmer_id: f.farmer_id });
                    navigate(`/farmers/${f.farmer_id}`);
                  }}
                />
              ))}
              {stats.totalFarmers > 8 && (
                <button
                  onClick={() => navigate("/farmers")}
                  className="w-full py-3 text-xs font-bold text-green-600 dark:text-green-400 bg-gray-50 dark:bg-gray-700/60 active:bg-gray-100 border-t border-gray-100 dark:border-gray-700"
                >
                  View all {stats.totalFarmers} farmers →
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── System Strip ─────────────────────────────────────────────── */}
        <div className="mx-4 mt-6 bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
          <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">System</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5">
            {[
              { k: "Version", v: "2.0.0" },
              { k: "Environment", v: "Development" },
              { k: "Role", v: user?.role || "Admin" },
              { k: "Logged in as", v: user?.email ?? "—" },
            ].map(({ k, v }) => (
              <div key={k}>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">{k}: </span>
                <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{v}</span>
              </div>
            ))}
          </div>
        </div>

      </div>{/* end scrollable content */}

      {/* ── Bottom Navigation Bar ─────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <div className="flex max-w-lg mx-auto">
          <NavItem icon="🏠" label="Home"      active={activeTab === "home"}      onClick={() => handleTabChange("home")} />
          <NavItem icon="👨‍🌾" label="Farmers"   active={activeTab === "farmers"}   onClick={() => handleTabChange("farmers")} />
          <NavItem icon="👨‍💼" label="Operators" active={activeTab === "operators"} onClick={() => handleTabChange("operators")} />
          <NavItem icon="📊" label="Reports"   active={activeTab === "reports"}   onClick={() => handleTabChange("reports")} />
          <NavItem icon="⚙️" label="Settings"  active={activeTab === "settings"}  onClick={() => handleTabChange("settings")} />
        </div>
      </nav>
    </div>
  );
}
