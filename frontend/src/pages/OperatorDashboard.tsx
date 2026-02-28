// src/pages/OperatorDashboard.tsx — Mobile-first modern operator dashboard (matches AdminDashboard)
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import { farmerService } from "@/services/farmer.service";
import { operatorService } from "@/services/operator.service";
import axios from "@/utils/axios";
import { useNotification } from "@/contexts/NotificationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { logger } from "@/utils/logger";

const COMPONENT = "OperatorDashboard";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Farmer {
  _id: string;
  farmer_id: string;
  first_name?: string;
  last_name?: string;
  phone_primary?: string;
  village?: string;
  district_name?: string;
  registration_status?: string;
  is_active?: boolean;
  personal_info?: {
    first_name?: string;
    last_name?: string;
    phone_primary?: string;
    email?: string;
  };
  primary_phone?: string;
  phone?: string;
  email?: string;
  created_at?: string;
}

interface OperatorStats {
  total_farmers: number;
  active_farmers: number;
  pending_farmers: number;
  verified_farmers: number;
  recent_registrations_30d: number;
  total_land_hectares: number;
  avg_land_hectares: number;
}

interface OperatorProfile {
  operator_id: string;
  full_name: string;
  email: string;
  phone?: string;
  assigned_district?: string;
  assigned_districts?: string[];
  assigned_regions?: string[];
  is_active?: boolean;
}

type NavTab = "home" | "farmers" | "reports" | "settings";

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-2xl ${className}`} />
  );
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
  const cls = `relative flex flex-col justify-between p-4 rounded-2xl text-left w-full ${color} text-white shadow-lg select-none`;
  if (!onClick) return <div className={cls}>{inner}</div>;
  return <button onClick={onClick} className={`${cls} active:scale-95 transition-transform duration-150`}>{inner}</button>;
}

// ─── Quick Action Tile ────────────────────────────────────────────────────────
function QuickAction({ icon, label, bg, onPress }: { icon: string; label: string; bg: string; onPress: () => void }) {
  return (
    <button onClick={onPress}
      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl ${bg} text-white shadow-md active:scale-95 transition-transform duration-150 select-none`}>
      <span className="text-2xl leading-none">{icon}</span>
      <span className="text-[11px] font-semibold text-center leading-tight">{label}</span>
    </button>
  );
}

