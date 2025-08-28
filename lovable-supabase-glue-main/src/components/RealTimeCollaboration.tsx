import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Video, 
  Calendar, 
  Clock, 
  Plus, 
  UserPlus,
  ExternalLink,
  Circle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface CollaborationSession {
  id: string;
  title: string;
  description?: string;
  session_type: string;
  course_id: string;
  assignment_id?: string;
  created_by: string;
  status: string;
  scheduled_start?: string;
  scheduled_end?: string;
  meeting_link?: string;
  max_participants?: number;
  created_at: string;
  updated_at: string;
  participants?: any[];
  creator?: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
}

interface RealTimeCollaborationProps {
  courseId?: string;
  assignmentId?: string;
}

export function RealTimeCollaboration({ courseId, assignmentId }: RealTimeCollaborationProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  
  const [sessions, setSessions] = useState<CollaborationSession[]>([]);
  const [activeSessions, setActiveSessions] = useState<CollaborationSession[]>([]);
  const [userPresence, setUserPresence] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Create session state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSession, setNewSession] = useState({
    title: '',
    description: '',
    session_type: 'study_group',
    scheduled_start: '',
    scheduled_end: '',
    meeting_link: '',
    max_participants: 10
  });

  useEffect(() => {
    loadSessions();
    loadUserPresence();
    
    // Set up real-time subscriptions
    const sessionsChannel = supabase
      .channel('collaboration_sessions')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'collaboration_sessions' },
        () => loadSessions()
      )
      .subscribe();

    const presenceChannel = supabase
      .channel('user_presence')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_presence' },
        () => loadUserPresence()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [courseId, assignmentId]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('collaboration_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      if (assignmentId) {
        query = query.eq('assignment_id', assignmentId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get session details with participants and creators
      const sessionsWithDetails = await Promise.all(
        (data || []).map(async (session) => {
          // Get creator profile
          const { data: creator } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('id', session.created_by)
            .single();

          // Get participants
          const { data: participants } = await supabase
            .from('collaboration_participants')
            .select(`
              *,
              user:profiles!collaboration_participants_user_id_fkey(first_name, last_name, avatar_url)
            `)
            .eq('session_id', session.id);

          return {
            ...session,
            creator,
            participants: participants || []
          };
        })
      );

      setSessions(sessionsWithDetails);
      
      // Filter active sessions
      const active = sessionsWithDetails.filter(s => s.status === 'active');
      setActiveSessions(active);
      
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Failed to load collaboration sessions');
    } finally {
      setLoading(false);
    }
  };

  const loadUserPresence = async () => {
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select(`
          *,
          user:profiles!user_presence_user_id_fkey(first_name, last_name, avatar_url)
        `)
        .eq('status', 'online')
        .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Last 5 minutes

      if (error) throw error;
      setUserPresence(data || []);
    } catch (error) {
      console.error('Error loading user presence:', error);
    }
  };

  const createSession = async () => {
    if (!user?.id || !courseId || !newSession.title.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const sessionData = {
        ...newSession,
        course_id: courseId,
        assignment_id: assignmentId,
        created_by: user.id,
        status: 'planned'
      };

      const { data, error } = await supabase
        .from('collaboration_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) throw error;

      // Add creator as participant
      await supabase
        .from('collaboration_participants')
        .insert({
          session_id: data.id,
          user_id: user.id,
          role: 'organizer'
        });

      toast.success('Collaboration session created successfully');
      setIsCreateDialogOpen(false);
      setNewSession({
        title: '',
        description: '',
        session_type: 'study_group',
        scheduled_start: '',
        scheduled_end: '',
        meeting_link: '',
        max_participants: 10
      });
      loadSessions();
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
    }
  };

  const joinSession = async (sessionId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('collaboration_participants')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          role: 'participant'
        });

      if (error) throw error;
      toast.success('Joined session successfully');
      loadSessions();
    } catch (error) {
      console.error('Error joining session:', error);
      toast.error('Failed to join session');
    }
  };

  const leaveSession = async (sessionId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('collaboration_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('session_id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Left session successfully');
      loadSessions();
    } catch (error) {
      console.error('Error leaving session:', error);
      toast.error('Failed to leave session');
    }
  };

  const updatePresence = async (status: 'online' | 'away' | 'offline', currentPage?: string) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          status,
          current_page: currentPage,
          last_seen: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  };

  // Update presence on mount and page visibility changes
  useEffect(() => {
    updatePresence('online', window.location.pathname);
    
    const handleVisibilityChange = () => {
      updatePresence(document.hidden ? 'away' : 'online', window.location.pathname);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user?.id]);

  const getSessionStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'planned': return 'bg-blue-500';
      case 'completed': return 'bg-gray-500';
      default: return 'bg-yellow-500';
    }
  };

  const getUserName = (user: any) => {
    return user?.first_name && user?.last_name 
      ? `${user.first_name} ${user.last_name}`
      : 'Unknown User';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Real-Time Collaboration</h2>
          <p className="text-muted-foreground">Connect and collaborate with others</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Collaboration Session</DialogTitle>
              <DialogDescription>
                Set up a new study session or collaboration space
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Session title"
                value={newSession.title}
                onChange={(e) => setNewSession(prev => ({ ...prev, title: e.target.value }))}
              />
              <Textarea
                placeholder="Description (optional)"
                value={newSession.description}
                onChange={(e) => setNewSession(prev => ({ ...prev, description: e.target.value }))}
              />
              <Select
                value={newSession.session_type}
                onValueChange={(value) => setNewSession(prev => ({ ...prev, session_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="study_group">Study Group</SelectItem>
                  <SelectItem value="project_work">Project Work</SelectItem>
                  <SelectItem value="peer_review">Peer Review</SelectItem>
                  <SelectItem value="office_hours">Office Hours</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="datetime-local"
                placeholder="Start time"
                value={newSession.scheduled_start}
                onChange={(e) => setNewSession(prev => ({ ...prev, scheduled_start: e.target.value }))}
              />
              <Input
                type="datetime-local"
                placeholder="End time"
                value={newSession.scheduled_end}
                onChange={(e) => setNewSession(prev => ({ ...prev, scheduled_end: e.target.value }))}
              />
              <Input
                placeholder="Meeting link (optional)"
                value={newSession.meeting_link}
                onChange={(e) => setNewSession(prev => ({ ...prev, meeting_link: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createSession}>Create Session</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Sessions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeSessions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No active sessions</p>
              ) : (
                activeSessions.map((session) => (
                  <div key={session.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getSessionStatusColor(session.status)}`} />
                          <h3 className="font-semibold">{session.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            {session.session_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        {session.description && (
                          <p className="text-sm text-muted-foreground mt-1">{session.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {session.participants?.length || 0} participants
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {session.meeting_link && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={session.meeting_link} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        )}
                        <Button size="sm" onClick={() => joinSession(session.id)}>
                          <UserPlus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* All Sessions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>All Sessions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sessions.map((session) => (
                <div key={session.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getSessionStatusColor(session.status)}`} />
                        <h3 className="font-semibold">{session.title}</h3>
                        <Badge variant="outline" className="text-xs capitalize">
                          {session.session_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      {session.description && (
                        <p className="text-sm text-muted-foreground mt-1">{session.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Created by {getUserName(session.creator)}</span>
                        <span>{formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {session.status === 'active' && (
                        <Button size="sm" variant="destructive" onClick={() => leaveSession(session.id)}>
                          Leave
                        </Button>
                      )}
                      {session.status === 'planned' && (
                        <Button size="sm" onClick={() => joinSession(session.id)}>
                          Join
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Online Users */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Online Now</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userPresence.map((presence) => (
                  <div key={presence.id} className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={presence.user?.avatar_url} />
                        <AvatarFallback>
                          {getUserName(presence.user).split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <Circle className="absolute -bottom-1 -right-1 h-3 w-3 fill-green-500 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {getUserName(presence.user)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {presence.current_page || 'Online'}
                      </p>
                    </div>
                  </div>
                ))}
                {userPresence.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No users online</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}