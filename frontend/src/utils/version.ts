/**
 * Application Version
 * Phase 3 — updated 2026-03-03
 */

export const APP_VERSION = '3.0.0';
export const BUILD_DATE = '2026-03-03T02:00:00.000Z';
export const PHASE = 'Phase-3';

export const getVersionInfo = () => ({
  version: APP_VERSION,
  buildDate: BUILD_DATE,
  phase: PHASE,
  fullVersion: `${PHASE} v${APP_VERSION}`
});

export default {
  APP_VERSION,
  BUILD_DATE,
  PHASE,
  getVersionInfo
};
