import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';
import { useMessaging } from '@/hooks/useMessaging';
import { useRealTimeNotifications } from '@/hooks/useRealTimeNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Send, Plus, AlertTriangle, Info, CheckCircle, RefreshCw } from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject?: string;
  content: string;
  read_at?: string;
  created_at: string;
  sender?: {
    first_name?: string;
    last_name?: string;
    email: string;
  };
  recipient?: {
    first_name?: string;
    last_name?: string;
    email: string;
  };
}

interface Announcement {
  id: string;
  course_id: string;
  author_id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expires_at?: string;
  created_at: string;
  course?: {
    title: string;
  };
  author?: {
    first_name?: string;
    last_name?: string;
    email: string;
  };
}

export const Communications: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  
  // Use messaging hook for enhanced functionality
  const { 
    threads, 
    messages, 
    sendMessage: sendDirectMessage, 
    createThread,
    loading: messagingLoading 
  } = useMessaging({ autoRefresh: true });
  
  // Use notifications hook
  const { notifications, unreadCount } = useRealTimeNotifications();
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New message state
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [newMessage, setNewMessage] = useState({
    recipient_id: '',
    subject: '',
    content: '',
    course_id: '',
  });
  
  // New announcement state
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    course_id: '',
    title: '',
    content: '',
    priority: 'normal' as const,
    expires_at: '',
  });

  // Real-time updates
  const handleRealTimeUpdate = (table: string, payload: any) => {
    if (table === 'announcements') {
      fetchAnnouncements();
    }
  };

  useRealTimeUpdates(handleRealTimeUpdate);

  useEffect(() => {
    if (user && profile) {
      fetchAnnouncements();
      fetchCourses();
      if (profile.role === 'teacher') {
        fetchStudents();
      }
    }
  }, [user, profile]);

  const fetchAnnouncements = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch announcements
      const { data: announcementsData } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (announcementsData) {
        // Get course and author info
        const courseIds = [...new Set(announcementsData.map(a => a.course_id))];
        const authorIds = [...new Set(announcementsData.map(a => a.author_id))];

        const [coursesResponse, authorsResponse] = await Promise.all([
          supabase.from('courses').select('id, title').in('id', courseIds),
          supabase.from('profiles').select('id, first_name, last_name, email').in('id', authorIds)
        ]);

        const announcementsWithDetails = announcementsData.map(announcement => ({
          ...announcement,
          priority: announcement.priority as 'low' | 'normal' | 'high' | 'urgent',
          course: coursesResponse.data?.find(c => c.id === announcement.course_id),
          author: authorsResponse.data?.find(p => p.id === announcement.author_id),
        }));

        setAnnouncements(announcementsWithDetails);
      }

    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast({
        title: "Error",
        description: "Failed to load announcements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    if (!user || !profile) return;

    try {
      let query = supabase.from('courses').select('id, title');

      if (profile.role === 'teacher') {
        query = query.eq('teacher_id', user.id);
      }

      const { data } = await query.order('title');
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchStudents = async () => {
    if (!user || profile?.role !== 'teacher') return;

    try {
      // Get all students from teacher's courses
      const { data: teacherCourses } = await supabase
        .from('courses')
        .select('id')
        .eq('teacher_id', user.id);

      if (teacherCourses && teacherCourses.length > 0) {
        const courseIds = teacherCourses.map(c => c.id);
        
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('student_id')
          .in('course_id', courseIds);

        if (enrollments && enrollments.length > 0) {
          const studentIds = [...new Set(enrollments.map(e => e.student_id))];
          const { data: studentProfiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .in('id', studentIds);

          setStudents(studentProfiles || []);
        }
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const sendMessage = async () => {
    if (!user || !newMessage.recipient_id || !newMessage.content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use the messaging hook's sendMessage function
      await sendDirectMessage(
        newMessage.recipient_id,
        newMessage.content,
        newMessage.subject || undefined
      );

      toast({
        title: "Success",
        description: "Message sent successfully",
      });

      setNewMessage({
        recipient_id: '',
        subject: '',
        content: '',
        course_id: '',
      });
      setIsMessageDialogOpen(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const createAnnouncement = async () => {
    if (!user || !newAnnouncement.course_id || !newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('announcements')
        .insert({
          course_id: newAnnouncement.course_id,
          author_id: user.id,
          title: newAnnouncement.title,
          content: newAnnouncement.content,
          priority: newAnnouncement.priority,
          expires_at: newAnnouncement.expires_at || null,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Announcement created successfully",
      });

      setNewAnnouncement({
        course_id: '',
        title: '',
        content: '',
        priority: 'normal',
        expires_at: '',
      });
      setIsAnnouncementDialogOpen(false);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast({
        title: "Error",
        description: "Failed to create announcement",
        variant: "destructive",
      });
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('recipient_id', user?.id);

      if (error) throw error;
      // The messaging hook will handle real-time updates
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'low':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive' as const;
      case 'high':
        return 'destructive' as const;
      case 'low':
        return 'secondary' as const;
      default:
        return 'default' as const;
    }
  };

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  const getUserDisplayName = (user: any) => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user?.email || 'Unknown User';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Communications</h2>
          <p className="text-muted-foreground">Stay connected with your class</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-muted-foreground">Real-time updates active</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <MessageSquare className="mr-2 h-4 w-4" />
                New Message
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Message</DialogTitle>
                <DialogDescription>
                  Send a direct message to a student or teacher
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Recipient</label>
                  <Select value={newMessage.recipient_id} onValueChange={(value) => setNewMessage(prev => ({ ...prev, recipient_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select recipient" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {getUserDisplayName(student)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Subject (Optional)</label>
                  <Input
                    value={newMessage.subject}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Enter subject"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    value={newMessage.content}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Type your message..."
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsMessageDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={sendMessage}>
                  <Send className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {profile?.role === 'teacher' && (
            <Dialog open={isAnnouncementDialogOpen} onOpenChange={setIsAnnouncementDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  New Announcement
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Announcement</DialogTitle>
                  <DialogDescription>
                    Post an announcement to your course
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Course</label>
                    <Select value={newAnnouncement.course_id} onValueChange={(value) => setNewAnnouncement(prev => ({ ...prev, course_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={newAnnouncement.title}
                      onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Announcement title"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Priority</label>
                    <Select value={newAnnouncement.priority} onValueChange={(value: any) => setNewAnnouncement(prev => ({ ...prev, priority: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Content</label>
                    <Textarea
                      value={newAnnouncement.content}
                      onChange={(e) => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Write your announcement..."
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAnnouncementDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createAnnouncement}>
                    Create Announcement
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Communications Tabs */}
      <Tabs defaultValue="messages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          {messages.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No messages yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <Card key={message.id} className={`cursor-pointer transition-colors ${
                  message.recipient_id === user?.id && !message.read_at ? 'border-primary bg-primary/5' : ''
                }`} onClick={() => {
                  if (message.recipient_id === user?.id && !message.read_at) {
                    markMessageAsRead(message.id);
                  }
                }}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">
                            {message.sender_id === user?.id ? 'To: ' : 'From: '}
                            Message Participant
                          </CardTitle>
                          {message.recipient_id === user?.id && !message.read_at && (
                            <Badge variant="default" className="text-xs">Unread</Badge>
                          )}
                        </div>
                        {message.subject && (
                          <CardDescription className="font-medium mt-1">
                            {message.subject}
                          </CardDescription>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(message.created_at)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm line-clamp-3">{message.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="announcements" className="space-y-4">
          {announcements.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No announcements yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <Card key={announcement.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getPriorityIcon(announcement.priority)}
                          <CardTitle className="text-lg">{announcement.title}</CardTitle>
                          <Badge variant={getPriorityVariant(announcement.priority)} className="text-xs">
                            {announcement.priority.toUpperCase()}
                          </Badge>
                        </div>
                        <CardDescription>
                          {announcement.course?.title} • By {getUserDisplayName(announcement.author)}
                        </CardDescription>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(announcement.created_at)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{announcement.content}</p>
                    {announcement.expires_at && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-muted-foreground">
                          Expires: {new Date(announcement.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};