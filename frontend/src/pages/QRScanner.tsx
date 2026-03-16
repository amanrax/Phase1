// frontend/src/pages/QRScanner.tsx
// QR code scanner — full-screen camera overlay with targeting frame, cancel button, and permission gate (P1 + P3)
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import BackButton from "@/components/BackButton";
import { PermissionDeniedCard } from "@/components/PermissionRequest";
import axiosClient from "@/utils/axios";
import useAuthStore from "@/store/authStore";
import { useFeedback } from "@/utils/feedback";
import { logger } from "@/utils/logger";
import { useNotification } from "@/contexts/NotificationContext";

const COMPONENT = "QRScanner";

interface PublicFarmerSummary {
  verified: boolean;
  farmer_id: string;
  name: string;
  province: string | null;
  district: string | null;
  photo_url: string | null;
  registered_date: string | null;
  operator_name: string | null;
}

type ScanStatus =
  | "idle"
  | "checking_permission"
  | "permission_denied"
  | "permission_permanent"
  | "camera_open"        // native Capacitor
  | "web_camera_open"   // web browser getUserMedia
  | "loading"
  | "result"
  | "error";

type BS = {
  checkPermissions?: () => Promise<{ camera: string }>;
  requestPermissions?: () => Promise<{ camera: string }>;
  checkPermission?: (o: { force: boolean }) => Promise<{ granted?: boolean; denied?: boolean; neverAsked?: boolean }>;
  hideBackground: () => void | Promise<void>;
  showBackground: () => void | Promise<void>;
  startScan: () => Promise<{ hasContent: boolean; content: string }>;
  stopScan: () => void | Promise<void>;
  openAppSettings: () => Promise<void>;
};

async function loadBS(): Promise<BS | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const mod = await import(
      /* @vite-ignore */
      /* @ts-ignore */
      "@capacitor-community/barcode-scanner"
    ).catch(() => null) as Record<string, unknown> | null;
    return (mod?.BarcodeScanner as BS) ?? null;
  } catch {
    return null;
  }
}

// ─── Targeting Frame SVG ──────────────────────────────────────────────────────

const TargetingFrame: React.FC = () => (
  <svg
    width="280"
    height="280"
    viewBox="0 0 280 280"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <mask id="frame-cutout">
        <rect width="280" height="280" fill="white" />
        <rect x="40" y="40" width="200" height="200" rx="12" fill="black" />
      </mask>
    </defs>
    {/* dim surround */}
    <rect width="280" height="280" fill="rgba(0,0,0,0.5)" mask="url(#frame-cutout)" />
    {/* corner brackets */}
    <path d="M40 90 L40 40 L90 40"   stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M190 40 L240 40 L240 90" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M40 190 L40 240 L90 240"  stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M190 240 L240 240 L240 190" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    {/* animated scan line */}
    <rect x="42" y="42" width="196" height="3" rx="1.5" fill="rgba(99,102,241,0.95)">
      <animateTransform attributeName="transform" type="translate"
        values="0 0;0 196;0 0" dur="2s" repeatCount="indefinite"/>
    </rect>
  </svg>
);

// ─── Full-screen camera overlay ───────────────────────────────────────────────
// Rendered on top of the transparent WebView while the native camera is active.

interface CameraOverlayProps { onCancel: () => void; }

const CameraOverlay: React.FC<CameraOverlayProps> = ({ onCancel }) => (
  <div
    className="fixed inset-0 z-50 flex flex-col items-center justify-between py-14 px-6"
    style={{ background: "transparent" }}
  >
    {/* Top bar */}
    <div className="w-full flex items-center justify-between">
      <p className="text-white text-lg font-bold drop-shadow-lg">📷 Scan QR Code</p>
      <button
        onClick={onCancel}
        className="bg-black/60 hover:bg-black/80 text-white rounded-full px-5 py-2 text-sm font-bold transition active:scale-95"
        aria-label="Cancel scan"
      >
        ✕ Cancel
      </button>
    </div>

    {/* Targeting frame */}
    <div className="flex flex-col items-center gap-5">
      <TargetingFrame />
      <p className="text-white text-sm font-medium text-center drop-shadow-lg px-6">
        Point camera at a farmer QR code
      </p>
    </div>

    {/* Bottom hint */}
    <p className="text-white/50 text-xs text-center">Tap Cancel to stop scanning</p>
  </div>
);

