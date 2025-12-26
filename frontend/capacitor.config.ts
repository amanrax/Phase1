// Capacitor Configuration File
// https://capacitorjs.com/docs/config

import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'zm.gov.agri.cem',
  appName: 'Chiefdom Empowerment Model',
  webDir: 'dist',
  server: {
    // Production-ready server settings
    androidScheme: 'https',
    url: 'http://13.204.83.198:8000',
    allowNavigation: [
      '13.204.83.198',
      '13.204.83.198:8000',
    ],
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
