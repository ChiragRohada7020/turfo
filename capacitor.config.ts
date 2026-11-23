import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.strikora.app',
  appName: 'Strikora',
  webDir: 'public',
  server: {
    url: 'https://strikora.in',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#070d12',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#070d12',
    },
  },
};

export default config;
