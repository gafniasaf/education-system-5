import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'assignment' | 'grade' | 'discussion' | 'message' | 'announcement' | 'reminder';
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
  expires_at?: string;
  action_url?: string;
}

interface UseRealTimeNotificationsOptions {
  markAsReadOnView?: boolean;
  autoRefresh?: boolean;
}

export const useRealTimeNotifications = ({
  markAsReadOnView = true,
  autoRefresh = true
}: UseRealTimeNotificationsOptions = {}) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications from database
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .or('expires_at.is.null,expires_at.gte.now()')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const typedData = (data || []).map(notification => ({
        ...notification,
        type: notification.type as Notification['type'],
        data: notification.data as Record<string, any>,
      }));

      setNotifications(typedData);
      setUnreadCount(typedData.filter(n => !n.is_read).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, [user?.id]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, [user?.id]);

  // Delete notification
  const clearNotification = useCallback(async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications(prev => {
        const filtered = prev.filter(n => n.id !== notificationId);
        const unreadRemaining = filtered.filter(n => !n.is_read).length;
        setUnreadCount(unreadRemaining);
        return filtered;
      });
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, [user?.id]);

  // Create notification helper
  const addNotification = useCallback(async (
    targetUserId: string,
    title: string,
    message: string,
    type: Notification['type'],
    data: Record<string, any> = {},
    actionUrl?: string
  ) => {
    try {
      const { data: notificationData, error } = await supabase
        .rpc('create_notification', {
          target_user_id: targetUserId,
          notification_title: title,
          notification_message: message,
          notification_type: type,
          notification_data: data,
          notification_action_url: actionUrl
        });

      if (error) throw error;
      return notificationData;
    } catch (err) {
      console.error('Error creating notification:', err);
      throw err;
    }
  }, []);

  // Set up real-time subscription for new notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // Add to notifications list
          setNotifications(prev => [newNotification, ...prev.slice(0, 49)]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast notification
          toast({
            title: newNotification.title,
            description: newNotification.message,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          setNotifications(prev =>
            prev.map(n =>
              n.id === updatedNotification.id ? updatedNotification : n
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const deletedNotification = payload.old as Notification;
          setNotifications(prev => prev.filter(n => n.id !== deletedNotification.id));
          if (!deletedNotification.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, toast]);

  // Legacy real-time notifications for existing events
  useEffect(() => {
    if (!user || !profile) return;

    const channels: any[] = [];

    // Listen for new assignments (students only)
    if (profile.role === 'student') {
      const assignmentsChannel = supabase
        .channel('assignments-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'assignments'
          },
          async (payload) => {
            // Check if student is enrolled in the course
            const { data: enrollment } = await supabase
              .from('enrollments')
              .select('id')
              .eq('course_id', payload.new.course_id)
              .eq('student_id', user.id)
              .single();

            if (enrollment) {
              // Get course title
              const { data: course } = await supabase
                .from('courses')
                .select('title')
                .eq('id', payload.new.course_id)
                .single();

              await addNotification(
                user.id,
                'New Assignment Available',
                `"${payload.new.title}" has been posted in ${course?.title || 'your course'}`,
                'assignment',
                { assignmentId: payload.new.id, courseId: payload.new.course_id },
                `/assignments/${payload.new.id}`
              );
            }
          }
        )
        .subscribe();

      channels.push(assignmentsChannel);
    }

    // Listen for new submissions (teachers only)
    if (profile.role === 'teacher') {
      const submissionsChannel = supabase
        .channel('submissions-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'submissions'
          },
          async (payload) => {
            // Get assignment info
            const { data: assignment } = await supabase
              .from('assignments')
              .select('title, course_id')
              .eq('id', payload.new.assignment_id)
              .single();

            if (!assignment) return;

            // Get course info
            const { data: course } = await supabase
              .from('courses')
              .select('title, teacher_id')
              .eq('id', assignment.course_id)
              .single();

            // Check if this is the teacher's course
            if (course?.teacher_id === user.id) {
              // Get student name
              const { data: student } = await supabase
                .from('profiles')
                .select('first_name, last_name')
                .eq('id', payload.new.student_id)
                .single();

              const studentName = student ? 
                `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'A student' : 'A student';

              await addNotification(
                user.id,
                'New Submission Received',
                `${studentName} submitted "${assignment?.title}" in ${course?.title}`,
                'assignment',
                { submissionId: payload.new.id, assignmentId: assignment?.course_id },
                `/assignments/${payload.new.assignment_id}`
              );
            }
          }
        )
        .subscribe();

      channels.push(submissionsChannel);
    }

    // Listen for grade updates (students only)
    if (profile.role === 'student') {
      const gradesChannel = supabase
        .channel('grades-realtime')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'submissions'
          },
          async (payload) => {
            // Check if this is the student's submission and grade was added
            if (payload.new.student_id === user.id && 
                payload.new.grade !== null && 
                payload.old.grade === null) {
              
              // Get assignment info
              const { data: assignment } = await supabase
                .from('assignments')
                .select('title, points_possible')
                .eq('id', payload.new.assignment_id)
                .single();

              await addNotification(
                user.id,
                'Assignment Graded',
                `Your submission for "${assignment?.title}" has been graded: ${payload.new.grade}/${assignment?.points_possible || '?'} points`,
                'grade',
                { submissionId: payload.new.id },
                `/assignments/${payload.new.assignment_id}`
              );
            }
          }
        )
        .subscribe();

      channels.push(gradesChannel);
    }

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [user, profile, addNotification]);

  // Initial fetch
  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id, fetchNotifications]);

  // Auto-refresh notifications
  useEffect(() => {
    if (!autoRefresh || !user?.id) return;

    const interval = setInterval(fetchNotifications, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [autoRefresh, user?.id, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    clearNotification,
    addNotification,
    refetch: fetchNotifications,
  };
};