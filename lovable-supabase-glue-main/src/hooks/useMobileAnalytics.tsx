import { useState, useEffect } from 'react';
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface MobileAnalyticsData {
  sessions: number;
  avgSessionDuration: number;
  totalScreenTime: number;
  mostUsedFeatures: Array<{
    feature: string;
    usage: number;
    percentage: number;
  }>;
  deviceInfo: {
    platform: string;
    model: string;
    version: string;
  };
  networkUsage: {
    wifiTime: number;
    cellularTime: number;
    offlineTime: number;
  };
  performanceMetrics: {
    appLaunchTime: number;
    avgLoadTime: number;
    crashCount: number;
  };
}

interface MobileAnalyticsState {
  data: MobileAnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  currentSession: {
    startTime: number;
    screenViews: Array<{
      screen: string;
      timestamp: number;
      duration?: number;
    }>;
    interactions: number;
  } | null;
}

export const useMobileAnalytics = () => {
  const [state, setState] = useState<MobileAnalyticsState>({
    data: null,
    isLoading: true,
    error: null,
    currentSession: null,
  });
  
  const { user } = useAuth();

  // Track screen view
  const trackScreenView = async (screenName: string) => {
    try {
      const now = Date.now();
      
      // Update current session
      setState(prev => {
        if (!prev.currentSession) return prev;
        
        const updatedViews = [...prev.currentSession.screenViews];
        const lastView = updatedViews[updatedViews.length - 1];
        
        // Calculate duration for previous screen
        if (lastView && !lastView.duration) {
          lastView.duration = now - lastView.timestamp;
        }
        
        // Add new screen view
        updatedViews.push({
          screen: screenName,
          timestamp: now,
        });
        
        return {
          ...prev,
          currentSession: {
            ...prev.currentSession,
            screenViews: updatedViews,
          },
        };
      });

      // Log to Supabase (in a real app, you'd have a mobile_analytics table)
      if (user) {
        await supabase.from('audit_logs').insert({
          actor_id: user.id,
          action: 'screen_view',
          entity_type: 'mobile_app',
          entity_id: screenName,
          details: {
            screen: screenName,
            timestamp: now,
            platform: 'mobile',
          } as any,
        });
      }
    } catch (error) {
      console.error('Error tracking screen view:', error);
    }
  };

  // Track user interaction
  const trackInteraction = async (interactionType: string, details?: any) => {
    try {
      setState(prev => {
        if (!prev.currentSession) return prev;
        
        return {
          ...prev,
          currentSession: {
            ...prev.currentSession,
            interactions: prev.currentSession.interactions + 1,
          },
        };
      });

      // Log interaction
      if (user) {
        await supabase.from('audit_logs').insert({
          actor_id: user.id,
          action: 'mobile_interaction',
          entity_type: 'mobile_app',
          entity_id: interactionType,
          details: {
            interaction_type: interactionType,
            timestamp: Date.now(),
            ...details,
          } as any,
        });
      }
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  };

  // Start session tracking
  const startSession = async () => {
    try {
      const deviceInfo = await Device.getInfo();
      const networkStatus = await Network.getStatus();
      
      setState(prev => ({
        ...prev,
        currentSession: {
          startTime: Date.now(),
          screenViews: [],
          interactions: 0,
        },
      }));

      // Log session start
      if (user) {
        await supabase.from('audit_logs').insert({
          actor_id: user.id,
          action: 'session_start',
          entity_type: 'mobile_app',
          entity_id: 'mobile_session',
          details: {
            device_info: deviceInfo as any,
            network_status: networkStatus as any,
            timestamp: Date.now(),
          } as any,
        });
      }
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  // End session tracking
  const endSession = async () => {
    try {
      if (!state.currentSession) return;
      
      const sessionDuration = Date.now() - state.currentSession.startTime;
      
      // Log session end
      if (user) {
        await supabase.from('audit_logs').insert({
          actor_id: user.id,
          action: 'session_end',
          entity_type: 'mobile_app',
          entity_id: 'mobile_session',
          details: {
            duration: sessionDuration,
            screen_views: state.currentSession.screenViews.length,
            interactions: state.currentSession.interactions,
            timestamp: Date.now(),
          } as any,
        });
      }
      
      setState(prev => ({
        ...prev,
        currentSession: null,
      }));
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  // Load analytics data
  const loadAnalyticsData = async () => {
    if (!user) return;
    
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // In a real app, you'd query a proper analytics table
      // For now, we'll simulate with audit logs
      const { data: sessionLogs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('actor_id', user.id)
        .eq('entity_type', 'mobile_app')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Process the logs to create analytics data
      const deviceInfo = await Device.getInfo();
      
      // Mock analytics data (in real app, this would be calculated from actual logs)
      const mockData: MobileAnalyticsData = {
        sessions: sessionLogs?.filter(log => log.action === 'session_start').length || 0,
        avgSessionDuration: 12.5, // minutes
        totalScreenTime: 156, // minutes this week
        mostUsedFeatures: [
          { feature: 'Dashboard', usage: 45, percentage: 35 },
          { feature: 'Assignments', usage: 32, percentage: 25 },
          { feature: 'Courses', usage: 28, percentage: 22 },
          { feature: 'Communications', usage: 15, percentage: 12 },
          { feature: 'Analytics', usage: 8, percentage: 6 },
        ],
        deviceInfo: {
          platform: deviceInfo.platform,
          model: deviceInfo.model || 'Unknown',
          version: deviceInfo.osVersion || 'Unknown',
        },
        networkUsage: {
          wifiTime: 134, // minutes on WiFi
          cellularTime: 22, // minutes on cellular
          offlineTime: 8, // minutes offline
        },
        performanceMetrics: {
          appLaunchTime: 2.3, // seconds
          avgLoadTime: 1.2, // seconds
          crashCount: 0,
        },
      };
      
      setState(prev => ({
        ...prev,
        data: mockData,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error loading analytics data:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to load analytics data',
        isLoading: false,
      }));
    }
  };

  // Initialize analytics
  useEffect(() => {
    if (user) {
      startSession();
      loadAnalyticsData();
    }
    
    return () => {
      if (state.currentSession) {
        endSession();
      }
    };
  }, [user]);

  // Track page visibility for session management
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        endSession();
      } else {
        startSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return {
    ...state,
    trackScreenView,
    trackInteraction,
    startSession,
    endSession,
    loadAnalyticsData,
  };
};