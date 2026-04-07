/// <reference types="@capacitor/splash-screen" />

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cookiecookie.app',
  appName: 'Cookie',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      /* Same as `--color-surface` in src/index.css */
      backgroundColor: '#fbf9f4',
      launchAutoHide: false,
    },
  },
};

export default config;
