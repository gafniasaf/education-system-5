import { useState, useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Device } from '@capacitor/device';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface PushNotificationState {
  isSupported: boolean;
  isRegistered: boolean;
  registrationToken: string | null;
  isLoading: boolean;
  error: string | null;
}

export const usePushNotifications = () => {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isRegistered: false,
    registrationToken: null,
    isLoading: true,
    error: null,
  });
  
  const { toast } = useToast();
  const { user } = useAuth();

  const initializePushNotifications = async () => {
    try {
      // Check if running on mobile device
      const deviceInfo = await Device.getInfo();
      const isNativePlatform = deviceInfo.platform === 'ios' || deviceInfo.platform === 'android';
      
      setState(prev => ({ ...prev, isSupported: isNativePlatform }));
      
      if (!isNativePlatform) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false,
          error: 'Push notifications only available on mobile devices'
        }));
        return;
      }

      // Request permission
      const permissionStatus = await PushNotifications.requestPermissions();
      
      if (permissionStatus.receive === 'granted') {
        // Register for push notifications
        await PushNotifications.register();
        
        // Listen for registration token
        PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration success, token: ' + token.value);
          
          setState(prev => ({
            ...prev,
            isRegistered: true,
            registrationToken: token.value,
            isLoading: false,
          }));

          // Save token to user profile in Supabase
          if (user) {
            await savePushTokenToProfile(token.value);
          }
        });

        // Listen for registration errors
        PushNotifications.addListener('registrationError', (error) => {
          console.error('Error on registration: ' + JSON.stringify(error));
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Failed to register for push notifications',
          }));
        });

        // Listen for incoming notifications
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received: ', notification);
          
          toast({
            title: notification.title || 'New Notification',
            description: notification.body || 'You have a new message',
          });
        });

        // Listen for notification actions
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push notification action performed', notification.actionId, notification.inputValue);
          
          // Handle notification tap/action
          if (notification.notification.data?.url) {
            window.location.href = notification.notification.data.url;
          }
        });
        
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Push notification permission denied',
        }));
      }
      
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to initialize push notifications',
      }));
    }
  };

  const savePushTokenToProfile = async (token: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', user?.id);

      if (error) {
        console.error('Error saving push token:', error);
      }
    } catch (error) {
      console.error('Error saving push token to profile:', error);
    }
  };

  const sendTestNotification = async () => {
    if (!state.registrationToken) return;

    try {
      // This would typically be sent from your backend
      toast({
        title: "Test Notification",
        description: "This is a test push notification",
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  };

  const unregister = async () => {
    try {
      await PushNotifications.removeAllListeners();
      setState(prev => ({
        ...prev,
        isRegistered: false,
        registrationToken: null,
      }));
      
      toast({
        title: "Unregistered",
        description: "Push notifications have been disabled",
      });
    } catch (error) {
      console.error('Error unregistering push notifications:', error);
    }
  };

  useEffect(() => {
    initializePushNotifications();
    
    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [user]);

  return {
    ...state,
    initializePushNotifications,
    sendTestNotification,
    unregister,
  };
};