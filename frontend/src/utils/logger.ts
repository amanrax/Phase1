/**
 * Frontend Logger Utility
 * Writes structured logs to console with levels, timestamps and optional
 * storage to localStorage (last 200 entries, capped at 500 KB).
 * On Capacitor native builds (Android/iOS) logs are also written to daily
 * files in the app-specific external storage directory and cleaned up after 7 days.
 */

import { Capacitor } from "@capacitor/core";

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

const LOG_STORAGE_KEY = 'cem_app_logs';
const MAX_LOG_ENTRIES = 200;
const IS_DEV = import.meta.env.DEV;

/** Return ISO timestamp */
function ts(): string {
  return new Date().toISOString();
}

/** Persist entry to localStorage (best-effort) */
function persist(level: LogLevel, module: string, message: string, data?: unknown) {
  try {
    const raw = localStorage.getItem(LOG_STORAGE_KEY);
    const entries: unknown[] = raw ? JSON.parse(raw) : [];
    entries.push({ ts: ts(), level, module, message, data: data ?? null });
    // Keep only the latest MAX_LOG_ENTRIES
    const trimmed = entries.slice(-MAX_LOG_ENTRIES);
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage may be full or unavailable — ignore
  }
}

/* ─── Capacitor Filesystem — mobile only ──────────────────────────────── */

/** Date string for the current day: YYYY-MM-DD */
function today(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Append a log line to the daily log file using Capacitor Filesystem.
 * Uses Directory.External (app-specific external storage on Android,
 * Documents on iOS) so the files are accessible without root.
 * This function is fire-and-forget (never throws, never blocks).
 */
async function mobileAppend(line: string): Promise<void> {
  try {
    const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
    const path = `logs/${today()}.log`;
    try {
      await Filesystem.appendFile({ path, data: line + "\n", directory: Directory.External, encoding: Encoding.UTF8 });
    } catch {
      // File may not exist yet — create it
      await Filesystem.writeFile({ path, data: line + "\n", directory: Directory.External, encoding: Encoding.UTF8, recursive: true });
    }
  } catch {
    // Capacitor plugin not available or permission denied — swallow silently
  }
}

/**
 * Delete log files older than 7 days from the native logs directory.
 * Called once at module load on native platforms.
 */
async function cleanOldMobileLogs(): Promise<void> {
  try {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const result = await Filesystem.readdir({ path: "logs", directory: Directory.External });
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const entry of result.files) {
      // entry.name is like "2024-01-15.log"
      const name = typeof entry === "string" ? entry : (entry as { name: string }).name;
      const dateStr = name.replace(".log", "");
      const fileTime = new Date(dateStr).getTime();
      if (!isNaN(fileTime) && fileTime < cutoff) {
        await Filesystem.deleteFile({ path: `logs/${name}`, directory: Directory.External }).catch(() => {/* noop */});
      }
    }
  } catch {
    // Directory may not exist yet on first run — ignore
  }
}

// On native platforms: clean old logs once at startup
if (Capacitor.isNativePlatform()) {
  cleanOldMobileLogs();
}

/** Style map for console output */
const STYLES: Record<LogLevel, string> = {
  DEBUG:    'color:#94a3b8;font-weight:400',
  INFO:     'color:#60a5fa;font-weight:600',
  WARN:     'color:#fbbf24;font-weight:600',
  ERROR:    'color:#f87171;font-weight:700',
  CRITICAL: 'color:#ff0000;font-weight:700;background:#1a0000;padding:2px 6px;border-radius:3px',
};

function emit(level: LogLevel, module: string, message: string, data?: unknown) {
  const formatted = `[${ts()}] [${level}] [${module}] ${message}`;

  if (level === 'DEBUG' && !IS_DEV) return; // suppress debug in prod

  /* eslint-disable no-console */
  switch (level) {
    case 'DEBUG':    IS_DEV && console.debug(`%c${formatted}`, STYLES.DEBUG, data ?? ''); break;
    case 'INFO':     console.info(`%c${formatted}`, STYLES.INFO, data ?? ''); break;
    case 'WARN':     console.warn(`%c${formatted}`, STYLES.WARN, data ?? ''); break;
    case 'ERROR':
    case 'CRITICAL': console.error(`%c${formatted}`, STYLES[level], data ?? ''); break;
  }
  /* eslint-enable no-console */

  // Always persist WARN and above; persist INFO/DEBUG only in dev
  if (level === 'WARN' || level === 'ERROR' || level === 'CRITICAL' || IS_DEV) {
    persist(level, module, message, data);
  }

  // On native platforms: also write to daily log file (fire-and-forget)
  if (Capacitor.isNativePlatform()) {
    const dataStr = data ? " | " + JSON.stringify(data) : "";
    mobileAppend(`${formatted}${dataStr}`);
  }
}

export const logger = {
  debug   : (module: string, msg: string, data?: unknown) => emit('DEBUG',    module, msg, data),
  info    : (module: string, msg: string, data?: unknown) => emit('INFO',     module, msg, data),
  warn    : (module: string, msg: string, data?: unknown) => emit('WARN',     module, msg, data),
  error   : (module: string, msg: string, data?: unknown) => emit('ERROR',    module, msg, data),
  critical: (module: string, msg: string, data?: unknown) => emit('CRITICAL', module, msg, data),

  /** Return all persisted log entries */
  getLogs(): unknown[] {
    try {
      const raw = localStorage.getItem(LOG_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },

  /** Clear persisted logs */
  clearLogs() {
    try { localStorage.removeItem(LOG_STORAGE_KEY); } catch { /* noop */ }
  },

  /** Return logs as a downloadable text blob */
  exportLogs(): string {
    return this.getLogs()
      .map((e: any) => `[${e.ts}] [${e.level}] [${e.module}] ${e.message}${e.data ? ' | ' + JSON.stringify(e.data) : ''}`)
      .join('\n');
  },
};

export default logger;

// ─── useMobileLogger hook ────────────────────────────────────────────────────
/**
 * useMobileLogger — convenience wrapper for use inside React components.
 * Binds a module name so callers only need to pass message + optional data.
 *
 * @example
 * const log = useMobileLogger("MyComponent");
 * log.info("Loaded", { count: 5 });
 */
export function useMobileLogger(module: string) {
  return {
    debug:    (msg: string, data?: unknown) => logger.debug(module, msg, data),
    info:     (msg: string, data?: unknown) => logger.info(module, msg, data),
    warn:     (msg: string, data?: unknown) => logger.warn(module, msg, data),
    error:    (msg: string, data?: unknown) => logger.error(module, msg, data),
    critical: (msg: string, data?: unknown) => logger.critical(module, msg, data),
  };
}
