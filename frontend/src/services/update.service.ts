import axios from '@/utils/axios';
import { App } from '@capacitor/app';
import { Dialog } from '@capacitor/dialog';
import { Browser } from '@capacitor/browser';

interface VersionInfo {
  versionCode: number;
  versionName: string;
  downloadUrl: string;
  releaseNotes?: string;
  mandatory?: boolean;
}

export const updateService = {
  /**
   * Check if a newer version is available
   */
  checkForUpdates: async (): Promise<void> => {
    try {
      // Get current app version
      const appInfo = await App.getInfo();
      const currentVersionCode = parseInt(appInfo.build);

      // Check latest version from backend
      const { data } = await axios.get<VersionInfo>('/api/app/version');
      
      if (data.versionCode > currentVersionCode) {
        // New version available
        await updateService.showUpdateDialog(data);
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      // Silently fail - don't bother user
    }
  },

  /**
   * Show update dialog to user
   */
  showUpdateDialog: async (versionInfo: VersionInfo): Promise<void> => {
    const message = versionInfo.releaseNotes 
      ? `Version ${versionInfo.versionName} is available!\n\n${versionInfo.releaseNotes}`
      : `A new version (${versionInfo.versionName}) is available!`;

    const { value } = await Dialog.confirm({
      title: 'Update Available',
      message: message,
      okButtonTitle: 'Update Now',
      cancelButtonTitle: versionInfo.mandatory ? '' : 'Later',
    });

    if (value) {
      // Open download URL in browser
      await Browser.open({ url: versionInfo.downloadUrl });
    } else if (versionInfo.mandatory) {
      // Force close app if update is mandatory
      await App.exitApp();
    }
  },

  /**
   * Start periodic update checks (every 6 hours)
   */
  startPeriodicChecks: (): void => {
    // Check immediately on app start
    updateService.checkForUpdates();

    // Then check every 6 hours
    setInterval(() => {
      updateService.checkForUpdates();
    }, 6 * 60 * 60 * 1000); // 6 hours in milliseconds
  },
};
