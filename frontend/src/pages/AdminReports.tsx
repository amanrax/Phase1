// frontend/src/pages/AdminReports.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import axios from "@/utils/axios";

interface DashboardMetrics {
  farmers_total: number;
  operators_total: number;
  users_total: number;
  farmers_registered_this_month: number;
}

interface RegionData {
  province: string;
  district: string;
  farmer_count: number;
}

interface OperatorPerformance {
  operator_id: string;
  operator_name: string;
  email: string;
  total_farmers: number;
  recent_farmers_30d: number;
}

interface ActivityTrend {
  date: string;
  registrations: number;
}

interface FarmerDetail {
  farmer_id: string;
  full_name: string;
  nrc_number: string;
  phone_primary: string;
  phone_secondary: string;
  gender: string;
  date_of_birth: string;
  province: string;
  district: string;
  constituency: string;
  ward: string;
  village: string;
  total_land_size: number;
  crops: string;
  years_farming: number;
  registration_status: string;
  registered_by: string;
  registration_date: string;
}

type ReportType = "summary" | "regional" | "operator" | "activity" | "farmers";

export default function AdminReports() {
  const navigate = useNavigate();
  
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [regions, setRegions] = useState<RegionData[]>([]);
  const [operators, setOperators] = useState<OperatorPerformance[]>([]);
  const [trends, setTrends] = useState<ActivityTrend[]>([]);
  const [farmerDetails, setFarmerDetails] = useState<FarmerDetail[]>([]);

  useEffect(() => {
    if (selectedReport) {
      loadReportData(selectedReport);
    }
  }, [selectedReport]);

  const loadReportData = async (reportType: ReportType) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Loading ${reportType} report...`);
      
      switch (reportType) {
        case "summary":
          const dashboardRes = await axios.get("/reports/dashboard");
          setMetrics(dashboardRes.data.metrics);
          break;
        case "regional":
          const regionsRes = await axios.get("/reports/farmers-by-region");
          setRegions(regionsRes.data.regions || []);
          break;
        case "operator":
          const operatorsRes = await axios.get("/reports/operator-performance");
          setOperators(operatorsRes.data.operators || []);
          break;
        case "activity":
          const trendsRes = await axios.get("/reports/activity-trends");
          setTrends(trendsRes.data.trends || []);
          break;
        case "farmers":
          const farmersRes = await axios.get("/reports/farmers-details");
          setFarmerDetails(farmersRes.data.farmers || []);
          break;
      }
    } catch (error: unknown) {
      console.error("Failed to load report:", error);
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      const errorMessage = err.response?.data?.detail || err.message || "Unknown error";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = (data: unknown[], filename: string, sheetName: string) => {
    if (data.length === 0) {
      alert("No data to export");
      return;
    }

    // Create CSV content with proper Excel formatting
    const headers = Object.keys(data[0] as Record<string, unknown>);
    const csvContent = [
      headers.join(","),
      ...data.map(row => 
        headers.map(header => {
          const value = (row as Record<string, unknown>)[header];
          // Properly escape values for Excel
          if (value === null || value === undefined) return "";
          const stringValue = String(value);
          // Wrap in quotes if contains comma, newline, or quote
          if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(",")
      )
    ].join("\r\n");

    // Add BOM for proper Excel UTF-8 handling
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const exportToPDF = async () => {
    const printContent = document.getElementById("printable-report");
    if (!printContent) {
      alert("Report content not found");
      return;
    }

    // Create a new window for printing
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to export PDF");
      return;
    }

    // Get report title
    const reportTitle = reportCards.find(c => c.type === selectedReport)?.title || "Report";
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle}</title>
          <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
          <style>
            body {
              font-family: 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
              padding: 20px;
              background: white;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              padding: 12px;
              text-align: left;
              border-bottom: 1px solid #e5e7eb;
            }
            th {
              background: #f9fafb;
              font-weight: bold;
              font-size: 12px;
              text-transform: uppercase;
              color: #374151;
            }
            tfoot {
              background: #f9fafb;
              border-top: 3px solid #e5e7eb;
              font-weight: bold;
            }
            h2 {
              color: #1f2937;
              border-bottom: 3px solid #15803d;
              padding-bottom: 12px;
              margin-bottom: 24px;
            }
            .metric-card {
              display: inline-block;
              padding: 20px;
              background: #f9fafb;
              border-radius: 8px;
              margin: 10px;
              min-width: 200px;
            }
            .metric-label {
              font-size: 12px;
              color: #6b7280;
              text-transform: uppercase;
              font-weight: bold;
            }
            .metric-value {
              font-size: 32px;
              font-weight: bold;
              color: #1f2937;
              margin-top: 8px;
            }
            @media print {
              body { margin: 0; padding: 15px; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const exportToJSON = (data: unknown, filename: string) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
  };

  const reportCards = [
    {
      type: "summary" as ReportType,
      title: "System Summary Report",
      description: "Overview of total farmers, operators, and monthly registrations",
      icon: "fa-chart-pie",
      color: "#15803d"
    },
    {
      type: "regional" as ReportType,
      title: "Regional Distribution Report",
      description: "Farmer distribution across provinces and districts",
      icon: "fa-map-location-dot",
      color: "#2563eb"
    },
    {
      type: "operator" as ReportType,
      title: "Operator Performance Report",
      description: "Individual operator statistics and recent activity",
      icon: "fa-user-tie",
      color: "#7c3aed"
    },
    {
      type: "activity" as ReportType,
      title: "Activity Trends Report",
      description: "Daily registration patterns over the past 14 days",
      icon: "fa-chart-line",
      color: "#c2410c"
    },
    {
      type: "farmers" as ReportType,
      title: "Farmer Details Report",
      description: "Complete list of all registered farmers with contact and farm information",
      icon: "fa-users",
      color: "#059669"
    }
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Sidebar */}
      <div style={{ position: "fixed", top: 0, left: 0, width: "16rem", height: "100vh", background: "#1f2937", zIndex: 50 }}>
        <div style={{ background: "#15803d", height: "64px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "white" }}>🌾 ZIAMIS</h1>
        </div>

        <nav style={{ padding: "24px 0" }}>
          <div style={{ padding: "0 16px", marginBottom: "8px", fontSize: "12px", fontWeight: "bold", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            NAVIGATION
          </div>
          
          <div
            onClick={() => navigate("/admin-dashboard")}
            style={{ display: "flex", alignItems: "center", padding: "12px 16px", color: "#d1d5db", cursor: "pointer", transition: "all 0.2s", borderLeft: "4px solid transparent" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#16a34a";
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#d1d5db";
            }}
          >
            <i className="fa-solid fa-arrow-left" style={{ marginRight: "12px" }}></i>
            <span>Back to Dashboard</span>
          </div>

          <div
            style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: "#16a34a", color: "white", borderLeft: "4px solid #c2410c" }}
          >
            <i className="fa-solid fa-file-lines" style={{ marginRight: "12px" }}></i>
            <span>Reports</span>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ marginLeft: "16rem", padding: "24px" }}>
        {/* Header */}
        <div style={{ background: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#1f2937", marginBottom: "8px" }}>
                📑 Reports & Analytics
              </h1>
              <p style={{ color: "#6b7280" }}>Generate and export comprehensive system reports</p>
            </div>
            {selectedReport && (
              <button
                onClick={() => setSelectedReport(null)}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: "white",
                  color: "#374151",
                  transition: "all 0.3s",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "#f9fafb";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "white";
                }}
              >
                <i className="fa-solid fa-arrow-left"></i>
                Back to Reports
              </button>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{ 
            background: "#fef2f2", 
            border: "1px solid #fecaca", 
            borderRadius: "12px", 
            padding: "16px 20px", 
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <i className="fa-solid fa-circle-exclamation" style={{ color: "#dc2626", fontSize: "20px" }}></i>
              <div>
                <p style={{ fontWeight: "600", color: "#991b1b", marginBottom: "4px" }}>Error Loading Report</p>
                <p style={{ fontSize: "14px", color: "#dc2626" }}>{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "20px" }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}

        {/* Report Selection */}
        {!selectedReport && (
          <div>
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#1f2937", marginBottom: "8px" }}>
                Select a Report Type
              </h2>
              <p style={{ fontSize: "14px", color: "#6b7280" }}>
                Choose a report to view detailed analytics and export data in multiple formats
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
              {reportCards.map((card) => (
                <div
                  key={card.type}
                  onClick={() => setSelectedReport(card.type)}
                  style={{
                    background: "white",
                    padding: "32px 24px",
                    borderRadius: "12px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    cursor: "pointer",
                    transition: "all 0.3s",
                    border: "2px solid transparent"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.15)";
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.borderColor = card.color;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = "transparent";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "16px" }}>
                    <div style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px",
                      color: "white",
                      background: card.color,
                      flexShrink: 0
                    }}>
                      <i className={`fa-solid ${card.icon}`}></i>
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#1f2937", marginBottom: "8px" }}>
                        {card.title}
                      </h3>
                      <p style={{ fontSize: "14px", color: "#6b7280", lineHeight: "1.5" }}>
                        {card.description}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "16px", borderTop: "1px solid #f3f4f6" }}>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: card.color }}>
                      Generate Report
                    </span>
                    <i className="fa-solid fa-arrow-right" style={{ color: card.color }}></i>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Report Content */}
        {selectedReport && (
          <div>
            {loading ? (
              <div style={{ textAlign: "center", padding: "80px 20px" }}>
                <div style={{
                  display: "inline-block",
                  width: "64px",
                  height: "64px",
                  border: "4px solid rgba(21, 128, 61, 0.3)",
                  borderTop: "4px solid #15803d",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }}></div>
                <p style={{ marginTop: "20px", fontSize: "18px", color: "#6b7280" }}>Generating report...</p>
              </div>
            ) : (
              <>
                {/* Export Actions */}
                <div style={{ background: "white", padding: "20px 24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                    <div>
                      <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#1f2937" }}>
                        {reportCards.find(c => c.type === selectedReport)?.title}
                      </h3>
                      <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                        Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                      <button
                        onClick={exportToPDF}
                        style={{
                          padding: "10px 16px",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontWeight: "600",
                          cursor: "pointer",
                          background: "#dc2626",
                          color: "white",
                          transition: "all 0.2s",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = "#b91c1c"}
                        onMouseOut={(e) => e.currentTarget.style.background = "#dc2626"}
                      >
                        <i className="fa-solid fa-file-pdf"></i>
                        Export PDF
                      </button>
                      <button
                        onClick={() => {
                          if (selectedReport === "summary" && metrics) {
                            exportToExcel([metrics], "summary_report", "Summary");
                          } else if (selectedReport === "regional") {
                            exportToExcel(regions, "regional_report", "Regional Data");
                          } else if (selectedReport === "operator") {
                            exportToExcel(operators, "operator_performance", "Operator Performance");
                          } else if (selectedReport === "activity") {
                            exportToExcel(trends, "activity_trends", "Activity Trends");
                          } else if (selectedReport === "farmers") {
                            exportToExcel(farmerDetails, "farmer_details", "Farmer Details");
                          }
                        }}
                        style={{
                          padding: "10px 16px",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontWeight: "600",
                          cursor: "pointer",
                          background: "#16a34a",
                          color: "white",
                          transition: "all 0.2s",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = "#15803d"}
                        onMouseOut={(e) => e.currentTarget.style.background = "#16a34a"}
                      >
                        <i className="fa-solid fa-file-excel"></i>
                        Export Excel
                      </button>
                      <button
                        onClick={() => {
                          if (selectedReport === "summary" && metrics) {
                            exportToJSON(metrics, "summary_report");
                          } else if (selectedReport === "regional") {
                            exportToJSON(regions, "regional_report");
                          } else if (selectedReport === "operator") {
                            exportToJSON(operators, "operator_performance");
                          } else if (selectedReport === "activity") {
                            exportToJSON(trends, "activity_trends");
                          } else if (selectedReport === "farmers") {
                            exportToJSON(farmerDetails, "farmer_details");
                          }
                        }}
                        style={{
                          padding: "10px 16px",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontWeight: "600",
                          cursor: "pointer",
                          background: "#2563eb",
                          color: "white",
                          transition: "all 0.2s",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = "#1d4ed8"}
                        onMouseOut={(e) => e.currentTarget.style.background = "#2563eb"}
                      >
                        <i className="fa-solid fa-code"></i>
                        Export JSON
                      </button>
                    </div>
                  </div>
                </div>

                {/* Report Data Display */}
                <div style={{ background: "white", padding: "32px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }} id="printable-report">
                  {selectedReport === "summary" && metrics && (
                    <div>
                      <div style={{ marginBottom: "32px", paddingBottom: "16px", borderBottom: "3px solid #15803d" }}>
                        <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#1f2937" }}>
                          System Summary Report
                        </h2>
                        <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "8px" }}>
                          Complete overview of system statistics and registrations
                        </p>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "24px" }}>
                        <div style={{ padding: "24px", background: "#f9fafb", borderRadius: "8px", borderLeft: "4px solid #15803d" }}>
                          <p style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase", fontWeight: "bold", marginBottom: "8px" }}>Total Farmers</p>
                          <p style={{ fontSize: "36px", fontWeight: "bold", color: "#1f2937" }}>{metrics.farmers_total.toLocaleString()}</p>
                        </div>
                        <div style={{ padding: "24px", background: "#f9fafb", borderRadius: "8px", borderLeft: "4px solid #2563eb" }}>
                          <p style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase", fontWeight: "bold", marginBottom: "8px" }}>Total Operators</p>
                          <p style={{ fontSize: "36px", fontWeight: "bold", color: "#1f2937" }}>{metrics.operators_total}</p>
                        </div>
                        <div style={{ padding: "24px", background: "#f9fafb", borderRadius: "8px", borderLeft: "4px solid #c2410c" }}>
                          <p style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase", fontWeight: "bold", marginBottom: "8px" }}>Registered This Month</p>
                          <p style={{ fontSize: "36px", fontWeight: "bold", color: "#1f2937" }}>{metrics.farmers_registered_this_month}</p>
                        </div>
                        <div style={{ padding: "24px", background: "#f9fafb", borderRadius: "8px", borderLeft: "4px solid #7c3aed" }}>
                          <p style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase", fontWeight: "bold", marginBottom: "8px" }}>Total System Users</p>
                          <p style={{ fontSize: "36px", fontWeight: "bold", color: "#1f2937" }}>{metrics.users_total}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedReport === "regional" && (
                    <div>
                      <div style={{ marginBottom: "32px", paddingBottom: "16px", borderBottom: "3px solid #2563eb" }}>
                        <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#1f2937" }}>
                          Regional Distribution Report
                        </h2>
                        <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "8px" }}>
                          Farmer distribution by province and district
                        </p>
                      </div>
                      {regions.length === 0 ? (
                        <p style={{ textAlign: "center", padding: "40px", color: "#6b7280", fontSize: "16px" }}>No regional data available</p>
                      ) : (
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
                            <thead style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                              <tr>
                                <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: "bold", color: "#374151", fontSize: "13px", textTransform: "uppercase" }}>Province</th>
                                <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: "bold", color: "#374151", fontSize: "13px", textTransform: "uppercase" }}>District</th>
                                <th style={{ padding: "14px 16px", textAlign: "right", fontWeight: "bold", color: "#374151", fontSize: "13px", textTransform: "uppercase" }}>Farmer Count</th>
                              </tr>
                            </thead>
                            <tbody>
                              {regions.sort((a, b) => b.farmer_count - a.farmer_count).map((region, idx) => (
                                <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                  <td style={{ padding: "14px 16px", color: "#1f2937", fontWeight: "500" }}>{region.province || "Unknown"}</td>
                                  <td style={{ padding: "14px 16px", color: "#6b7280" }}>{region.district || "Unknown"}</td>
                                  <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: "bold", color: "#15803d", fontSize: "16px" }}>{region.farmer_count}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot style={{ background: "#f9fafb", borderTop: "3px solid #e5e7eb" }}>
                              <tr>
                                <td colSpan={2} style={{ padding: "14px 16px", fontWeight: "bold", color: "#1f2937", fontSize: "15px" }}>TOTAL FARMERS</td>
                                <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: "bold", color: "#15803d", fontSize: "18px" }}>
                                  {regions.reduce((sum, r) => sum + r.farmer_count, 0).toLocaleString()}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedReport === "operator" && (
                    <div>
                      <div style={{ marginBottom: "32px", paddingBottom: "16px", borderBottom: "3px solid #7c3aed" }}>
                        <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#1f2937" }}>
                          Operator Performance Report
                        </h2>
                        <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "8px" }}>
                          Individual operator registration statistics and recent activity
                        </p>
                      </div>
                      {operators.length === 0 ? (
                        <p style={{ textAlign: "center", padding: "40px", color: "#6b7280", fontSize: "16px" }}>No operator data available</p>
                      ) : (
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
                            <thead style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                              <tr>
                                <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: "bold", color: "#374151", fontSize: "13px", textTransform: "uppercase" }}>Operator Name</th>
                                <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: "bold", color: "#374151", fontSize: "13px", textTransform: "uppercase" }}>Email Address</th>
                                <th style={{ padding: "14px 16px", textAlign: "right", fontWeight: "bold", color: "#374151", fontSize: "13px", textTransform: "uppercase" }}>Total Farmers</th>
                                <th style={{ padding: "14px 16px", textAlign: "right", fontWeight: "bold", color: "#374151", fontSize: "13px", textTransform: "uppercase" }}>Last 30 Days</th>
                              </tr>
                            </thead>
                            <tbody>
                              {operators.sort((a, b) => b.total_farmers - a.total_farmers).map((op, idx) => (
                                <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                  <td style={{ padding: "14px 16px", color: "#1f2937", fontWeight: "600" }}>{op.operator_name}</td>
                                  <td style={{ padding: "14px 16px", color: "#6b7280" }}>{op.email || "-"}</td>
                                  <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: "bold", color: "#15803d", fontSize: "16px" }}>{op.total_farmers}</td>
                                  <td style={{ padding: "14px 16px", textAlign: "right", color: "#6b7280", fontWeight: "500" }}>{op.recent_farmers_30d}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot style={{ background: "#f9fafb", borderTop: "3px solid #e5e7eb" }}>
                              <tr>
                                <td colSpan={2} style={{ padding: "14px 16px", fontWeight: "bold", color: "#1f2937", fontSize: "15px" }}>TOTAL</td>
                                <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: "bold", color: "#15803d", fontSize: "18px" }}>
                                  {operators.reduce((sum, o) => sum + o.total_farmers, 0).toLocaleString()}
                                </td>
                                <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: "bold", color: "#6b7280", fontSize: "16px" }}>
                                  {operators.reduce((sum, o) => sum + o.recent_farmers_30d, 0)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedReport === "activity" && (
                    <div>
                      <div style={{ marginBottom: "32px", paddingBottom: "16px", borderBottom: "3px solid #c2410c" }}>
                        <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#1f2937" }}>
                          Activity Trends Report (Last 14 Days)
                        </h2>
                        <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "8px" }}>
                          Daily farmer registration patterns and activity levels
                        </p>
                      </div>
                      {trends.length === 0 ? (
                        <p style={{ textAlign: "center", padding: "40px", color: "#6b7280", fontSize: "16px" }}>No activity data available</p>
                      ) : (
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
                            <thead style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                              <tr>
                                <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: "bold", color: "#374151", fontSize: "13px", textTransform: "uppercase" }}>Date</th>
                                <th style={{ padding: "14px 16px", textAlign: "right", fontWeight: "bold", color: "#374151", fontSize: "13px", textTransform: "uppercase" }}>Registrations</th>
                                <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: "bold", color: "#374151", fontSize: "13px", textTransform: "uppercase" }}>Activity Level</th>
                              </tr>
                            </thead>
                            <tbody>
                              {trends.map((trend, idx) => {
                                const maxReg = Math.max(...trends.map(t => t.registrations), 1);
                                const percentage = (trend.registrations / maxReg) * 100;
                                return (
                                  <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                    <td style={{ padding: "14px 16px", color: "#1f2937", fontWeight: "500" }}>{trend.date}</td>
                                    <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: "bold", color: "#15803d", fontSize: "16px" }}>{trend.registrations}</td>
                                    <td style={{ padding: "14px 16px" }}>
                                      <div style={{ background: "#f3f4f6", borderRadius: "4px", height: "24px", width: "100%", maxWidth: "400px" }}>
                                        <div style={{
                                          width: `${percentage}%`,
                                          background: "linear-gradient(90deg, #15803d, #16a34a)",
                                          height: "100%",
                                          borderRadius: "4px",
                                          minWidth: percentage > 0 ? "20px" : "0"
                                        }}></div>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot style={{ background: "#f9fafb", borderTop: "3px solid #e5e7eb" }}>
                              <tr>
                                <td style={{ padding: "14px 16px", fontWeight: "bold", color: "#1f2937", fontSize: "15px" }}>TOTAL</td>
                                <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: "bold", color: "#15803d", fontSize: "18px" }}>
                                  {trends.reduce((sum, t) => sum + t.registrations, 0).toLocaleString()}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedReport === "farmers" && (
                    <div>
                      <div style={{ marginBottom: "32px", paddingBottom: "16px", borderBottom: "3px solid #059669" }}>
                        <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#1f2937" }}>
                          Farmer Details Report
                        </h2>
                        <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "8px" }}>
                          Complete list of all registered farmers with contact and farm details
                        </p>
                      </div>
                      {farmerDetails.length === 0 ? (
                        <p style={{ textAlign: "center", padding: "40px", color: "#6b7280", fontSize: "16px" }}>No farmer data available</p>
                      ) : (
                        <>
                          <div style={{ marginBottom: "24px", padding: "16px", background: "#f0fdf4", borderRadius: "8px", borderLeft: "4px solid #059669" }}>
                            <p style={{ fontSize: "14px", fontWeight: "bold", color: "#047857" }}>
                              <i className="fa-solid fa-users" style={{ marginRight: "8px" }}></i>
                              Total Farmers: {farmerDetails.length.toLocaleString()}
                            </p>
                          </div>
                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                              <thead style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                                <tr>
                                  <th style={{ padding: "12px", textAlign: "left", fontWeight: "bold", color: "#374151", fontSize: "12px", textTransform: "uppercase" }}>Farmer ID</th>
                                  <th style={{ padding: "12px", textAlign: "left", fontWeight: "bold", color: "#374151", fontSize: "12px", textTransform: "uppercase" }}>Full Name</th>
                                  <th style={{ padding: "12px", textAlign: "left", fontWeight: "bold", color: "#374151", fontSize: "12px", textTransform: "uppercase" }}>NRC Number</th>
                                  <th style={{ padding: "12px", textAlign: "left", fontWeight: "bold", color: "#374151", fontSize: "12px", textTransform: "uppercase" }}>Phone</th>
                                  <th style={{ padding: "12px", textAlign: "left", fontWeight: "bold", color: "#374151", fontSize: "12px", textTransform: "uppercase" }}>Gender</th>
                                  <th style={{ padding: "12px", textAlign: "left", fontWeight: "bold", color: "#374151", fontSize: "12px", textTransform: "uppercase" }}>District</th>
                                  <th style={{ padding: "12px", textAlign: "left", fontWeight: "bold", color: "#374151", fontSize: "12px", textTransform: "uppercase" }}>Village</th>
                                  <th style={{ padding: "12px", textAlign: "left", fontWeight: "bold", color: "#374151", fontSize: "12px", textTransform: "uppercase" }}>Land (ha)</th>
                                  <th style={{ padding: "12px", textAlign: "left", fontWeight: "bold", color: "#374151", fontSize: "12px", textTransform: "uppercase" }}>Crops</th>
                                  <th style={{ padding: "12px", textAlign: "left", fontWeight: "bold", color: "#374151", fontSize: "12px", textTransform: "uppercase" }}>Status</th>
                                  <th style={{ padding: "12px", textAlign: "left", fontWeight: "bold", color: "#374151", fontSize: "12px", textTransform: "uppercase" }}>Registered</th>
                                </tr>
                              </thead>
                              <tbody>
                                {farmerDetails.map((farmer, idx) => (
                                  <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                    <td style={{ padding: "12px", color: "#059669", fontWeight: "600", fontSize: "12px" }}>{farmer.farmer_id}</td>
                                    <td style={{ padding: "12px", color: "#1f2937", fontWeight: "500" }}>{farmer.full_name}</td>
                                    <td style={{ padding: "12px", color: "#6b7280" }}>{farmer.nrc_number || "-"}</td>
                                    <td style={{ padding: "12px", color: "#6b7280" }}>{farmer.phone_primary || "-"}</td>
                                    <td style={{ padding: "12px", color: "#6b7280" }}>{farmer.gender || "-"}</td>
                                    <td style={{ padding: "12px", color: "#6b7280" }}>{farmer.district || "-"}</td>
                                    <td style={{ padding: "12px", color: "#6b7280" }}>{farmer.village || "-"}</td>
                                    <td style={{ padding: "12px", color: "#6b7280", textAlign: "right" }}>{farmer.total_land_size || 0}</td>
                                    <td style={{ padding: "12px", color: "#6b7280", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={farmer.crops}>{farmer.crops || "None"}</td>
                                    <td style={{ padding: "12px" }}>
                                      <span style={{
                                        padding: "4px 8px",
                                        borderRadius: "12px",
                                        fontSize: "11px",
                                        fontWeight: "600",
                                        background: farmer.registration_status === "APPROVED" || farmer.registration_status === "verified" ? "#dcfce7" : farmer.registration_status === "PENDING" || farmer.registration_status === "pending" ? "#fef3c7" : "#fee2e2",
                                        color: farmer.registration_status === "APPROVED" || farmer.registration_status === "verified" ? "#166534" : farmer.registration_status === "PENDING" || farmer.registration_status === "pending" ? "#92400e" : "#991b1b"
                                      }}>
                                        {farmer.registration_status || "Unknown"}
                                      </span>
                                    </td>
                                    <td style={{ padding: "12px", color: "#6b7280", fontSize: "12px" }}>{farmer.registration_date || "-"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @media print {
            body { background: white !important; }
            nav, .no-print, button { display: none !important; }
            #printable-report { box-shadow: none !important; }
          }
        `}
      </style>
    </div>
  );
}
