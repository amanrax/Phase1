import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { farmerService } from "@/services/farmer.service";

interface Farmer {
  _id: string;
  farmer_id: string;
  personal_info?: {
    first_name?: string;
    last_name?: string;
    phone_primary?: string;
  };
  full_name?: string;
  phone?: string;
  address?: {
    village?: string;
    district_name?: string;
  };
  district?: string;
  registration_status?: string;
  created_at?: string;
  is_active: boolean;
}

export default function FarmersList() {
  const navigate = useNavigate();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "pending" | "inactive">("all");

  useEffect(() => {
    fetchFarmers();
  }, [filter]);

  const fetchFarmers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await farmerService.getFarmers(100, 0);
      let farmerList = Array.isArray(data) ? data : (data.results || data || []);
      
      // Apply filter
      if (filter === "active") {
        farmerList = farmerList.filter((f: any) => f.is_active && f.registration_status === "registered");
      } else if (filter === "pending") {
        farmerList = farmerList.filter((f: any) => f.registration_status === "pending");
      } else if (filter === "inactive") {
        farmerList = farmerList.filter((f: any) => !f.is_active);
      }
      
      setFarmers(farmerList);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error("Fetch farmers error:", err);
      setError(err.response?.data?.detail || "Failed to load farmers");
    } finally {
      setLoading(false);
    }
  };

  const getFarmerName = (farmer: Farmer) => {
    return farmer.full_name || `${farmer.personal_info?.first_name} ${farmer.personal_info?.last_name}`.trim() || "Unknown";
  };

  const getFarmerPhone = (farmer: Farmer) => {
    return farmer.phone || farmer.personal_info?.phone_primary || "-";
  };

  const getFarmerDistrict = (farmer: Farmer) => {
    return farmer.district || farmer.address?.district_name || "Unknown";
  };

  const getStatusColor = (status: string, isActive: boolean) => {
    if (!isActive) return "bg-gray-100 text-gray-800";
    if (status === "registered") return "bg-green-100 text-green-800";
    if (status === "pending") return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate("/")} 
              className="text-green-700 hover:text-green-800 font-bold text-sm"
            >
              ← BACK
            </button>
            <h1 className="text-2xl font-bold text-gray-800">👨‍🌾 All Farmers</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border-l-4 border-red-500">
            {error}
            <button onClick={() => setError("")} className="ml-auto block text-xs hover:underline">Dismiss</button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-2 flex gap-2 overflow-x-auto">
          {["all", "active", "pending", "inactive"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition ${
                filter === f ? "bg-green-700 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} {f !== "all" && `(${farmers.length})`}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600"></div>
            <p className="text-gray-600 mt-4">Loading farmers...</p>
          </div>
        ) : farmers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-600 text-lg">No farmers found</p>
            <p className="text-gray-500 text-sm">Try changing the filter</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3">Farmer ID</th>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Phone</th>
                    <th className="px-6 py-3">District</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {farmers.map(farmer => (
                    <tr key={farmer._id} className="hover:bg-green-50 transition">
                      <td className="px-6 py-4 font-mono font-bold text-xs">{farmer.farmer_id}</td>
                      <td className="px-6 py-4 font-bold">{getFarmerName(farmer)}</td>
                      <td className="px-6 py-4 text-xs">{getFarmerPhone(farmer)}</td>
                      <td className="px-6 py-4 text-sm">{getFarmerDistrict(farmer)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusColor(farmer.registration_status || "", farmer.is_active)}`}>
                          {farmer.is_active ? (farmer.registration_status === "registered" ? "✓ Registered" : "⏳ Pending") : "✗ Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs">{farmer.created_at ? new Date(farmer.created_at).toLocaleDateString() : "-"}</td>
                      <td className="px-6 py-4 text-xs space-x-2">
                        <button
                          onClick={() => navigate(`/farmers/${farmer.farmer_id}`)}
                          className="text-green-600 hover:text-green-700 font-bold"
                        >
                          View
                        </button>
                        <button
                          onClick={() => navigate(`/farmers/${farmer.farmer_id}/edit`)}
                          className="text-blue-600 hover:text-blue-700 font-bold"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {farmers.map(farmer => (
                <div key={farmer._id} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-gray-800 text-sm">{getFarmerName(farmer)}</h3>
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(farmer.registration_status || "", farmer.is_active)}`}>
                      {farmer.is_active ? (farmer.registration_status === "registered" ? "Registered" : "Pending") : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-1"><strong>ID:</strong> {farmer.farmer_id}</p>
                  <p className="text-xs text-gray-600 mb-1"><strong>Phone:</strong> {getFarmerPhone(farmer)}</p>
                  <p className="text-xs text-gray-600 mb-1"><strong>District:</strong> {getFarmerDistrict(farmer)}</p>
                  <p className="text-xs text-gray-600 mb-3"><strong>Registered:</strong> {farmer.created_at ? new Date(farmer.created_at).toLocaleDateString() : "-"}</p>
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() => navigate(`/farmers/${farmer.farmer_id}`)}
                      className="flex-1 bg-green-100 text-green-700 hover:bg-green-200 font-bold py-2 rounded transition"
                    >
                      View
                    </button>
                    <button
                      onClick={() => navigate(`/farmers/${farmer.farmer_id}/edit`)}
                      className="flex-1 bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold py-2 rounded transition"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Total Count */}
        {!loading && farmers.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-600">
            Showing {farmers.length} farmer{farmers.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
