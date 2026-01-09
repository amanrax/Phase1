import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import dashboardService, { 
  type ReportDashboard, 
  type FarmerByRegion, 
  type OperatorPerformance, 
  type ActivityTrend 
} from "@/services/dashboard.service";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

type ReportType = 'dashboard' | 'region' | 'operators' | 'trends';

export default function AdminReports() {
  const navigate = useNavigate();
  const [activeReport, setActiveReport] = useState<ReportType>('dashboard');
  
  // Data states for each report type
  const [dashboardData, setDashboardData] = useState<ReportDashboard | null>(null);
  const [regionData, setRegionData] = useState<FarmerByRegion[]>([]);
  const [operatorData, setOperatorData] = useState<OperatorPerformance[]>([]);
  const [trendsData, setTrendsData] = useState<ActivityTrend[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    loadReportData();
  }, [activeReport]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      switch (activeReport) {
        case 'dashboard':
          const dashReport = await dashboardService.getDashboardReport();
          setDashboardData(dashReport);
          break;
          
        case 'region':
          const regionReport = await dashboardService.getFarmersByRegion();
          setRegionData(regionReport.regions);
          break;
          
        case 'operators':
          const opReport = await dashboardService.getOperatorPerformance();
          setOperatorData(opReport.operators);
          break;
          
        case 'trends':
          const trendsReport = await dashboardService.getActivityTrends();
          setTrendsData(trendsReport.trends);
          break;
      }
    } catch (err: any) {
      console.error("Reports error:", err);
      setError(err.response?.data?.detail || `Failed to load ${activeReport} report`);
    } finally {
      setLoading(false);
    }
  };

  const generateCSV = () => {
    let csv = "Farmer ID,Name,District,Status,Registered\n";
    farmers.forEach(f => {
      csv += `"${f.farmer_id}","${getFarmerName(f)}","${getFarmerDistrict(f)}","${getFarmerStatus(f)}","${getFarmerDate(f)}"\n`;
    });
    return csv;
  };

  const getCurrentDataForExport = () => {
    switch (activeReport) {
      case 'dashboard':
        return dashboardData?.metrics ? [dashboardData.metrics] : [];
      case 'region':
        return regionData;
      case 'operators':
        return operatorData;
      case 'trends':
        return trendsData;
      default:
        return [];
    }
  };

  const getExportFilename = (extension: string) => {
    const date = new Date().toISOString().split('T')[0];
    return `${activeReport}-report-${date}.${extension}`;
  };

  const exportReport = (type: "csv" | "excel" | "pdf") => {
    const data = getCurrentDataForExport();
    
    if (type === "csv") {
      exportToCSV(data, getExportFilename('csv'));
    } else if (type === "excel") {
      exportToExcel(data, getExportFilename('xlsx'));
    } else if (type === "pdf") {
      exportToPDF(data, getExportFilename('pdf'));
    }
  };

  const exportToExcel = (data: any[], filename: string) => {
    try {
      if (!data || data.length === 0) {
        setError('No data to export');
        return;
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, activeReport);
      XLSX.writeFile(wb, filename);
      
      setShowExportMenu(false);
    } catch (error) {
      setError('Failed to export Excel');
      console.error('Excel export error:', error);
    }
  };

  const exportToPDF = (data: any[], filename: string) => {
    try {
      if (!data || data.length === 0) {
        setError('No data to export');
        return;
      }

      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(18);
      doc.setTextColor(21, 128, 61);
      doc.text("Chiefdom Empowerment Model", 14, 20);
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`${activeReport.charAt(0).toUpperCase() + activeReport.slice(1)} Report`, 14, 28);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);
      
      // Convert data to table
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        const rows = data.map(item => Object.values(item));
        
        autoTable(doc, {
          startY: 45,
          head: [headers],
          body: rows,
          theme: 'striped',
          headStyles: { fillColor: [21, 128, 61] },
          styles: { fontSize: 8 }
        });
      }
      
      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${pageCount} | CEM Reports`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }
      
      doc.save(filename);
      setShowExportMenu(false);
    } catch (error) {
      setError('Failed to export PDF');
      console.error('PDF export error:', error-label">Pending Verification</div>
      <div class="metric-value">${report?.pending_verification || 0}</div>
    </div>
  </div>

  <h2>Farmer Details (${farmers.length} records)</h2>
  <table>
    <thead>
      <tr>
        <th>Farmer ID</th>
        <th>Name</th>
        <th>District</th>
        <th>Status</th>
        <th>Registered</th>
      </tr>
    </thead>
    <tbody>
      ${farmers.map(f => `
        <tr>
          <td><strong>${f.farmer_id}</strong></td>
          <td>${getFarmerName(f)}</td>
          <td>${getFarmerDistrict(f)}</td>
          <td><strong>${getFarmerStatus(f)}</strong></td>
          <td>${getFarmerDate(f)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    <p><strong>Chiefdom Management Model</strong> | Chiefdom Empowerment Model (CEM)</p>
  </div>
</body>
</html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate("/admin-dashboard")} 
              className="text-green-700 hover:text-green-800 font-bold text-sm"
            >
              ← BACK
            </button>
            <h1 className="text-2xl font-bold text-gray-800">📊 Reports & Analytics</h1>
          </div>

          {/* Export Menu */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-lg transition text-sm flex items-center gap-2"
            >
              📥 Export
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                <button
                  onClick={() => exportReport("csv")}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 border-b border-gray-200"
                >
                  📄 CSV
                </button>
                <button
                  onClick={() => exportReport("excel")}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 border-b border-gray-200"
                >
                  📊 Excel
                </button>
                <button
                  onClick={() => exportReport("pdf")}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                >
                  📋 PDF
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap border-b border-gray-200 -mb-px">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                { id: 'region', label: 'By Region', icon: '🗺️' },
                { id: 'operators', label: 'Operator Performance', icon: '👥' },
                { id: 'trends', label: 'Activity Trends', icon: '📈' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveReport(tab.id as ReportType)}
                  className={`
                    flex items-center gap-2 py-4 px-6 font-semibold text-sm transition-all duration-300 border-b-2
                    ${activeReport === tab.id
                      ? 'text-green-700 border-green-700 bg-green-50'
                      : 'text-gray-600 border-transparent hover:text-green-600 hover:border-green-300'
                    }
                  `}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border-l-4 border-red-500 flex justify-between items-center">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="text-xs hover:underline">Dismiss</button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600"></div>
            <p className="text-gray-600 mt-4">Loading {activeReport} data...</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-6">
            {/* Dashboard Report */}
            {activeReport === 'dashboard' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Summary</h2>
                {dashboardData?.metrics ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'Total Farmers', value: dashboardData.metrics.farmers_total, icon: '🌾', color: 'green' },
                      { label: 'Total Operators', value: dashboardData.metrics.operators_total, icon: '👥', color: 'blue' },
                      { label: 'Total Users', value: dashboardData.metrics.users_total, icon: '👤', color: 'purple' },
                      { label: 'New This Month', value: dashboardData.metrics.farmers_registered_this_month, icon: '📅', color: 'orange' },
                    ].map((card, idx) => (
                      <div key={idx} className={`bg-gradient-to-br from-${card.color}-50 to-${card.color}-100 rounded-lg p-6 border border-${card.color}-200`}>
                        <div className="text-4xl mb-2">{card.icon}</div>
                        <p className="text-gray-600 text-sm font-semibold uppercase">{card.label}</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{card.value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No dashboard data available</p>
                )}
              </div>
            )}

            {/* Farmers by Region Report */}
            {activeReport === 'region' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Farmers by Region</h2>
                {regionData.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No regional data available</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Province</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">District</th>
                          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Farmer Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {regionData.map((region, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 text-sm text-gray-900">{region.province || 'Unknown'}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{region.district || 'Unknown'}</td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">{region.farmer_count}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={2} className="px-6 py-3 text-sm font-semibold text-gray-900">Total</td>
                          <td className="px-6 py-3 text-sm text-right font-bold text-green-700">
                            {regionData.reduce((sum, r) => sum + r.farmer_count, 0)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Operator Performance Report */}
            {activeReport === 'operators' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Operator Performance</h2>
                {operatorData.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No operator data available</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Operator Name</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Total Farmers</th>
                          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Last 30 Days</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {operatorData.map((op, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{op.operator_name || 'Unknown'}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{op.email || 'N/A'}</td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">{op.total_farmers}</td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-blue-600">{op.recent_farmers_30d}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={2} className="px-6 py-3 text-sm font-semibold text-gray-900">Total</td>
                          <td className="px-6 py-3 text-sm text-right font-bold text-green-700">
                            {operatorData.reduce((sum, op) => sum + op.total_farmers, 0)}
                          </td>
                          <td className="px-6 py-3 text-sm text-right font-bold text-blue-700">
                            {operatorData.reduce((sum, op) => sum + op.recent_farmers_30d, 0)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Activity Trends Report */}
            {activeReport === 'trends' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Activity Trends (Last 14 Days)</h2>
                {trendsData.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No trends data available</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Registrations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {trendsData.map((trend, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 text-sm text-gray-900">{trend.date}</td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">{trend.registrations}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td className="px-6 py-3 text-sm font-semibold text-gray-900">Total</td>
                          <td className="px-6 py-3 text-sm text-right font-bold text-green-700">
                            {trendsData.reduce((sum, t) => sum + t.registrations, 0)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>Last updated: {new Date().toLocaleString()} • Data refreshes on page load</p>
        </div>
      </div>
    </div>
  );
}
