import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.easyparking.app',
  appName: 'Easy Parking Brasil',
  webDir: 'dist/easy-parking',
  bundledWebRuntime: false,
  server: {
    cleartext: false
  }
};

export default config;