// ─── Bottom Nav Item ──────────────────────────────────────────────────────────
function NavItem({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-colors duration-150 ${active ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`}>
      <span className={`text-xl leading-none ${active ? "scale-110" : "scale-100"} transition-transform duration-150`}>{icon}</span>
      <span className={`text-[10px] font-semibold ${active ? "opacity-100" : "opacity-70"}`}>{label}</span>
      {active && <span className="w-1 h-1 rounded-full bg-green-500 dark:bg-green-400 mt-0.5" />}
    </button>
  );
}

// ─── Farmer List Item with Review ─────────────────────────────────────────────
function FarmerItem({ farmer, onClick, onReview }: { farmer: Farmer; onClick: () => void; onReview?: (status: string) => void }) {
  const statusColor: Record<string, string> = {
    verified: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    pending:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
    registered: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    inactive: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
  };
  const fn = farmer.first_name || farmer.personal_info?.first_name || "Unknown";
  const ln = farmer.last_name || farmer.personal_info?.last_name || "";
  const name = `${fn} ${ln}`.trim();
  const phone = farmer.phone_primary || farmer.personal_info?.phone_primary || farmer.primary_phone || farmer.phone || "N/A";
  const status = farmer.is_active !== false ? (farmer.registration_status || "registered") : "inactive";
  const colorClass = statusColor[status.toLowerCase()] || statusColor.registered;

  return (
    <div className="flex items-center gap-3 w-full px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700/60 text-left select-none last:border-b-0">
      <button onClick={onClick} className="flex items-center gap-3 flex-1 min-w-0 active:bg-gray-50 dark:active:bg-gray-700 transition-colors duration-100">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
          {name[0]?.toUpperCase() || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">📱 {phone} · {farmer.farmer_id}</p>
        </div>
      </button>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase whitespace-nowrap ${colorClass}`}>{status}</span>
        {onReview && (status === "pending" || status === "registered") && (
          <div className="flex gap-1">
            <button onClick={() => onReview("verified")} title="Approve"
              className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-600 hover:bg-green-200 dark:hover:bg-green-900/60 active:scale-90 transition-all">
              <span className="text-xs font-bold">✓</span>
            </button>
            <button onClick={() => onReview("rejected")} title="Reject"
              className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 hover:bg-red-200 dark:hover:bg-red-900/60 active:scale-90 transition-all">
              <span className="text-xs font-bold">✕</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex justify-between items-center px-4 mb-2">
      <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">{title}</h2>
      {action && <button onClick={onAction} className="text-xs font-semibold text-green-600 dark:text-green-400 active:opacity-70">{action} →</button>}
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────
function SettingsPanel({ onBack }: { onBack: () => void }) {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const notify = useNotification();
  const themeOptions: { value: "light" | "dark" | "system"; icon: string; label: string }[] = [
    { value: "light", icon: "☀️", label: "Light" },
    { value: "dark", icon: "🌙", label: "Dark" },
    { value: "system", icon: "🖥️", label: "System" },
  ];

  return (
    <div className="px-4 pt-4 pb-24">
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 active:opacity-70">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="15 18 9 12 15 6" /></svg>
        Back
      </button>
      <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">⚙️ Settings</h2>

      {/* Theme */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm mb-4">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">🎨 Appearance</h3>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map(opt => (
            <button key={opt.value} onClick={() => { setTheme(opt.value); notify.success(`Theme: ${opt.label}`); }}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${theme === opt.value ? "border-green-500 bg-green-50 dark:bg-green-900/30" : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"}`}>
              <span className="text-xl">{opt.icon}</span>
              <span className={`text-xs font-bold ${theme === opt.value ? "text-green-700 dark:text-green-300" : "text-gray-600 dark:text-gray-300"}`}>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Account */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm mb-4">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">👤 Account</h3>
        <div className="space-y-2 text-sm">
          {[{ k: "Email", v: user?.email || "—" }, { k: "Role", v: "Operator" }, { k: "Version", v: "v2.0.0" }].map(({ k, v }) => (
            <div key={k} className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{k}</span><span className="font-semibold text-gray-800 dark:text-gray-100 truncate ml-2">{v}</span></div>
          ))}
        </div>
      </div>

      <button onClick={() => { logger.info(COMPONENT, "Logout"); logout(); }}
        className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold text-sm rounded-2xl border border-red-200 dark:border-red-800 active:scale-95 transition-transform">
        🚪 Sign Out
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OperatorDashboard() {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const notify = useNotification();

  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [stats, setStats] = useState<OperatorStats>({ total_farmers: 0, active_farmers: 0, pending_farmers: 0, verified_farmers: 0, recent_registrations_30d: 0, total_land_hectares: 0, avg_land_hectares: 0 });
  const [profile, setProfile] = useState<OperatorProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadingRef = useRef(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setLoadError(null);
    logger.info(COMPONENT, "Loading data", { isRefresh });

    try {
      let operatorProfile: OperatorProfile | null = null;
      try { const resp = await axios.get("/operators/me"); operatorProfile = resp.data; setProfile(resp.data); } catch { logger.warn(COMPONENT, "Profile fetch failed"); }
      try { const s = await operatorService.getCurrentOperatorStats(); setStats(s); } catch { logger.warn(COMPONENT, "Stats fetch failed"); }
      try {
        const district = operatorProfile?.assigned_district;
        const data = await farmerService.getFarmers(100, 0, district ? { district } : undefined);
        setFarmers(Array.isArray(data) ? data : (data.results || data.farmers || []));
      } catch { logger.warn(COMPONENT, "Farmers fetch failed"); }
      if (isRefresh) notify.success("Dashboard refreshed");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string }; status?: number }; message?: string };
      const msg = e?.response?.data?.detail || e?.message || "Failed to load dashboard";
      setLoadError(msg);
      if (e?.response?.status === 401) { notify.error("Session expired."); logout(); return; }
    } finally {
      setLoading(false); setRefreshing(false); loadingRef.current = false;
    }
  }, [logout, notify]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleReviewFarmer = async (farmerId: string, newStatus: string) => {
    try {
      logger.info(COMPONENT, "Reviewing farmer", { farmerId, newStatus });
      await axios.patch(`/farmers/${farmerId}/review?new_status=${newStatus}`);
      notify.success(`Farmer ${newStatus === "verified" ? "approved" : "rejected"}`);
      await loadData(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      notify.error(e?.response?.data?.detail || "Failed to update status");
    }
  };

  const handleTabChange = (tab: NavTab) => {
    if (tab === "settings") { setShowSettings(true); setActiveTab("settings"); return; }
    setShowSettings(false);
    if (tab === "home") { setActiveTab("home"); return; }
    if (tab === "farmers") { navigate("/farmers"); return; }
    if (tab === "reports") { navigate("/admin/analytics"); return; }
  };

  const quickActions = [
    { icon: "➕", label: "Add Farmer", bg: "bg-gradient-to-br from-emerald-500 to-green-600", onPress: () => navigate("/farmers/create") },
    { icon: "📋", label: "All Farmers", bg: "bg-gradient-to-br from-blue-500 to-indigo-600", onPress: () => navigate("/farmers") },
    { icon: "📈", label: "Analytics", bg: "bg-gradient-to-br from-violet-500 to-purple-600", onPress: () => navigate("/admin/analytics") },
    { icon: "📷", label: "QR Scan", bg: "bg-gradient-to-br from-amber-500 to-orange-600", onPress: () => navigate("/qr-scanner") },
  ];

  const getGreeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };
  const firstName = profile?.full_name?.split(" ")[0] || user?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Operator";

  const filteredFarmers = farmers.filter(f => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const fn = f.first_name || f.personal_info?.first_name || "";
    const ln = f.last_name || f.personal_info?.last_name || "";
    const ph = f.phone_primary || f.personal_info?.phone_primary || f.primary_phone || f.phone || "";
    return fn.toLowerCase().includes(q) || ln.toLowerCase().includes(q) || ph.includes(q) || f.farmer_id.toLowerCase().includes(q);
  });

  const pendingFarmers = farmers.filter(f => f.registration_status === "pending" || f.registration_status === "registered");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="overflow-y-auto pb-24">

        {/* ── Hero Banner ── */}
        <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 px-5 pt-12 pb-10 overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="relative flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><span className="text-sm">👨‍💼</span></div>
              <span className="text-white/80 text-xs font-semibold tracking-widest uppercase">CEM Operator</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => loadData(true)} disabled={refreshing} aria-label="Refresh"
                className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50">
                <span className={`text-sm ${refreshing ? "animate-spin" : ""}`}>🔄</span>
              </button>
              <button onClick={() => { logout(); }} aria-label="Logout"
                className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:scale-90 transition-transform">
                <span className="text-sm">🚪</span>
              </button>
            </div>
          </div>
          <div className="relative">
            <p className="text-white/70 text-sm font-medium">{getGreeting()},</p>
            <h1 className="text-white text-2xl font-extrabold tracking-tight mt-0.5">{firstName} 👋</h1>
            <p className="text-white/60 text-xs mt-1">{profile?.assigned_district ? `📍 ${profile.assigned_district}` : "Field Operations Management"}</p>
          </div>
          <div className="relative mt-4 inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse" />
            <span className="text-white/90 text-[11px] font-semibold">v2.0.0 · Operator</span>
          </div>
        </div>

        {showSettings ? (
          <SettingsPanel onBack={() => { setShowSettings(false); setActiveTab("home"); }} />
        ) : (
          <>
            {loadError && !loading && (
              <div className="mx-4 mt-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-2xl p-4">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">⚠️ Failed to load data</p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{loadError}</p>
                <button onClick={() => loadData()} className="mt-3 text-xs font-bold text-red-700 dark:text-red-400 border border-red-300 dark:border-red-600 px-3 py-1.5 rounded-lg active:scale-95 transition-transform">Try Again</button>
              </div>
            )}

            {/* Stats */}
            <div className="px-4 mt-5">
              <SectionHeader title="My Overview" />
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon="👨‍🌾" label="My Farmers" value={loading ? "—" : stats.total_farmers} sub={`${stats.active_farmers} active`} color="bg-gradient-to-br from-green-500 to-emerald-600" loading={loading} />
                <StatCard icon="⏳" label="Pending" value={loading ? "—" : stats.pending_farmers} sub="Tap to review" color={stats.pending_farmers > 0 ? "bg-gradient-to-br from-amber-500 to-orange-600" : "bg-gradient-to-br from-gray-400 to-slate-500"} loading={loading} onClick={() => { const el = document.getElementById("pending-section"); if (el) el.scrollIntoView({ behavior: "smooth" }); }} />
                <StatCard icon="✅" label="Verified" value={loading ? "—" : stats.verified_farmers} sub={`${stats.recent_registrations_30d} this month`} color="bg-gradient-to-br from-blue-500 to-cyan-600" loading={loading} />
                <StatCard icon="🌾" label="Total Land" value={loading ? "—" : `${stats.total_land_hectares.toFixed(1)}ha`} sub={`Avg: ${stats.avg_land_hectares.toFixed(1)} ha`} color="bg-gradient-to-br from-violet-500 to-purple-600" loading={loading} />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="px-4 mt-6">
              <SectionHeader title="Quick Actions" />
              <div className="grid grid-cols-4 gap-3">
                {quickActions.map(a => <QuickAction key={a.label} {...a} />)}
              </div>
            </div>

            {/* Pending Review */}
            {pendingFarmers.length > 0 && (
              <div className="mt-6" id="pending-section">
                <SectionHeader title={`Pending Review (${pendingFarmers.length})`} />
                <div className="mx-4 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-amber-200 dark:border-amber-700/50 shadow-sm">
                  {pendingFarmers.slice(0, 5).map(f => (
                    <FarmerItem key={f.farmer_id || f._id} farmer={f} onClick={() => navigate(`/farmers/${f.farmer_id}`)} onReview={(s) => handleReviewFarmer(f.farmer_id, s)} />
                  ))}
                  {pendingFarmers.length > 5 && (
                    <button onClick={() => navigate("/farmers?status=pending")} className="w-full py-3 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 active:bg-amber-100 border-t border-amber-200 dark:border-amber-700/50">
                      View all {pendingFarmers.length} pending →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Search */}
            <div className="px-4 mt-6">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search farmers..."
                  className="w-full pl-9 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition shadow-sm" />
              </div>
            </div>

            {/* Farmers List */}
            <div className="mt-4">
              <SectionHeader title={searchQuery ? `Results (${filteredFarmers.length})` : "All Farmers"} action="See All" onAction={() => navigate("/farmers")} />
              {loading ? (
                <div className="mx-4 flex flex-col gap-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16" />)}</div>
              ) : filteredFarmers.length === 0 ? (
                <div className="mx-4 bg-white dark:bg-gray-800 rounded-2xl p-6 text-center border border-gray-100 dark:border-gray-700">
                  <p className="text-2xl mb-1">🌾</p>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{searchQuery ? "No farmers found" : "No farmers assigned yet"}</p>
                  {!searchQuery && <button onClick={() => navigate("/farmers/create")} className="mt-3 text-xs font-bold text-green-600 dark:text-green-400">+ Register First Farmer</button>}
                </div>
              ) : (
                <div className="mx-4 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm">
                  {filteredFarmers.slice(0, 10).map(f => (
                    <FarmerItem key={f.farmer_id || f._id} farmer={f} onClick={() => navigate(`/farmers/${f.farmer_id}`)} onReview={(s) => handleReviewFarmer(f.farmer_id, s)} />
                  ))}
                  {farmers.length > 10 && (
                    <button onClick={() => navigate("/farmers")} className="w-full py-3 text-xs font-bold text-green-600 dark:text-green-400 bg-gray-50 dark:bg-gray-700/60 active:bg-gray-100 border-t border-gray-100 dark:border-gray-700">
                      View all {farmers.length} farmers →
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* System Strip */}
            <div className="mx-4 mt-6 bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
              <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">System</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1.5">
                {[{ k: "Version", v: "2.0.0" }, { k: "Role", v: "Operator" }, { k: "District", v: profile?.assigned_district || "—" }, { k: "Logged in as", v: user?.email ?? "—" }].map(({ k, v }) => (
                  <div key={k}><span className="text-[10px] text-gray-400 dark:text-gray-500">{k}: </span><span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{v}</span></div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <div className="flex max-w-lg mx-auto">
          <NavItem icon="🏠" label="Home" active={activeTab === "home" && !showSettings} onClick={() => handleTabChange("home")} />
          <NavItem icon="👨‍🌾" label="Farmers" active={activeTab === "farmers"} onClick={() => handleTabChange("farmers")} />
          <NavItem icon="📊" label="Reports" active={activeTab === "reports"} onClick={() => handleTabChange("reports")} />
          <NavItem icon="⚙️" label="Settings" active={activeTab === "settings"} onClick={() => handleTabChange("settings")} />
        </div>
      </nav>
    </div>
  );
}