import axios from '@/utils/axios';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { logger } from '@/utils/logger';

interface VersionInfo {
  versionCode: number;
  versionName: string;
  latest_version: string;
  minimum_version: string;
  force_update: boolean;
  downloadUrl: string;
  releaseNotes?: string;
  mandatory?: boolean;
}

export interface UpdatePrompt {
  mandatory: boolean;
  versionName: string;
  downloadUrl: string;
  releaseNotes?: string;
}

let periodicChecksStarted = false;

const compareSemver = (a: string, b: string): number => {
  const av = a.split('.').map((x) => parseInt(x, 10) || 0);
  const bv = b.split('.').map((x) => parseInt(x, 10) || 0);
  const len = Math.max(av.length, bv.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (av[i] || 0) - (bv[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

export const updateService = {
  /**
   * Check if a newer version is available
   */
  checkForUpdates: async (): Promise<UpdatePrompt | null> => {
    try {
      // Get current app version
      const appInfo = await App.getInfo();
      const currentVersionName = appInfo.version || '0.0.0';

      // Check latest version from backend
      const { data } = await axios.get<VersionInfo>('/app-version');

      const isBelowMinimum = compareSemver(currentVersionName, data.minimum_version) < 0;
      const hasNewerVersion = compareSemver(currentVersionName, data.latest_version) < 0;

      if (isBelowMinimum || data.force_update) {
        return {
          mandatory: true,
          versionName: data.latest_version,
          downloadUrl: data.downloadUrl,
          releaseNotes: data.releaseNotes,
        };
      }

      if (hasNewerVersion) {
        return {
          mandatory: false,
          versionName: data.latest_version,
          downloadUrl: data.downloadUrl,
          releaseNotes: data.releaseNotes,
        };
      }

      return null;
    } catch (error) {
      logger.error('update.service', 'Failed to check for updates', {
        error: (error as Error)?.message,
      });
      // Silently fail - don't bother user
      return null;
    }
  },

  openDownloadUrl: async (url: string): Promise<void> => {
    await Browser.open({ url });
  },

  /**
   * Start periodic update checks (every 6 hours)
   */
  startPeriodicChecks: (onUpdateFound?: (prompt: UpdatePrompt) => void): void => {
    if (periodicChecksStarted) return;
    periodicChecksStarted = true;

    // Check immediately on app start
    updateService.checkForUpdates().then((prompt) => {
      if (prompt && onUpdateFound) onUpdateFound(prompt);
    });

    // Then check every 6 hours
    setInterval(() => {
      updateService.checkForUpdates().then((prompt) => {
        if (prompt && onUpdateFound) onUpdateFound(prompt);
      });
    }, 6 * 60 * 60 * 1000); // 6 hours in milliseconds
  },
};