// ─── Web camera overlay (browser getUserMedia — shown in place of native) ────

interface WebCameraOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hasBarcodeDetector: boolean;
  onCancel: () => void;
}

const WebCameraOverlay: React.FC<WebCameraOverlayProps> = ({ videoRef, hasBarcodeDetector, onCancel }) => (
  <div className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden">
    {/* Live camera feed */}
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="absolute inset-0 w-full h-full object-cover"
    />
    {/* UI overlay on top of video */}
    <div className="relative z-10 flex flex-col items-center justify-between h-full py-14 px-6">
      <div className="w-full flex items-center justify-between">
        <p className="text-white text-lg font-bold drop-shadow-lg">📷 Scan QR Code</p>
        <button
          onClick={onCancel}
          className="bg-black/60 hover:bg-black/80 text-white rounded-full px-5 py-2 text-sm font-bold transition active:scale-95"
          aria-label="Cancel scan"
        >
          ✕ Cancel
        </button>
      </div>
      <div className="flex flex-col items-center gap-5">
        <TargetingFrame />
        <p className="text-white text-sm font-medium text-center drop-shadow-lg px-6">
          {hasBarcodeDetector
            ? "Point camera at a farmer QR code"
            : "Position QR code in frame — tap scan icon to capture"}
        </p>
      </div>
      <p className="text-white/50 text-xs text-center">Tap Cancel to stop scanning</p>
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const QRScanner: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const isAuthenticated = Boolean(token);
  const { triggerVibration, triggerSound } = useFeedback();
  const { error: showError } = useNotification();

  const [status, setStatus] = useState<ScanStatus>("idle");
  const [farmerResult, setFarmerResult] = useState<PublicFarmerSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [manualId, setManualId] = useState<string>("");
  const [lastLookupValue, setLastLookupValue] = useState<string>("");

  const bsRef = useRef<BS | null>(null);

  // ── Web camera refs ──────────────────────────────────────────────────────────
  const videoRef  = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<number>(0);

  function stopWebCamera() {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  // TC-169: Pause/resume scan when app goes to background (e.g. incoming call)
  useEffect(() => {
    let appListener: { remove: () => void } | null = null;

    if (Capacitor.isNativePlatform()) {
      import("@capacitor/app").then(({ App }) => {
        App.addListener("appStateChange", ({ isActive }) => {
          if (!isActive) {
            // App backgrounded — pause scanning
            logger.info(COMPONENT, "App backgrounded — pausing scan");
            if (bsRef.current) { bsRef.current.stopScan?.(); bsRef.current.showBackground?.(); }
            stopWebCamera();
          } else if (status === "camera_open" || status === "web_camera_open") {
            // App resumed — user will need to re-tap "Start Scan"
            logger.info(COMPONENT, "App resumed — scan paused, user must restart");
            setStatus("idle");
          }
        }).then((l) => { appListener = l; });
      }).catch(() => { /* @capacitor/app not available */ });
    }

    return () => {
      appListener?.remove();
      if (bsRef.current) {
        bsRef.current.showBackground?.();
        bsRef.current.stopScan?.();
        bsRef.current = null;
      }
      stopWebCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // ── Attach stream + start BarcodeDetector loop when web camera opens ─────────
  // (defined AFTER lookupFarmer so the closure captures it correctly)


  const cancelScan = useCallback(async () => {
    try {
      await bsRef.current?.stopScan?.();
      await bsRef.current?.showBackground?.();
    } catch { /* noop */ }
    bsRef.current = null;
    setStatus("idle");
    logger.info(COMPONENT, "scan cancelled");
  }, []);

  const cancelWebScan = useCallback(() => {
    stopWebCamera();
    setStatus("idle");
    logger.info(COMPONENT, "web camera scan cancelled");
  }, []);

  const startWebCameraScan = useCallback(async () => {
    setErrorMessage("");
    setFarmerResult(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setErrorMessage("Camera not supported on this browser. Use manual entry below.");
      return;
    }

    setStatus("checking_permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      logger.info(COMPONENT, "web camera stream obtained");
      setStatus("web_camera_open");
    } catch (err: unknown) {
      const e = err as { name?: string };
      logger.warn(COMPONENT, "getUserMedia failed", { name: e?.name });
      if (e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError") {
        setStatus("permission_denied");
      } else {
        setStatus("error");
        setErrorMessage("Could not open camera. Try manual entry below.");
      }
    }
  }, []);

  const lookupFarmer = useCallback(async (rawValue: string) => {
    setStatus("loading");
    setErrorMessage("");
    setLastLookupValue(rawValue);

    let farmerId = rawValue.trim();
    try {
      const parsed = JSON.parse(rawValue) as Record<string, unknown>;
      if (typeof parsed?.farmer_id === "string") {
        farmerId = parsed.farmer_id;
      } else if (typeof parsed?.url === "string") {
        const m = parsed.url.toString().match(/([A-Z]{2}[0-9A-F]{6,12})/i);
        if (m) farmerId = m[1].toUpperCase();
      }
    } catch {
      const m = farmerId.match(/([A-Z]{2}[0-9A-F]{6,12})/i);
      if (m) farmerId = m[1].toUpperCase();
    }

    if (!farmerId) {
      showError("Invalid QR code");
      triggerVibration("form_error");
      setStatus("error");
      setErrorMessage("Invalid QR code — could not extract a Farmer ID.");
      return;
    }

    logger.info(COMPONENT, "lookupFarmer", { farmerId });

    if (isAuthenticated) {
      triggerVibration("qr_success");
      triggerSound("qr_success");
      navigate(`/farmers/${farmerId}`, { state: { fromQR: true } });
      return;
    }

    try {
      const res = await axiosClient.get<PublicFarmerSummary>(`/farmers/verify-qr/${farmerId}`);
      setFarmerResult(res.data);
      setStatus("result");
      triggerVibration("qr_success");
      triggerSound("qr_success");
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      const isOffline = !navigator.onLine || !e?.response;
      const msg = e?.response?.status === 404
        ? "Farmer not registered in this system."
        : isOffline
          ? "No connection. Retry when you are back online."
          : "Could not load farmer details. Check your connection.";
      setErrorMessage(msg);
      showError(msg);
      triggerVibration("form_error");
      setStatus("error");
    }
  }, [isAuthenticated, navigate, showError, triggerVibration, triggerSound]);

  const startCameraScan = useCallback(async () => {
    setErrorMessage("");
    setFarmerResult(null);

    if (!Capacitor.isNativePlatform()) {
      // On web/browser (including mobile browser): use getUserMedia
      startWebCameraScan();
      return;
    }

    setStatus("checking_permission");
    const bs = await loadBS();
    if (!bs) {
      setStatus("error");
      setErrorMessage("Barcode scanner plugin unavailable on this device.");
      return;
    }

    try {
      // Check current permission status
      let camStatus = "prompt";
      if (typeof bs.checkPermissions === "function") {
        const p = await bs.checkPermissions();
        camStatus = p.camera;
      } else if (typeof bs.checkPermission === "function") {
        const p = await bs.checkPermission({ force: false });
        camStatus = p.granted ? "granted" : p.denied ? "denied" : "prompt";
      }

      if (camStatus === "denied") { setStatus("permission_permanent"); return; }

      if (camStatus !== "granted") {
        // Request once — P3: one-time per session
        let granted = false;
        if (typeof bs.requestPermissions === "function") {
          const r = await bs.requestPermissions();
          granted = r.camera === "granted";
        } else if (typeof bs.checkPermission === "function") {
          const r = await bs.checkPermission({ force: true });
          granted = !!r.granted;
        }
        if (!granted) {
          // Re-check if now permanently denied
          if (typeof bs.checkPermissions === "function") {
            const recheck = await bs.checkPermissions();
            if (recheck.camera === "denied") { setStatus("permission_permanent"); return; }
          }
          setStatus("permission_denied");
          return;
        }
      }

      // Open camera — show overlay
      bsRef.current = bs;
      await bs.hideBackground();
      setStatus("camera_open");

      const result = await bs.startScan();
      await bs.showBackground();
      bsRef.current = null;

      if (result.hasContent && result.content) {
        await lookupFarmer(result.content);
      } else {
        setStatus("idle");
      }
    } catch {
      await bs.showBackground?.();
      bsRef.current = null;
      setStatus("error");
      setErrorMessage("Camera error. Use manual entry below.");
    }
  }, [lookupFarmer, startWebCameraScan]);

  // ── Attach stream + start BarcodeDetector loop when web camera opens ─────────
  // Placed AFTER lookupFarmer so useEffect closure captures the latest version.
  useEffect(() => {
    if (status !== "web_camera_open") return;
    const video = videoRef.current;
    if (!video || !streamRef.current) return;

    video.srcObject = streamRef.current;
    video.play().catch(() => {});

    // @ts-ignore — BarcodeDetector not yet in TypeScript lib
    if (!("BarcodeDetector" in window)) return; // live auto-decode unavailable; user sees video feed

    // @ts-ignore
    const detector = new (window as Record<string, unknown>).BarcodeDetector({ formats: ["qr_code"] }) as {
      detect: (source: HTMLCanvasElement) => Promise<{ rawValue: string }[]>;
    };
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    let raf: number;
    const tick = async () => {
      if (!streamRef.current) return;
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        try {
          const codes = await detector.detect(canvas);
          if (codes.length > 0) {
            stopWebCamera();
            lookupFarmer(codes[0].rawValue);
            return;
          }
        } catch { /* frame error — continue */ }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    rafRef.current = raf;
    return () => { cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, lookupFarmer]); // status + lookupFarmer are the correct deps here

  const handleManualLookup = useCallback(() => {
    if (manualId.trim()) lookupFarmer(manualId.trim());
  }, [manualId, lookupFarmer]);

  const reset = () => { setStatus("idle"); setFarmerResult(null); setErrorMessage(""); setManualId(""); };

  // ── Render: full-screen native camera overlay
  if (status === "camera_open") return <CameraOverlay onCancel={cancelScan} />;

  // ── Render: web camera overlay  
  if (status === "web_camera_open") {
    return (
      <WebCameraOverlay
        videoRef={videoRef}
        hasBarcodeDetector={"BarcodeDetector" in window}
        onCancel={cancelWebScan}
      />
    );
  }

  // ── Render: permanently denied
  if (status === "permission_permanent") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4">
          <PermissionDeniedCard permission="camera" permanent />
          <div className="text-center"><BackButton /></div>
        </div>
      </div>
    );
  }

  // ── Render: main UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 shadow-lg">
            <span className="text-3xl">📷</span>
          </div>
          <h1 className="text-2xl font-bold text-white">QR Verification</h1>
          <p className="mt-1 text-sm text-gray-400">Scan a farmer QR code to verify registration</p>
        </div>

        {/* Spinners */}
        {(status === "checking_permission" || status === "loading") && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
            <p className="text-sm text-gray-300">
              {status === "checking_permission" ? "Checking camera permission…" : "Verifying farmer…"}
            </p>
          </div>
        )}

        {/* Soft permission denied — can retry */}
        {status === "permission_denied" && (
          <div className="rounded-xl border border-orange-500/40 bg-orange-900/20 p-5 space-y-3 text-center">
            <p className="text-3xl">📷</p>
            <p className="text-sm font-semibold text-orange-300">Camera Permission Needed</p>
            <p className="text-xs text-orange-400">
              Camera access is required to scan QR codes. Tap below to allow.
            </p>
            <button
              onClick={startCameraScan}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-xl transition active:scale-95"
            >
              Grant Camera Access
            </button>
          </div>
        )}

        {/* Verified result — public view */}
        {status === "result" && farmerResult && (
          <div className="rounded-xl border border-green-500/40 bg-green-900/20 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">✅</span>
              <h2 className="text-lg font-semibold text-green-300">Verified Farmer</h2>
            </div>
            {farmerResult.photo_url && (
              <div className="flex justify-center">
                <img src={farmerResult.photo_url} alt={farmerResult.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-green-600" />
              </div>
            )}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {([
                ["Name",       farmerResult.name],
                ["Farmer ID",  farmerResult.farmer_id],
                ["Province",   farmerResult.province   ?? "—"],
                ["District",   farmerResult.district   ?? "—"],
                ["Operator",   farmerResult.operator_name ?? "—"],
                ["Registered", farmerResult.registered_date
                  ? new Date(farmerResult.registered_date).toLocaleDateString() : "—"],
              ] as [string, string][]).map(([label, value]) => (
                <React.Fragment key={label}>
                  <dt className="font-medium text-gray-400">{label}</dt>
                  <dd className="text-gray-100">{value}</dd>
                </React.Fragment>
              ))}
            </dl>
            {/* Share + Scan Again */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={async () => {
                  try {
                    const { Share } = await import("@capacitor/share");
                    await Share.share({
                      title: `Farmer: ${farmerResult.name}`,
                      text: `CEM Farmer Registration\nName: ${farmerResult.name}\nID: ${farmerResult.farmer_id}\nDistrict: ${farmerResult.district ?? "—"}`,
                      dialogTitle: "Share Farmer Info",
                    });
                  } catch {
                    /* Share not available on web — silent */ 
                  }
                }}
                className="flex-1 rounded-lg border border-green-600/50 bg-green-800/30 py-2 text-xs font-semibold text-green-300 hover:bg-green-700/40 transition active:scale-95"
              >
                ↗ Share
              </button>
              <button
                onClick={reset}
                className="flex-1 rounded-lg border border-gray-600 bg-gray-800/60 py-2 text-xs font-semibold text-gray-300 hover:bg-gray-700 transition active:scale-95"
              >
                📷 Scan Another
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {status === "error" && errorMessage && (
          <div className="rounded-xl border border-red-500/40 bg-red-900/20 p-4 text-center space-y-3">
            <p className="text-2xl">⚠️</p>
            <p className="text-sm text-red-300">{errorMessage}</p>
            {errorMessage.includes("No connection") && lastLookupValue && (
              <button
                onClick={() => lookupFarmer(lastLookupValue)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition active:scale-95"
              >
                Retry Lookup
              </button>
            )}
            {errorMessage.includes("not registered") && (
              <button onClick={() => navigate(-1)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-semibold rounded-xl transition">
                Return to Dashboard
              </button>
            )}
          </div>
        )}

        {/* Action buttons */}
        {!["checking_permission", "loading"].includes(status) && (
          <div className="space-y-3">
            {(status === "idle" || status === "error") ? (
              <button
                onClick={startCameraScan}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 active:scale-95 transition"
              >
                📷 Open Camera Scanner
              </button>
            ) : status !== "permission_denied" ? (
              <button onClick={reset}
                className="w-full rounded-xl border border-gray-600 bg-gray-800 px-4 py-3 text-sm font-semibold text-gray-200 hover:bg-gray-700 transition">
                Scan Again
              </button>
            ) : null}

            {/* Manual entry */}
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
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-40 transition active:scale-95"
                >
                  Go
                </button>
              </div>
            </div>

            <div className="text-center text-xs text-gray-500 pt-1">
              {isAuthenticated ? <BackButton /> : (
                <span>
                  <button onClick={() => navigate("/login")}
                    className="text-indigo-400 underline underline-offset-2">Log in</button>
                  {" "}to access the full farmer profile
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
