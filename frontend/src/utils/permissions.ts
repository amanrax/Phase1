// frontend/src/utils/permissions.ts
// Centralised permission check and request utility for Capacitor native features
import { Capacitor } from "@capacitor/core";

export type PermissionType = "camera" | "storage" | "location";

/**
 * Module-level session cache: once a permission has been resolved this session,
 * we don't ask the OS again to avoid excessive prompts.
 */
const _cache = new Map<PermissionType, boolean>();

/**
 * Check if a permission is granted, requesting it once if not already answered.
 * Returns `true` if granted, `false` if denied.
 *
 * If running on web (not native platform), always returns `true` —
 * browser permissions are handled by the browser itself.
 *
 * If the permission is permanently denied, `granted` will be `false`
 * and `permanent` will be `true` on the returned object — callers should
 * show the "Open Settings" deep-link UI rather than re-requesting.
 */
export async function checkAndRequestPermission(
  type: PermissionType
): Promise<{ granted: boolean; permanent: boolean }> {
  // On web: skip, let the browser handle it
  if (!Capacitor.isNativePlatform()) {
    return { granted: true, permanent: false };
  }

  // Return cached result if already resolved this session
  const cached = _cache.get(type);
  if (cached !== undefined) {
    return { granted: cached, permanent: !cached };
  }

  if (type === "camera") {
    return await _checkCameraPermission();
  }

  if (type === "storage") {
    return await _checkStoragePermission();
  }

  if (type === "location") {
    return await _checkLocationPermission();
  }

  return { granted: false, permanent: false };
}

/** Open device app settings so the user can re-grant a permission. */
export async function openAppSettings(): Promise<void> {
  try {
    // Barcode scanner plugin has openAppSettings
    const mod = await import(
      /* @vite-ignore */ /* @ts-ignore */ "@capacitor-community/barcode-scanner"
    ).catch(() => null) as Record<string, unknown> | null;
    const bs = mod?.BarcodeScanner as { openAppSettings?: () => Promise<void> } | undefined;
    if (bs?.openAppSettings) {
      await bs.openAppSettings();
      return;
    }
    // Fallback: NativeSettings or App plugin
    const { App } = await import("@capacitor/app").catch(() => ({ App: null }));
    // @ts-ignore
    await (App as any)?.openUrl?.({ url: "app-settings:" });
  } catch {
    // Swallow silently — deep-link may not be available
  }
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

async function _checkCameraPermission(): Promise<{ granted: boolean; permanent: boolean }> {
  try {
    const mod = await import(
      /* @vite-ignore */ /* @ts-ignore */ "@capacitor-community/barcode-scanner"
    ).catch(() => null) as Record<string, unknown> | null;

    type BS = {
      checkPermission: (o: { force: boolean }) => Promise<{ granted?: boolean; denied?: boolean; neverAsked?: boolean }>;
    };
    const BarcodeScanner = mod?.BarcodeScanner as BS | undefined;
    if (!BarcodeScanner) {
      _cache.set("camera", true); // plugin absent = web build, treat as granted
      return { granted: true, permanent: false };
    }

    const result = await BarcodeScanner.checkPermission({ force: true });
    const granted = result.granted === true;
    const permanent = result.denied === true && result.neverAsked !== true;
    _cache.set("camera", granted);
    return { granted, permanent };
  } catch {
    return { granted: false, permanent: false };
  }
}

async function _checkStoragePermission(): Promise<{ granted: boolean; permanent: boolean }> {
  try {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    // A read attempt is the most reliable way to check Filesystem permission
    await Filesystem.readdir({ path: "", directory: Directory.External });
    _cache.set("storage", true);
    return { granted: true, permanent: false };
  } catch (e: unknown) {
    const msg = String(e);
    const permanent = msg.includes("denied") && !msg.includes("neverAsked");
    _cache.set("storage", !permanent);
    return { granted: false, permanent };
  }
}

async function _checkLocationPermission(): Promise<{ granted: boolean; permanent: boolean }> {
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const status = await Geolocation.checkPermissions();
    const granted = status.location === "granted" || status.coarseLocation === "granted";
    const permanent = (status.location === "denied" || status.coarseLocation === "denied");
    if (!granted) {
      const req = await Geolocation.requestPermissions();
      const reqGranted = req.location === "granted" || req.coarseLocation === "granted";
      _cache.set("location", reqGranted);
      return { granted: reqGranted, permanent: !reqGranted };
    }
    _cache.set("location", granted);
    return { granted, permanent };
  } catch {
    return { granted: false, permanent: false };
  }
}
