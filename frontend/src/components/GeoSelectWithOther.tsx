/**
 * GeoSelectWithOther
 *
 * A chained Province → District → Chiefdom dropdown set.
 * Each dropdown has an "Other (Enter manually)" option that:
 *  1. Shows an inline text input + Save button
 *  2. On Save, calls POST /geo/custom/... to persist to DB
 *  3. Reloads the dropdown so the new value appears next time
 *  4. Auto-selects the newly created option
 */
import React, { useEffect, useState, useCallback } from "react";
import geoService from "@/services/geo.service";

interface GeoOption {
  code: string;
  name: string;
}

interface GeoValue {
  province_code: string;
  province_name: string;
  district_code: string;
  district_name: string;
  chiefdom_code: string;
  chiefdom_name: string;
}

interface Props {
  value: Partial<GeoValue>;
  onChange: (v: GeoValue) => void;
  /** Show chiefdom selector (default true) */
  showChiefdom?: boolean;
  /** Show village text input (default false) */
  showVillage?: boolean;
  village?: string;
  onVillageChange?: (v: string) => void;
  disabled?: boolean;
  className?: string;
}

const OTHER = "__OTHER__";

function OtherInput({
  placeholder,
  onSave,
  saving,
}: {
  placeholder: string;
  onSave: (name: string) => void;
  saving: boolean;
}) {
  const [val, setVal] = useState("");
  return (
    <div className="mt-2 flex gap-2">
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-3 py-2 rounded-lg border border-indigo-300 dark:border-indigo-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
        onKeyDown={(e) => { if (e.key === "Enter" && val.trim()) onSave(val.trim()); }}
        autoFocus
      />
      <button
        type="button"
        disabled={!val.trim() || saving}
        onClick={() => val.trim() && onSave(val.trim())}
        className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? (
          <span className="flex items-center gap-1">
            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Saving…
          </span>
        ) : "Save"}
      </button>
    </div>
  );
}

const selectClass =
  "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 " +
  "bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm " +
  "focus:ring-2 focus:ring-indigo-400 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition";

