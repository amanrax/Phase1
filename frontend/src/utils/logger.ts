/**
 * Frontend Logger Utility
 * Writes structured logs to console with levels, timestamps and optional
 * storage to localStorage (last 200 entries, capped at 500 KB).
 */

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
