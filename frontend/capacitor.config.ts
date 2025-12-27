// Capacitor Configuration File
// https://capacitorjs.com/docs/config

import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cem.app',
  appName: 'CEM',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true,
    allowNavigation: [
      '13.204.83.198',
      '13.204.83.198:8000', // For API calls
      'localhost'
    ],
  },
  android: {
    allowMixedContent: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#15803d',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff'
    }
  }
};

export default config;

