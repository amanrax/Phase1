import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { operatorService } from "@/services/operator.service";
import geoService from "@/services/geo.service";
import { GeoSelectWithOther } from "@/components/GeoSelectWithOther";
import PhoneInput from "@/components/PhoneInput";
import { logger } from "@/utils/logger";
import { useNotification } from "@/contexts/NotificationContext";

interface Operator {
  _id: string;
  operator_id: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone?: string;
  is_active?: boolean;
  assigned_district?: string;
  assigned_districts?: string[];
  assigned_regions?: string[];
  created_at?: string;
  updated_at?: string;
  farmer_count?: number;
}

interface Province { code: string; name: string }
interface District { code: string; name: string }

interface GeoValue {
  province_code: string;
  province_name: string;
  district_code: string;
  district_name: string;
  chiefdom_code: string;
  chiefdom_name: string;
}

const emptyGeo: GeoValue = {
  province_code: "", province_name: "",
  district_code: "", district_name: "",
  chiefdom_code: "", chiefdom_name: "",
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    { label: "8+ chars",  ok: password.length >= 8 },
    { label: "Uppercase", ok: /[A-Z]/.test(password) },
    { label: "Lowercase", ok: /[a-z]/.test(password) },
    { label: "Number",    ok: /[0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const barColor =
    score <= 1 ? "bg-red-500" :
    score <= 2 ? "bg-orange-400" :
    score <= 3 ? "bg-yellow-400" : "bg-green-500";
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1 flex-1 rounded ${i <= score ? barColor : "bg-gray-200 dark:bg-gray-600"}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {checks.map(c => (
          <span
            key={c.label}
            className={`text-xs ${c.ok ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`}
          >
            {c.ok ? "✓" : "○"} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[...Array(7)].map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div className="p-4 space-y-3 animate-pulse">
      <div className="flex justify-between">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-28" />
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[...Array(4)].map((_, i) => <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />)}
      </div>
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}

function ConfirmDialog({
  label, danger, onConfirm, onCancel,
}: {
  label: string; danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 leading-snug">
          {label}
        </h3>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-white text-sm font-semibold transition ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-green-700 hover:bg-green-800"
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Eye toggle button ───────────────────────────────────────────────────────

function EyeBtn({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition text-base select-none"
      aria-label={show ? "Hide password" : "Show password"}
    >
      {show ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  );
}

// ─── Input class helpers ───────────────────────────────────────────────────────

const inputCls =
  "w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 " +
  "bg-white dark:bg-gray-700 text-gray-900 dark:text-white " +
  "placeholder-gray-400 dark:placeholder-gray-500 " +
  "focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm transition";

const selectCls =
  "w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg " +
  "bg-white dark:bg-gray-700 text-gray-900 dark:text-white " +
  "focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900 text-sm transition";

const labelCls = "text-xs font-bold text-gray-600 dark:text-gray-400 uppercase";

const errorBannerCls =
  "flex items-start gap-2 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 " +
  "dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm";

// ─── Main Component ────────────────────────────────────────────────────────────

export default function OperatorManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const notify   = useNotification();

  const [operators,        setOperators]        = useState<Operator[]>([]);
  const [loading,          setLoading]          = useState(false);
  const [updatingId,       setUpdatingId]       = useState<string | null>(null);
  const [submitting,       setSubmitting]       = useState(false);

  const [showCreateModal,  setShowCreateModal]  = useState(false);
  const [showViewModal,    setShowViewModal]    = useState(false);
  const [showEditModal,    setShowEditModal]    = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);

  // Separate error states so create/edit errors don't bleed into each other
  const [createError, setCreateError] = useState("");
  const [editError,   setEditError]   = useState("");

  // Password visibility toggles (create form)
  const [showCreatePwd,        setShowCreatePwd]        = useState(false);
  const [showCreateConfirmPwd, setShowCreateConfirmPwd] = useState(false);
  // Password visibility toggles (edit form)
  const [showEditPwd,          setShowEditPwd]          = useState(false);
  const [showEditConfirmPwd,   setShowEditConfirmPwd]   = useState(false);

  // Confirm modal
  type ConfirmPending = { label: string; danger?: boolean; onConfirm: () => void };
  const [confirmPending, setConfirmPending] = useState<ConfirmPending | null>(null);

  const [formData, setFormData] = useState({
    first_name: "", last_name: "", email: "",
    password: "", confirmPassword: "", phone: "",
  });
  const [createGeoValue, setCreateGeoValue] = useState<GeoValue>(emptyGeo);

  const [editFormData, setEditFormData] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    password: "", confirmPassword: "", is_active: true,
  });
  const [editGeoValue, setEditGeoValue] = useState<GeoValue>(emptyGeo);

  const [currentPage,     setCurrentPage]     = useState(0);
  const [pageSize]                            = useState(10);
  const [totalOperators,  setTotalOperators]  = useState(0);
  const [searchBy,        setSearchBy]        = useState<"name" | "operator_id">("name");
  const [searchValue,     setSearchValue]     = useState("");
  const [statusFilter,    setStatusFilter]    = useState<"all" | "active" | "inactive">("all");

  // Helper: open create modal with fully-reset form (used by header button + deep-link from dashboard)
  const openCreateModal = useCallback(() => {
    logger.info("OperatorManagement", "Create modal opened (fresh form)");
    setFormData({ first_name: "", last_name: "", email: "", password: "", confirmPassword: "", phone: "" });
    setCreateGeoValue(emptyGeo);
    setCreateError("");
    setShowCreatePwd(false);
    setShowCreateConfirmPwd(false);
    setShowCreateModal(true);
  }, []);

  useEffect(() => {
    loadOperators(0);
    // If navigated here from Dashboard's "Add Operator" quick action, auto-open create modal
    if ((location.state as any)?.openCreate) {
      openCreateModal();
      // Clear the state so refresh doesn't re-open the modal
      window.history.replaceState({}, "");
    }
  }, []);

  // ── Data ──────────────────────────────────────────────────────────────────────

  const loadOperators = useCallback(async (page = 0) => {
    setLoading(true);
    logger.info("OperatorManagement", `Loading operators (page ${page})`);
    try {
      const data = await operatorService.getOperators(200, 0);
      let list: Operator[] = [];
      let total = 0;
      if (Array.isArray(data)) {
        list = data; total = data.length;
      } else if (Array.isArray(data.results)) {
        list = data.results; total = data.total ?? data.count ?? data.results.length;
      } else if (Array.isArray(data.operators)) {
        list = data.operators; total = data.total ?? data.operators.length;
      }
      logger.info("OperatorManagement", `Loaded ${list.length} operators`, { total });
      setOperators(list);
      setTotalOperators(total);
      setCurrentPage(page);
    } catch (err: any) {
      const code   = err?.response?.status;
      const detail = err?.response?.data?.detail || err?.message;
      logger.error("OperatorManagement", "Failed to load operators", { code, detail });
      if (code === 401) notify.error("Session expired. Please log in again.");
      else if (code === 403) notify.error("Access denied — admin rights required.");
      else notify.error(detail || "Failed to load operators. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDistricts = async (provinceCode: string): Promise<District[]> => {
    try {
      return await geoService.districts(provinceCode);
    } catch {
      logger.error("OperatorManagement", "Failed to load districts", { provinceCode });
      return [];
    }
  };

  // ── Filters ───────────────────────────────────────────────────────────────────

  const filteredOperators = operators.filter(op => {
    const q = searchValue.toLowerCase().trim();
    const matchSearch = !q || (
      searchBy === "name"
        ? op.full_name.toLowerCase().includes(q)
        : op.operator_id.toLowerCase().includes(q)
    );
    const matchStatus =
      statusFilter === "all"      ? true :
      statusFilter === "active"   ? !!op.is_active :
                                    !op.is_active;
    return matchSearch && matchStatus;
  });

  const paged = filteredOperators.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const getDistrictDisplayName = (v?: string) => {
    if (!v) return "N/A";
    return /^[A-Z]{2}\d{2}$/.test(v) ? `${v} (Code)` : v;
  };

  // ── Modals ────────────────────────────────────────────────────────────────────

  const openViewModal = (op: Operator) => {
    logger.info("OperatorManagement", "Viewing operator details", { operator_id: op.operator_id, email: op.email });
    setSelectedOperator(op);
    setShowViewModal(true);
  };

  const openEditModal = async (op: Operator) => {
    logger.info("OperatorManagement", "Opening edit modal", { operator_id: op.operator_id });
    setSelectedOperator(op);
    setEditError("");
    setShowEditPwd(false);
    setShowEditConfirmPwd(false);

    const currentDistrict = op.assigned_district || op.assigned_districts?.[0] || "";
    const currentRegion   = op.assigned_regions?.[0] || "";

    let districtName = currentDistrict, districtCode = "";
    let provinceCode = "", provinceName = currentRegion;

    try {
      const allProvinces = await geoService.provinces();
      const matchProv = allProvinces.find((p: Province) =>
        p.name.toLowerCase() === currentRegion.toLowerCase() || p.code === currentRegion
      );
      if (matchProv) { provinceCode = matchProv.code; provinceName = matchProv.name; }

      if (currentDistrict && /^[A-Z]{2}\d{2}$/.test(currentDistrict)) {
        const allDistricts = await geoService.districts();
        const matchDist = allDistricts.find((d: District) => d.code === currentDistrict);
        if (matchDist) { districtName = matchDist.name; districtCode = matchDist.code; }
      } else if (currentDistrict && provinceCode) {
        const provDistricts = await loadDistricts(provinceCode);
        const matchDist = provDistricts.find((d: District) =>
          d.name.toLowerCase() === currentDistrict.toLowerCase()
        );
        if (matchDist) districtCode = matchDist.code;
      }
    } catch (err) {
      logger.error("OperatorManagement", "Error resolving geo for edit", { error: String(err) });
    }

    const parts     = (op.full_name || "").split(" ");
    const firstName = parts[0] || "";
    const lastName  = parts.slice(1).join(" ") || "";

    setEditFormData({
      first_name: firstName, last_name: lastName,
      email: op.email || "", phone: op.phone || "",
      password: "", confirmPassword: "",
      is_active: op.is_active ?? true,
    });
    setEditGeoValue({
      province_code: provinceCode, province_name: provinceName,
      district_code: districtCode, district_name: districtName,
      chiefdom_code: "", chiefdom_name: "",
    });
    setShowEditModal(true);
    setShowViewModal(false);
  };

  // ── Actions ───────────────────────────────────────────────────────────────────

  const handleToggleActive = (operatorId: string, currentStatus: boolean, name: string) => {
    const action = currentStatus ? "Deactivate" : "Activate";
    logger.info("OperatorManagement", `Requesting ${action} confirmation`, { operatorId, name });
    setConfirmPending({
      label: `${action} operator "${name}"?`,
      danger: currentStatus,
      onConfirm: async () => {
        setConfirmPending(null);
        setUpdatingId(operatorId);
        logger.info("OperatorManagement", `${action}ing operator`, { operatorId });
        try {
          await operatorService.update(operatorId, { is_active: !currentStatus });
          logger.info("OperatorManagement", `Operator ${action.toLowerCase()}d`, { operatorId });
          notify.success(`Operator ${action.toLowerCase()}d successfully.`);
          loadOperators(currentPage);
        } catch (err: any) {
          const code   = err?.response?.status;
          const detail = err?.response?.data?.detail;
          logger.error("OperatorManagement", `Failed to ${action.toLowerCase()} operator`, { operatorId, code, detail });
          if (code === 404) notify.error("Operator not found — it may have been deleted.");
          else if (code === 403) notify.error("Access denied — admin rights required.");
          else notify.error(detail || `Failed to ${action.toLowerCase()} operator. Please try again.`);
        } finally {
          setUpdatingId(null);
        }
      },
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOperator) return;
    setEditError("");

    if (editFormData.password || editFormData.confirmPassword) {
      if (editFormData.password !== editFormData.confirmPassword) {
        setEditError("Passwords do not match"); return;
      }
      if (editFormData.password.length < 8) {
        setEditError("Password must be at least 8 characters"); return;
      }
      if (!/[A-Z]/.test(editFormData.password)) {
        setEditError("Password must contain at least 1 uppercase letter"); return;
      }
      if (!/[0-9]/.test(editFormData.password)) {
        setEditError("Password must contain at least 1 number"); return;
      }
    }

    setSubmitting(true);
    logger.info("OperatorManagement", "Submitting edit", { operator_id: selectedOperator.operator_id });
    try {
      const full_name = `${editFormData.first_name} ${editFormData.last_name}`.trim();
      const payload: any = {
        full_name, email: editFormData.email,
        phone: editFormData.phone, is_active: editFormData.is_active,
      };
      if (editFormData.password) payload.password = editFormData.password;

      const distVal = editGeoValue.district_name || editGeoValue.district_code;
      if (distVal)                   payload.assigned_districts = [distVal];
      if (editGeoValue.province_name) payload.assigned_regions  = [editGeoValue.province_name];

      await operatorService.update(selectedOperator.operator_id, payload);
      logger.info("OperatorManagement", "Operator updated", { operator_id: selectedOperator.operator_id });
      notify.success("Operator updated successfully.");
      setShowEditModal(false);
      setSelectedOperator(null);
      setEditGeoValue(emptyGeo);
      loadOperators(currentPage);
    } catch (err: any) {
      const code   = err?.response?.status;
      const detail = err?.response?.data?.detail;
      logger.error("OperatorManagement", "Failed to update operator", { code, detail });
      if      (code === 409) setEditError(detail || "Email already in use by another account.");
      else if (code === 404) { notify.error("Operator not found — it may have been deleted."); setShowEditModal(false); }
      else if (code === 422) setEditError("Please check all required fields.");
      else if (code === 401) { notify.error("Session expired. Please log in again."); }
      else setEditError(detail || "Failed to update operator. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setCreateError("First name and last name are required"); return;
    }
    if (!formData.email.trim()) {
      setCreateError("Email is required"); return;
    }
    if (!formData.password) {
      setCreateError("Password is required"); return;
    }
    if (formData.password !== formData.confirmPassword) {
      setCreateError("Passwords do not match"); return;
    }
    if (formData.password.length < 8) {
      setCreateError("Password must be at least 8 characters"); return;
    }
    if (!/[A-Z]/.test(formData.password)) {
      setCreateError("Password must contain at least 1 uppercase letter"); return;
    }
    if (!/[0-9]/.test(formData.password)) {
      setCreateError("Password must contain at least 1 number"); return;
    }

    setSubmitting(true);
    logger.info("OperatorManagement", "Creating operator", { email: formData.email });
    try {
      const distVal = createGeoValue.district_name || createGeoValue.district_code;
      const payload = {
        first_name: formData.first_name.trim(),
        last_name:  formData.last_name.trim(),
        email:      formData.email.trim(),
        phone:      formData.phone.replace(/[\s\-()]/g, ""),
        password:   formData.password,
        role:       "OPERATOR",
        assigned_districts: distVal                     ? [distVal]                      : [],
        assigned_regions:   createGeoValue.province_name ? [createGeoValue.province_name] : [],
      };

      await operatorService.create(payload);
      logger.info("OperatorManagement", "Operator created", { email: formData.email });
      notify.success(`Operator account created for ${formData.email}`);
      setShowCreateModal(false);
      setFormData({ first_name: "", last_name: "", email: "", password: "", confirmPassword: "", phone: "" });
      setCreateGeoValue(emptyGeo);
      loadOperators(0);
    } catch (err: any) {
      const code   = err?.response?.status;
      const detail = err?.response?.data?.detail;
      logger.error("OperatorManagement", "Failed to create operator", { code, detail });
      if      (code === 409) setCreateError(detail || "An account with this email already exists.");
      else if (code === 422) setCreateError("Please check all required fields and try again.");
      else if (code === 401) { notify.error("Session expired. Please log in again."); setShowCreateModal(false); }
      else setCreateError(detail || "Failed to create operator. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Status badge ─────────────────────────────────────────────────────────────

  const StatusBadge = ({ active }: { active: boolean | undefined }) => (
    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
      active
        ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-400"
        : "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-400"
    }`}>
      {active ? "Active" : "Inactive"}
    </span>
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 transition-colors duration-300">

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin-dashboard")}
              className="text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-bold text-sm transition"
            >
              ← BACK
            </button>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">👨‍💼 Operator Management</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { logger.info("OperatorManagement", "Manual refresh triggered"); loadOperators(currentPage); }}
              disabled={loading}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition"
            >
              {loading ? "⟳" : "↺"} Refresh
            </button>
            <button
              onClick={openCreateModal}
              className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              + Create Operator
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ── Search + Filter Bar ─────────────────────────────────────────────── */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-end">
          {/* Search By */}
          <div className="min-w-[140px]">
            <label className={`${labelCls} block mb-1`}>Search By</label>
            <select
              value={searchBy}
              onChange={(e) => {
                setSearchBy(e.target.value as any);
                setSearchValue("");
                logger.info("OperatorManagement", "Search field changed", { searchBy: e.target.value });
              }}
              className={selectCls}
            >
              <option value="name">Name</option>
              <option value="operator_id">Operator ID</option>
            </select>
          </div>

          {/* Search Value */}
          <div className="flex-1 min-w-[180px]">
            <label className={`${labelCls} block mb-1`}>Search</label>
            <div className="relative">
              <input
                type="text"
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value);
                  logger.info("OperatorManagement", "Search value changed", { searchBy, value: e.target.value });
                }}
                placeholder={searchBy === "name" ? "Search by name…" : "Search by operator ID…"}
                className={`${selectCls} pr-8`}
              />
              {searchValue && (
                <button
                  onClick={() => { setSearchValue(""); logger.info("OperatorManagement", "Search cleared"); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
                >×</button>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div className="min-w-[140px]">
            <label className={`${labelCls} block mb-1`}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(0);
                logger.info("OperatorManagement", "Status filter changed", { status: e.target.value });
              }}
              className={selectCls}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Summary */}
          <div className="text-xs text-gray-500 dark:text-gray-400 self-end pb-2">
            <span className="font-semibold text-gray-700 dark:text-gray-300">{filteredOperators.length}</span> of {operators.length} operators
          </div>
        </div>

        {/* ── Operator Table / Cards ──────────────────────────────────────────── */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold uppercase text-xs">
                  <tr>
                    {["Operator ID","Full Name","Email","Phone","District","Status","Actions"].map(h => (
                      <th key={h} className="px-6 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        ) : filteredOperators.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <p className="text-5xl mb-4">👨‍💼</p>
            <p className="text-gray-700 dark:text-gray-300 font-semibold text-lg">
              {operators.length === 0 ? "No operators yet" : "No operators match your filters"}
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
              {operators.length === 0
                ? "Create the first operator account to get started."
                : "Try adjusting your search or status filter."}
            </p>
            {operators.length === 0 && (
              <button
                onClick={openCreateModal}
                className="mt-6 bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-6 rounded-lg transition"
              >
                + Create First Operator
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3">Operator ID</th>
                    <th className="px-6 py-3">Full Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Phone</th>
                    <th className="px-6 py-3">District</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paged.map(op => (
                    <tr
                      key={op._id}
                      className="hover:bg-green-50 dark:hover:bg-gray-700/50 transition"
                    >
                      <td className="px-6 py-4 font-semibold text-gray-800 dark:text-gray-100 font-mono text-xs">
                        {op.operator_id || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-gray-800 dark:text-gray-200">{op.full_name || "Unknown"}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{op.email || "N/A"}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{op.phone || "N/A"}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                        {getDistrictDisplayName(op.assigned_district || op.assigned_districts?.[0])}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge active={op.is_active} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 items-center flex-wrap">
                          <button
                            onClick={() => openViewModal(op)}
                            className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-xs font-semibold rounded transition"
                          >
                            👁 View
                          </button>
                          <button
                            onClick={() => openEditModal(op)}
                            className="px-3 py-1 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-400 text-xs font-semibold rounded transition"
                          >
                            ✏️ Edit
                          </button>
                          {op.is_active ? (
                            <button
                              onClick={() => handleToggleActive(op.operator_id, true, op.full_name)}
                              disabled={updatingId === op.operator_id}
                              className="px-3 py-1 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 text-xs font-semibold rounded transition disabled:opacity-50"
                            >
                              {updatingId === op.operator_id ? "…" : "⛔ Deactivate"}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleActive(op.operator_id, false, op.full_name)}
                              disabled={updatingId === op.operator_id}
                              className="px-3 py-1 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 text-xs font-semibold rounded transition disabled:opacity-50"
                            >
                              {updatingId === op.operator_id ? "…" : "✅ Activate"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {paged.map(op => (
                <div key={op._id} className="p-4 hover:bg-green-50 dark:hover:bg-gray-700/50 transition space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={`${labelCls} mb-0.5`}>Operator ID</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-100 font-mono text-xs">{op.operator_id || "N/A"}</p>
                    </div>
                    <StatusBadge active={op.is_active} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      ["Name",     op.full_name || "Unknown"],
                      ["Email",    op.email || "N/A"],
                      ["Phone",    op.phone || "N/A"],
                      ["District", getDistrictDisplayName(op.assigned_district || op.assigned_districts?.[0])],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <p className={`${labelCls} mb-0.5`}>{k}</p>
                        <p className="text-gray-700 dark:text-gray-300 text-xs break-all">{v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => openViewModal(op)}
                      className="flex-1 py-2 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-xs font-semibold rounded transition"
                    >👁 View</button>
                    <button
                      onClick={() => openEditModal(op)}
                      className="flex-1 py-2 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-400 text-xs font-semibold rounded transition"
                    >✏️ Edit</button>
                    <button
                      onClick={() => handleToggleActive(op.operator_id, op.is_active ?? false, op.full_name)}
                      disabled={updatingId === op.operator_id}
                      className={`flex-1 py-2 text-xs font-semibold rounded transition disabled:opacity-50 ${
                        op.is_active
                          ? "bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400"
                          : "bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400"
                      }`}
                    >
                      {updatingId === op.operator_id ? "…" : op.is_active ? "⛔ Deactivate" : "✅ Activate"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-wrap justify-between items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <span>
                Showing {filteredOperators.length === 0 ? 0 : currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, filteredOperators.length)} of {filteredOperators.length} filtered (Total: {totalOperators})
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const p = currentPage - 1;
                    setCurrentPage(p);
                    logger.info("OperatorManagement", "Pagination: prev", { page: p });
                  }}
                  disabled={currentPage === 0}
                  className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >← Prev</button>
                <button
                  onClick={() => {
                    const p = currentPage + 1;
                    setCurrentPage(p);
                    logger.info("OperatorManagement", "Pagination: next", { page: p });
                  }}
                  disabled={(currentPage + 1) * pageSize >= filteredOperators.length}
                  className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >Next →</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Create Modal ────────────────────────────────────────────────────── */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center rounded-t-2xl">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">➕ Create New Operator</h2>
                <button
                  onClick={() => { setShowCreateModal(false); setCreateError(""); setShowCreatePwd(false); setShowCreateConfirmPwd(false); }}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none transition"
                >×</button>
              </div>

              {createError && (
                <div className={`mx-6 mt-4 ${errorBannerCls}`}>
                  <span>⚠️</span><span className="flex-1">{createError}</span>
                  <button onClick={() => setCreateError("")} className="text-red-400 hover:text-red-600 font-bold">×</button>
                </div>
              )}

              <form onSubmit={handleCreate} autoComplete="off" className="p-6 space-y-5">
                {/* Honeypot hidden fields stop Chrome from autofilling visible inputs */}
                <input type="text"     style={{ display: "none" }} aria-hidden="true" tabIndex={-1} />
                <input type="password" style={{ display: "none" }} aria-hidden="true" tabIndex={-1} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>First Name <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="e.g., John" value={formData.first_name}
                      onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                      autoComplete="off" required className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Last Name <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="e.g., Doe" value={formData.last_name}
                      onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                      autoComplete="off" required className={inputCls} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Email <span className="text-red-500">*</span></label>
                    <input type="text" inputMode="email" placeholder="john@example.com" value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      autoComplete="off" required className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Phone</label>
                    <PhoneInput value={formData.phone} onChange={v => setFormData({ ...formData, phone: v })} />
                  </div>
                </div>

                <div>
                  <label className={`${labelCls} block mb-1`}>Province &amp; District</label>
                  <GeoSelectWithOther value={createGeoValue} onChange={setCreateGeoValue} showChiefdom={false} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Password <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input
                        type={showCreatePwd ? "text" : "password"}
                        placeholder="Min 8 characters"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        autoComplete="new-password"
                        required
                        className={`${inputCls} pr-10`}
                      />
                      <EyeBtn show={showCreatePwd} onToggle={() => setShowCreatePwd(v => !v)} />
                    </div>
                    <PasswordStrength password={formData.password} />
                  </div>
                  <div>
                    <label className={labelCls}>Confirm Password <span className="text-red-500">*</span></label>
                    <div className="relative mt-1">
                      <input
                        type={showCreateConfirmPwd ? "text" : "password"}
                        placeholder="Re-enter password"
                        value={formData.confirmPassword}
                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                        autoComplete="new-password"
                        required
                        className={`${inputCls} pr-10 ${
                          formData.confirmPassword
                            ? formData.password === formData.confirmPassword
                              ? "!border-green-500 focus:!ring-green-400"
                              : "!border-red-400 focus:!ring-red-300"
                            : ""
                        }`}
                      />
                      <EyeBtn show={showCreateConfirmPwd} onToggle={() => setShowCreateConfirmPwd(v => !v)} />
                    </div>
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">Passwords do not match</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-green-700 hover:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Creating…</>
                    ) : "Create Operator"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCreateModal(false); setCreateError(""); setShowCreatePwd(false); setShowCreateConfirmPwd(false); }}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-3 px-4 rounded-lg transition"
                  >Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── View Modal ──────────────────────────────────────────────────────── */}
        {showViewModal && selectedOperator && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center rounded-t-2xl">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">👁️ Operator Details</h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none transition"
                >×</button>
              </div>

              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <p className={`${labelCls} mb-1`}>Operator ID</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white font-mono">{selectedOperator.operator_id || "N/A"}</p>
                  </div>
                  <StatusBadge active={selectedOperator.is_active} />
                </div>

                {/* Personal */}
                <section>
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    👤 Personal Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      ["Full Name", selectedOperator.full_name || "Unknown"],
                      ["Email",     selectedOperator.email || "N/A"],
                      ["Phone",     selectedOperator.phone || "N/A"],
                      ...(selectedOperator.user_id ? [["User ID", selectedOperator.user_id]] : []),
                    ].map(([k, v]) => (
                      <div key={k}>
                        <p className={`${labelCls} mb-1`}>{k}</p>
                        <p className="text-gray-800 dark:text-gray-200 text-sm break-all">{v}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Assignment */}
                <section className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    📍 Assignment Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className={`${labelCls} mb-2`}>Assigned Districts</p>
                      {selectedOperator.assigned_districts?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {selectedOperator.assigned_districts.map((d, i) => (
                            <span key={i} className="bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-sm">
                              {getDistrictDisplayName(d)}
                            </span>
                          ))}
                        </div>
                      ) : <p className="text-gray-400 dark:text-gray-500 text-sm">None assigned</p>}
                    </div>
                    <div>
                      <p className={`${labelCls} mb-2`}>Assigned Regions</p>
                      {selectedOperator.assigned_regions?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {selectedOperator.assigned_regions.map((r, i) => (
                            <span key={i} className="bg-purple-50 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 px-2 py-1 rounded text-sm">
                              {r}
                            </span>
                          ))}
                        </div>
                      ) : <p className="text-gray-400 dark:text-gray-500 text-sm">None assigned</p>}
                    </div>
                  </div>
                </section>

                {/* Stats */}
                <section className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">📊 Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-600 dark:border-green-700 p-4 rounded-lg">
                      <p className={`${labelCls} mb-1`}>Registered Farmers</p>
                      <p className="text-2xl font-bold text-gray-800 dark:text-white">{selectedOperator.farmer_count ?? 0}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                      <p className={`${labelCls} mb-2`}>Account Status</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {selectedOperator.is_active ? "✅ Can login and register farmers" : "⛔ Account disabled"}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Timestamps */}
                <section className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">🕒 Timestamps</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedOperator.created_at && (
                      <div>
                        <p className={`${labelCls} mb-1`}>Created At</p>
                        <p className="text-gray-800 dark:text-gray-200 text-sm">
                          {new Date(selectedOperator.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    )}
                    {selectedOperator.updated_at && (
                      <div>
                        <p className={`${labelCls} mb-1`}>Last Updated</p>
                        <p className="text-gray-800 dark:text-gray-200 text-sm">
                          {new Date(selectedOperator.updated_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Actions */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                  <button
                    onClick={() => openEditModal(selectedOperator)}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-xl transition shadow"
                  >✏️ Edit Operator</button>
                  <button
                    onClick={() => {
                      handleToggleActive(selectedOperator.operator_id, selectedOperator.is_active ?? false, selectedOperator.full_name);
                    }}
                    className={`flex-1 font-bold py-3 px-4 rounded-xl transition shadow ${
                      selectedOperator.is_active
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-green-700 hover:bg-green-800 text-white"
                    }`}
                  >
                    {selectedOperator.is_active ? "⛔ Deactivate" : "✅ Activate"}
                  </button>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-3 px-4 rounded-xl transition"
                  >Close</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Edit Modal ──────────────────────────────────────────────────────── */}
        {showEditModal && selectedOperator && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full my-8 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center rounded-t-2xl">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">✏️ Edit Operator</h2>
                <button
                  onClick={() => { setShowEditModal(false); setEditError(""); setShowEditPwd(false); setShowEditConfirmPwd(false); }}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none transition"
                >×</button>
              </div>

              {editError && (
                <div className={`mx-6 mt-4 ${errorBannerCls}`}>
                  <span>⚠️</span><span className="flex-1">{editError}</span>
                  <button onClick={() => setEditError("")} className="text-red-400 hover:text-red-600 font-bold">×</button>
                </div>
              )}

              <form onSubmit={handleEditSubmit} autoComplete="off" className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>First Name <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="e.g., John" value={editFormData.first_name}
                      autoComplete="off"
                      onChange={e => setEditFormData({ ...editFormData, first_name: e.target.value })}
                      required className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Last Name <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="e.g., Doe" value={editFormData.last_name}
                      autoComplete="off"
                      onChange={e => setEditFormData({ ...editFormData, last_name: e.target.value })}
                      required className={inputCls} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Email <span className="text-red-500">*</span></label>
                    <input type="text" inputMode="email" placeholder="john@example.com" value={editFormData.email}
                      autoComplete="off"
                      onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                      required className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Phone</label>
                    <PhoneInput value={editFormData.phone} onChange={v => setEditFormData({ ...editFormData, phone: v })} />
                  </div>
                </div>

                <div>
                  <label className={`${labelCls} block mb-1`}>Province &amp; District</label>
                  <GeoSelectWithOther value={editGeoValue} onChange={setEditGeoValue} showChiefdom={false} />
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Change Password</p>
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">Optional — leave blank to keep current</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>New Password</label>
                      <div className="relative">
                        <input
                          type={showEditPwd ? "text" : "password"}
                          placeholder="Leave blank to keep current"
                          value={editFormData.password}
                          autoComplete="new-password"
                          onChange={e => setEditFormData({ ...editFormData, password: e.target.value, confirmPassword: e.target.value ? editFormData.confirmPassword : "" })}
                          className={`${inputCls} pr-10`}
                        />
                        <EyeBtn show={showEditPwd} onToggle={() => setShowEditPwd(v => !v)} />
                      </div>
                      <PasswordStrength password={editFormData.password} />
                    </div>
                    <div>
                      <label className={labelCls}>Confirm New Password</label>
                      <div className="relative mt-1">
                        <input
                          type={showEditConfirmPwd ? "text" : "password"}
                          placeholder="Re-enter new password"
                          value={editFormData.confirmPassword}
                          autoComplete="new-password"
                          disabled={!editFormData.password}
                          onChange={e => setEditFormData({ ...editFormData, confirmPassword: e.target.value })}
                          className={`${inputCls} pr-10 disabled:opacity-40 disabled:cursor-not-allowed ${
                            editFormData.confirmPassword
                              ? editFormData.password === editFormData.confirmPassword
                                ? "!border-green-500 focus:!ring-green-400"
                                : "!border-red-400 focus:!ring-red-300"
                              : ""
                          }`}
                        />
                        {editFormData.password && (
                          <EyeBtn show={showEditConfirmPwd} onToggle={() => setShowEditConfirmPwd(v => !v)} />
                        )}
                      </div>
                      {editFormData.confirmPassword && editFormData.password !== editFormData.confirmPassword && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">Passwords do not match</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <label className={`${labelCls} block mb-3`}>Status</label>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={editFormData.is_active}
                        onChange={() => setEditFormData({ ...editFormData, is_active: true })}
                        className="w-4 h-4 accent-green-600" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">🟢 Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={!editFormData.is_active}
                        onChange={() => setEditFormData({ ...editFormData, is_active: false })}
                        className="w-4 h-4 accent-red-600" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">🔴 Inactive</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-green-700 hover:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Saving…</>
                    ) : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowEditModal(false); setEditError(""); setShowEditPwd(false); setShowEditConfirmPwd(false); }}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-3 px-4 rounded-xl transition"
                  >Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Confirm Dialog ─────────────────────────────────────────────────── */}
        {confirmPending && (
          <ConfirmDialog
            label={confirmPending.label}
            danger={confirmPending.danger}
            onConfirm={confirmPending.onConfirm}
            onCancel={() => setConfirmPending(null)}
          />
        )}

      </div>
    </div>
  );
}
