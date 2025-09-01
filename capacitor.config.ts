import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.cb76a18ec1394c3da57cc32c45db3b55',
  appName: 'sales-dialog-analyzer',
  webDir: 'dist',
  server: {
    url: 'https://cb76a18e-c139-4c3d-a57c-c32c45db3b55.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#1e3a8a",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  }
};

export default config;