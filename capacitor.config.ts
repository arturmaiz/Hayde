import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hayde.game',
  appName: 'Hayde',
  webDir: 'www',
  plugins: {
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#000000',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: false,
      launchAutoHide: true,
    },
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    backgroundColor: '#000000',
  },
  android: {
    backgroundColor: '#000000',
  },
};

export default config;
