import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.a6ceedf28e354ef3b2296f3acfc2482f',
  appName: 'lovable-supabase-glue',
  webDir: 'dist',
  server: {
    url: 'https://a6ceedf2-8e35-4ef3-b229-6f3acfc2482f.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF',
      sound: 'beep.wav',
    },
  },
};

export default config;