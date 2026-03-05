// frontend/src/pages/AdminSettings.tsx - FIXED VERSION
import { useEffect, useState } from "react";
import BackButton from "@/components/BackButton";
import axios from "@/utils/axios";
import useAuthStore from "@/store/authStore";
import { useTheme } from "@/contexts/ThemeContext";
import type { Theme } from "@/contexts/ThemeContext";
import { logger } from "@/utils/logger";
import { useNotification } from "@/contexts/NotificationContext";
import { APP_VERSION, PHASE } from "@/utils/version";
import { loadFeedbackPrefs, saveFeedbackPrefs } from "@/utils/feedback";

interface User {
  _id: string;
  resourceId: string;  // farmer_id, operator_id, or email - used for API calls
  email: string;
  role: string;
  roles: string[];
  is_active: boolean;
  created_at: string;
  full_name?: string;
  phone?: string;
}

interface SystemStats {
  total_users: number;
  active_users: number;
  total_admins: number;
  total_operators: number;
  total_farmers: number;
}
type SettingsTab = "users" | "system" | "data" | "security" | "appearance";

/** ─── Appearance Tab ─────────────────────────────────────────── */
function AppearanceTab() {
  const { theme, setTheme, isDark } = useTheme();
  const [logText, setLogText] = useState<string>('');
  const [showLogs, setShowLogs] = useState(false);
  const [feedbackPrefs, setFeedbackPrefs] = useState(loadFeedbackPrefs);

  function toggleSound() {
    const next = { ...feedbackPrefs, soundEnabled: !feedbackPrefs.soundEnabled };
    setFeedbackPrefs(next);
    saveFeedbackPrefs(next);
    logger.info('AppearanceTab', `Sound ${next.soundEnabled ? 'enabled' : 'disabled'}`);
  }

  function toggleHaptics() {
    const next = { ...feedbackPrefs, hapticsEnabled: !feedbackPrefs.hapticsEnabled };
    setFeedbackPrefs(next);
    saveFeedbackPrefs(next);
    logger.info('AppearanceTab', `Haptics ${next.hapticsEnabled ? 'enabled' : 'disabled'}`);
  }

  const themeOptions: { value: Theme; icon: string; label: string; desc: string }[] = [
    { value: 'light',  icon: '☀️',  label: 'Light',  desc: 'White backgrounds, high contrast in daylight.' },
    { value: 'dark',   icon: '🌙',  label: 'Dark',   desc: 'Dark backgrounds, easier on eyes at night.' },
    { value: 'system', icon: '🖥️', label: 'System', desc: 'Automatically follows your device theme.' },
  ];

  function handleExportLogs() {
    const text = logger.exportLogs();
    setLogText(text || '(no logs recorded yet)');
    setShowLogs(true);
    logger.info('AppearanceTab', 'Logs exported by user');
  }

  function handleClearLogs() {
    logger.clearLogs();
    setLogText('(logs cleared)');
    logger.info('AppearanceTab', 'Logs cleared by user');
  }

  function downloadLogs() {
    const blob = new Blob([logText], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `cem-logs-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* ── Theme Selector ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">🎨 Color Theme</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Select your preferred color scheme. Changes are instant and saved automatically.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {themeOptions.map(opt => {
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  setTheme(opt.value);
                  logger.info('AppearanceTab', `User selected theme: ${opt.value}`);
                }}
                className={`flex flex-col items-start gap-2 p-5 rounded-xl border-2 transition-all duration-200 text-left w-full ${
                  active
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-md'
                    : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10'
                }`}
              >
                {/* Icon + radio */}
                <div className="flex items-center justify-between w-full">
                  <span className="text-3xl">{opt.icon}</span>
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    active ? 'border-indigo-500' : 'border-gray-300 dark:border-gray-500'
                  }`}>
                    {active && <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                  </span>
                </div>
                <span className={`font-bold text-sm ${active ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200'}`}>
                  {opt.label}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{opt.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Live preview strip */}
        <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 text-sm font-medium transition-all duration-300 ${
          isDark ? 'bg-gray-900 text-gray-100 border border-gray-700' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
        }`}>
          <span className="text-xl">{isDark ? '🌙' : '☀️'}</span>
          <span>
            Current preview: <strong>{isDark ? 'Dark' : 'Light'}</strong> mode is active.
            {' '}Cards, text, and backgrounds adapt automatically.
          </span>
        </div>
      </div>

      {/* ── Application Logs ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">📋 Application Logs</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Client-side logs stored in your browser (last 200 entries). Useful for debugging.
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleExportLogs}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
          >
            📥 View Logs
          </button>
          {showLogs && (
            <>
              <button
                onClick={downloadLogs}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition"
              >
                ⬇️ Download
              </button>
              <button
                onClick={handleClearLogs}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition"
              >
                🗑️ Clear Logs
              </button>
            </>
          )}
        </div>
        {showLogs && (
          <pre className="mt-4 p-4 bg-gray-900 text-green-400 rounded-xl text-xs overflow-auto max-h-64 whitespace-pre-wrap font-mono">
            {logText}
          </pre>
        )}
      </div>

      {/* ── Sound & Vibration ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">🔔 Sound &amp; Vibration</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Control audio and haptic feedback. Settings are saved per device and persist across sessions.
        </p>
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 cursor-pointer select-none">
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">🔊 Sound Effects</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Chimes on QR scan, registration complete, errors</p>
            </div>
            <button
              role="switch"
              aria-checked={feedbackPrefs.soundEnabled}
              onClick={toggleSound}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${feedbackPrefs.soundEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${feedbackPrefs.soundEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </label>
          <label className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 cursor-pointer select-none">
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">📳 Vibration (Mobile)</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Haptic pulses on key interactions — Android/iOS only</p>
            </div>
            <button
              role="switch"
              aria-checked={feedbackPrefs.hapticsEnabled}
              onClick={toggleHaptics}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${feedbackPrefs.hapticsEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${feedbackPrefs.hapticsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </label>
        </div>
      </div>
    </div>
  );
}

// ─── Inline Geo Data Manager ──────────────────────────────────────────────────
// Self-contained CRUD for provinces, districts, chiefdoms, ethnic groups
// embedded directly inside the Settings > Data tab (no page navigation needed)

interface GeoItem { _id: string; name: string; code?: string; province_name?: string; district_name?: string; is_active?: boolean; }
type GeoTab = "provinces" | "districts" | "chiefdoms" | "ethnic-groups";
const GEO_TABS: { key: GeoTab; label: string; icon: string }[] = [
  { key: "provinces",     label: "Provinces",     icon: "🗺️" },
  { key: "districts",     label: "Districts",     icon: "📍" },
  { key: "chiefdoms",     label: "Chiefdoms",     icon: "🏘️" },
  { key: "ethnic-groups", label: "Ethnic Groups", icon: "👥" },
];

function matchesSearch(item: GeoItem, q: string): boolean {
  if (!q) return true;
  const lq = q.toLowerCase();
  return (
    item.name.toLowerCase().includes(lq) ||
    (item.code ?? "").toLowerCase().includes(lq) ||
    (item.province_name ?? "").toLowerCase().includes(lq) ||
    (item.district_name ?? "").toLowerCase().includes(lq)
  );
}

function InlineGeoManager() {
  const notify = useNotification();
  const [geoTab, setGeoTab]       = useState<GeoTab>("provinces");
  const [items, setItems]         = useState<GeoItem[]>([]);
  const [loading, setLoading]     = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [editItem, setEditItem]   = useState<GeoItem | null>(null);
  const [formName, setFormName]   = useState("");
  const [formCode, setFormCode]   = useState("");
  const [formParent, setFormParent] = useState("");
  const [saving, setSaving]       = useState(false);
  const [provinces, setProvinces] = useState<GeoItem[]>([]);
  const [districts, setDistricts] = useState<GeoItem[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<GeoItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Merged fetch: loads the active tab's items + any parent lookups needed for dropdowns.
  // Uses AbortController for StrictMode-safe cleanup (prevents in-flight ghost requests).
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const run = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get<GeoItem[]>(`/admin/geo/${geoTab}`, { signal });
        if (!signal.aborted) setItems(data);

        // Load parent dropdowns only when needed
        if (geoTab === "districts" && !signal.aborted) {
          const { data: p } = await axios.get<GeoItem[]>("/admin/geo/provinces", { signal });
          if (!signal.aborted) setProvinces(p);
        } else if (geoTab === "chiefdoms" && !signal.aborted) {
          const [{ data: p }, { data: d }] = await Promise.all([
            axios.get<GeoItem[]>("/admin/geo/provinces", { signal }),
            axios.get<GeoItem[]>("/admin/geo/districts", { signal }),
          ]);
          if (!signal.aborted) { setProvinces(p); setDistricts(d); }
        }
      } catch (e: unknown) {
        if (!signal.aborted) {
          // Only show error for the primary items fetch, not parent lookups
          notify.error("Failed to load data.");
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    run();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoTab, refreshKey]); // notify intentionally omitted — not stable across renders

  const openCreate = () => { setEditItem(null); setFormName(""); setFormCode(""); setFormParent(""); setShowForm(true); };
  const openEdit = (item: GeoItem) => {
    setEditItem(item);
    setFormName(item.name);
    setFormCode(item.code ?? "");
    setFormParent(item.province_name ?? item.district_name ?? "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { notify.error("Name is required."); return; }
    setSaving(true);
    try {
      const body: Record<string, string> = { name: formName.trim() };
      if (formCode.trim())   body.code = formCode.trim();
      if (formParent.trim()) {
        if (geoTab === "districts") body.province_name = formParent.trim();
        if (geoTab === "chiefdoms") body.district_name = formParent.trim();
      }
      if (editItem) {
        await axios.put(`/admin/geo/${geoTab}/${editItem._id}`, body);
        notify.success(`${GEO_TABS.find(t => t.key === geoTab)?.label.slice(0, -1)} updated.`);
      } else {
        await axios.post(`/admin/geo/${geoTab}`, body);
        notify.success(`${GEO_TABS.find(t => t.key === geoTab)?.label.slice(0, -1)} created.`);
      }
      setShowForm(false);
      setRefreshKey(k => k + 1);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      notify.error(e?.response?.data?.detail ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: GeoItem) => {
    try {
      await axios.delete(`/admin/geo/${geoTab}/${item._id}`);
      notify.success(`"${item.name}" deactivated.`);
      setConfirmDelete(null);
      setRefreshKey(k => k + 1);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      notify.error(e?.response?.data?.detail ?? "Deactivate failed.");
    }
  };

  const singularLabel = GEO_TABS.find(t => t.key === geoTab)?.label.replace(/s$/, "") ?? "Entry";

  return (
    <div className="space-y-4">
      {/* Confirm Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-100 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">Deactivate entry?</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
              <strong>"{confirmDelete.name}"</strong> will be marked inactive. Existing farmer records that reference it will not be affected.
            </p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition active:scale-95">Deactivate</button>
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition active:scale-95">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">🗺️ Reference Data Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Add, edit, or deactivate reference data used across the system.</p>
        </div>

        {/* Sub-tabs */}
        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
          {GEO_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setGeoTab(tab.key); setShowForm(false); setSearchQuery(""); }}
              className={`flex-shrink-0 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                geoTab === tab.key
                  ? "border-green-600 text-green-700 dark:text-green-400 bg-white dark:bg-gray-800"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            {/* Search */}
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={`Search ${GEO_TABS.find(t => t.key === geoTab)?.label.toLowerCase()}…`}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold"
                  aria-label="Clear search"
                >✕</button>
              )}
            </div>
            {/* Count + Add */}
            <div className="flex items-center gap-3 shrink-0">
              <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {loading ? "Loading…" : searchQuery
                  ? `${items.filter(i => matchesSearch(i, searchQuery)).length} of ${items.length}`
                  : `${items.length} ${GEO_TABS.find(t => t.key === geoTab)?.label}`}
              </p>
              <button
                onClick={openCreate}
                className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-xl shadow transition active:scale-95"
              >
                + Add {singularLabel}
              </button>
            </div>
          </div>

          {/* Inline Add/Edit Form */}
          {showForm && (
            <div className="mb-5 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">
                {editItem ? `Edit ${singularLabel}` : `New ${singularLabel}`}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Name *</label>
                  <input
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSave()}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder={geoTab === "provinces" ? "e.g. Lusaka" : geoTab === "districts" ? "e.g. Kafue" : geoTab === "chiefdoms" ? "e.g. Chieftainess Nkomeshya" : "e.g. Bemba"}
                    autoFocus
                  />
                </div>
                {geoTab === "provinces" && (
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
                {geoTab === "districts" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Province *</label>
                    <select
                      value={formParent}
                      onChange={e => setFormParent(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">— Select Province —</option>
                      {provinces.map(p => <option key={p._id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                )}
                {geoTab === "chiefdoms" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">District *</label>
                    <select
                      value={formParent}
                      onChange={e => setFormParent(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">— Select District —</option>
                      {districts.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60 active:scale-95"
                >
                  {saving ? "Saving…" : editItem ? `Update ${singularLabel}` : `Create ${singularLabel}`}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl transition active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Items table */}
          {(() => { const filtered = items.filter(i => matchesSearch(i, searchQuery)); return (
          loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-600">
              <p className="text-4xl mb-2">{GEO_TABS.find(t => t.key === geoTab)?.icon}</p>
              <p className="text-sm">{searchQuery ? `No results for "${searchQuery}"` : `No ${GEO_TABS.find(t => t.key === geoTab)?.label.toLowerCase()} yet.`}</p>
              {!searchQuery && <button onClick={openCreate} className="mt-3 text-sm font-bold text-green-700 dark:text-green-400">+ Add first {singularLabel.toLowerCase()}</button>}
              {searchQuery && <button onClick={() => setSearchQuery("")} className="mt-3 text-sm font-bold text-green-700 dark:text-green-400">Clear search</button>}
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Name</th>
                    {geoTab === "provinces"  && <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Code</th>}
                    {geoTab === "districts"  && <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Province</th>}
                    {geoTab === "chiefdoms"  && <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">District</th>}
                    <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Status</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {filtered.map(item => (
                    <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">{item.name}</td>
                      {geoTab === "provinces"  && <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.code ?? "—"}</td>}
                      {geoTab === "districts"  && <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.province_name ?? "—"}</td>}
                      {geoTab === "chiefdoms"  && <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.district_name ?? "—"}</td>}
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
                            className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/60 font-semibold transition active:scale-95"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setConfirmDelete(item)}
                            disabled={item.is_active === false}
                            className="px-3 py-1 text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/60 font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
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
          )
          ); })()}
        </div>
      </div>
    </div>
  );
}

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("users");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  // success messages handled via notify.success() — local state unused
  // Confirm modal
  type ConfirmPending = { label: string; danger?: boolean; onConfirm: () => void };
  const [confirmPending, setConfirmPending] = useState<ConfirmPending | null>(null);
  
  // Create Admin Form
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  
  // Include inactive users toggle
  const [includeInactive, setIncludeInactive] = useState(true);  // Changed to TRUE by default
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const notify = useNotification();

  useEffect(() => {
    loadUsers();
    loadStats();
  }, [includeInactive]); // Reload when toggle changes

  const loadUsers = async () => {
    try {
      setLoading(true);
      logger.info('AdminSettings', 'Loading ALL system entities', { includeInactive });
      
      const timestamp = Date.now();
      
      // Fetch all three types in parallel
      const [usersResp, operatorsResp, farmersResp] = await Promise.all([
        axios.get(`/users/?t=${timestamp}&include_inactive=${includeInactive}`).catch(() => ({ data: { users: [] } })),
        axios.get(`/operators/?t=${timestamp}`).catch(() => ({ data: { results: [] } })),
        axios.get(`/farmers/?t=${timestamp}&limit=100`).catch(() => ({ data: [] }))
      ]);
      
      logger.info('AdminSettings', 'Fetched all entities', {
        users: Array.isArray(usersResp.data?.users || usersResp.data) ? (usersResp.data?.users || usersResp.data).length : 0,
        operators: (operatorsResp.data?.results || []).length,
        farmers: Array.isArray(farmersResp.data) ? farmersResp.data.length : (farmersResp.data?.results || []).length,
      });
      
      // Combine all into a unified list
      const allUsers: User[] = [];
      
      // Get operators list for lookup
      const operatorsList = operatorsResp.data?.results || operatorsResp.data?.operators || [];
      const operatorsMap = new Map();
      if (Array.isArray(operatorsList)) {
        operatorsList.forEach((op: any) => {
          if (op.email) {
            operatorsMap.set(op.email.toLowerCase(), op.operator_id);
          }
        });
      }
      
      // 1. Add users from users collection
      const usersList = usersResp.data?.users || usersResp.data || [];
      if (Array.isArray(usersList)) {
        usersList.forEach((u: any) => {
          const userRole = (u.role || u.roles?.[0] || 'UNKNOWN').toUpperCase();
          let resourceId = u.email || u._id || '';
          
          // For operators, use operator_id instead of email
          if (userRole === 'OPERATOR' && u.email) {
            const operatorId = operatorsMap.get(u.email.toLowerCase());
            if (operatorId) {
              resourceId = operatorId;
            }
          }
          
          allUsers.push({
            _id: u._id || u.id || '',
            resourceId: resourceId,
            email: u.email || '',
            role: u.role || (u.roles?.[0]) || 'UNKNOWN',
            roles: u.roles || [u.role || 'UNKNOWN'],
            is_active: u.is_active !== false,
            created_at: u.created_at || '',
            full_name: u.full_name,
            phone: u.phone
          });
        });
      }
      
      // 2. Add operators (if they don't have user accounts)
      // operatorsList already declared above for mapping
      if (Array.isArray(operatorsList)) {
        operatorsList.forEach((op: any) => {
          // Only add if not already in users list
          const existingUser = allUsers.find(u => u.email === op.email);
          if (!existingUser) {
            allUsers.push({
              _id: op._id || op.operator_id || '',
              resourceId: op.operator_id || op._id || '',  // Use operator_id
              email: op.email || '',
              role: 'OPERATOR',
              roles: ['OPERATOR'],
              is_active: op.is_active !== false,
              created_at: op.created_at || '',
              full_name: op.full_name || op.operator_name,
              phone: op.phone
            });
          }
        });
      }
      
      // 3. Add farmers (if they don't have user accounts)
      const farmersList = Array.isArray(farmersResp.data) ? farmersResp.data : (farmersResp.data?.results || []);
      if (Array.isArray(farmersList)) {
        farmersList.forEach((f: any) => {
          const email = f.email || f.primary_email || `${f.farmer_id}@farmer.local`;
          const existingUser = allUsers.find(u => u.email === email);
          if (!existingUser) {
            const personalInfo = f.personal_info || {};
            allUsers.push({
              _id: f._id || f.farmer_id || '',
              resourceId: f.farmer_id || f._id || '',  // Use farmer_id (e.g., "ZM1A2B3C4D")
              email: email,
              role: 'FARMER',
              roles: ['FARMER'],
              is_active: f.is_active !== false,
              created_at: f.created_at || '',
              full_name: `${personalInfo.first_name || ''} ${personalInfo.last_name || ''}`.trim() || 'Farmer',
              phone: f.primary_phone || f.phone
            });
          }
        });
      }
      
      logger.info('AdminSettings', `Combined ${allUsers.length} total entities`, {
        admins: allUsers.filter(u => u.role?.toUpperCase() === 'ADMIN').length,
        operators: allUsers.filter(u => u.role?.toUpperCase() === 'OPERATOR').length,
        farmers: allUsers.filter(u => u.role?.toUpperCase() === 'FARMER').length,
      });
      
      setUsers(allUsers);
      
    } catch (err: any) {
      const code = (err as any)?.response?.status;
      const msg  = (err as any)?.response?.data?.detail || "Failed to load users";
      logger.error('AdminSettings', 'Failed to load entities', { error: msg, code });
      if (code === 401) notify.error('Session expired. Please log in again.');
      else notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    logger.info('AdminSettings', 'Loading dashboard stats');
    try {
      const timestamp = Date.now();
      const response = await axios.get(`/dashboard/stats?t=${timestamp}`);
      const metrics = response.data?.users || {};
      const farmerMetrics = response.data?.farmers || {};
      const operatorMetrics = response.data?.operators || {};
      setStats({
        total_users:     metrics.total           || 0,
        active_users:    metrics.active          || 0,
        total_admins:    metrics.by_role?.admin  || 0,
        total_operators: operatorMetrics.total   || 0,
        total_farmers:   farmerMetrics.total     || 0,
      });
      logger.info('AdminSettings', 'Stats updated', { total_users: metrics.total, total_farmers: farmerMetrics.total });
    } catch (err: any) {
      logger.error('AdminSettings', 'Failed to load stats', { error: err?.message });
    }
  };

  const createAdmin = async () => {
    if (!newAdminEmail || !newAdminPassword) {
      setError("Email and password required");
      return;
    }
    
    // Validate password strength
    if (newAdminPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!/[A-Z]/.test(newAdminPassword)) {
      setError("Password must contain at least 1 uppercase letter");
      return;
    }
    if (!/[a-z]/.test(newAdminPassword)) {
      setError("Password must contain at least 1 lowercase letter");
      return;
    }
    if (!/[0-9]/.test(newAdminPassword)) {
      setError("Password must contain at least 1 number");
      return;
    }
    
    const adminEmail = newAdminEmail.trim();
    logger.info('AdminSettings', 'Creating admin user', { email: adminEmail });
    try {
      setError(null);
      const response = await axios.post("/users/", {
        email: adminEmail,
        password: newAdminPassword,
        roles: ["ADMIN"]
      });
      logger.info('AdminSettings', 'Admin created successfully', { email: adminEmail, id: (response.data as any)?._id });
      notify.success(`Admin account created for ${adminEmail}`);
      setNewAdminEmail("");
      setNewAdminPassword("");
      setShowCreateAdmin(false);
      await Promise.all([loadUsers(), loadStats()]);
    } catch (err: any) {
      const code   = err?.response?.status;
      const detail = err?.response?.data?.detail;
      const msg    = Array.isArray(detail) ? detail.map((d: any) => d.msg || d).join(', ') : (detail || 'Failed to create admin');
      logger.error('AdminSettings', 'Failed to create admin', { email: adminEmail, error: msg, code });
      if      (code === 401) setError('Authentication failed. Please log in again.');
      else if (code === 409) setError('An account with this email already exists.');
      else if (code === 422) setError(`Validation error: ${msg}`);
      else                   setError(msg);
    }
  };

  /** Returns true if a resourceId is an email (orphaned user — no proper ID assigned) */
  const isEmailFallback = (id: string) => id.includes('@');

  const deactivateUser = async (resourceId: string, email: string, role: string) => {
    const currentEmail = useAuthStore.getState().user?.email;
    if (email.toLowerCase() === currentEmail?.toLowerCase()) {
      notify.error("You cannot deactivate your own account.");
      return;
    }
    setConfirmPending({
      label: `Deactivate ${email}?`,
      danger: true,
      onConfirm: async () => {
        setConfirmPending(null);
        const loadingKey = `deactivate-${email}`;
        setActionLoadingId(loadingKey);
        logger.info("AdminSettings", "Deactivating user", { email, role, resourceId });
    try {
      const roleUp = role.toUpperCase();
      if (roleUp === 'FARMER') {
        await axios.patch(`/farmers/${resourceId}/review?new_status=registered`);
      } else if (roleUp === 'OPERATOR') {
        // If resourceId is an email (orphaned — no operator record), use users endpoint
        if (isEmailFallback(resourceId)) {
          await axios.patch(`/users/${email}/status`, { is_active: false });
        } else {
          await axios.put(`/operators/${resourceId}`, { is_active: false });
        }
      } else {
        await axios.patch(`/users/${email}/status`, { is_active: false });
      }
        logger.info("AdminSettings", "User deactivated", { email });
        notify.success(`${email} has been deactivated.`);
        await Promise.all([loadUsers(), loadStats()]);
      } catch (err: any) {
        const status = err?.response?.status;
        const detail = err?.response?.data?.detail;
        logger.error("AdminSettings", "Failed to deactivate user", { email, status, detail });
        if (status === 404) notify.error(`User not found: ${email}`);
        else if (status === 403) notify.error("Access denied — admin rights required.");
        else notify.error(detail || "Failed to deactivate user. Please try again.");
      } finally {
        setActionLoadingId(null);
      }
    },
  });
  };

  const activateUser = async (resourceId: string, email: string, role: string) => {
    setConfirmPending({
      label: `Activate ${email}?`,
      danger: false,
      onConfirm: async () => {
        setConfirmPending(null);
        const loadingKey = `activate-${email}`;
        setActionLoadingId(loadingKey);
        logger.info("AdminSettings", "Activating user", { email, role, resourceId });
    try {
      const roleUp = role.toUpperCase();
      if (roleUp === 'FARMER') {
        await axios.patch(`/farmers/${resourceId}/review?new_status=verified`);
      } else if (roleUp === 'OPERATOR') {
        if (isEmailFallback(resourceId)) {
          await axios.patch(`/users/${email}/status`, { is_active: true });
        } else {
          await axios.put(`/operators/${resourceId}`, { is_active: true });
        }
      } else {
        await axios.patch(`/users/${email}/status`, { is_active: true });
      }
        logger.info("AdminSettings", "User activated", { email });
        notify.success(`${email} has been activated.`);
        await Promise.all([loadUsers(), loadStats()]);
      } catch (err: any) {
        const status = err?.response?.status;
        const detail = err?.response?.data?.detail;
        logger.error("AdminSettings", "Failed to activate user", { email, status, detail });
        if (status === 404) notify.error(`User not found: ${email}`);
        else if (status === 403) notify.error("Access denied — admin rights required.");
        else notify.error(detail || "Failed to activate user. Please try again.");
      } finally {
        setActionLoadingId(null);
      }
    },
  });
  };

  const deleteUser = async (resourceId: string, email: string, role: string) => {
    const currentEmail = useAuthStore.getState().user?.email;
    if (email.toLowerCase() === currentEmail?.toLowerCase()) {
      notify.error("You cannot delete your own account.");
      return;
    }
    setConfirmPending({
      label: `Permanently delete ${email}? This cannot be undone.`,
      danger: true,
      onConfirm: async () => {
        setConfirmPending(null);
        const loadingKey = `delete-${email}`;
        setActionLoadingId(loadingKey);
        logger.info("AdminSettings", "Deleting user", { email, role, resourceId });
    try {
      const roleUp = role.toUpperCase();
      if (roleUp === 'FARMER') {
        await axios.delete(`/farmers/${resourceId}`);
      } else if (roleUp === 'OPERATOR') {
        // If resourceId is an email (orphaned user — no operator_id), delete via users endpoint
        if (isEmailFallback(resourceId)) {
          logger.warn("AdminSettings", `Orphaned operator user detected (${email}), deleting via /users`);
          await axios.delete(`/users/${email}`);
        } else {
          await axios.delete(`/operators/${resourceId}`);
        }
      } else {
        await axios.delete(`/users/${email}`);
      }
        logger.info("AdminSettings", "User deleted", { email });
        notify.success(`${email} has been permanently deleted.`);
        await Promise.all([loadUsers(), loadStats()]);
      } catch (err: any) {
        const status = err?.response?.status;
        const detail = err?.response?.data?.detail;
        logger.error("AdminSettings", "Failed to delete user", { email, status, detail });
        if (status === 404) notify.error(`User not found: ${email} — may have already been deleted.`);
        else if (status === 403) notify.error("Access denied — admin rights required.");
        else if (status === 400) notify.error(detail || "Cannot delete this account (safety constraint).");
        else notify.error(detail || "Failed to delete user. Please try again.");
      } finally {
        setActionLoadingId(null);
      }
    },
  });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton to="/admin-dashboard" />
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">⚙️ Settings</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                loadUsers();
                loadStats();
              }}
              disabled={loading}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className={`fa-solid fa-rotate-right mr-2 ${loading ? 'animate-spin' : ''}`}></i>
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-2 flex gap-2 overflow-x-auto">
          {[
            { value: "data",       label: "🗺️ Data" },
            { value: "users",      label: "👥 Users" },
            { value: "system",     label: "📊 System" },
            { value: "appearance", label: "🎨 Appearance" },
            { value: "security",   label: "🔐 Security" }
          ].map(t => (
            <button
              key={t.value}
              onClick={() => setActiveTab(t.value as any)}
              className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition ${
                activeTab === t.value
                  ? "bg-green-700 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && activeTab === "users" ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 dark:border-gray-600 border-t-green-600"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading settings...</p>
          </div>
        ) : (
          <>
            {/* Users Tab */}
            {activeTab === "users" && (
              <div className="space-y-6">
                {/* Create Admin Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">➕ Create New Admin</h2>
                  {!showCreateAdmin ? (
                    <button
                      onClick={() => setShowCreateAdmin(true)}
                      className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-lg transition"
                    >
                      Create Admin
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <input
                        type="email"
                        placeholder="Admin Email"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                      />
                      <div>
                        <input
                          type="password"
                          placeholder="Password"
                          value={newAdminPassword}
                          onChange={(e) => setNewAdminPassword(e.target.value)}
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                        />
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Requirements: Min 8 chars, 1 uppercase, 1 lowercase, 1 number
                        </p>
                      </div>
                      {error && (
                        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg px-3 py-2 text-sm">
                          <span className="mt-0.5">⚠️</span>
                          <span>{error}</span>
                          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 font-bold leading-none">×</button>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={createAdmin}
                          className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-lg transition"
                        >
                          Create Admin
                        </button>
                        <button
                          onClick={() => setShowCreateAdmin(false)}
                          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 dark:text-gray-100 font-bold py-2 px-4 rounded-lg transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Users List */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">All System Users ({users.length})</h2>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Manage all users: 
                        <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full font-semibold">
                          {users.filter(u => u.role.toUpperCase() === 'ADMIN').length} Admins
                        </span>
                        <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-semibold">
                          {users.filter(u => u.role.toUpperCase() === 'OPERATOR').length} Operators
                        </span>
                        <span className="ml-1 px-2 py-0.5 bg-green-100 text-green-800 rounded-full font-semibold">
                          {users.filter(u => u.role.toUpperCase() === 'FARMER').length} Farmers
                        </span>
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={includeInactive}
                        onChange={(e) => setIncludeInactive(e.target.checked)}
                        className="rounded"
                      />
                      Show inactive
                    </label>
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                      <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold uppercase text-xs">
                        <tr>
                          <th className="px-6 py-3">Email</th>
                          <th className="px-6 py-3">Role</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3">Created</th>
                          <th className="px-6 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {users.map(user => (
                          <tr key={user._id} className="hover:bg-green-50 transition">
                            <td className="px-6 py-4 font-mono text-xs">{user.email}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                                user.role.toUpperCase() === 'ADMIN' 
                                  ? 'bg-purple-100 text-purple-800'
                                  : user.role.toUpperCase() === 'OPERATOR'
                                  ? 'bg-blue-100 text-blue-800'
                                  : user.role.toUpperCase() === 'FARMER'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100'
                              }`}>
                                {user.role.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                                user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              }`}>
                                {user.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs">{new Date(user.created_at).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-xs space-x-2">
                              {user.is_active ? (
                                <button
                                  onClick={() => deactivateUser(user.resourceId, user.email, user.role)}
                                  disabled={actionLoadingId !== null}
                                  className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Deactivate"
                                >
                                  {actionLoadingId === `deactivate-${user.email}` ? '⏳' : '🔴 Deactivate'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => activateUser(user.resourceId, user.email, user.role)}
                                  disabled={actionLoadingId !== null}
                                  className="px-3 py-1 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Activate"
                                >
                                  {actionLoadingId === `activate-${user.email}` ? '⏳' : '🟢 Activate'}
                                </button>
                              )}
                              <button
                                onClick={() => deleteUser(user.resourceId, user.email, user.role)}
                                disabled={actionLoadingId !== null}
                                className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete"
                              >
                                {actionLoadingId === `delete-${user.email}` ? '⏳' : '🗑️ Delete'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
                    {users.map(user => (
                      <div key={user._id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100 break-all">{user.email}</h3>
                          <span className={`px-2 py-1 text-xs font-bold rounded-full whitespace-nowrap ml-2 ${
                            user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>
                            {user.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          <strong>Role:</strong> 
                          <span className={`ml-2 px-2 py-1 text-xs font-bold rounded-full ${
                            user.role.toUpperCase() === 'ADMIN' 
                              ? 'bg-purple-100 text-purple-800'
                              : user.role.toUpperCase() === 'OPERATOR'
                              ? 'bg-blue-100 text-blue-800'
                              : user.role.toUpperCase() === 'FARMER'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100'
                          }`}>
                            {user.role.toUpperCase()}
                          </span>
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3"><strong>Created:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
                        <div className="flex gap-2 text-xs">
                          {user.is_active ? (
                            <button
                              onClick={() => deactivateUser(user.resourceId, user.email, user.role)}
                              disabled={actionLoadingId !== null}
                              className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 font-bold py-1 px-2 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Deactivate"
                            >
                              {actionLoadingId === `deactivate-${user.email}` ? '⏳' : '🔴 Deactivate'}
                            </button>
                          ) : (
                            <button
                              onClick={() => activateUser(user.resourceId, user.email, user.role)}
                              disabled={actionLoadingId !== null}
                              className="flex-1 bg-green-100 text-green-700 hover:bg-green-200 font-bold py-1 px-2 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Activate"
                            >
                              {actionLoadingId === `activate-${user.email}` ? '⏳' : '🟢 Activate'}
                            </button>
                          )}
                          <button
                            onClick={() => deleteUser(user.resourceId, user.email, user.role)}
                            disabled={actionLoadingId !== null}
                            className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 font-bold py-1 px-2 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete"
                          >
                            {actionLoadingId === `delete-${user.email}` ? '⏳' : '🗑️ Delete'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {users.length === 0 && (
                    <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                      <p className="text-lg font-semibold mb-2">No users found</p>
                      <p className="text-sm">
                        {includeInactive ? "No users in the system" : "No active users. Toggle 'Show inactive' to see all users."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* System Tab */}
            {activeTab === "system" && stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border-l-4 border-green-600">
                  <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-500 uppercase font-bold tracking-wider">Total Users</p>
                  <h3 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-1">{stats.total_users}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-500 mt-1">{stats.active_users} active</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border-l-4 border-blue-600">
                  <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-500 uppercase font-bold tracking-wider">Admins</p>
                  <h3 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-1">{stats.total_admins}</h3>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border-l-4 border-orange-500">
                  <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-500 uppercase font-bold tracking-wider">Operators</p>
                  <h3 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-1">{stats.total_operators}</h3>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border-l-4 border-purple-600">
                  <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-500 uppercase font-bold tracking-wider">Farmers</p>
                  <h3 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-1">{stats.total_farmers}</h3>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border-l-4 border-cyan-600">
                  <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-500 uppercase font-bold tracking-wider">Total Entities</p>
                  <h3 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-1">
                    {stats.total_users + stats.total_farmers}
                  </h3>
                </div>
              </div>
            )}

            {/* Data Management Tab — inline geo management */}
            {activeTab === "data" && <InlineGeoManager />}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 border border-gray-100 dark:border-gray-700">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">🔐 Security Settings</h2>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-600">
                      <p className="font-bold text-sm text-blue-800 dark:text-blue-300">JWT Token Expiration</p>
                      <p className="text-xs mt-1 text-blue-700 dark:text-blue-400">Access tokens expire after 30 minutes. Refresh tokens expire after 7 days.</p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-600">
                      <p className="font-bold text-sm text-green-800 dark:text-green-300">Password Requirements</p>
                      <p className="text-xs mt-1 text-green-700 dark:text-green-400">Min 8 chars, 1 uppercase, 1 lowercase, 1 number.</p>
                    </div>
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-l-4 border-orange-500">
                      <p className="font-bold text-sm text-orange-800 dark:text-orange-300">API Rate Limiting</p>
                      <p className="text-xs mt-1 text-orange-700 dark:text-orange-400">100 requests per minute per IP for public endpoints.</p>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-l-4 border-purple-600">
                      <p className="font-bold text-sm text-purple-800 dark:text-purple-300">Data Protection</p>
                      <p className="text-xs mt-1 text-purple-700 dark:text-purple-400">All sensitive data is encrypted at rest and in transit.</p>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-600">
                      <p className="font-bold text-sm text-red-800 dark:text-red-300">Version</p>
                      <p className="text-xs mt-1 text-red-700 dark:text-red-400">CEM Farmer System v{APP_VERSION} ({PHASE})</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === "appearance" && <AppearanceTab />}
          </>
        )}
      </div>

      {/* Confirm Modal */}
      {confirmPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 leading-snug">
              {confirmPending.label}
            </h3>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmPending(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmPending.onConfirm}
                className={`px-4 py-2 rounded-lg text-white text-sm font-semibold transition ${
                  confirmPending.danger
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-700 hover:bg-green-800"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
