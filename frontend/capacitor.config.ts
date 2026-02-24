// Capacitor Configuration File
// https://capacitorjs.com/docs/config

import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cem.farmerapp',
  appName: 'CEM Farmer',
  webDir: 'dist',
  
  server: {
    androidScheme: 'https',
    // Allow cleartext (HTTP) traffic for development
    // Set to false for production with HTTPS only
    cleartext: true
  },
  
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true
  },
  
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    allowsBackForwardNavigationGestures: false
  },
  
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1E3A5F',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'large',
      spinnerColor: '#4ADE80',
      splashFullScreen: true,
      splashImmersive: true,
      androidScaleType: 'CENTER_CROP'
    }
  }
};

export default config;
