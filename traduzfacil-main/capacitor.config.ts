import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.traduzfacil.app',
  appName: 'Traduz Fácil',
  webDir: 'dist',
  server: {
    url: 'https://www.traduzfacil.com',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#1e54a8',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#1e54a8',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#1e54a8',
    },
  },
};

export default config;
