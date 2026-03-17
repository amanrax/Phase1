// src/pages/AnalyticsDashboard.tsx
import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import dashboardService from "@/services/dashboard.service";
import { useTheme } from "@/contexts/ThemeContext";
import BackButton from "@/components/BackButton";

const roleBackPath = (role?: string) => role === "operator" ? "/operator-dashboard" : "/admin-dashboard";
import { logger } from "@/utils/logger";
import { APP_VERSION } from "@/utils/version";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#14b8a6"];

// Skeleton loader component
function ChartSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-3 h-48">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-xl" />
    </div>
  );
}

function StatCard({ label, value, icon, color, loading }: {
  label: string; value: string | number; icon: string; color: string; loading?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-5 shadow-sm border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5
      bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700`}>
      {loading ? (
        <div className="animate-pulse flex gap-3 items-center">
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color}`}>
            {icon}
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { logout, user, token, role } = useAuthStore();
  const backPath = roleBackPath((role || user?.role || "").toLowerCase());

  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      logger.info("AnalyticsDashboard", "Loading analytics data");
      const [statsData, analyticsData] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getAnalytics(),
      ]);
      setStats(statsData);
      setAnalytics(analyticsData);
      setLastUpdated(new Date().toLocaleTimeString());
      logger.info("AnalyticsDashboard", "Analytics data loaded", {
        farmers: statsData?.farmers?.total,
        operators: statsData?.operators?.total,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Failed to load analytics data";
      logger.error("AnalyticsDashboard", "Failed to load analytics", { error: msg, status: err?.response?.status });
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [loadData, token]);

  // --- Filters ---
  const [filterMonths, setFilterMonths] = useState<number>(0); // 0 = all time
  const [filterProvince, setFilterProvince] = useState<string>("");
  const [filterOperator, setFilterOperator] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");  // OP-015: custom date range
  const [dateTo, setDateTo] = useState<string>("");      // OP-015: custom date range

  const provinceOptions = useMemo<string[]>(
    () => (analytics?.farmers_by_province ?? []).map((p: any) => p.province as string),
    [analytics]
  );
  const operatorOptions = useMemo<string[]>(
    () => (analytics?.farmers_by_operator ?? []).map((o: any) => o.operator as string),
    [analytics]
  );

  const filteredMonthly = useMemo(() => {
    const data: any[] = analytics?.monthly_registrations ?? [];
    // OP-015: custom date range takes precedence over preset month buttons
    if (dateFrom || dateTo) {
      return data.filter((entry: any) => {
        const m = entry.month as string; // e.g. "2025-01" or "Jan 2025"
        if (!m) return true;
        // Normalise to comparable string (YYYY-MM)
        const iso = m.length === 7 ? m : new Date(m + " 1").toISOString().slice(0, 7);
        if (dateFrom && iso < dateFrom.slice(0, 7)) return false;
        if (dateTo && iso > dateTo.slice(0, 7)) return false;
        return true;
      });
    }
    return filterMonths === 0 ? data : data.slice(-filterMonths);
  }, [analytics, filterMonths, dateFrom, dateTo]);

  const filteredByProvince = useMemo(() => {
    const data: any[] = analytics?.farmers_by_province ?? [];
    return filterProvince ? data.filter((p: any) => p.province === filterProvince) : data;
  }, [analytics, filterProvince]);

  const filteredByOperator = useMemo(() => {
    const data: any[] = analytics?.farmers_by_operator ?? [];
    return filterOperator ? data.filter((o: any) => o.operator === filterOperator) : data;
  }, [analytics, filterOperator]);

  const gridText = isDark ? "#9ca3af" : "#6b7280";
  const gridLine = isDark ? "#374151" : "#e5e7eb";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton to={backPath} />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                📈 Analytics Dashboard
              </h1>
              {lastUpdated && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Updated: {lastUpdated}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="px-3 py-2 text-sm bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? "⟳ Loading..." : "↻ Refresh"}
            </button>
            <button
              onClick={() => { logout(); navigate("/login"); }}
              className="px-3 py-2 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 flex items-center gap-2">
            <span>⚠️</span> {error}
            <button onClick={loadData} className="ml-auto text-sm underline">Retry</button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">🔍 Filters:</span>
            {/* Day range buttons */}
            <div className="flex items-center gap-1 flex-wrap">
              {([0, 3, 6, 12] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setFilterMonths(n)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    filterMonths === n
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {n === 0 ? "All time" : `Last ${n}mo`}
                </button>
              ))}
            </div>
            {/* OP-015: Custom date range picker */}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); if (e.target.value) setFilterMonths(0); }}
                className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="From date"
              />
              <span className="text-xs text-gray-400">—</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); if (e.target.value) setFilterMonths(0); }}
                className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="To date"
              />
            </div>
            {/* Province selector */}
            <select
              value={filterProvince}
              onChange={e => setFilterProvince(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Provinces</option>
              {provinceOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {/* Operator selector */}
            <select
              value={filterOperator}
              onChange={e => setFilterOperator(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Operators</option>
              {operatorOptions.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            {/* Reset */}
            {(filterMonths !== 0 || filterProvince || filterOperator || dateFrom || dateTo) && (
              <button
                onClick={() => { setFilterMonths(0); setFilterProvince(""); setFilterOperator(""); setDateFrom(""); setDateTo(""); }}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 font-medium transition-colors"
              >
                ✕ Reset
              </button>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Farmers" value={stats?.farmers?.total ?? "—"} icon="👨‍🌾" color="bg-indigo-50 dark:bg-indigo-900/30" loading={loading} />
          <StatCard label="Active Farmers" value={stats?.farmers?.active ?? "—"} icon="✅" color="bg-emerald-50 dark:bg-emerald-900/30" loading={loading} />
          <StatCard label="Operators" value={stats?.operators?.total ?? "—"} icon="👔" color="bg-purple-50 dark:bg-purple-900/30" loading={loading} />
          <StatCard label="Total Users" value={stats?.users?.total ?? "—"} icon="👥" color="bg-amber-50 dark:bg-amber-900/30" loading={loading} />
        </div>

        {/* Monthly Registrations - Line Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            📅 Monthly Farmer Registrations
          </h2>
          {loading ? <ChartSkeleton /> : (filteredMonthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={filteredMonthly}>
                <defs>
                  <linearGradient id="colorFarmers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridLine} />
                <XAxis dataKey="month" tick={{ fill: gridText, fontSize: 11 }} />
                <YAxis tick={{ fill: gridText, fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "#1f2937" : "#fff",
                    border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
                    borderRadius: "12px",
                    color: isDark ? "#fff" : "#111"
                  }}
                />
                <Area type="monotone" dataKey="farmers" stroke="#6366f1" strokeWidth={2} fill="url(#colorFarmers)" dot={{ r: 4, fill: "#6366f1" }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-sm">
              No registration data available
            </div>
          ))}
        </div>

        {/* Province + Status - Row */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Farmers by Province */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">🗺️ Farmers by Province</h2>
          {loading ? <ChartSkeleton /> : (filteredByProvince.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={filteredByProvince} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={gridLine} />
                  <XAxis type="number" tick={{ fill: gridText, fontSize: 11 }} />
                  <YAxis type="category" dataKey="province" tick={{ fill: gridText, fontSize: 9 }} width={90} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#1f2937" : "#fff",
                      borderRadius: "12px",
                      color: isDark ? "#fff" : "#111"
                    }}
                  />
                  <Bar dataKey="farmers" fill="#6366f1" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-sm">
                No province data available
              </div>
            ))}
          </div>

          {/* Active vs Inactive - Pie */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">📊 Farmer Status</h2>
            {loading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={analytics?.status_breakdown || []}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {(analytics?.status_breakdown || []).map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#1f2937" : "#fff",
                      borderRadius: "12px",
                      color: isDark ? "#fff" : "#111"
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Crops + Livestock Row */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Crops */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">🌽 Top Crops</h2>
            {loading ? <ChartSkeleton /> : (analytics?.crops_distribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.crops_distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridLine} />
                  <XAxis dataKey="crop" tick={{ fill: gridText, fontSize: 10 }} />
                  <YAxis tick={{ fill: gridText, fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: isDark ? "#1f2937" : "#fff", borderRadius: "12px", color: isDark ? "#fff" : "#111" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {analytics.crops_distribution.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-sm">
                No crop data available
              </div>
            ))}
          </div>

          {/* Livestock */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">🐄 Livestock Distribution</h2>
            {loading ? <ChartSkeleton /> : (analytics?.livestock_distribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={analytics.livestock_distribution} dataKey="count" nameKey="animal" cx="50%" cy="50%" outerRadius={75} label={({ name }) => name}>
                    {analytics.livestock_distribution.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: isDark ? "#1f2937" : "#fff", borderRadius: "12px", color: isDark ? "#fff" : "#111" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-sm">
                No livestock data available
              </div>
            ))}
          </div>
        </div>

        {/* Top Districts */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">📍 Top Districts by Farmer Count</h2>
          {loading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics?.farmers_by_district || []}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridLine} />
                <XAxis dataKey="district" tick={{ fill: gridText, fontSize: 10 }} />
                <YAxis tick={{ fill: gridText, fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: isDark ? "#1f2937" : "#fff", borderRadius: "12px", color: isDark ? "#fff" : "#111" }} />
                <Bar dataKey="farmers" radius={[6, 6, 0, 0]}>
                  {(analytics?.farmers_by_district || []).map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Farmers by Operator */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">👔 Farmers by Operator</h2>
          {loading ? <ChartSkeleton /> : (filteredByOperator.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={filteredByOperator} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={gridLine} />
                <XAxis type="number" tick={{ fill: gridText, fontSize: 11 }} />
                <YAxis type="category" dataKey="operator" tick={{ fill: gridText, fontSize: 9 }} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "#1f2937" : "#fff",
                    borderRadius: "12px",
                    color: isDark ? "#fff" : "#111"
                  }}
                />
                <Bar dataKey="farmers" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-600 text-sm">
              No operator data available
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 pb-4">
          CEM Farmer System v{APP_VERSION} - Analytics ({analytics?.generated_at ? new Date(analytics.generated_at).toLocaleString() : "—"})
        </p>
      </div>
    </div>
  );
}
