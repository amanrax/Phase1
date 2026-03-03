// frontend/src/pages/QRScanner.tsx
// QR code scanner page — uses Capacitor barcode scanner on mobile, manual on web
import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import BackButton from "@/components/BackButton";
import axiosClient from "@/utils/axios";
import useAuthStore from "@/store/authStore";

interface PublicFarmerSummary {
  verified: boolean;
  farmer_id: string;
  name: string;
  nrc: string | null;
  province: string | null;
  district: string | null;
  photo_url: string | null;
  registered_date: string | null;
  operator_name: string | null;
}

type ScanStatus = "idle" | "scanning" | "loading" | "result" | "error" | "permission_denied";

const QRScanner: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const isAuthenticated = Boolean(token);

  const [status, setStatus] = useState<ScanStatus>("idle");
  const [farmerResult, setFarmerResult] = useState<PublicFarmerSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [manualId, setManualId] = useState<string>("");

  const lookupFarmer = useCallback(
    async (rawValue: string) => {
      setStatus("loading");
      setErrorMessage("");

      let farmerId = rawValue.trim();
      try {
        const parsed = JSON.parse(rawValue) as Record<string, unknown>;
        if (typeof parsed?.farmer_id === "string") farmerId = parsed.farmer_id;
      } catch {
        const match = farmerId.match(/([A-Z]{2}[0-9A-F]{6,12})/i);
        if (match) farmerId = match[1].toUpperCase();
      }

      if (!farmerId) {
        setErrorMessage("Could not extract a valid Farmer ID from the QR code.");
        setStatus("error");
        return;
      }

      if (isAuthenticated) {
        navigate(`/farmers/${farmerId}`);
        return;
      }

      try {
        const response = await axiosClient.get<PublicFarmerSummary>(
          `/farmers/verify-qr/${farmerId}`
        );
        setFarmerResult(response.data);
        setStatus("result");
      } catch (err: unknown) {
        const e = err as { response?: { status?: number } };
        if (e?.response?.status === 404) {
          setErrorMessage("Farmer not found. This QR code may be invalid or expired.");
        } else {
          setErrorMessage("Failed to verify. Please check your connection and try again.");
        }
        setStatus("error");
      }
    },
    [isAuthenticated, navigate]
  );

  const startCameraScan = useCallback(async () => {
    setStatus("scanning");
    setErrorMessage("");
    setFarmerResult(null);

    if (!Capacitor.isNativePlatform()) {
      setErrorMessage("Camera scanning is only available in the mobile app. Use manual entry below.");
      setStatus("error");
      return;
    }

    try {
      // Optional mobile-only Capacitor plugin — not installed in web builds.
      // Path is split to prevent Vite static import-analysis from trying to resolve it.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const pluginPath = "@capacitor-community" + "/barcode-scanner";
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const mod = await import(/* @vite-ignore */ /* @ts-ignore */ pluginPath).catch(() => null) as Record<string, unknown> | null;
      type BS = {
        checkPermission: (o: { force: boolean }) => Promise<{ granted: boolean; denied?: boolean; neverAsked?: boolean }>;
        hideBackground: () => void;
        showBackground: () => void;
        startScan: () => Promise<{ hasContent: boolean; content: string }>;
        openAppSettings: () => Promise<void>;
      };
      const BarcodeScanner = mod?.BarcodeScanner as BS | undefined;
      if (!BarcodeScanner) throw new Error("Plugin not available");

      const perm = await BarcodeScanner.checkPermission({ force: true });
      if (!perm.granted) {
        if (perm.denied) {
          // Permanently denied — direct user to settings
          setStatus("permission_denied");
          return;
        }
        setErrorMessage("Camera permission is required to scan QR codes.");
        setStatus("error");
        return;
      }

      BarcodeScanner.hideBackground();
      const result = await BarcodeScanner.startScan();
      BarcodeScanner.showBackground();

      if (result.hasContent && result.content) {
        await lookupFarmer(result.content);
      } else {
        setErrorMessage("No QR code detected. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMessage("Camera not available here. Use manual entry below.");
      setStatus("error");
    }
  }, [lookupFarmer]);

  const handleManualLookup = useCallback(() => {
    if (!manualId.trim()) return;
    lookupFarmer(manualId.trim());
  }, [manualId, lookupFarmer]);

  const reset = () => {
    setStatus("idle");
    setFarmerResult(null);
    setErrorMessage("");
    setManualId("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600">
            <span className="text-3xl">📷</span>
          </div>
          <h1 className="text-2xl font-bold text-white">QR Verification</h1>
          <p className="mt-1 text-sm text-gray-400">Scan a farmer QR code to verify registration</p>
        </div>

        {status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
            <p className="text-sm text-gray-300">Verifying farmer…</p>
          </div>
        )}

        {status === "result" && farmerResult && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-2xl">✅</span>
              <h2 className="text-lg font-semibold text-green-800 dark:text-green-300">Verified Farmer</h2>
            </div>
            {farmerResult.photo_url && (
              <div className="mb-4 flex justify-center">
                <img
                  src={farmerResult.photo_url}
                  alt={farmerResult.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-green-300 dark:border-green-700"
                />
              </div>
            )}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {(
                [
                  ["Name", farmerResult.name],
                  ["Farmer ID", farmerResult.farmer_id],
                  ["NRC", farmerResult.nrc ?? "—"],
                  ["Province", farmerResult.province ?? "—"],
                  ["District", farmerResult.district ?? "—"],
                  ["Operator", farmerResult.operator_name ?? "—"],
                  [
                    "Registered",
                    farmerResult.registered_date
                      ? new Date(farmerResult.registered_date).toLocaleDateString()
                      : "—",
                  ],
                ] as [string, string][]
              ).map(([label, value]) => (
                <React.Fragment key={label}>
                  <dt className="font-medium text-gray-500 dark:text-gray-400">{label}</dt>
                  <dd className="text-gray-900 dark:text-gray-100">{value}</dd>
                </React.Fragment>
              ))}
            </dl>
          </div>
        )}

        {status === "permission_denied" && (
          <div className="rounded-xl border border-orange-300 bg-orange-50 p-5 dark:border-orange-700 dark:bg-orange-900/20 text-center space-y-3">
            <p className="text-2xl">📷</p>
            <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">Camera Permission Denied</p>
            <p className="text-xs text-orange-700 dark:text-orange-300">
              Camera access was permanently denied. Please open device Settings and enable camera permission for CEM.
            </p>
            <button
              onClick={async () => {
                try {
                  const mod = await import(/* @vite-ignore */ /* @ts-ignore */ "@capacitor-community/barcode-scanner").catch(() => null) as Record<string, unknown> | null;
                  const bs = mod?.BarcodeScanner as { openAppSettings?: () => Promise<void> } | undefined;
                  await bs?.openAppSettings?.();
                } catch { /* noop */ }
              }}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl transition"
            >
              Open Settings
            </button>
          </div>
        )}

        {status === "error" && errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
          </div>
        )}

        {status !== "loading" && (
          <div className="space-y-3">
            {(status === "idle" || status === "scanning") ? (
              <button
                onClick={startCameraScan}
                disabled={status === "scanning"}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"
              >
                {status === "scanning" ? "Opening camera…" : "📷 Scan QR Code"}
              </button>
            ) : (
              <button
                onClick={reset}
                className="w-full rounded-xl border border-gray-600 bg-gray-800 px-4 py-3 text-sm font-semibold text-gray-200 hover:bg-gray-700"
              >
                Scan Again
              </button>
            )}

            <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Or enter Farmer ID manually
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleManualLookup()}
                  placeholder="e.g. ZM1A2B3C4D"
                  className="flex-1 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-400 focus:outline-none"
                />
                <button
                  onClick={handleManualLookup}
                  disabled={!manualId.trim()}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  Go
                </button>
              </div>
            </div>

            <div className="text-center text-xs text-gray-500">
              {isAuthenticated ? (
                <BackButton />
              ) : (
                <span>
                  <button
                    onClick={() => navigate("/login")}
                    className="text-indigo-400 underline underline-offset-2"
                  >
                    Log in
                  </button>{" "}
                  to access the full farmer profile
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRScanner;
