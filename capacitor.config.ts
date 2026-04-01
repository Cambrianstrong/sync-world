import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rflctsync.app',
  appName: 'RFLCT SYNC',
  webDir: 'out',
  server: {
    // Point to your live Vercel deployment
    url: 'https://sync-world-app.vercel.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'RFLCT SYNC',
    backgroundColor: '#0f0f13',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#0f0f13',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f0f13',
    },
  },
};

export default config;
