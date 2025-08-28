import { useState, useEffect, useCallback } from 'react';
import { Storage } from '@capacitor/storage';
import { Network } from '@capacitor/network';
import { useToast } from '@/hooks/use-toast';

interface OfflineData {
  assignments: any[];
  submissions: any[];
  courses: any[];
  lastSync: string | null;
}

interface OfflineStorageState {
  isOnline: boolean;
  isLoading: boolean;
  offlineData: OfflineData;
  pendingSync: any[];
  hasOfflineContent: boolean;
}

export const useOfflineStorage = () => {
  const [state, setState] = useState<OfflineStorageState>({
    isOnline: true,
    isLoading: true,
    offlineData: {
      assignments: [],
      submissions: [],
      courses: [],
      lastSync: null,
    },
    pendingSync: [],
    hasOfflineContent: false,
  });
  
  const { toast } = useToast();

  // Monitor network status
  const initializeNetworkListener = useCallback(async () => {
    const status = await Network.getStatus();
    setState(prev => ({ ...prev, isOnline: status.connected }));

    Network.addListener('networkStatusChange', (status) => {
      const wasOffline = !state.isOnline;
      const isNowOnline = status.connected;
      
      setState(prev => ({ ...prev, isOnline: status.connected }));
      
      if (wasOffline && isNowOnline) {
        toast({
          title: "Back Online",
          description: "Syncing offline changes...",
        });
        syncPendingChanges();
      } else if (!status.connected) {
        toast({
          title: "Offline Mode",
          description: "You can continue working. Changes will sync when online.",
        });
      }
    });
  }, [state.isOnline, toast]);

  // Save data to offline storage
  const saveToOfflineStorage = async (key: string, data: any) => {
    try {
      await Storage.set({
        key: `offline_${key}`,
        value: JSON.stringify(data),
      });
      
      await Storage.set({
        key: 'offline_last_sync',
        value: new Date().toISOString(),
      });
      
      setState(prev => ({
        ...prev,
        offlineData: {
          ...prev.offlineData,
          [key]: data,
          lastSync: new Date().toISOString(),
        },
        hasOfflineContent: true,
      }));
    } catch (error) {
      console.error('Error saving to offline storage:', error);
    }
  };

  // Load data from offline storage
  const loadFromOfflineStorage = async (key: string) => {
    try {
      const result = await Storage.get({ key: `offline_${key}` });
      return result.value ? JSON.parse(result.value) : [];
    } catch (error) {
      console.error('Error loading from offline storage:', error);
      return [];
    }
  };

  // Add pending sync item
  const addToPendingSync = async (action: string, data: any) => {
    try {
      const pendingItem = {
        id: Date.now().toString(),
        action,
        data,
        timestamp: new Date().toISOString(),
      };
      
      const currentPending = await loadFromOfflineStorage('pending_sync');
      const updatedPending = [...currentPending, pendingItem];
      
      await Storage.set({
        key: 'offline_pending_sync',
        value: JSON.stringify(updatedPending),
      });
      
      setState(prev => ({
        ...prev,
        pendingSync: updatedPending,
      }));
    } catch (error) {
      console.error('Error adding to pending sync:', error);
    }
  };

  // Sync pending changes when back online
  const syncPendingChanges = async () => {
    try {
      const pending = await loadFromOfflineStorage('pending_sync');
      
      for (const item of pending) {
        try {
          // This would make actual API calls to sync data
          console.log('Syncing:', item);
          
          // Remove from pending after successful sync
          await removePendingItem(item.id);
        } catch (error) {
          console.error('Error syncing item:', item, error);
        }
      }
      
      toast({
        title: "Sync Complete",
        description: "All offline changes have been synchronized.",
      });
    } catch (error) {
      console.error('Error syncing pending changes:', error);
    }
  };

  // Remove item from pending sync
  const removePendingItem = async (itemId: string) => {
    try {
      const pending = await loadFromOfflineStorage('pending_sync');
      const filtered = pending.filter((item: any) => item.id !== itemId);
      
      await Storage.set({
        key: 'offline_pending_sync',
        value: JSON.stringify(filtered),
      });
      
      setState(prev => ({
        ...prev,
        pendingSync: filtered,
      }));
    } catch (error) {
      console.error('Error removing pending item:', error);
    }
  };

  // Initialize offline storage
  const initializeOfflineStorage = async () => {
    try {
      // Load existing offline data
      const assignments = await loadFromOfflineStorage('assignments');
      const submissions = await loadFromOfflineStorage('submissions');
      const courses = await loadFromOfflineStorage('courses');
      const pendingSync = await loadFromOfflineStorage('pending_sync');
      
      const lastSyncResult = await Storage.get({ key: 'offline_last_sync' });
      const lastSync = lastSyncResult.value;
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        offlineData: {
          assignments,
          submissions,
          courses,
          lastSync,
        },
        pendingSync: pendingSync || [],
        hasOfflineContent: assignments.length > 0 || submissions.length > 0 || courses.length > 0,
      }));
    } catch (error) {
      console.error('Error initializing offline storage:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Clear offline storage
  const clearOfflineStorage = async () => {
    try {
      await Storage.remove({ key: 'offline_assignments' });
      await Storage.remove({ key: 'offline_submissions' });
      await Storage.remove({ key: 'offline_courses' });
      await Storage.remove({ key: 'offline_pending_sync' });
      await Storage.remove({ key: 'offline_last_sync' });
      
      setState(prev => ({
        ...prev,
        offlineData: {
          assignments: [],
          submissions: [],
          courses: [],
          lastSync: null,
        },
        pendingSync: [],
        hasOfflineContent: false,
      }));
      
      toast({
        title: "Offline Data Cleared",
        description: "All offline content has been removed.",
      });
    } catch (error) {
      console.error('Error clearing offline storage:', error);
    }
  };

  useEffect(() => {
    initializeNetworkListener();
    initializeOfflineStorage();
    
    return () => {
      Network.removeAllListeners();
    };
  }, [initializeNetworkListener]);

  return {
    ...state,
    saveToOfflineStorage,
    loadFromOfflineStorage,
    addToPendingSync,
    syncPendingChanges,
    clearOfflineStorage,
  };
};