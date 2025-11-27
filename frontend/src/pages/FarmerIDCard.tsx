import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import { farmerService } from "@/services/farmer.service";

interface Farmer {
  farmer_id: string;
  personal_info: {
    first_name: string;
    last_name: string;
    phone_primary: string;
    email?: string;
    nrc?: string;
    date_of_birth?: string;
    gender?: string;
  };
  address: {
    province_name?: string;
    district_name?: string;
    chiefdom_name?: string;
    village?: string;
  };
  farm_info?: {
    farm_size_hectares?: number;
    crops_grown?: string[];
    livestock?: string;
    has_irrigation?: boolean;
  };
  photos?: {
    profile?: string;
  };
  id_card_path?: string;
  id_card_generated_at?: string;
  qr_code_path?: string;
  created_at?: string;
  status?: string;
}

interface QRData {
  farmer_id: string;
  name: string;
  phone: string;
  district: string;
  farm_size: number;
}

const FarmerIDCard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadFarmerData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFarmerData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get farmer_id from user object
      const farmerId = user?.farmer_id || user?.username;
      
      if (!farmerId) {
        setError("Farmer ID not found. Please contact support.");
        setLoading(false);
        return;
      }

      const data = await farmerService.getFarmer(farmerId);
      setFarmer(data);
    } catch (err: unknown) {
      console.error("Error loading farmer data:", err);
      const error = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(error.response?.data?.detail || error.message || "Failed to load farmer data");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateIDCard = async () => {
    if (!farmer) return;

    try {
      setGenerating(true);
      setError(null);
      setSuccessMessage(null);

      await farmerService.generateIDCard(farmer.farmer_id);

      setSuccessMessage(
        "ID card generation started! Please wait a few moments, then refresh the page to download."
      );

      // Auto-refresh after 5 seconds
      setTimeout(() => {
        loadFarmerData();
      }, 5000);
    } catch (err: unknown) {
      console.error("Error generating ID card:", err);
      const error = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(error.response?.data?.detail || error.message || "Failed to generate ID card");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadIDCard = async () => {
    if (!farmer) return;

    try {
      setError(null);
      await farmerService.downloadIDCard(farmer.farmer_id);
      setSuccessMessage("ID card downloaded successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error("Error downloading ID card:", err);
      const error = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(error.response?.data?.detail || error.message || "Failed to download ID card");
    }
  };

  const handleViewIDCard = async () => {
    if (!farmer) return;

    try {
      setError(null);
      await farmerService.viewIDCard(farmer.farmer_id);
    } catch (err: unknown) {
      console.error("Error viewing ID card:", err);
      const error = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(error.response?.data?.detail || error.message || "Failed to view ID card");
    }
  };

  const getQRData = (): QRData | null => {
    if (!farmer) return null;

    return {
      farmer_id: farmer.farmer_id,
      name: `${farmer.personal_info?.first_name || ""} ${farmer.personal_info?.last_name || ""}`.trim(),
      phone: farmer.personal_info?.phone_primary || "",
      district: farmer.address?.district_name || "",
      farm_size: farmer.farm_info?.farm_size_hectares || 0,
    };
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadgeStyle = (status?: string) => {
    const baseStyle: React.CSSProperties = {
      display: "inline-block",
      padding: "4px 12px",
      borderRadius: "12px",
      fontSize: "12px",
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    };

    switch (status?.toLowerCase()) {
      case "verified":
      case "approved":
        return {
          ...baseStyle,
          backgroundColor: "#d4edda",
          color: "#155724",
        };
      case "pending":
        return {
          ...baseStyle,
          backgroundColor: "#fff3cd",
          color: "#856404",
        };
      case "rejected":
        return {
          ...baseStyle,
          backgroundColor: "#f8d7da",
          color: "#721c24",
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: "#e2e3e5",
          color: "#383d41",
        };
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "15px",
            padding: "40px",
            textAlign: "center",
            boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
          }}
        >
          <div
            style={{
              width: "50px",
              height: "50px",
              border: "4px solid #f3f3f3",
              borderTop: "4px solid #667eea",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 20px",
            }}
          />
          <p style={{ color: "#666", fontSize: "16px" }}>Loading farmer data...</p>
        </div>
      </div>
    );
  }

  if (error && !farmer) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "15px",
            padding: "40px",
            textAlign: "center",
            maxWidth: "500px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>❌</div>
          <h2 style={{ color: "#dc3545", marginBottom: "15px" }}>Error</h2>
          <p style={{ color: "#666", marginBottom: "25px" }}>{error}</p>
          <button
            onClick={() => navigate("/farmer-dashboard")}
            style={{
              padding: "12px 30px",
              backgroundColor: "#667eea",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#5568d3";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#667eea";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const qrData = getQRData();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "40px 20px",
      }}
    >
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        `}
      </style>

      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "40px",
            animation: "fadeIn 0.6s ease-out",
          }}
        >
          <h1
            style={{
              color: "white",
              fontSize: "42px",
              fontWeight: "700",
              marginBottom: "10px",
              textShadow: "2px 2px 4px rgba(0,0,0,0.2)",
            }}
          >
            🌾 Farmer ID Card
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.9)",
              fontSize: "18px",
              fontWeight: "400",
            }}
          >
            Generate, View, and Download Your Digital Farmer ID
          </p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div
            style={{
              background: "#f8d7da",
              border: "1px solid #f5c6cb",
              borderRadius: "8px",
              padding: "15px 20px",
              marginBottom: "20px",
              color: "#721c24",
              animation: "fadeIn 0.3s ease-out",
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {successMessage && (
          <div
            style={{
              background: "#d4edda",
              border: "1px solid #c3e6cb",
              borderRadius: "8px",
              padding: "15px 20px",
              marginBottom: "20px",
              color: "#155724",
              animation: "fadeIn 0.3s ease-out",
            }}
          >
            <strong>Success:</strong> {successMessage}
          </div>
        )}

        {/* Main Content Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "30px",
            animation: "fadeIn 0.6s ease-out 0.2s backwards",
          }}
        >
          {/* Farmer Information Card */}
          <div
            style={{
              background: "white",
              borderRadius: "15px",
              padding: "30px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            }}
          >
            <h2
              style={{
                color: "#333",
                fontSize: "24px",
                fontWeight: "700",
                marginBottom: "20px",
                borderBottom: "3px solid #667eea",
                paddingBottom: "10px",
              }}
            >
              📋 Farmer Information
            </h2>

            {/* Profile Photo */}
            {farmer?.photos?.profile && (
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <img
                  src={farmer.photos.profile}
                  alt="Profile"
                  style={{
                    width: "120px",
                    height: "120px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "4px solid #667eea",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: "25px" }}>
              <label
                style={{
                  display: "block",
                  color: "#666",
                  fontSize: "12px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  marginBottom: "5px",
                  letterSpacing: "0.5px",
                }}
              >
                Farmer ID
              </label>
              <p
                style={{
                  color: "#333",
                  fontSize: "18px",
                  fontWeight: "700",
                  fontFamily: "monospace",
                  backgroundColor: "#f8f9fa",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "2px solid #667eea",
                }}
              >
                {farmer?.farmer_id || "N/A"}
              </p>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label
                style={{
                  display: "block",
                  color: "#666",
                  fontSize: "12px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  marginBottom: "5px",
                }}
              >
                Full Name
              </label>
              <p style={{ color: "#333", fontSize: "16px", fontWeight: "500" }}>
                {farmer?.personal_info?.first_name || ""}{" "}
                {farmer?.personal_info?.last_name || ""}
              </p>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label
                style={{
                  display: "block",
                  color: "#666",
                  fontSize: "12px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  marginBottom: "5px",
                }}
              >
                Phone Number
              </label>
              <p style={{ color: "#333", fontSize: "16px" }}>
                {farmer?.personal_info?.phone_primary || "N/A"}
              </p>
            </div>

            {farmer?.personal_info?.nrc && (
              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    color: "#666",
                    fontSize: "12px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    marginBottom: "5px",
                  }}
                >
                  NRC Number
                </label>
                <p style={{ color: "#333", fontSize: "16px" }}>
                  {farmer.personal_info.nrc}
                </p>
              </div>
            )}

            <div style={{ marginBottom: "15px" }}>
              <label
                style={{
                  display: "block",
                  color: "#666",
                  fontSize: "12px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  marginBottom: "5px",
                }}
              >
                District
              </label>
              <p style={{ color: "#333", fontSize: "16px" }}>
                {farmer?.address?.district_name || "N/A"}
              </p>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label
                style={{
                  display: "block",
                  color: "#666",
                  fontSize: "12px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  marginBottom: "5px",
                }}
              >
                Province
              </label>
              <p style={{ color: "#333", fontSize: "16px" }}>
                {farmer?.address?.province_name || "N/A"}
              </p>
            </div>

            {farmer?.farm_info?.farm_size_hectares && (
              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    color: "#666",
                    fontSize: "12px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    marginBottom: "5px",
                  }}
                >
                  Farm Size
                </label>
                <p style={{ color: "#333", fontSize: "16px" }}>
                  {farmer.farm_info.farm_size_hectares} hectares
                </p>
              </div>
            )}

            {farmer?.farm_info?.crops_grown &&
              farmer.farm_info.crops_grown.length > 0 && (
                <div style={{ marginBottom: "15px" }}>
                  <label
                    style={{
                      display: "block",
                      color: "#666",
                      fontSize: "12px",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      marginBottom: "5px",
                    }}
                  >
                    Crops Grown
                  </label>
                  <p style={{ color: "#333", fontSize: "16px" }}>
                    {farmer.farm_info.crops_grown.join(", ")}
                  </p>
                </div>
              )}

            <div style={{ marginBottom: "15px" }}>
              <label
                style={{
                  display: "block",
                  color: "#666",
                  fontSize: "12px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  marginBottom: "5px",
                }}
              >
                Registration Status
              </label>
              <span style={getStatusBadgeStyle(farmer?.status)}>
                {farmer?.status || "Unknown"}
              </span>
            </div>

            {farmer?.created_at && (
              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    color: "#666",
                    fontSize: "12px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    marginBottom: "5px",
                  }}
                >
                  Registered On
                </label>
                <p style={{ color: "#666", fontSize: "14px" }}>
                  {formatDate(farmer.created_at)}
                </p>
              </div>
            )}
          </div>

          {/* ID Card Actions */}
          <div>
            {/* ID Card Status */}
            <div
              style={{
                background: "white",
                borderRadius: "15px",
                padding: "30px",
                marginBottom: "30px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
              }}
            >
              <h2
                style={{
                  color: "#333",
                  fontSize: "24px",
                  fontWeight: "700",
                  marginBottom: "20px",
                  borderBottom: "3px solid #28a745",
                  paddingBottom: "10px",
                }}
              >
                🆔 ID Card Status
              </h2>

              {farmer?.id_card_path ? (
                <div>
                  <div
                    style={{
                      background: "#d4edda",
                      border: "2px solid #28a745",
                      borderRadius: "8px",
                      padding: "15px",
                      marginBottom: "20px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span style={{ fontSize: "24px" }}>✅</span>
                    <div>
                      <p
                        style={{
                          color: "#155724",
                          fontWeight: "600",
                          marginBottom: "5px",
                        }}
                      >
                        ID Card Generated
                      </p>
                      {farmer.id_card_generated_at && (
                        <p style={{ color: "#155724", fontSize: "13px" }}>
                          Generated: {formatDate(farmer.id_card_generated_at)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                    <button
                      onClick={handleViewIDCard}
                      style={{
                        padding: "15px 25px",
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "16px",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#0056b3";
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,123,255,0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#007bff";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <span style={{ fontSize: "20px" }}>👁️</span>
                      View ID Card (PDF)
                    </button>

                    <button
                      onClick={handleDownloadIDCard}
                      style={{
                        padding: "15px 25px",
                        backgroundColor: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "16px",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#218838";
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 6px 20px rgba(40,167,69,0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#28a745";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <span style={{ fontSize: "20px" }}>⬇️</span>
                      Download ID Card
                    </button>

                    <button
                      onClick={handleGenerateIDCard}
                      disabled={generating}
                      style={{
                        padding: "15px 25px",
                        backgroundColor: generating ? "#6c757d" : "#ffc107",
                        color: generating ? "#fff" : "#000",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "16px",
                        fontWeight: "600",
                        cursor: generating ? "not-allowed" : "pointer",
                        transition: "all 0.3s ease",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                        opacity: generating ? 0.7 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!generating) {
                          e.currentTarget.style.backgroundColor = "#e0a800";
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 6px 20px rgba(255,193,7,0.4)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!generating) {
                          e.currentTarget.style.backgroundColor = "#ffc107";
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "none";
                        }
                      }}
                    >
                      {generating ? (
                        <>
                          <div
                            style={{
                              width: "16px",
                              height: "16px",
                              border: "2px solid #fff",
                              borderTop: "2px solid transparent",
                              borderRadius: "50%",
                              animation: "spin 0.8s linear infinite",
                            }}
                          />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: "20px" }}>🔄</span>
                          Regenerate ID Card
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      background: "#fff3cd",
                      border: "2px solid #ffc107",
                      borderRadius: "8px",
                      padding: "15px",
                      marginBottom: "20px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span style={{ fontSize: "24px" }}>⚠️</span>
                    <div>
                      <p
                        style={{
                          color: "#856404",
                          fontWeight: "600",
                          marginBottom: "5px",
                        }}
                      >
                        No ID Card Generated Yet
                      </p>
                      <p style={{ color: "#856404", fontSize: "13px" }}>
                        Click the button below to generate your digital farmer ID
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateIDCard}
                    disabled={generating}
                    style={{
                      width: "100%",
                      padding: "18px 25px",
                      backgroundColor: generating ? "#6c757d" : "#9333ea",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "18px",
                      fontWeight: "700",
                      cursor: generating ? "not-allowed" : "pointer",
                      transition: "all 0.3s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "12px",
                      opacity: generating ? 0.7 : 1,
                      animation: generating ? "none" : "pulse 2s ease-in-out infinite",
                    }}
                    onMouseEnter={(e) => {
                      if (!generating) {
                        e.currentTarget.style.backgroundColor = "#7e22ce";
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 8px 25px rgba(147,51,234,0.4)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!generating) {
                        e.currentTarget.style.backgroundColor = "#9333ea";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }
                    }}
                  >
                    {generating ? (
                      <>
                        <div
                          style={{
                            width: "20px",
                            height: "20px",
                            border: "3px solid #fff",
                            borderTop: "3px solid transparent",
                            borderRadius: "50%",
                            animation: "spin 0.8s linear infinite",
                          }}
                        />
                        Generating ID Card...
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: "24px" }}>🆔</span>
                        Generate My ID Card
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* QR Code Information */}
            <div
              style={{
                background: "white",
                borderRadius: "15px",
                padding: "30px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
              }}
            >
              <h2
                style={{
                  color: "#333",
                  fontSize: "24px",
                  fontWeight: "700",
                  marginBottom: "20px",
                  borderBottom: "3px solid #fd7e14",
                  paddingBottom: "10px",
                }}
              >
                📱 QR Code Information
              </h2>

              <div
                style={{
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  padding: "20px",
                  border: "2px dashed #dee2e6",
                }}
              >
                <p
                  style={{
                    color: "#666",
                    fontSize: "14px",
                    marginBottom: "15px",
                    lineHeight: "1.6",
                  }}
                >
                  Your ID card contains a QR code with the following information:
                </p>

                {qrData && (
                  <div
                    style={{
                      background: "white",
                      borderRadius: "6px",
                      padding: "15px",
                      border: "1px solid #dee2e6",
                    }}
                  >
                    <pre
                      style={{
                        fontFamily: "monospace",
                        fontSize: "13px",
                        color: "#333",
                        margin: 0,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {JSON.stringify(qrData, null, 2)}
                    </pre>
                  </div>
                )}

                <div
                  style={{
                    marginTop: "15px",
                    padding: "12px",
                    background: "#e7f3ff",
                    borderLeft: "4px solid #007bff",
                    borderRadius: "4px",
                  }}
                >
                  <p style={{ color: "#004085", fontSize: "13px", margin: 0 }}>
                    <strong>ℹ️ Note:</strong> This QR code can be scanned at
                    agricultural offices to verify your farmer registration and
                    access your details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div
          style={{
            textAlign: "center",
            marginTop: "40px",
            animation: "fadeIn 0.6s ease-out 0.4s backwards",
          }}
        >
          <button
            onClick={() => navigate("/farmer-dashboard")}
            style={{
              padding: "15px 40px",
              backgroundColor: "white",
              color: "#667eea",
              border: "2px solid white",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "white";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "white";
              e.currentTarget.style.color = "#667eea";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default FarmerIDCard;