export const GeoSelectWithOther: React.FC<Props> = ({
  value,
  onChange,
  showChiefdom = true,
  showVillage = false,
  village = "",
  onVillageChange,
  disabled = false,
}) => {
  const [provinces, setProvinces] = useState<GeoOption[]>([]);
  const [districts, setDistricts] = useState<GeoOption[]>([]);
  const [chiefdoms, setChiefdoms] = useState<GeoOption[]>([]);

  const [loadingP, setLoadingP] = useState(false);
  const [loadingD, setLoadingD] = useState(false);
  const [loadingC, setLoadingC] = useState(false);

  const [savingP, setSavingP] = useState(false);
  const [savingD, setSavingD] = useState(false);
  const [savingC, setSavingC] = useState(false);

  const [errP, setErrP] = useState("");
  const [errD, setErrD] = useState("");
  const [errC, setErrC] = useState("");

  // ── Load provinces once ──
  useEffect(() => {
    setLoadingP(true);
    geoService
      .provinces()
      .then((data) => setProvinces(data))
      .catch(() => setErrP("Failed to load provinces"))
      .finally(() => setLoadingP(false));
  }, []);

  // ── Load districts when province changes ──
  useEffect(() => {
    const code = value.province_code;
    if (!code || code === OTHER) { setDistricts([]); return; }
    setLoadingD(true);
    setDistricts([]);
    geoService
      .districts(code)
      .then((data) => setDistricts(data))
      .catch(() => setErrD("Failed to load districts"))
      .finally(() => setLoadingD(false));
  }, [value.province_code]);

  // ── Load chiefdoms when district changes ──
  useEffect(() => {
    const code = value.district_code;
    if (!code || code === OTHER) { setChiefdoms([]); return; }
    setLoadingC(true);
    setChiefdoms([]);
    geoService
      .chiefdoms(code)
      .then((data) => setChiefdoms(data))
      .catch(() => setErrC("Failed to load chiefdoms"))
      .finally(() => setLoadingC(false));
  }, [value.district_code]);

  const emit = useCallback(
    (patch: Partial<GeoValue>) => onChange({ ...defaultValue(value), ...patch } as GeoValue),
    [value, onChange]
  );

  // ── Province changed ──
  const onProvinceChange = (code: string) => {
    setErrP(""); setErrD(""); setErrC("");
    if (code === OTHER) {
      emit({ province_code: OTHER, province_name: "", district_code: "", district_name: "", chiefdom_code: "", chiefdom_name: "" });
    } else {
      const found = provinces.find((p) => p.code === code);
      emit({ province_code: code, province_name: found?.name ?? "", district_code: "", district_name: "", chiefdom_code: "", chiefdom_name: "" });
    }
  };

  // ── District changed ──
  const onDistrictChange = (code: string) => {
    setErrD(""); setErrC("");
    if (code === OTHER) {
      emit({ district_code: OTHER, district_name: "", chiefdom_code: "", chiefdom_name: "" });
    } else {
      const found = districts.find((d) => d.code === code);
      emit({ district_code: code, district_name: found?.name ?? "", chiefdom_code: "", chiefdom_name: "" });
    }
  };

  // ── Chiefdom changed ──
  const onChiefdomChange = (code: string) => {
    setErrC("");
    if (code === OTHER) {
      emit({ chiefdom_code: OTHER, chiefdom_name: "" });
    } else {
      const found = chiefdoms.find((c) => c.code === code);
      emit({ chiefdom_code: code, chiefdom_name: found?.name ?? "" });
    }
  };

  // ── Save custom province to DB → reload → select it ──
  const saveCustomProvince = async (name: string) => {
    setSavingP(true); setErrP("");
    try {
      const created = await geoService.createCustomProvince(name);
      setProvinces((prev) => [...prev, created]);
      emit({ province_code: created.code, province_name: created.name, district_code: "", district_name: "", chiefdom_code: "", chiefdom_name: "" });
    } catch {
      setErrP("Failed to save — try again");
    } finally {
      setSavingP(false);
    }
  };

  // ── Save custom district to DB → reload → select it ──
  const saveCustomDistrict = async (name: string) => {
    if (!value.province_code) return;
    setSavingD(true); setErrD("");
    try {
      const created = await geoService.createCustomDistrict(value.province_code, name);
      setDistricts((prev) => [...prev, created]);
      emit({ district_code: created.code, district_name: created.name, chiefdom_code: "", chiefdom_name: "" });
    } catch {
      setErrD("Failed to save — try again");
    } finally {
      setSavingD(false);
    }
  };

  // ── Save custom chiefdom to DB → reload → select it ──
  const saveCustomChiefdom = async (name: string) => {
    if (!value.district_code) return;
    setSavingC(true); setErrC("");
    try {
      const created = await geoService.createCustomChiefdom(value.district_code, name);
      setChiefdoms((prev) => [...prev, created]);
      emit({ chiefdom_code: created.code, chiefdom_name: created.name });
    } catch {
      setErrC("Failed to save — try again");
    } finally {
      setSavingC(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Province ── */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          Province <span className="text-red-500">*</span>
        </label>
        <select
          value={value.province_code || ""}
          onChange={(e) => onProvinceChange(e.target.value)}
          disabled={disabled || loadingP}
          className={selectClass}
        >
          <option value="">{loadingP ? "Loading provinces…" : "— Select Province —"}</option>
          {provinces.map((p) => (
            <option key={p.code} value={p.code}>{p.name}</option>
          ))}
          <option value={OTHER}>✏️ Other (Enter manually)</option>
        </select>
        {value.province_code === OTHER && (
          <OtherInput
            placeholder="Type province name and press Save"
            onSave={saveCustomProvince}
            saving={savingP}
          />
        )}
        {errP && <p className="text-xs text-red-500 mt-1">{errP}</p>}
      </div>

      {/* ── District ── */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          District <span className="text-red-500">*</span>
        </label>
        <select
          value={value.district_code || ""}
          onChange={(e) => onDistrictChange(e.target.value)}
          disabled={disabled || loadingD || !value.province_code || value.province_code === OTHER}
          className={selectClass}
        >
          <option value="">
            {!value.province_code
              ? "Select province first"
              : value.province_code === OTHER
              ? "Enter province first"
              : loadingD
              ? "Loading districts…"
              : "— Select District —"}
          </option>
          {districts.map((d) => (
            <option key={d.code} value={d.code}>{d.name}</option>
          ))}
          {value.province_code && value.province_code !== OTHER && (
            <option value={OTHER}>✏️ Other (Enter manually)</option>
          )}
        </select>
        {value.district_code === OTHER && (
          <OtherInput
            placeholder="Type district name and press Save"
            onSave={saveCustomDistrict}
            saving={savingD}
          />
        )}
        {errD && <p className="text-xs text-red-500 mt-1">{errD}</p>}
      </div>

      {/* ── Chiefdom ── */}
      {showChiefdom && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Chiefdom / Traditional Authority
          </label>
          <select
            value={value.chiefdom_code || ""}
            onChange={(e) => onChiefdomChange(e.target.value)}
            disabled={disabled || loadingC || !value.district_code || value.district_code === OTHER}
            className={selectClass}
          >
            <option value="">
              {!value.district_code
                ? "Select district first"
                : value.district_code === OTHER
                ? "Enter district first"
                : loadingC
                ? "Loading chiefdoms…"
                : "— Select Chiefdom (optional) —"}
            </option>
            {chiefdoms.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
            {value.district_code && value.district_code !== OTHER && (
              <option value={OTHER}>✏️ Other (Enter manually)</option>
            )}
          </select>
          {value.chiefdom_code === OTHER && (
            <OtherInput
              placeholder="Type chiefdom name and press Save"
              onSave={saveCustomChiefdom}
              saving={savingC}
            />
          )}
          {errC && <p className="text-xs text-red-500 mt-1">{errC}</p>}
        </div>
      )}

      {/* ── Village ── */}
      {showVillage && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Village / Area
          </label>
          <input
            type="text"
            value={village}
            onChange={(e) => onVillageChange?.(e.target.value)}
            disabled={disabled}
            placeholder="e.g. Milambo Village"
            className={selectClass}
          />
        </div>
      )}
    </div>
  );
};

function defaultValue(v: Partial<GeoValue>): GeoValue {
  return {
    province_code: v.province_code ?? "",
    province_name: v.province_name ?? "",
    district_code: v.district_code ?? "",
    district_name: v.district_name ?? "",
    chiefdom_code: v.chiefdom_code ?? "",
    chiefdom_name: v.chiefdom_name ?? "",
  };
}

export default GeoSelectWithOther;
