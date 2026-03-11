// src/pages/FarmerRegistrationWizard/Step2Address.tsx
import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import GeoSelectWithOther from "@/components/GeoSelectWithOther";
import { checkAndRequestPermission, openAppSettings } from "@/utils/permissions";
import { logger } from "@/utils/logger";

const COMPONENT = "Step2Address";

// TC-021: Zambia bounding box
const ZAMBIA = { minLat: -18.1, maxLat: -7.9, minLng: 21.9, maxLng: 33.7 };
const isInZambia = (lat: number, lng: number) =>
  lat >= ZAMBIA.minLat && lat <= ZAMBIA.maxLat && lng >= ZAMBIA.minLng && lng <= ZAMBIA.maxLng;

type AddressData = {
  province_code?: string;
  province_name?: string;
  district_code?: string;
  district_name?: string;
  chiefdom_code?: string;
  chiefdom_name?: string;
  village?: string;
  latitude?: number;
  longitude?: number;
};

type Props = {
  data: AddressData;
  onBack: () => void;
  onNext: (values: AddressData) => void;
};

export default function Step2Address({ data, onBack, onNext }: Props) {
  const [geo, setGeo] = useState({
    province_code: data?.province_code || "",
    province_name: data?.province_name || "",
    district_code: data?.district_code || "",
    district_name: data?.district_name || "",
    chiefdom_code: data?.chiefdom_code || "",
    chiefdom_name: data?.chiefdom_name || "",
  });
  const [village, setVillage] = useState(data?.village || "");
  const [err, setErr] = useState("");
  // TC-018/019/020/021: GPS state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsDenied, setGpsDenied] = useState(false);
  const [gpsPermanent, setGpsPermanent] = useState(false);
  const [gpsOutZambia, setGpsOutZambia] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    data?.latitude && data?.longitude ? { lat: data.latitude, lng: data.longitude } : null
  );

  // TC-018: Capture GPS location
  const handleGPS = async () => {
    setGpsLoading(true);
    setGpsDenied(false);
    setGpsPermanent(false);
    setGpsOutZambia(false);
    try {
      // TC-019: request permission (one-time via cached helper)
      const { granted, permanent } = await checkAndRequestPermission("location");
      if (!granted) {
        // TC-020: distinguish permanent deny
        if (permanent) setGpsPermanent(true);
        else setGpsDenied(true);
        setGpsLoading(false);
        return;
      }

      const { Geolocation } = await import("@capacitor/geolocation");
      const pos = await Geolocation.getCurrentPosition({ timeout: 10000, enableHighAccuracy: true });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // TC-021: outside Zambia warning
      if (!isInZambia(lat, lng)) {
        setGpsOutZambia(true);
        logger.warn(COMPONENT, "GPS location outside Zambia", { lat, lng });
        setGpsLoading(false);
        return;
      }

      setCoords({ lat, lng });
      logger.info(COMPONENT, "GPS captured", { lat, lng });
    } catch (e) {
      logger.error(COMPONENT, "GPS capture failed", { e });
      setGpsDenied(true);
    } finally {
      setGpsLoading(false);
    }
  };

  const handleNext = () => {
    if (!geo.province_code) {
      setErr("Please select a province");
      return;
    }
    if (!geo.district_code) {
      setErr("Please select a district");
      return;
    }
    setErr("");
    onNext({
      ...geo,
      village,
      ...(coords ? { latitude: coords.lat, longitude: coords.lng } : {}),
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-gray-800 dark:text-white border-b-2 border-green-500 pb-2.5">
        📍 Address &amp; Location
      </h3>
      {err && (
        <div role="alert" className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm font-semibold border-l-4 border-red-500">
          ❌ {err}
        </div>
      )}

      <GeoSelectWithOther
        value={geo}
        onChange={setGeo}
        showChiefdom={true}
        showVillage={true}
        village={village}
        onVillageChange={setVillage}
      />

      {/* TC-018: GPS capture button (native only, graceful fallback on web) */}
      {Capacitor.isNativePlatform() && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleGPS}
            disabled={gpsLoading}
            aria-label="Capture GPS location"
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-bold text-sm rounded-lg transition active:scale-95 shadow-sm"
          >
            {gpsLoading ? "⏳ Getting location…" : coords ? "📍 Update GPS Location" : "📍 Use GPS Location"}
          </button>

          {/* TC-021: Outside Zambia warning */}
          {gpsOutZambia && (
            <div role="alert" className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-3 py-2 rounded-lg text-xs font-semibold border-l-4 border-amber-500">
              ⚠️ GPS location appears to be outside Zambia. Please verify your location.
            </div>
          )}

          {/* TC-020: Permanent deny — open settings */}
          {gpsPermanent && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-3 text-xs text-red-700 dark:text-red-300">
              <p className="font-semibold mb-1">Location access permanently denied.</p>
              <button onClick={openAppSettings} className="px-2 py-1 bg-red-600 text-white rounded text-xs font-semibold">
                Open Settings
              </button>
            </div>
          )}

          {/* TC-019: One-time denial */}
          {gpsDenied && !gpsPermanent && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Location permission denied. Please allow access and try again.
            </p>
          )}

          {/* Show captured coordinates */}
          {coords && !gpsOutZambia && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              ✓ GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold text-sm rounded-lg transition active:scale-95"
          aria-label="Back to previous step"
        >
          ← Back
        </button>
        <div className="flex-1" />
        <button
          onClick={handleNext}
          className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-lg transition active:scale-95 shadow-sm"
          aria-label="Proceed to next step"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
