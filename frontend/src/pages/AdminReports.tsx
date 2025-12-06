import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "@/utils/axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface Report {
  timestamp?: string;
  metrics?: {
    farmers_total?: number;
    operators_total?: number;
    users_total?: number;
    farmers_registered_this_month?: number;
  };
  // Also support flat structure for backwards compatibility
  farmers_total?: number;
  operators_total?: number;
  new_this_month?: number;
  active_status?: number;
  pending_verification?: number;
}

interface FarmerData {
  farmer_id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  district?: string;
  district_name?: string;
  registered_on?: string;
  created_at?: string;
  status?: string;
  registration_status?: string;
  is_active?: boolean;
}

export default function AdminReports() {
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [farmers, setFarmers] = useState<FarmerData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const getFarmerName = (farmer: FarmerData) => {
    if (farmer.full_name?.trim()) return farmer.full_name;
    const first = farmer.first_name?.trim() || "";
    const last = farmer.last_name?.trim() || "";
    if (first || last) return `${first} ${last}`.trim();
    return "-";
  };

  const getFarmerDistrict = (farmer: FarmerData) => {
    return farmer.district_name || farmer.district || "-";
  };

  const getFarmerStatus = (farmer: FarmerData) => {
    return farmer.registration_status || farmer.status || "unknown";
  };

  const getFarmerDate = (farmer: FarmerData) => {
    const date = farmer.created_at || farmer.registered_on;
    return date ? new Date(date).toLocaleDateString() : "-";
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/reports/dashboard");
      // API returns {timestamp, metrics: {...}}
      const reportData = response.data || {};
      setReport(reportData);
      
      // Load farmer data
      const farmersResponse = await axios.get("/farmers?limit=100");
      let farmersList: FarmerData[] = [];
      if (Array.isArray(farmersResponse.data)) {
        farmersList = farmersResponse.data;
      } else if (farmersResponse.data?.results && Array.isArray(farmersResponse.data.results)) {
        farmersList = farmersResponse.data.results;
      } else if (farmersResponse.data?.farmers && Array.isArray(farmersResponse.data.farmers)) {
        farmersList = farmersResponse.data.farmers;
      }
      setFarmers(farmersList);
    } catch (err: any) {
      console.error("Reports error:", err);
      setError(err.response?.data?.detail || "Failed to load reports");
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

  const exportReport = (type: "csv" | "excel" | "pdf") => {
    if (type === "csv") {
      const csv = generateCSV();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `farmers-report-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } else if (type === "excel") {
      // Create workbook with summary and details
      const wb = XLSX.utils.book_new();
      
      // Summary sheet
      const summaryData = [
        ["Chiefdom Management Model - Farmer Report"],
        ["Generated", new Date().toLocaleDateString()],
        [],
        ["Metric", "Value"],
        ["Total Farmers", report?.metrics?.farmers_total || report?.farmers_total || 0],
        ["Total Operators", report?.metrics?.operators_total || report?.operators_total || 0],
        ["Total Users", report?.metrics?.users_total || report?.active_status || 0],
        ["New This Month", report?.metrics?.farmers_registered_this_month || report?.new_this_month || 0],
        ["Pending Verification", report?.pending_verification || 0]
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");
      
      // Farmers details sheet
      const farmersData = [
        ["Farmer ID", "Name", "District", "Status", "Registered"],
        ...farmers.map(f => [
          f.farmer_id,
          getFarmerName(f),
          getFarmerDistrict(f),
          getFarmerStatus(f),
          getFarmerDate(f)
        ])
      ];
      const farmersSheet = XLSX.utils.aoa_to_sheet(farmersData);
      XLSX.utils.book_append_sheet(wb, farmersSheet, "Farmers");
      
      // Download
      XLSX.writeFile(wb, `farmers-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    } else if (type === "pdf") {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(18);
      doc.setTextColor(21, 128, 61); // green-700
      doc.text("Chiefdom Management Model", 14, 20);
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Farmer Report", 14, 28);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 35);
      
      // Summary metrics
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("System Summary", 14, 45);
      
      const metrics = [
        ["Metric", "Value"],
        ["Total Farmers", String(report?.metrics?.farmers_total || report?.farmers_total || 0)],
        ["Total Operators", String(report?.metrics?.operators_total || report?.operators_total || 0)],
        ["Total Users", String(report?.metrics?.users_total || report?.active_status || 0)],
        ["New This Month", String(report?.metrics?.farmers_registered_this_month || report?.new_this_month || 0)],
        ["Pending Verification", String(report?.pending_verification || 0)]
      ];
      
      autoTable(doc, {
        startY: 50,
        head: [metrics[0]],
        body: metrics.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [21, 128, 61] }
      });
      
      // Farmers table
      doc.setFontSize(12);
      const finalY = (doc as any).lastAutoTable?.finalY || 100;
      doc.text(`Farmer Details (${farmers.length} records)`, 14, finalY + 10);
      
      const farmersData = farmers.map(f => [
        f.farmer_id,
        getFarmerName(f),
        getFarmerDistrict(f),
        getFarmerStatus(f),
        getFarmerDate(f)
      ]);
      
      autoTable(doc, {
        startY: finalY + 15,
        head: [["Farmer ID", "Name", "District", "Status", "Registered"]],
        body: farmersData,
        theme: 'striped',
        headStyles: { fillColor: [21, 128, 61] },
        styles: { fontSize: 8 }
      });
      
      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${pageCount} | Ministry of Agriculture`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }
      
      doc.save(`farmers-report-${new Date().toISOString().split('T')[0]}.pdf`);
    }
    setShowExportMenu(false);
  };

  const printReport = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Chiefdom Management Model - Farmer Report</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 30px; color: #333; }
    h1 { color: #15803d; border-bottom: 3px solid #15803d; padding-bottom: 10px; }
    h2 { color: #14532d; margin-top: 30px; }
    .summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
    .metric { background: #f0f9ff; padding: 15px; border-left: 4px solid #15803d; }
    .metric-label { font-size: 12px; font-weight: bold; color: #666; text-transform: uppercase; }
    .metric-value { font-size: 28px; font-weight: bold; color: #15803d; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background-color: #15803d; color: white; padding: 12px; text-align: left; font-size: 12px; }
    td { border-bottom: 1px solid #ddd; padding: 10px; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <h1>Chiefdom Management Model - Farmer Report</h1>
  <p style="color: #999;">Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
  
  <h2>System Summary</h2>
  <div class="summary">
    <div class="metric">
      <div class="metric-label">Total Farmers</div>
      <div class="metric-value">${report?.metrics?.farmers_total || report?.farmers_total || 0}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Total Operators</div>
      <div class="metric-value">${report?.metrics?.operators_total || report?.operators_total || 0}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Total Users</div>
      <div class="metric-value">${report?.metrics?.users_total || report?.active_status || 0}</div>
    </div>
    <div class="metric">
      <div class="metric-label">New This Month</div>
      <div class="metric-value">${report?.metrics?.farmers_registered_this_month || report?.new_this_month || 0}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Pending Verification</div>
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
    <p><strong>Chiefdom Management Model</strong> | Ministry of Agriculture</p>
  </div>
</body>
</html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/admin-dashboard")} className="text-green-700 hover:text-green-800 font-bold text-sm">
              ← BACK
            </button>
            <h1 className="text-2xl font-bold text-gray-800">📊 Reports & Analytics</h1>
          </div>

          {/* Compact Export Menu */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-3 rounded-lg transition text-sm flex items-center gap-1"
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
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 border-b border-gray-200"
                >
                  📋 PDF
                </button>
                <button
                  onClick={printReport}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                >
                  🖨️ Print
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 bg-orange-50 text-orange-700 px-4 py-3 rounded-lg text-sm border-l-4 border-orange-500">
            ⚠️ {error}
            <button onClick={() => setError(null)} className="ml-auto block text-xs hover:underline">Dismiss</button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600"></div>
            <p className="text-gray-600 mt-4">Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* Dashboard Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-600 hover:shadow-md transition">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Farmers</p>
                <h3 className="text-3xl font-bold text-gray-800 mt-2">
                  {report?.metrics?.farmers_total || report?.farmers_total || 0}
                </h3>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-600 hover:shadow-md transition">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Operators</p>
                <h3 className="text-3xl font-bold text-gray-800 mt-2">
                  {report?.metrics?.operators_total || report?.operators_total || 0}
                </h3>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-orange-600 hover:shadow-md transition">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">New This Month</p>
                <h3 className="text-3xl font-bold text-gray-800 mt-2">
                  {report?.metrics?.farmers_registered_this_month || report?.new_this_month || 0}
                </h3>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-600 hover:shadow-md transition">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Users</p>
                <h3 className="text-3xl font-bold text-gray-800 mt-2">
                  {report?.metrics?.users_total || report?.active_status || 0}
                </h3>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-600 hover:shadow-md transition">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Pending Verification</p>
                <h3 className="text-3xl font-bold text-gray-800 mt-2">
                  {report?.pending_verification || 0}
                </h3>
              </div>
            </div>

            {/* Farmer Details Table */}
            {farmers.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <p className="text-gray-600 text-lg">No farmer data available</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs">
                      <tr>
                        <th className="px-6 py-3">Farmer ID</th>
                        <th className="px-6 py-3">Name</th>
                        <th className="px-6 py-3">District</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Registered</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {farmers.map((f, idx) => (
                        <tr key={idx} className="hover:bg-green-50 transition">
                          <td className="px-6 py-4 font-mono font-bold text-xs">{f.farmer_id}</td>
                          <td className="px-6 py-4 font-bold">{getFarmerName(f)}</td>
                          <td className="px-6 py-4 text-sm">{getFarmerDistrict(f)}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                              getFarmerStatus(f) === "registered" || getFarmerStatus(f) === "verified" ? "bg-green-100 text-green-800" :
                              getFarmerStatus(f) === "pending" ? "bg-yellow-100 text-yellow-800" :
                              "bg-red-100 text-red-800"
                            }`}>
                              {getFarmerStatus(f)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">{getFarmerDate(f)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden divide-y divide-gray-200">
                  {farmers.map((f, idx) => (
                    <div key={idx} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-800 text-sm">{getFarmerName(f)}</h3>
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                          getFarmerStatus(f) === "registered" || getFarmerStatus(f) === "verified" ? "bg-green-100 text-green-800" :
                          getFarmerStatus(f) === "pending" ? "bg-yellow-100 text-yellow-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {getFarmerStatus(f)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-1"><strong>ID:</strong> {f.farmer_id}</p>
                      <p className="text-xs text-gray-600 mb-1"><strong>District:</strong> {getFarmerDistrict(f)}</p>
                      <p className="text-xs text-gray-600"><strong>Registered:</strong> {getFarmerDate(f)}</p>
                    </div>
                  ))}
                </div>

                {/* Pagination info */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
                  Showing {farmers.length} record{farmers.length !== 1 ? "s" : ""}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
