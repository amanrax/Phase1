/**
 * Application Version
 * Phase 4 — v4.0 Farmer Portal & Self-Service
 */

export const APP_VERSION = '4.0.0';
export const BUILD_DATE = '2025-07-10T00:00:00.000Z';
export const PHASE = 'Phase-4';

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
