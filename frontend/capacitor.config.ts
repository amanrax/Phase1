// Capacitor Configuration File
// https://capacitorjs.com/docs/config

import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cem.farmerapp',
  appName: 'CEM Farmer',
  webDir: 'dist',
  
  server: {
    androidScheme: 'https',
    cleartext: true,
    hostname: 'localhost'
  },
  
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    loggingBehavior: 'debug'
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
