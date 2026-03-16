// TC-284: Secure token storage — uses Capacitor Preferences on native, falls back to localStorage on web
import { Capacitor } from "@capacitor/core";

interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * On native platforms, delegates to @capacitor/preferences (encrypted on iOS Keychain,
 * Android SharedPreferences with OS-level encryption when device is encrypted).
 * On web, falls back to localStorage (standard browser behaviour).
 */
const createAdapter = (): StorageAdapter => {
  if (Capacitor.isNativePlatform()) {
    return {
      async getItem(key: string): Promise<string | null> {
        const { Preferences } = await import("@capacitor/preferences");
        const { value } = await Preferences.get({ key });
        return value;
      },
      async setItem(key: string, value: string): Promise<void> {
        const { Preferences } = await import("@capacitor/preferences");
        await Preferences.set({ key, value });
      },
      async removeItem(key: string): Promise<void> {
        const { Preferences } = await import("@capacitor/preferences");
        await Preferences.remove({ key });
      },
    };
  }

  // Web fallback — wraps localStorage in async API for consistent interface
  return {
    async getItem(key: string): Promise<string | null> {
      return localStorage.getItem(key);
    },
    async setItem(key: string, value: string): Promise<void> {
      localStorage.setItem(key, value);
    },
    async removeItem(key: string): Promise<void> {
      localStorage.removeItem(key);
    },
  };
};

export const secureStorage = createAdapter();
export default secureStorage;
