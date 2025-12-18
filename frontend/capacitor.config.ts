// Capacitor Configuration File
// https://capacitorjs.com/docs/config

import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'zm.gov.agri.cem',
  appName: 'Chiefdom Empowerment Model',
  webDir: 'dist',
  server: {
    // For development, you can set this to your local or staging API
    // url: 'http://192.168.1.100:5173',
    // cleartext: true,
    androidScheme: 'http',
    allowNavigation: ['13.233.201.167']
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
