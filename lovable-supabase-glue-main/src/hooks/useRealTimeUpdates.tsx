import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

export const useRealTimeUpdates = (
  onUpdate: (table: string, payload: any) => void
) => {
  const { user } = useAuth();
  const { profile } = useProfile();

  const setupRealtimeSubscription = useCallback(() => {
    if (!user || !profile) return null;

    const channels: any[] = [];

    // Subscribe to assignments updates
    const assignmentsChannel = supabase
      .channel('assignments-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assignments'
        },
        (payload) => onUpdate('assignments', payload)
      )
      .subscribe();

    channels.push(assignmentsChannel);

    // Subscribe to submissions updates
    const submissionsChannel = supabase
      .channel('submissions-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions'
        },
        (payload) => onUpdate('submissions', payload)
      )
      .subscribe();

    channels.push(submissionsChannel);

    // Subscribe to messages updates
    const messagesChannel = supabase
      .channel('messages-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        (payload) => onUpdate('messages', payload)
      )
      .subscribe();

    channels.push(messagesChannel);

    // Subscribe to announcements updates
    const announcementsChannel = supabase
      .channel('announcements-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements'
        },
        (payload) => onUpdate('announcements', payload)
      )
      .subscribe();

    channels.push(announcementsChannel);

    // Subscribe to discussion posts updates
    const discussionPostsChannel = supabase
      .channel('discussion-posts-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discussion_posts'
        },
        (payload) => onUpdate('discussion_posts', payload)
      )
      .subscribe();

    channels.push(discussionPostsChannel);

    return channels;
  }, [user, profile, onUpdate]);

  useEffect(() => {
    const channels = setupRealtimeSubscription();

    return () => {
      if (channels) {
        channels.forEach(channel => {
          supabase.removeChannel(channel);
        });
      }
    };
  }, [setupRealtimeSubscription]);
};