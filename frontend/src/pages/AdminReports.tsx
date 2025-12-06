import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "@/utils/axios";

interface Report {
  farmers_total: number;
  operators_total: number;
  new_this_month: number;
  active_status: number;
  pending_verification: number;
}

interface FarmerData {
  farmer_id: string;
  full_name: string;
  district: string;
  registered_on: string;
  status: string;
}

export default function AdminReports() {
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [farmers, setFarmers] = useState<FarmerData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "farmers" | "operators">("overview");

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/reports/dashboard");
      setReport(response.data);
      
      // Load farmer data
      const farmersResponse = await axios.get("/farmers?limit=100");
      setFarmers(farmersResponse.data.results || farmersResponse.data || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const csv = generateCSV();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportExcel = () => {
    let excel = "Farmer ID\tName\tDistrict\tStatus\tRegistered\n";
    farmers.forEach(f => {
      excel += `${f.farmer_id}\t${f.full_name}\t${f.district}\t${f.status}\t${f.registered_on}\n`;
    });
    const blob = new Blob([excel], { type: "application/vnd.ms-excel" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
  };

  const exportPDF = () => {
    const content = `
ZIAMIS Pro - Farmer Report
Generated: ${new Date().toLocaleDateString()}

System Summary:
- Total Farmers: ${report?.farmers_total}
- Total Operators: ${report?.operators_total}
- Active Users: ${report?.active_status}
- Pending Verification: ${report?.pending_verification}

Farmer Details:
${farmers.map(f => `${f.farmer_id} | ${f.full_name} | ${f.district} | ${f.status}`).join('\n')}
    `.trim();
    const blob = new Blob([content], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${new Date().toISOString().split('T')[0]}.pdf`;
    a.click();
  };

  const printReport = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write(`
<html>
<head>
  <title>ZIAMIS Pro - Farmer Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #15803d; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    th { background-color: #f0f0f0; font-weight: bold; }
  </style>
</head>
<body>
  <h1>ZIAMIS Pro - Farmer Report</h1>
  <p>Generated: ${new Date().toLocaleDateString()}</p>
  <h2>System Summary</h2>
  <ul>
    <li>Total Farmers: ${report?.farmers_total}</li>
    <li>Total Operators: ${report?.operators_total}</li>
    <li>Active Users: ${report?.active_status}</li>
    <li>Pending Verification: ${report?.pending_verification}</li>
  </ul>
  <h2>Farmer Details</h2>
  <table>
    <thead>
      <tr><th>Farmer ID</th><th>Name</th><th>District</th><th>Status</th><th>Registered</th></tr>
    </thead>
    <tbody>
      ${farmers.map(f => `<tr><td>${f.farmer_id}</td><td>${f.full_name}</td><td>${f.district}</td><td>${f.status}</td><td>${new Date(f.registered_on).toLocaleDateString()}</td></tr>`).join('')}
    </tbody>
  </table>
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
            <h1 className="text-2xl font-bold text-gray-800">📊 Reports</h1>
          </div>
          <button
            onClick={exportReport}
            className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-3 rounded-lg transition text-sm"
            title="Export as CSV"
          >
            📊 CSV
          </button>
          <button
            onClick={exportExcel}
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-3 rounded-lg transition text-sm"
            title="Export as Excel"
          >
            📈 EXCEL
          </button>
          <button
            onClick={exportPDF}
            className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-3 rounded-lg transition text-sm"
            title="Export as PDF"
          >
            📄 PDF
          </button>
          <button
            onClick={printReport}
            className="bg-orange-700 hover:bg-orange-800 text-white font-bold py-2 px-3 rounded-lg transition text-sm"
            title="Print Report"
          >
            🖨️ PRINT
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border-l-4 border-red-500">
            <strong>Error:</strong> {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600"></div>
            <p className="text-gray-600 mt-4">Loading reports...</p>
          </div>
        ) : (
          <>
            {/* Metrics Cards */}
            {report && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-green-600">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Farmers</p>
                  <h3 className="text-3xl font-bold text-gray-800 mt-1">{report.farmers_total}</h3>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-blue-600">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Operators</p>
                  <h3 className="text-3xl font-bold text-gray-800 mt-1">{report.operators_total}</h3>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-orange-500">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">New This Month</p>
                  <h3 className="text-3xl font-bold text-gray-800 mt-1">{report.new_this_month}</h3>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-purple-600">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Active</p>
                  <h3 className="text-3xl font-bold text-gray-800 mt-1">{report.active_status}</h3>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-yellow-500">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Pending</p>
                  <h3 className="text-3xl font-bold text-gray-800 mt-1">{report.pending_verification}</h3>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="mb-6 bg-white rounded-lg shadow-sm p-2 flex gap-2">
              {[
                { value: "overview", label: "📊 Overview" },
                { value: "farmers", label: "👨‍🌾 Farmers" },
                { value: "operators", label: "📋 Operators" }
              ].map(t => (
                <button
                  key={t.value}
                  onClick={() => setTab(t.value as any)}
                  className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition ${
                    tab === t.value ? "bg-green-700 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            {tab === "overview" && report && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-4 border-green-700">
                    System Summary
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Farmers:</span>
                      <span className="font-bold text-gray-800">{report.farmers_total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Operators:</span>
                      <span className="font-bold text-gray-800">{report.operators_total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">New This Month:</span>
                      <span className="font-bold text-orange-600">{report.new_this_month}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Active Users:</span>
                      <span className="font-bold text-green-600">{report.active_status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pending Verification:</span>
                      <span className="font-bold text-yellow-600">{report.pending_verification}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-4 border-blue-600">
                    Quick Actions
                  </h2>
                  <div className="space-y-3">
                    <button
                      onClick={exportReport}
                      className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <span>⬇️</span> Export Report
                    </button>
                    <button
                      onClick={() => navigate("/admin-dashboard")}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <span>📊</span> Dashboard
                    </button>
                    <button
                      onClick={() => navigate("/admin/supply-requests")}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <span>📦</span> Supply Requests
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === "farmers" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs">
                      <tr>
                        <th className="px-6 py-3">Farmer ID</th>
                        <th className="px-6 py-3">Name</th>
                        <th className="px-6 py-3">District</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {farmers.map(f => (
                        <tr key={f.farmer_id} className="hover:bg-green-50 transition">
                          <td className="px-6 py-4 font-mono font-bold">{f.farmer_id}</td>
                          <td className="px-6 py-4 font-bold">{f.full_name}</td>
                          <td className="px-6 py-4">{f.district}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                              f.status === "active" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                            }`}>
                              {f.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs">{new Date(f.registered_on).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden divide-y divide-gray-200">
                  {farmers.map(f => (
                    <div key={f.farmer_id} className="p-4 hover:bg-green-50 transition">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-800">{f.full_name}</h3>
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                          f.status === "active" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {f.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600"><strong>ID:</strong> {f.farmer_id}</p>
                      <p className="text-xs text-gray-600"><strong>District:</strong> {f.district}</p>
                      <p className="text-xs text-gray-600"><strong>Registered:</strong> {new Date(f.registered_on).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "operators" && (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <p className="text-gray-600">📋 Operator statistics coming soon...</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
