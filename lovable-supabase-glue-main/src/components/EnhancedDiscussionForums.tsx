import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Pin, 
  Lock, 
  Plus, 
  Tag, 
  CheckCircle,
  Clock,
  User,
  Search
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface DiscussionForum {
  id: string;
  title: string;
  description?: string | null;
  course_id?: string | null;
  assignment_id?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_pinned?: boolean | null;
  is_locked?: boolean | null;
  tags?: string[] | null;
  forum_type: string;
}

interface DiscussionPost {
  id: string;
  forum_id: string;
  author_id: string;
  parent_post_id?: string | null;
  content: string;
  is_solution?: boolean | null;
  votes?: number | null;
  edited_at?: string | null;
  attachments: any;
  created_at: string;
  updated_at: string;
  author?: {
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
  } | null;
  user_vote?: any;
  replies?: DiscussionPost[];
}

interface EnhancedDiscussionForumsProps {
  courseId?: string;
  assignmentId?: string;
}

export function EnhancedDiscussionForums({ courseId, assignmentId }: EnhancedDiscussionForumsProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  
  const [forums, setForums] = useState<DiscussionForum[]>([]);
  const [selectedForum, setSelectedForum] = useState<DiscussionForum | null>(null);
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [isCreateForumOpen, setIsCreateForumOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [newForumData, setNewForumData] = useState({
    title: '',
    description: '',
    forum_type: 'general' as DiscussionForum['forum_type'],
    tags: [] as string[]
  });
  const [newPostContent, setNewPostContent] = useState('');
  const [replyToPost, setReplyToPost] = useState<string | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'votes'>('newest');

  // Load forums
  useEffect(() => {
    loadForums();
  }, [courseId, assignmentId]);

  // Load posts when forum is selected
  useEffect(() => {
    if (selectedForum) {
      loadPosts(selectedForum.id);
    }
  }, [selectedForum]);

  const loadForums = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('discussion_forums')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      if (assignmentId) {
        query = query.eq('assignment_id', assignmentId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const typedForums = (data || []).map(forum => ({
        ...forum,
        forum_type: forum.forum_type as DiscussionForum['forum_type'],
        tags: Array.isArray(forum.tags) ? forum.tags : []
      }));
      setForums(typedForums);
      
      // Auto-select first forum if none selected
      if (!selectedForum && typedForums && typedForums.length > 0) {
        setSelectedForum(typedForums[0]);
      }
    } catch (err) {
      console.error('Error loading forums:', err);
      setError('Failed to load discussion forums');
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async (forumId: string) => {
    try {
      setLoading(true);
      
      // Load posts with a simpler query
      const { data: postsData, error } = await supabase
        .from('discussion_posts')
        .select('*')
        .eq('forum_id', forumId)
        .is('parent_post_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform and get user profiles separately
      const postsWithDetails = await Promise.all(
        (postsData || []).map(async (post) => {
          // Get author profile
          const { data: authorProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('id', post.author_id)
            .single();

          // Get user vote if logged in
          let userVote = null;
          if (user?.id) {
            const { data: voteData } = await supabase
              .from('post_votes')
              .select('vote_type')
              .eq('post_id', post.id)
              .eq('user_id', user.id)
              .single();
            userVote = voteData?.vote_type || null;
          }

          // Get replies
          const { data: repliesData } = await supabase
            .from('discussion_posts')
            .select('*')
            .eq('parent_post_id', post.id)
            .order('created_at', { ascending: true });

          const repliesWithDetails = await Promise.all(
            (repliesData || []).map(async (reply) => {
              const { data: replyAuthor } = await supabase
                .from('profiles')
                .select('first_name, last_name, avatar_url')
                .eq('id', reply.author_id)
                .single();

              let replyVote = null;
              if (user?.id) {
                const { data: voteData } = await supabase
                  .from('post_votes')
                  .select('vote_type')
                  .eq('post_id', reply.id)
                  .eq('user_id', user.id)
                  .single();
                replyVote = voteData?.vote_type || null;
              }

              return {
                ...reply,
                author: replyAuthor,
                user_vote: replyVote,
                attachments: Array.isArray(reply.attachments) ? reply.attachments : []
              };
            })
          );

          return {
            ...post,
            author: authorProfile,
            user_vote: userVote,
            attachments: Array.isArray(post.attachments) ? post.attachments : [],
            replies: repliesWithDetails
          };
        })
      );

      setPosts(postsWithDetails as DiscussionPost[]);
    } catch (err) {
      console.error('Error loading posts:', err);
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const createForum = async () => {
    if (!user?.id || !newForumData.title.trim()) return;

    try {
      const forumData = {
        ...newForumData,
        course_id: courseId,
        assignment_id: assignmentId,
        created_by: user.id
      };

      const { data, error } = await supabase
        .from('discussion_forums')
        .insert(forumData)
        .select()
        .single();

      if (error) throw error;

      setForums(prev => [data, ...prev]);
      setIsCreateForumOpen(false);
      setNewForumData({ title: '', description: '', forum_type: 'general', tags: [] });
      toast.success('Discussion forum created successfully');
    } catch (err) {
      console.error('Error creating forum:', err);
      toast.error('Failed to create forum');
    }
  };

  const createPost = async () => {
    if (!user?.id || !selectedForum || !newPostContent.trim()) return;

    try {
      const postData = {
        forum_id: selectedForum.id,
        author_id: user.id,
        content: newPostContent,
        parent_post_id: replyToPost,
        attachments: []
      };

      const { data, error } = await supabase
        .from('discussion_posts')
        .insert(postData)
        .select('*')
        .single();

      if (error) throw error;

      // Get author profile
      const { data: authorProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', user.id)
        .single();

      const newPost = {
        ...data,
        author: authorProfile,
        user_vote: null,
        attachments: [],
        replies: []
      };

      if (replyToPost) {
        // Add as reply to existing post - reload posts instead
        loadPosts(selectedForum.id);
      } else {
        // Add as new top-level post
        setPosts(prev => [newPost, ...prev]);
      }

      setNewPostContent('');
      setIsCreatePostOpen(false);
      setReplyToPost(null);
      toast.success(replyToPost ? 'Reply posted successfully' : 'Post created successfully');
    } catch (err) {
      console.error('Error creating post:', err);
      toast.error('Failed to create post');
    }
  };

  const voteOnPost = async (postId: string, voteType: 'up' | 'down') => {
    if (!user?.id) return;

    try {
      // Check if user has already voted
      const { data: existingVote } = await supabase
        .from('post_votes')
        .select('vote_type')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

      if (existingVote?.vote_type === voteType) {
        // Remove vote if clicking same vote type
        await supabase
          .from('post_votes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        // Add or update vote
        await supabase
          .from('post_votes')
          .upsert({
            post_id: postId,
            user_id: user.id,
            vote_type: voteType
          });
      }

      // Reload posts to get updated vote counts
      if (selectedForum) {
        loadPosts(selectedForum.id);
      }
    } catch (err) {
      console.error('Error voting on post:', err);
      toast.error('Failed to record vote');
    }
  };

  const markAsSolution = async (postId: string) => {
    if (!user?.id || !selectedForum) return;

    try {
      const { error } = await supabase
        .from('discussion_posts')
        .update({ is_solution: true })
        .eq('id', postId);

      if (error) throw error;

      // Update local state
      setPosts(prev =>
        prev.map(post => ({
          ...post,
          replies: post.replies?.map(reply =>
            reply.id === postId ? { ...reply, is_solution: true } : reply
          ) || []
        }))
      );

      toast.success('Marked as solution');
    } catch (err) {
      console.error('Error marking solution:', err);
      toast.error('Failed to mark as solution');
    }
  };

  const getAuthorName = (author?: { first_name?: string; last_name?: string }) => {
    if (!author) return 'Unknown User';
    return `${author.first_name || ''} ${author.last_name || ''}`.trim() || 'Unknown User';
  };

  const filteredForums = forums.filter(forum => {
    if (searchTerm && !forum.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filterType !== 'all' && forum.forum_type !== filterType) {
      return false;
    }
    return true;
  });

  const sortedPosts = [...posts].sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'votes':
        return b.votes - a.votes;
      default: // newest
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  if (loading && forums.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Discussion Forums</h2>
          <p className="text-muted-foreground">Join the conversation and ask questions</p>
        </div>
        
        {profile?.role === 'teacher' && (
          <Dialog open={isCreateForumOpen} onOpenChange={setIsCreateForumOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Forum
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Discussion Forum</DialogTitle>
                <DialogDescription>
                  Create a new forum for course discussions
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Forum title"
                  value={newForumData.title}
                  onChange={(e) => setNewForumData(prev => ({ ...prev, title: e.target.value }))}
                />
                <Textarea
                  placeholder="Forum description (optional)"
                  value={newForumData.description}
                  onChange={(e) => setNewForumData(prev => ({ ...prev, description: e.target.value }))}
                />
                <Select
                  value={newForumData.forum_type}
                  onValueChange={(value) => setNewForumData(prev => ({ ...prev, forum_type: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Discussion</SelectItem>
                    <SelectItem value="q_and_a">Q&A</SelectItem>
                    <SelectItem value="announcement">Announcements</SelectItem>
                    <SelectItem value="assignment_specific">Assignment Specific</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateForumOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createForum}>Create Forum</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Forums List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Forums</CardTitle>
                <Badge variant="outline">{filteredForums.length}</Badge>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search forums..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="q_and_a">Q&A</SelectItem>
                    <SelectItem value="announcement">Announcements</SelectItem>
                    <SelectItem value="assignment_specific">Assignment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {filteredForums.map((forum) => (
                  <div
                    key={forum.id}
                    className={`p-3 cursor-pointer transition-colors border-l-4 ${
                      selectedForum?.id === forum.id
                        ? 'bg-primary/10 border-l-primary'
                        : 'hover:bg-muted/50 border-l-transparent'
                    }`}
                    onClick={() => setSelectedForum(forum)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {forum.is_pinned && <Pin className="h-3 w-3 text-primary" />}
                          {forum.is_locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                          <p className="font-medium text-sm truncate">{forum.title}</p>
                        </div>
                        {forum.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {forum.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {forum.forum_type.replace('_', ' ')}
                          </Badge>
                          {forum.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Posts Display */}
        <div className="lg:col-span-3">
          {selectedForum ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {selectedForum.is_pinned && <Pin className="h-4 w-4 text-primary" />}
                      {selectedForum.is_locked && <Lock className="h-4 w-4 text-muted-foreground" />}
                      {selectedForum.title}
                    </CardTitle>
                    {selectedForum.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedForum.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest</SelectItem>
                        <SelectItem value="oldest">Oldest</SelectItem>
                        <SelectItem value="votes">Most Voted</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {!selectedForum.is_locked && (
                      <Dialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            New Post
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Create New Post</DialogTitle>
                            <DialogDescription>
                              Share your thoughts or ask a question
                            </DialogDescription>
                          </DialogHeader>
                          <Textarea
                            placeholder="What's on your mind?"
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            rows={6}
                          />
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreatePostOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={createPost}>Post</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {sortedPosts.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No posts yet. Be the first to start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {sortedPosts.map((post) => (
                      <div key={post.id} className="space-y-4">
                        {/* Main Post */}
                        <div className="flex gap-4 p-4 border rounded-lg">
                          <Avatar>
                            <AvatarImage src={post.author?.avatar_url} />
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{getAuthorName(post.author)}</span>
                                <span className="text-sm text-muted-foreground">
                                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                                </span>
                                {post.is_solution && (
                                  <Badge variant="default" className="text-xs">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Solution
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => voteOnPost(post.id, 'up')}
                                    className={post.user_vote === 'up' ? 'text-green-600' : ''}
                                  >
                                    <ThumbsUp className="h-4 w-4" />
                                  </Button>
                                  <span className="text-sm font-medium">{post.votes}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => voteOnPost(post.id, 'down')}
                                    className={post.user_vote === 'down' ? 'text-red-600' : ''}
                                  >
                                    <ThumbsDown className="h-4 w-4" />
                                  </Button>
                                </div>
                                
                                {selectedForum.forum_type === 'q_and_a' && 
                                 !post.is_solution && 
                                 (profile?.role === 'teacher' || post.author_id === user?.id) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => markAsSolution(post.id)}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Mark Solution
                                  </Button>
                                )}
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setReplyToPost(post.id);
                                    setIsCreatePostOpen(true);
                                  }}
                                >
                                  Reply
                                </Button>
                              </div>
                            </div>
                            
                            <div className="prose prose-sm max-w-none">
                              <p className="whitespace-pre-wrap">{post.content}</p>
                            </div>
                          </div>
                        </div>

                        {/* Replies */}
                        {post.replies && post.replies.length > 0 && (
                          <div className="ml-12 space-y-3">
                            {post.replies.map((reply) => (
                              <div key={reply.id} className="flex gap-3 p-3 border rounded-lg bg-muted/30">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={reply.author?.avatar_url} />
                                  <AvatarFallback>
                                    <User className="h-3 w-3" />
                                  </AvatarFallback>
                                </Avatar>
                                
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm">{getAuthorName(reply.author)}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                                      </span>
                                      {reply.is_solution && (
                                        <Badge variant="default" className="text-xs">
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Solution
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => voteOnPost(reply.id, 'up')}
                                        className={reply.user_vote === 'up' ? 'text-green-600' : ''}
                                      >
                                        <ThumbsUp className="h-3 w-3" />
                                      </Button>
                                      <span className="text-xs">{reply.votes}</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => voteOnPost(reply.id, 'down')}
                                        className={reply.user_vote === 'down' ? 'text-red-600' : ''}
                                      >
                                        <ThumbsDown className="h-3 w-3" />
                                      </Button>
                                      
                                      {selectedForum.forum_type === 'q_and_a' && 
                                       !reply.is_solution && 
                                       (profile?.role === 'teacher' || post.author_id === user?.id) && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => markAsSolution(reply.id)}
                                        >
                                          <CheckCircle className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="prose prose-sm max-w-none">
                                    <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Select a forum to view discussions</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}