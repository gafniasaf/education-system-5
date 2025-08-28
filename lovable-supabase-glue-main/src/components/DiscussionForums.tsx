import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Plus, Reply, Users, BookOpen, FileText, Send } from 'lucide-react';

interface DiscussionForum {
  id: string;
  course_id?: string;
  assignment_id?: string;
  title: string;
  description?: string;
  created_by: string;
  created_at: string;
  course?: {
    title: string;
  };
  assignment?: {
    title: string;
  };
  creator?: {
    first_name?: string;
    last_name?: string;
    email: string;
  };
  post_count?: number;
  last_post?: string;
}

interface DiscussionPost {
  id: string;
  forum_id: string;
  author_id: string;
  content: string;
  parent_post_id?: string;
  created_at: string;
  updated_at: string;
  author?: {
    first_name?: string;
    last_name?: string;
    email: string;
  };
  replies?: DiscussionPost[];
}

export const DiscussionForums: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  
  const [forums, setForums] = useState<DiscussionForum[]>([]);
  const [selectedForum, setSelectedForum] = useState<DiscussionForum | null>(null);
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  
  // New forum state
  const [isForumDialogOpen, setIsForumDialogOpen] = useState(false);
  const [newForum, setNewForum] = useState({
    title: '',
    description: '',
    course_id: '',
    assignment_id: '',
  });
  
  // New post state
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [newPost, setNewPost] = useState({
    content: '',
    parent_post_id: '',
  });
  
  // Reply state
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // Real-time updates
  const handleRealTimeUpdate = (table: string, payload: any) => {
    if (table === 'discussion_posts') {
      if (selectedForum) {
        fetchPosts(selectedForum.id);
      }
      fetchForums(); // Update post counts
    }
  };

  useRealTimeUpdates(handleRealTimeUpdate);

  useEffect(() => {
    if (user && profile) {
      fetchForums();
      fetchCourses();
      fetchAssignments();
    }
  }, [user, profile]);

  useEffect(() => {
    if (selectedForum) {
      fetchPosts(selectedForum.id);
    }
  }, [selectedForum]);

  const fetchForums = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: forumsData, error } = await supabase
        .from('discussion_forums')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (forumsData) {
        // Fetch additional data for each forum
        const forumsWithDetails = await Promise.all(
          forumsData.map(async (forum) => {
            // Get course/assignment details
            let courseData = null;
            let assignmentData = null;
            
            if (forum.course_id) {
              const { data } = await supabase
                .from('courses')
                .select('title')
                .eq('id', forum.course_id)
                .single();
              courseData = data;
            }
            
            if (forum.assignment_id) {
              const { data } = await supabase
                .from('assignments')
                .select('title')
                .eq('id', forum.assignment_id)
                .single();
              assignmentData = data;
            }

            // Get creator details
            const { data: creator } = await supabase
              .from('profiles')
              .select('first_name, last_name, email')
              .eq('id', forum.created_by)
              .single();

            // Get post count
            const { count: postCount } = await supabase
              .from('discussion_posts')
              .select('*', { count: 'exact', head: true })
              .eq('forum_id', forum.id);

            // Get last post time
            const { data: lastPost } = await supabase
              .from('discussion_posts')
              .select('created_at')
              .eq('forum_id', forum.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            return {
              ...forum,
              course: courseData,
              assignment: assignmentData,
              creator,
              post_count: postCount || 0,
              last_post: lastPost?.created_at,
            };
          })
        );

        setForums(forumsWithDetails);
      }
    } catch (error) {
      console.error('Error fetching forums:', error);
      toast({
        title: "Error",
        description: "Failed to load discussion forums",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async (forumId: string) => {
    try {
      setPostsLoading(true);

      const { data: postsData, error } = await supabase
        .from('discussion_posts')
        .select('*')
        .eq('forum_id', forumId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (postsData) {
        // Fetch author details
        const authorIds = [...new Set(postsData.map(p => p.author_id))];
        const { data: authors } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', authorIds);

        // Build threaded structure
        const postsWithAuthors = postsData.map(post => ({
          ...post,
          author: authors?.find(a => a.id === post.author_id),
          replies: [],
        }));

        // Create threaded structure
        const threadedPosts: DiscussionPost[] = [];
        const postMap = new Map<string, DiscussionPost>();

        // First pass: create map of all posts
        postsWithAuthors.forEach(post => {
          postMap.set(post.id, post);
        });

        // Second pass: build threaded structure
        postsWithAuthors.forEach(post => {
          if (post.parent_post_id && postMap.has(post.parent_post_id)) {
            const parent = postMap.get(post.parent_post_id)!;
            if (!parent.replies) parent.replies = [];
            parent.replies.push(post);
          } else {
            threadedPosts.push(post);
          }
        });

        setPosts(threadedPosts);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive",
      });
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchCourses = async () => {
    if (!user || !profile) return;

    try {
      let query = supabase.from('courses').select('id, title');

      if (profile.role === 'teacher') {
        query = query.eq('teacher_id', user.id);
      } else if (profile.role === 'student') {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('course_id')
          .eq('student_id', user.id);

        if (enrollments && enrollments.length > 0) {
          const courseIds = enrollments.map(e => e.course_id);
          query = query.in('id', courseIds);
        }
      }

      const { data } = await query.order('title');
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchAssignments = async () => {
    if (!user || !profile) return;

    try {
      const { data } = await supabase
        .from('assignments')
        .select('id, title, course_id')
        .order('title');
      
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const createForum = async () => {
    if (!user || !newForum.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a forum title",
        variant: "destructive",
      });
      return;
    }

    if (!newForum.course_id && !newForum.assignment_id) {
      toast({
        title: "Error",
        description: "Please select either a course or assignment",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('discussion_forums')
        .insert({
          title: newForum.title,
          description: newForum.description || null,
          course_id: newForum.course_id || null,
          assignment_id: newForum.assignment_id || null,
          created_by: user.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Discussion forum created successfully",
      });

      setNewForum({
        title: '',
        description: '',
        course_id: '',
        assignment_id: '',
      });
      setIsForumDialogOpen(false);
      fetchForums();
    } catch (error) {
      console.error('Error creating forum:', error);
      toast({
        title: "Error",
        description: "Failed to create forum",
        variant: "destructive",
      });
    }
  };

  const createPost = async () => {
    if (!user || !selectedForum || !newPost.content.trim()) {
      toast({
        title: "Error",
        description: "Please enter post content",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('discussion_posts')
        .insert({
          forum_id: selectedForum.id,
          author_id: user.id,
          content: newPost.content,
          parent_post_id: newPost.parent_post_id || null,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post created successfully",
      });

      setNewPost({
        content: '',
        parent_post_id: '',
      });
      setIsPostDialogOpen(false);
      fetchPosts(selectedForum.id);
      fetchForums(); // Update post count
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive",
      });
    }
  };

  const createReply = async (parentPostId: string) => {
    if (!user || !selectedForum || !replyContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter reply content",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('discussion_posts')
        .insert({
          forum_id: selectedForum.id,
          author_id: user.id,
          content: replyContent,
          parent_post_id: parentPostId,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reply posted successfully",
      });

      setReplyContent('');
      setReplyingTo(null);
      fetchPosts(selectedForum.id);
      fetchForums(); // Update post count
    } catch (error) {
      console.error('Error creating reply:', error);
      toast({
        title: "Error",
        description: "Failed to post reply",
        variant: "destructive",
      });
    }
  };

  const getUserDisplayName = (user: any) => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user?.email || 'Unknown User';
  };

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  const renderPost = (post: DiscussionPost, isReply = false) => (
    <div key={post.id} className={`${isReply ? 'ml-8 mt-4' : 'mb-6'}`}>
      <Card className={isReply ? 'border-l-4 border-l-primary' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">{getUserDisplayName(post.author)}</CardTitle>
              <CardDescription>{formatDate(post.created_at)}</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
            >
              <Reply className="h-4 w-4 mr-1" />
              Reply
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap mb-4">{post.content}</p>
          
          {replyingTo === post.id && (
            <div className="mt-4 pt-4 border-t space-y-3">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write your reply..."
                rows={3}
              />
              <div className="flex gap-2">
                <Button onClick={() => createReply(post.id)} size="sm">
                  <Send className="h-4 w-4 mr-1" />
                  Post Reply
                </Button>
                <Button variant="outline" size="sm" onClick={() => setReplyingTo(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Render replies */}
      {post.replies && post.replies.length > 0 && (
        <div className="mt-4">
          {post.replies.map(reply => renderPost(reply, true))}
        </div>
      )}
    </div>
  );

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Discussion Forums</h2>
          <p className="text-muted-foreground">
            {selectedForum ? `Viewing: ${selectedForum.title}` : 'Engage in course discussions'}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedForum && (
            <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Post
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Post</DialogTitle>
                  <DialogDescription>
                    Share your thoughts in {selectedForum.title}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Content</label>
                    <Textarea
                      value={newPost.content}
                      onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Write your post..."
                      rows={6}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPostDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createPost}>
                    Create Post
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          
          <Dialog open={isForumDialogOpen} onOpenChange={setIsForumDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                New Forum
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Discussion Forum</DialogTitle>
                <DialogDescription>
                  Start a new discussion topic
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={newForum.title}
                    onChange={(e) => setNewForum(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Forum title"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description (Optional)</label>
                  <Textarea
                    value={newForum.description}
                    onChange={(e) => setNewForum(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe this forum..."
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Course</label>
                  <Select value={newForum.course_id} onValueChange={(value) => setNewForum(prev => ({ ...prev, course_id: value, assignment_id: '' }))}>
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
                {newForum.course_id && (
                  <div>
                    <label className="text-sm font-medium">Assignment (Optional)</label>
                    <Select value={newForum.assignment_id} onValueChange={(value) => setNewForum(prev => ({ ...prev, assignment_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No specific assignment</SelectItem>
                        {assignments
                          .filter(a => a.course_id === newForum.course_id)
                          .map((assignment) => (
                            <SelectItem key={assignment.id} value={assignment.id}>
                              {assignment.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsForumDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createForum}>
                  Create Forum
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {selectedForum && (
            <Button variant="outline" onClick={() => setSelectedForum(null)}>
              Back to Forums
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {!selectedForum ? (
        // Forums List
        <>
          {forums.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No discussion forums yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {forums.map((forum) => (
                <Card key={forum.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedForum(forum)}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {forum.course_id && <BookOpen className="h-4 w-4" />}
                          {forum.assignment_id && <FileText className="h-4 w-4" />}
                          {forum.title}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {forum.description || "No description provided"}
                        </CardDescription>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>
                            {forum.course?.title}
                            {forum.assignment?.title && ` • ${forum.assignment.title}`}
                          </span>
                          <span>By {getUserDisplayName(forum.creator)}</span>
                          <span>{formatDate(forum.created_at)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span className="text-sm">{forum.post_count} posts</span>
                        </div>
                        {forum.last_post && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last: {formatDate(forum.last_post)}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        // Posts View
        <div className="space-y-6">
          {/* Forum Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {selectedForum.course_id && <BookOpen className="h-4 w-4" />}
                {selectedForum.assignment_id && <FileText className="h-4 w-4" />}
                {selectedForum.title}
              </CardTitle>
              <CardDescription>
                {selectedForum.description}
              </CardDescription>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  {selectedForum.course?.title}
                  {selectedForum.assignment?.title && ` • ${selectedForum.assignment.title}`}
                </span>
                <span>Created by {getUserDisplayName(selectedForum.creator)}</span>
                <span>{formatDate(selectedForum.created_at)}</span>
              </div>
            </CardHeader>
          </Card>

          {/* Posts */}
          {postsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-muted rounded w-1/4"></div>
                      <div className="h-20 bg-muted rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No posts yet. Start the discussion!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {posts.map(post => renderPost(post))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};