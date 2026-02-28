import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { operatorService } from "@/services/operator.service";
import GeoSelectWithOther from "@/components/GeoSelectWithOther";
import BackButton from "@/components/BackButton";
import PhoneInput from "@/components/PhoneInput";
import { useNotification } from "@/contexts/NotificationContext";
import { logger } from "@/utils/logger";

const COMPONENT = "CreateOperator";

export default function CreateOperator() {
  const navigate = useNavigate();
  const notify = useNotification();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "OPERATOR",
    assigned_province: "",
    assigned_province_name: "",
    assigned_district: "",
    assigned_district_name: "",
    assigned_chiefdom: "",
    assigned_chiefdom_name: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    logger.info(COMPONENT, "Submit create operator", { email: formData.email });

    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setError("First name and last name are required.");
      setSaving(false);
      return;
    }
    if (!formData.email.trim()) {
      setError("Email is required.");
      setSaving(false);
      return;
    }
    if (!formData.phone.trim()) {
      setError("Phone number is required.");
      setSaving(false);
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters.");
      setSaving(false);
      return;
    }
    if (!/[A-Z]/.test(formData.password)) {
      setError("Password must contain at least 1 uppercase letter.");
      setSaving(false);
      return;
    }
    if (!/[a-z]/.test(formData.password)) {
      setError("Password must contain at least 1 lowercase letter.");
      setSaving(false);
      return;
    }
    if (!/[0-9]/.test(formData.password)) {
      setError("Password must contain at least 1 number.");
      setSaving(false);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      setSaving(false);
      return;
    }

    try {
      const provinceName = formData.assigned_province_name;
      const districtName = formData.assigned_district_name;
      const chiefdomName = formData.assigned_chiefdom_name || undefined;

      const payload = {
        email: formData.email.trim(),
        full_name: `${formData.first_name.trim()} ${formData.last_name.trim()}`,
        phone: formData.phone.replace(/[\s\-()]/g, ""),
        password: formData.password,
        assigned_regions: provinceName ? [provinceName] : [],
        assigned_districts: districtName ? [districtName] : [],
        assigned_chiefdoms: chiefdomName ? [chiefdomName] : [],
      };

      await operatorService.create(payload);
      logger.info(COMPONENT, "Operator created successfully", { email: formData.email });
      notify.success("Operator created successfully!");
      navigate("/operators/manage");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string }; status?: number }; message?: string };
      const msg = e?.response?.data?.detail || e?.message || "Failed to create operator";
      logger.error(COMPONENT, "Create operator failed", { error: msg, status: e?.response?.status });
      setError(msg);
      notify.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const getPasswordStrength = () => {
    const p = formData.password;
    if (!p) return { label: "", color: "", width: "0%" };
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[a-z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 2) return { label: "Weak", color: "bg-red-500", width: "33%" };
    if (score <= 3) return { label: "Medium", color: "bg-amber-500", width: "66%" };
    return { label: "Strong", color: "bg-green-500", width: "100%" };
  };

  const strength = getPasswordStrength();
  const inputClass = "w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition";
  const labelClass = "block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <BackButton to="/operators/manage" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">➕ Create New Operator</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-12">
        {error && (
          <div className="mb-5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 border-l-4 border-l-red-500 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
            <span>❌ {error}</span>
            <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 ml-2 font-bold">✕</button>
          </div>
        )}

        <form onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === "Enter" && e.target instanceof HTMLInputElement) e.preventDefault(); }} className="space-y-5">
          {/* Personal Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 sm:p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-5 pb-2 border-b-2 border-blue-400">👤 Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>First Name <span className="text-red-500">*</span></label>
                <input type="text" value={formData.first_name} onChange={(e) => handleChange("first_name", e.target.value)} required placeholder="Enter first name" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Last Name <span className="text-red-500">*</span></label>
                <input type="text" value={formData.last_name} onChange={(e) => handleChange("last_name", e.target.value)} required placeholder="Enter last name" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email <span className="text-red-500">*</span></label>
                <input type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} required placeholder="operator@example.com" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone <span className="text-red-500">*</span></label>
                <PhoneInput value={formData.phone} onChange={(v) => handleChange("phone", v)} required />
              </div>
            </div>
          </div>

          {/* Account Credentials */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 sm:p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-5 pb-2 border-b-2 border-amber-400">🔐 Account Credentials</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => handleChange("password", e.target.value)} required minLength={8} placeholder="Min. 8 characters" className={inputClass} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">{showPassword ? "🙈" : "👁️"}</button>
                </div>
                {formData.password && (
                  <div className="mt-2">
                    <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div className={`h-full ${strength.color} rounded-full transition-all duration-300`} style={{ width: strength.width }} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Strength: <span className="font-semibold">{strength.label}</span></p>
                  </div>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">1 uppercase, 1 lowercase, 1 number required</p>
              </div>
              <div>
                <label className={labelClass}>Confirm Password <span className="text-red-500">*</span></label>
                <input type={showPassword ? "text" : "password"} value={formData.confirmPassword} onChange={(e) => handleChange("confirmPassword", e.target.value)} required minLength={8} placeholder="Repeat password" className={inputClass} />
                {formData.confirmPassword && formData.password !== formData.confirmPassword && <p className="text-xs text-red-500 mt-1 font-medium">Passwords do not match</p>}
                {formData.confirmPassword && formData.password === formData.confirmPassword && formData.confirmPassword.length >= 8 && <p className="text-xs text-green-600 mt-1 font-medium">✓ Passwords match</p>}
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Role <span className="text-red-500">*</span></label>
                <select value={formData.role} onChange={(e) => handleChange("role", e.target.value)} required className={inputClass}>
                  <option value="OPERATOR">Field Operator</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
            </div>
          </div>

          {/* Geographic Assignment */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 sm:p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-5 pb-2 border-b-2 border-green-400">📍 Geographic Assignment</h3>
            <GeoSelectWithOther
              value={{
                province_code: formData.assigned_province,
                province_name: formData.assigned_province_name,
                district_code: formData.assigned_district,
                district_name: formData.assigned_district_name,
                chiefdom_code: formData.assigned_chiefdom,
                chiefdom_name: formData.assigned_chiefdom_name,
              }}
              onChange={(v) => setFormData((prev) => ({
                ...prev,
                assigned_province: v.province_code,
                assigned_province_name: v.province_name,
                assigned_district: v.district_code,
                assigned_district_name: v.district_name,
                assigned_chiefdom: v.chiefdom_code,
                assigned_chiefdom_name: v.chiefdom_name,
              }))}
              showChiefdom={true}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end flex-wrap pt-2">
            <button type="button" onClick={() => navigate("/operators/manage")} disabled={saving} className="flex-1 sm:flex-none px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-lg text-sm transition active:scale-95 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 sm:flex-none px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-lg text-sm transition active:scale-95 flex items-center justify-center gap-2">
              {saving ? (<><span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Creating...</>) : "✅ Create Operator"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
