// frontend/src/pages/AdminGeoManagement.tsx
// Admin-only geo-data management — provinces, districts, chiefdoms, ethnic groups (P4)
import { useEffect, useState, useCallback } from "react";
import BackButton from "@/components/BackButton";
import axiosClient from "@/utils/axios";
import { useNotification } from "@/contexts/NotificationContext";
import { logger } from "@/utils/logger";

const COMPONENT = "AdminGeoManagement";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface GeoItem {
  _id: string;
  name: string;
  code?: string;
  province_name?: string;
  district_name?: string;
  is_active?: boolean;
}

type Tab = "provinces" | "districts" | "chiefdoms" | "ethnic-groups";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "provinces",     label: "Provinces",     icon: "🗺️" },
  { key: "districts",     label: "Districts",     icon: "📍" },
  { key: "chiefdoms",     label: "Chiefdoms",     icon: "🏘️" },
  { key: "ethnic-groups", label: "Ethnic Groups", icon: "👥" },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AdminGeoManagement() {
  const { success: showSuccess, error: showError } = useNotification();

  const [activeTab, setActiveTab] = useState<Tab>("provinces");
  const [items, setItems]         = useState<GeoItem[]>([]);
  const [loading, setLoading]     = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [editItem, setEditItem]   = useState<GeoItem | null>(null);

  // form state
  const [formName, setFormName]   = useState("");
  const [formCode, setFormCode]   = useState("");
  const [formParent, setFormParent] = useState("");
  const [saving, setSaving]       = useState(false);

  // parent lists for dropdowns
  const [provinces, setProvinces]   = useState<GeoItem[]>([]);
  const [districts, setDistricts]   = useState<GeoItem[]>([]);

  const fetchParents = useCallback(async () => {
    try {
      const [p, d] = await Promise.all([
        axiosClient.get<GeoItem[]>("/admin/geo/provinces"),
        axiosClient.get<GeoItem[]>("/admin/geo/districts"),
      ]);
      setProvinces(p.data);
      setDistricts(d.data);
    } catch { /* silent */ }
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosClient.get<GeoItem[]>(`/admin/geo/${activeTab}`);
      setItems(data);
      logger.info(COMPONENT, `Loaded ${activeTab}`, { count: data.length });
    } catch {
      showError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, showError]);

  useEffect(() => {
    fetchItems();
    fetchParents();
  }, [fetchItems, fetchParents]);

  const openCreate = () => {
    setEditItem(null);
    setFormName("");
    setFormCode("");
    setFormParent("");
    setShowForm(true);
  };

  const openEdit = (item: GeoItem) => {
    setEditItem(item);
    setFormName(item.name);
    setFormCode(item.code ?? "");
    setFormParent(item.province_name ?? item.district_name ?? "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { showError("Name is required."); return; }
    setSaving(true);
    try {
      const body: Record<string, string> = { name: formName.trim() };
      if (formCode.trim())   body.code = formCode.trim();
      if (formParent.trim()) {
        if (activeTab === "districts")  body.province_name = formParent.trim();
        if (activeTab === "chiefdoms")  body.district_name = formParent.trim();
      }

      if (editItem) {
        await axiosClient.put(`/admin/geo/${activeTab}/${editItem._id}`, body);
        showSuccess("Updated successfully.");
      } else {
        await axiosClient.post(`/admin/geo/${activeTab}`, body);
        showSuccess("Created successfully.");
      }
      setShowForm(false);
      await fetchItems();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      showError(e?.response?.data?.detail ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: GeoItem) => {
    if (!window.confirm(`Deactivate "${item.name}"? Farmers referencing it will not be affected.`)) return;
    try {
      await axiosClient.delete(`/admin/geo/${activeTab}/${item._id}`);
      showSuccess("Deactivated (soft delete).");
      await fetchItems();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      showError(e?.response?.data?.detail ?? "Delete failed.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 flex items-center gap-3">
        <BackButton />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">🗺️ Geo Data Management</h1>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-green-600 text-green-700 dark:text-green-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Toolbar */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {items.length} {activeTab.replace("-", " ")}
          </p>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-xl shadow transition active:scale-95"
          >
            + Add {TABS.find(t => t.key === activeTab)?.label.slice(0, -1)}
          </button>
        </div>

        {/* Inline Add/Edit Form */}
        {showForm && (
          <div className="mb-5 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-5 space-y-3">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">
              {editItem ? "Edit Entry" : "New Entry"}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Name *</label>
                <input
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. Lusaka"
                />
              </div>

              {activeTab === "provinces" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Code</label>
                  <input
                    value={formCode}
                    onChange={e => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g. LUS"
                  />
                </div>
              )}

              {activeTab === "districts" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Province</label>
                  <select
                    value={formParent}
                    onChange={e => setFormParent(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">-- Select Province --</option>
                    {provinces.map(p => <option key={p._id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
              )}

              {activeTab === "chiefdoms" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">District</label>
                  <select
                    value={formParent}
                    onChange={e => setFormParent(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">-- Select District --</option>
                    {districts.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60"
              >
                {saving ? "Saving…" : editItem ? "Update" : "Create"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-600">
            <p className="text-5xl mb-3">🗺️</p>
            <p className="text-sm">No entries yet. Add one above.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Name</th>
                  {activeTab === "provinces"  && <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Code</th>}
                  {activeTab === "districts"  && <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Province</th>}
                  {activeTab === "chiefdoms"  && <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">District</th>}
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {items.map(item => (
                  <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">{item.name}</td>
                    {activeTab === "provinces"  && <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.code ?? "—"}</td>}
                    {activeTab === "districts"  && <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.province_name ?? "—"}</td>}
                    {activeTab === "chiefdoms"  && <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.district_name ?? "—"}</td>}
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        item.is_active !== false
                          ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      }`}>
                        {item.is_active !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openEdit(item)}
                          className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/60 font-semibold transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          disabled={item.is_active === false}
                          className="px-3 py-1 text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/60 font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Deactivate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
