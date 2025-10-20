import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.easyparking.app',
  appName: 'Easy Parking',
  webDir: 'dist/easy-parking',
  bundledWebRuntime: false,
  server: {
    cleartext: true
  }
};

export default config;
