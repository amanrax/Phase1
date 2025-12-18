// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import useAuthStore from "@/store/authStore";
import { farmerService } from "@/services/farmer.service";

interface Farmer {
  id?: string;
  farmer_id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  primary_phone?: string;
}

export default function Dashboard() {
  const { user, logout } = useAuthStore();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFarmers();
  }, []);

  const loadFarmers = async () => {
    setLoading(true);
    try {
      const data = await farmerService.getFarmers();
      // Normalize data structure gracefully
      setFarmers(Array.isArray(data) ? data : data.farmers || []);
    } catch (error) {
      console.error("Failed to load farmers:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-800 pb-8"
      style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", paddingBottom: "32px" }}
    >
      {/* Header */}
      <header 
        className="bg-white/10 backdrop-blur-sm shadow-lg"
        style={{ background: "rgba(255, 255, 255, 0.1)", backdropFilter: "blur(10px)", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
      >
        <div 
          className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
          style={{ maxWidth: "80rem", margin: "0 auto", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <h1 
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-white drop-shadow-lg"
            style={{ fontSize: "clamp(1.5rem, 5vw, 2.25rem)", fontWeight: "bold", color: "white", textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}
          >
            🌾 Farmer Dashboard
          </h1>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4" style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <span className="text-sm text-white/90" style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.9)" }}>
              Welcome, {user?.username} ({user?.role})
            </span>
            <button
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all shadow-lg"
              style={{ background: "#dc3545", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", transition: "all 0.3s" }}
              aria-label="Logout"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main 
        className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8"
        style={{ maxWidth: "80rem", margin: "0 auto", padding: "32px 16px" }}
      >
        <section 
          className="bg-white rounded-2xl shadow-2xl p-5 sm:p-8"
          style={{ background: "white", borderRadius: "16px", boxShadow: "0 15px 35px rgba(0,0,0,0.1)", padding: "32px" }}
        >
          <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-gray-800" style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "24px", color: "#333" }}>
            Farmers List
          </h2>

          {loading ? (
            <div className="text-center py-8" style={{ textAlign: "center", padding: "32px 0" }}>
              <div 
                className="inline-block w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-4"
                style={{
                  display: "inline-block",
                  width: "48px",
                  height: "48px",
                  border: "4px solid #e0e0e0",
                  borderTop: "4px solid #007bff",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  marginBottom: "16px"
                }}
              ></div>
              <p style={{ color: "#666" }}>Loading farmers...</p>
            </div>
          ) : farmers.length === 0 ? (
            <p className="text-gray-500 text-center py-8" style={{ color: "#666", textAlign: "center", padding: "32px 0" }}>No farmers found</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
              {farmers.map((farmer) => (
                <article
                  key={farmer.id || farmer.farmer_id}
                  className="border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:scale-105 transition-all"
                  style={{ border: "1px solid #e0e0e0", borderRadius: "12px", padding: "20px", transition: "all 0.3s", cursor: "pointer" }}
                  tabIndex={0}
                >
                  <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2" style={{ fontSize: "1.125rem", fontWeight: "bold", color: "#333", marginBottom: "8px" }}>
                    {farmer.first_name} {farmer.last_name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1" style={{ fontSize: "0.875rem", color: "#666", marginBottom: "4px" }}>
                    Phone: {farmer.phone || farmer.primary_phone || "N/A"}
                  </p>
                  <p className="text-sm text-gray-600 font-mono" style={{ fontSize: "0.875rem", color: "#666", fontFamily: "monospace" }}>ID: {farmer.farmer_id}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
