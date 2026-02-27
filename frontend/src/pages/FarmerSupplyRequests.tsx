import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "@/components/BackButton";
import axios from "@/utils/axios";
import { useNotification } from "@/contexts/NotificationContext";
import { logger } from "@/utils/logger";

const COMPONENT = "FarmerSupplyRequests";

interface SupplyRequest {
  id: string;
  items: string[];
  quantity: string;
  urgency: string;
  notes: string;
  status: string;
  admin_notes: string;
  created_at: string;
  updated_at: string;
}

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

const ConfirmDialog = ({ state, onCancel }: { state: ConfirmState; onCancel: () => void }) => {
  if (!state.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm w-full border border-gray-200 dark:border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{state.title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{state.message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={state.onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const AVAILABLE_ITEMS = ["Seeds", "Fertilizers", "Pesticides", "Tools", "Irrigation Equipment", "Tractor Services", "Other"];
const URGENCY_LEVELS = ["low", "medium", "high"];

export default function FarmerSupplyRequests() {
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useNotification();

  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "fulfilled" | "rejected">("all");

  const [confirm, setConfirm] = useState<ConfirmState>({ open: false, title: "", message: "", onConfirm: () => {} });
  const dismissConfirm = () => setConfirm(s => ({ ...s, open: false }));

  // New request form state
  const [showForm, setShowForm] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [quantity, setQuantity] = useState("");
  const [urgency, setUrgency] = useState("medium");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      logger.info(COMPONENT, "loadRequests start");
      const response = await axios.get("/supplies/my-requests");
      const data = response.data;
      const list = Array.isArray(data) ? data : data.requests || data.results || [];
      setRequests(list);
      logger.info(COMPONENT, "loadRequests success", { count: list.length });
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || "Failed to load requests";
      logger.error(COMPONENT, "loadRequests failed", { msg, err });
      showError(msg, 5000);
    } finally {
      setLoading(false);
    }
  };

  const createRequest = async () => {
    if (!selectedItems.length || !quantity) {
      showError("Please select items and quantity", 4000);
      return;
    }
    logger.info(COMPONENT, "createRequest start", { items: selectedItems, quantity, urgency });
    try {
      await axios.post("/supplies/request", { items: selectedItems, quantity, urgency, notes });
      logger.info(COMPONENT, "createRequest success");
      showSuccess("Request submitted successfully", 4000);
      setSelectedItems([]);
      setQuantity("");
      setUrgency("medium");
      setNotes("");
      setShowForm(false);
      await loadRequests();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || "Failed to create request";
      logger.error(COMPONENT, "createRequest failed", { msg, err });
      showError(msg, 5000);
    }
  };

  const deleteRequest = (id: string) => {
    setConfirm({
      open: true,
      title: "Delete Request",
      message: "Are you sure you want to delete this request? This action cannot be undone.",
      onConfirm: async () => {
        dismissConfirm();
        logger.info(COMPONENT, "deleteRequest start", { id });
        try {
          await axios.delete(`/supplies/${id}`);
          logger.info(COMPONENT, "deleteRequest success", { id });
          showSuccess("Request deleted successfully", 3000);
          await loadRequests();
        } catch (err: any) {
          const msg = err.response?.data?.detail || err.response?.data?.message || "Failed to delete request";
          logger.error(COMPONENT, "deleteRequest failed", { id, msg, err });
          showError(msg, 5000);
        }
      },
    });
  };

  const filteredRequests = requests.filter(r => filter === "all" || r.status.toLowerCase() === filter);

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === "pending") return "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300";
    if (s === "approved") return "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300";
    if (s === "fulfilled") return "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300";
    if (s === "rejected") return "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300";
    return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100";
  };

  const getUrgencyColor = (urg: string) => {
    const u = urg.toLowerCase();
    if (u === "high") return "text-red-600 dark:text-red-400";
    if (u === "medium") return "text-orange-600 dark:text-orange-400";
    return "text-green-600 dark:text-green-400";
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <ConfirmDialog state={confirm} onCancel={dismissConfirm} />

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton to="/farmer-dashboard" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">📦 My Requests</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-lg transition text-sm"
          >
            {showForm ? "✕ Close" : "+ New Request"}
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* New Request Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">📝 Create New Request</h2>
            <div className="space-y-4">
              {/* Items Selection */}
              <div>
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Items Needed</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
                  {AVAILABLE_ITEMS.map(item => (
                    <label
                      key={item}
                      className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                    >
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item)}
                        onChange={e => {
                          if (e.target.checked) setSelectedItems([...selectedItems, item]);
                          else setSelectedItems(selectedItems.filter(i => i !== item));
                        }}
                        className="w-4 h-4 accent-green-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-200">{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Quantity</label>
                <input
                  type="text"
                  placeholder="e.g., 10 bags, 2 units"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none text-sm transition"
                  autoComplete="off"
                />
              </div>

              {/* Urgency */}
              <div>
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Urgency</label>
                <select
                  value={urgency}
                  onChange={e => setUrgency(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none text-sm transition"
                >
                  {URGENCY_LEVELS.map(u => (
                    <option key={u} value={u}>{capitalize(u)}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Notes</label>
                <textarea
                  placeholder="Additional details or special requests"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none text-sm transition"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={createRequest}
                  className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-lg transition text-sm"
                >
                  Submit Request
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-lg transition text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-2 flex gap-2 overflow-x-auto">
          {(["all", "pending", "approved", "fulfilled", "rejected"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition ${
                filter === f
                  ? "bg-green-700 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {capitalize(f)}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 dark:border-gray-600 border-t-green-600"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
            <p className="text-4xl mb-4">📦</p>
            <p className="text-gray-600 dark:text-gray-400 text-lg font-semibold">No requests found</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">
              {filter === "all" ? "Create a new supply request to get started" : `No ${filter} requests`}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold uppercase text-xs border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-3">Items</th>
                    <th className="px-6 py-3">Quantity</th>
                    <th className="px-6 py-3">Urgency</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRequests.map(req => (
                    <tr key={req.id} className="hover:bg-green-50 dark:hover:bg-green-900/10 transition">
                      <td className="px-6 py-4 font-bold text-gray-800 dark:text-gray-100">{req.items.join(", ")}</td>
                      <td className="px-6 py-4">{req.quantity}</td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${getUrgencyColor(req.urgency)}`}>
                          {capitalize(req.urgency)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusColor(req.status)}`}>
                          {capitalize(req.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs">{new Date(req.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-xs space-x-2">
                        <button
                          onClick={() => navigate(`/supply-request/${req.id}`)}
                          className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-bold"
                        >
                          View
                        </button>
                        {req.status.toLowerCase() === "pending" && (
                          <button
                            onClick={() => deleteRequest(req.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-bold"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {filteredRequests.map(req => (
                <div key={req.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm flex-1">{req.items.join(", ")}</h3>
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(req.status)} whitespace-nowrap ml-2`}>
                      {capitalize(req.status)}
                    </span>
                  </div>

                  <div className="space-y-1 mb-4 text-xs text-gray-600 dark:text-gray-400">
                    <p><strong>Quantity:</strong> {req.quantity}</p>
                    <p>
                      <strong>Urgency:</strong>
                      <span className={`ml-2 font-bold ${getUrgencyColor(req.urgency)}`}>
                        {capitalize(req.urgency)}
                      </span>
                    </p>
                    <p><strong>Date:</strong> {new Date(req.created_at).toLocaleDateString()}</p>
                    {req.notes && <p><strong>Notes:</strong> {req.notes}</p>}
                    {req.admin_notes && (
                      <p className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 p-2 rounded mt-1">
                        <strong>Admin Reply:</strong> {req.admin_notes}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() => navigate(`/supply-request/${req.id}`)}
                      className="flex-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 font-bold py-2 rounded transition"
                    >
                      View Details
                    </button>
                    {req.status.toLowerCase() === "pending" && (
                      <button
                        onClick={() => deleteRequest(req.id)}
                        className="flex-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 font-bold py-2 rounded transition"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
