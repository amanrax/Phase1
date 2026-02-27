// AdminReports page — client-side quick exports + server-side Celery PDF/Excel generation
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { logger } from "@/utils/logger";
import dashboardService, {
  type ReportDashboard,
  type FarmerByRegion,
  type OperatorPerformance,
  type ActivityTrend,
} from "@/services/dashboard.service";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

type ReportType = "dashboard" | "region" | "operators" | "trends";

export default function AdminReports() {
  const navigate = useNavigate();
  const [activeReport, setActiveReport] = useState<ReportType>("dashboard");

  const [dashboardData, setDashboardData] = useState<ReportDashboard | null>(null);
  const [regionData, setRegionData] = useState<FarmerByRegion[]>([]);
  const [operatorData, setOperatorData] = useState<OperatorPerformance[]>([]);
  const [trendsData, setTrendsData] = useState<ActivityTrend[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Server-side (Celery) report state
  const [serverTaskId, setServerTaskId] = useState<string | null>(null);
  const [serverTaskStatus, setServerTaskStatus] = useState<string>("");
  const [serverPolling, setServerPolling] = useState(false);
  const [serverReportType, setServerReportType] = useState<string>("");
  const [showServerMenu, setShowServerMenu] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadReportData();
  }, [activeReport]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      switch (activeReport) {
        case "dashboard": {
          const r = await dashboardService.getDashboardReport();
          setDashboardData(r);
          break;
        }
        case "region": {
          const r = await dashboardService.getFarmersByRegion();
          setRegionData(r.regions);
          break;
        }
        case "operators": {
          const r = await dashboardService.getOperatorPerformance();
          setOperatorData(r.operators);
          break;
        }
        case "trends": {
          const r = await dashboardService.getActivityTrends();
          setTrendsData(r.trends);
          break;
        }
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string }; status?: number } };
      const msg = e?.response?.data?.detail || `Failed to load ${activeReport} report`;
      logger.error("AdminReports", `Failed to load ${activeReport} report`, { error: msg });
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentData = () => {
    switch (activeReport) {
      case "dashboard": return dashboardData?.metrics ? [dashboardData.metrics] : [];
      case "region":    return regionData;
      case "operators": return operatorData;
      case "trends":    return trendsData;
      default:          return [];
    }
  };

  const filename = (ext: string) => {
    const d = new Date().toISOString().split("T")[0];
    return `${activeReport}-report-${d}.${ext}`;
  };

  // ─── Client-side exports ───────────────────────────────────────────────────

  const exportReport = (type: "csv" | "excel" | "pdf") => {
    const data = getCurrentData() as Record<string, unknown>[];
    if (!data.length) { setError("No data to export."); return; }

    if (type === "csv") {
      const headers = Object.keys(data[0]);
      const csv = [headers.join(","), ...data.map(r => headers.map(h => {
        const v = r[h]; 
        if (typeof v === "string" && (v.includes(",") || v.includes('"'))) return `"${v.replace(/"/g,'""')}"`;
        return v ?? "";
      }).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename("csv");
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } else if (type === "excel") {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), activeReport);
      XLSX.writeFile(wb, filename("xlsx"));
    } else {
      const doc = new jsPDF();
      doc.setFontSize(18); doc.setTextColor(21,128,61);
      doc.text("Chiefdom Empowerment Model", 14, 20);
      doc.setFontSize(14); doc.setTextColor(0,0,0);
      doc.text(`${activeReport.charAt(0).toUpperCase()+activeReport.slice(1)} Report`, 14, 28);
      doc.setFontSize(10); doc.setTextColor(100,100,100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);
      autoTable(doc, { startY:45, head:[Object.keys(data[0])], body:data.map(r=>Object.values(r)) as unknown[][], theme:"striped", headStyles:{fillColor:[21,128,61]}, styles:{fontSize:8} });
      const pc = doc.getNumberOfPages();
      for (let i=1;i<=pc;i++) {
        doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150,150,150);
        doc.text(`Page ${i} of ${pc} | CEM Reports`, doc.internal.pageSize.getWidth()/2, doc.internal.pageSize.getHeight()-10, {align:"center"});
      }
      doc.save(filename("pdf"));
    }
    setShowExportMenu(false);
    setError(null);
  };

  // ─── Server-side Celery reports ────────────────────────────────────────────

  const triggerServerExport = async (endpoint: string, label: string, params?: Record<string,string>) => {
    try {
      setServerPolling(true);
      setServerTaskStatus("queued");
      setServerReportType(label);
      setShowServerMenu(false);
      setError(null);
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      const res = await axios.post(`/api/reports/${endpoint}${qs}`);
      setServerTaskId(res.data.task_id);
      logger.info("AdminReports", `Server report queued: ${label}`, { task_id: res.data.task_id });
    } catch (err: unknown) {
      setServerPolling(false);
      setServerTaskStatus("");
      const e = err as { response?: { data?: { detail?: string } } };
      const msg = e?.response?.data?.detail || `Failed to start ${label} export`;
      setError(msg);
      logger.error("AdminReports", "Failed to trigger server report", { error: msg });
    }
  };

  useEffect(() => {
    if (!serverTaskId || !serverPolling) return;
    pollingRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`/api/reports/task/${serverTaskId}`);
        const { status, file_id, filename: fname, error: taskErr } = res.data as { status:string; file_id?:string; filename?:string; error?:string };
        setServerTaskStatus(status);
        if (status === "completed" && file_id) {
          clearInterval(pollingRef.current!);
          setServerPolling(false);
          const a = document.createElement("a");
          a.href = `/api/reports/download/${file_id}`;
          a.download = fname ?? "report";
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          logger.info("AdminReports", `Server report ready: ${serverReportType}`, { file_id });
          setTimeout(() => { setServerTaskId(null); setServerTaskStatus(""); setServerReportType(""); }, 3000);
        } else if (status === "failed") {
          clearInterval(pollingRef.current!);
          setServerPolling(false);
          setError(`Report generation failed: ${taskErr ?? "unknown error"}`);
          setServerTaskId(null); setServerTaskStatus("");
        }
      } catch {
        clearInterval(pollingRef.current!);
        setServerPolling(false);
        setError("Lost connection while polling for report status.");
      }
    }, 2000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverTaskId, serverPolling]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/admin-dashboard")} className="text-green-700 dark:text-green-400 hover:text-green-800 font-bold text-sm">
              &larr; BACK
            </button>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Reports &amp; Analytics</h1>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/admin/analytics")} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition text-sm">
              Charts
            </button>

            {/* Server-generated reports (Celery) */}
            <div className="relative">
              <button
                onClick={() => setShowServerMenu(!showServerMenu)}
                disabled={serverPolling}
                className="bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-bold py-2 px-4 rounded-lg transition text-sm flex items-center gap-2"
              >
                {serverPolling ? (
                  <><span className="inline-block h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />{serverTaskStatus === "completed" ? "Done!" : "Generating..."}</>
                ) : "Server Reports"}
              </button>
              {showServerMenu && !serverPolling && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-20">
                  <p className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-600">Full Reports (server)</p>
                  <button onClick={() => triggerServerExport("summary-pdf","Summary PDF")} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600">Summary Report PDF</button>
                  <button onClick={() => triggerServerExport("summary-excel","Summary Excel")} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600">Summary Report Excel</button>
                  <button onClick={() => triggerServerExport("farmers-excel","Farmers Excel")} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200">All Farmers Excel</button>
                </div>
              )}
              {serverPolling && serverReportType && (
                <p className="absolute top-full right-0 mt-1 text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">
                  {serverTaskStatus === "completed" ? "Ready — downloading..." : `${serverReportType}: ${serverTaskStatus}`}
                </p>
              )}
            </div>

            {/* Quick client-side export */}
            <div className="relative">
              <button onClick={() => setShowExportMenu(!showExportMenu)} className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-lg transition text-sm flex items-center gap-2">
                Export
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-20">
                  <button onClick={() => exportReport("csv")} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600">CSV</button>
                  <button onClick={() => exportReport("excel")} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600">Excel</button>
                  <button onClick={() => exportReport("pdf")} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200">PDF</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-700 -mb-px">
              {[
                { id:"dashboard", label:"Dashboard", icon:"📊" },
                { id:"region",    label:"By Region",  icon:"🗺️" },
                { id:"operators", label:"Operator Performance", icon:"👥" },
                { id:"trends",    label:"Activity Trends",      icon:"📈" },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveReport(tab.id as ReportType)}
                  className={`flex items-center gap-2 py-4 px-6 font-semibold text-sm transition-all duration-300 border-b-2 ${activeReport===tab.id ? "text-green-700 dark:text-green-400 border-green-700 dark:border-green-400 bg-green-50 dark:bg-green-900/20" : "text-gray-600 dark:text-gray-400 border-transparent hover:text-green-600 hover:border-green-300"}`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border-l-4 border-red-500 flex justify-between items-center">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="text-xs hover:underline">Dismiss</button>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_,i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[...Array(4)].map((_,j) => <div key={j} className="h-20 bg-gray-100 dark:bg-gray-700 rounded-lg" />)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">

            {activeReport === "dashboard" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Dashboard Summary</h2>
                {dashboardData?.metrics ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label:"Total Farmers",   value:dashboardData.metrics.farmers_total,                    icon:"🌾", color:"green" },
                      { label:"Total Operators",  value:dashboardData.metrics.operators_total,                   icon:"👥", color:"blue" },
                      { label:"Total Users",      value:dashboardData.metrics.users_total,                       icon:"👤", color:"purple" },
                      { label:"New This Month",   value:dashboardData.metrics.farmers_registered_this_month,     icon:"📅", color:"orange" },
                    ].map((card,idx) => (
                      <div key={idx} className={`bg-gradient-to-br from-${card.color}-50 to-${card.color}-100 rounded-lg p-6 border border-${card.color}-200`}>
                        <div className="text-4xl mb-2">{card.icon}</div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm font-semibold uppercase">{card.label}</p>
                        <p className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-2">{card.value}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-center text-gray-500 dark:text-gray-400 py-8">No dashboard data available</p>}
              </div>
            )}

            {activeReport === "region" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Farmers by Region</h2>
                {regionData.length === 0 ? <p className="text-center text-gray-500 dark:text-gray-400 py-8">No regional data available</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Province</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">District</th>
                          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-200">Farmer Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                        {regionData.map((r,idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">{r.province||"Unknown"}</td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">{r.district||"Unknown"}</td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">{r.farmer_count}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <td colSpan={2} className="px-6 py-3 text-sm font-semibold text-gray-900 dark:text-white">Total</td>
                          <td className="px-6 py-3 text-sm text-right font-bold text-green-700">{regionData.reduce((s,r)=>s+r.farmer_count,0)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeReport === "operators" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Operator Performance</h2>
                {operatorData.length === 0 ? <p className="text-center text-gray-500 dark:text-gray-400 py-8">No operator data available</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Operator Name</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Email</th>
                          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-200">Total Farmers</th>
                          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-200">Last 30 Days</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                        {operatorData.map((op,idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200 font-semibold">{op.operator_name||"Unknown"}</td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{op.email||"N/A"}</td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">{op.total_farmers}</td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-blue-600">{op.recent_farmers_30d}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <td colSpan={2} className="px-6 py-3 text-sm font-semibold text-gray-900 dark:text-gray-200">Total</td>
                          <td className="px-6 py-3 text-sm text-right font-bold text-green-700">{operatorData.reduce((s,o)=>s+o.total_farmers,0)}</td>
                          <td className="px-6 py-3 text-sm text-right font-bold text-blue-700">{operatorData.reduce((s,o)=>s+o.recent_farmers_30d,0)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeReport === "trends" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Activity Trends (Last 14 Days)</h2>
                {trendsData.length === 0 ? <p className="text-center text-gray-500 dark:text-gray-400 py-8">No trends data available</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Date</th>
                          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-200">Registrations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                        {trendsData.map((t,idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">{t.date}</td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">{t.registrations}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <td className="px-6 py-3 text-sm font-semibold text-gray-900 dark:text-gray-200">Total</td>
                          <td className="px-6 py-3 text-sm text-right font-bold text-green-700">{trendsData.reduce((s,t)=>s+t.registrations,0)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        <div className="mt-8 text-center text-gray-600 dark:text-gray-400 text-sm">
          <p>Last updated: {new Date().toLocaleString()} &bull; Data refreshes on page load</p>
        </div>
      </div>
    </div>
  );
}
