import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface MessageThread {
  id: string;
  subject: string;
  course_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  participants: string[];
}

export interface Message {
  id: string;
  thread_id?: string;
  message_thread_id?: string;
  sender_id: string;
  recipient_id?: string;
  subject?: string;
  content: string;
  message_type: 'text' | 'file' | 'announcement';
  attachments: any[];
  is_draft: boolean;
  read_at?: string;
  created_at: string;
  course_id?: string;
}

interface UseMessagingOptions {
  courseId?: string;
  threadId?: string;
  autoRefresh?: boolean;
}

export const useMessaging = ({
  courseId,
  threadId,
  autoRefresh = true
}: UseMessagingOptions = {}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentThread, setCurrentThread] = useState<MessageThread | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch message threads
  const fetchThreads = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('message_threads')
        .select('*')
        .or(`created_by.eq.${user.id},participants.cs.{${user.id}}`);

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error } = await query
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setThreads(data || []);
    } catch (err) {
      console.error('Error fetching threads:', err);
      setError('Failed to load message threads');
    } finally {
      setLoading(false);
    }
  }, [user?.id, courseId]);

  // Fetch messages for a thread
  const fetchMessages = useCallback(async (thread_id: string) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('message_thread_id', thread_id)
        .eq('is_draft', false)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages((data || []).map(msg => ({
        ...msg,
        message_type: msg.message_type as Message['message_type'],
        attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
      })));
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Create new thread
  const createThread = useCallback(async (
    subject: string,
    participantIds: string[],
    course_id?: string
  ) => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('message_threads')
        .insert({
          subject,
          course_id,
          created_by: user.id,
          participants: [...participantIds, user.id]
        })
        .select()
        .single();

      if (error) throw error;

      setThreads(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error creating thread:', err);
      toast({
        title: "Error",
        description: "Failed to create message thread",
        variant: "destructive",
      });
      return null;
    }
  }, [user?.id, toast]);

  // Send message
  const sendMessage = useCallback(async (
    content: string,
    thread_id?: string,
    recipient_id?: string,
    subject?: string,
    attachments: any[] = [],
    message_type: Message['message_type'] = 'text'
  ) => {
    if (!user?.id) return null;

    try {
      const messageData: any = {
        sender_id: user.id,
        content,
        message_type,
        attachments,
        is_draft: false
      };

      if (thread_id) {
        messageData.message_thread_id = thread_id;
      } else if (recipient_id) {
        messageData.recipient_id = recipient_id;
        messageData.subject = subject;
        if (courseId) messageData.course_id = courseId;
      }

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;

      // Update thread timestamp if applicable
      if (thread_id) {
        await supabase
          .from('message_threads')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', thread_id);
        
        setMessages(prev => [...prev, {
          ...data,
          message_type: data.message_type as Message['message_type'],
          attachments: Array.isArray(data.attachments) ? data.attachments : [],
        }]);
      }

      return data;
    } catch (err) {
      console.error('Error sending message:', err);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      return null;
    }
  }, [user?.id, courseId, toast]);

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('recipient_id', user.id);

      if (error) throw error;

      setMessages(prev =>
        prev.map(m =>
          m.id === messageId ? { ...m, read_at: new Date().toISOString() } : m
        )
      );
    } catch (err) {
      console.error('Error marking message as read:', err);
    }
  }, [user?.id]);

  // Archive thread
  const archiveThread = useCallback(async (thread_id: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('message_threads')
        .update({ is_archived: true })
        .eq('id', thread_id)
        .eq('created_by', user.id);

      if (error) throw error;

      setThreads(prev => prev.filter(t => t.id !== thread_id));
    } catch (err) {
      console.error('Error archiving thread:', err);
      toast({
        title: "Error",
        description: "Failed to archive thread",
        variant: "destructive",
      });
    }
  }, [user?.id, toast]);

  // Add participant to thread
  const addParticipant = useCallback(async (thread_id: string, userId: string) => {
    if (!user?.id) return;

    try {
      const thread = threads.find(t => t.id === thread_id);
      if (!thread || thread.created_by !== user.id) return;

      const updatedParticipants = [...new Set([...thread.participants, userId])];

      const { error } = await supabase
        .from('message_threads')
        .update({ participants: updatedParticipants })
        .eq('id', thread_id);

      if (error) throw error;

      setThreads(prev =>
        prev.map(t =>
          t.id === thread_id ? { ...t, participants: updatedParticipants } : t
        )
      );
    } catch (err) {
      console.error('Error adding participant:', err);
    }
  }, [user?.id, threads]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;

    const messagesChannel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
          
          toast({
            title: "New Message",
            description: newMessage.subject || "You have a new message",
          });
        }
      )
      .subscribe();

    const threadsChannel = supabase
      .channel('threads')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_threads'
        },
        (payload) => {
          const newThread = payload.new as MessageThread;
          if (newThread.participants.includes(user.id)) {
            setThreads(prev => [newThread, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(threadsChannel);
    };
  }, [user?.id, toast]);

  // Initial data fetch
  useEffect(() => {
    if (user?.id) {
      fetchThreads();
    }
  }, [user?.id, fetchThreads]);

  // Fetch messages when thread changes
  useEffect(() => {
    if (threadId) {
      fetchMessages(threadId);
      const thread = threads.find(t => t.id === threadId);
      setCurrentThread(thread || null);
    }
  }, [threadId, threads, fetchMessages]);

  return {
    threads,
    messages,
    currentThread,
    loading,
    error,
    createThread,
    sendMessage,
    markAsRead,
    archiveThread,
    addParticipant,
    fetchMessages,
    refetch: fetchThreads,
  };
};