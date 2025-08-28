import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCourseContent, ContentItem } from '@/hooks/useCourseContent';
import { FileUpload } from '@/components/FileUpload';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { formatDistanceToNow } from 'date-fns';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Video, 
  FileText, 
  Link, 
  Clock,
  GripVertical,
  Play,
  Download,
  ExternalLink,
  BookOpen,
  HelpCircle,
  Star,
  CheckCircle
} from 'lucide-react';

interface ContentItemManagerProps {
  moduleId: string;
  courseId: string;
  className?: string;
}

const CONTENT_TYPE_ICONS = {
  video: Video,
  document: FileText,
  link: ExternalLink,
  text: BookOpen,
  quiz: HelpCircle,
  interactive: Star,
};

const CONTENT_TYPE_LABELS = {
  video: 'Video',
  document: 'Document',
  link: 'External Link',
  text: 'Text Content',
  quiz: 'Quiz',
  interactive: 'Interactive Content',
};

export const ContentItemManager: React.FC<ContentItemManagerProps> = ({
  moduleId,
  courseId,
  className,
}) => {
  const {
    contentItems,
    loading,
    createContentItem,
    updateContentItem,
    deleteContentItem,
  } = useCourseContent({ moduleId });

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content_type: 'text' as ContentItem['content_type'],
    content_url: '',
    embed_code: '',
    estimated_duration: '',
    is_required: true,
    text_content: '',
    video_url: '',
    document_url: '',
    quiz_data: {
      questions: [],
      passing_score: 70,
    },
  });

  const [files, setFiles] = useState<any[]>([]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      content_type: 'text',
      content_url: '',
      embed_code: '',
      estimated_duration: '',
      is_required: true,
      text_content: '',
      video_url: '',
      document_url: '',
      quiz_data: {
        questions: [],
        passing_score: 70,
      },
    });
    setFiles([]);
  };

  const handleCreateItem = async () => {
    let contentData: Record<string, any> = {};
    
    switch (formData.content_type) {
      case 'text':
        contentData = { text: formData.text_content };
        break;
      case 'video':
        contentData = { 
          video_url: formData.video_url,
          embed_code: formData.embed_code 
        };
        break;
      case 'document':
        contentData = { document_url: formData.document_url };
        break;
      case 'link':
        contentData = { url: formData.content_url };
        break;
      case 'quiz':
        contentData = formData.quiz_data;
        break;
      case 'interactive':
        contentData = { embed_code: formData.embed_code };
        break;
    }

    const itemData = {
      title: formData.title,
      description: formData.description,
      content_type: formData.content_type,
      content_data: contentData,
      content_url: formData.content_url,
      embed_code: formData.embed_code,
      estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration) : undefined,
      is_required: formData.is_required,
      file_attachments: files,
      item_order: contentItems.length,
    };

    const result = await createContentItem(itemData);
    if (result) {
      setIsCreateDialogOpen(false);
      resetForm();
    }
  };

  const handleEditItem = async () => {
    if (!editingItem) return;

    let contentData: Record<string, any> = {};
    
    switch (formData.content_type) {
      case 'text':
        contentData = { text: formData.text_content };
        break;
      case 'video':
        contentData = { 
          video_url: formData.video_url,
          embed_code: formData.embed_code 
        };
        break;
      case 'document':
        contentData = { document_url: formData.document_url };
        break;
      case 'link':
        contentData = { url: formData.content_url };
        break;
      case 'quiz':
        contentData = formData.quiz_data;
        break;
      case 'interactive':
        contentData = { embed_code: formData.embed_code };
        break;
    }

    const updateData = {
      title: formData.title,
      description: formData.description,
      content_type: formData.content_type,
      content_data: contentData,
      content_url: formData.content_url,
      embed_code: formData.embed_code,
      estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration) : undefined,
      is_required: formData.is_required,
      file_attachments: files,
    };

    const result = await updateContentItem(editingItem.id, updateData);
    if (result) {
      setEditingItem(null);
      resetForm();
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setDeletingId(itemId);
    const result = await deleteContentItem(itemId);
    setDeletingId(null);
  };

  const openEditDialog = (item: ContentItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      content_type: item.content_type,
      content_url: item.content_url || '',
      embed_code: item.embed_code || '',
      estimated_duration: item.estimated_duration?.toString() || '',
      is_required: item.is_required,
      text_content: item.content_data?.text || '',
      video_url: item.content_data?.video_url || '',
      document_url: item.content_data?.document_url || '',
      quiz_data: (item.content_data?.questions || item.content_data?.passing_score) ? {
        questions: item.content_data.questions || [],
        passing_score: item.content_data.passing_score || 70,
      } : {
        questions: [],
        passing_score: 70,
      },
    });
    setFiles(Array.isArray(item.file_attachments) ? item.file_attachments : []);
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(contentItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order for all affected items
    const updatePromises = items.map((item, index) => 
      updateContentItem(item.id, { item_order: index })
    );

    await Promise.all(updatePromises);
  };

  const renderContentSpecificFields = () => {
    switch (formData.content_type) {
      case 'text':
        return (
          <div className="space-y-2">
            <Label htmlFor="text_content">Text Content</Label>
            <Textarea
              id="text_content"
              value={formData.text_content}
              onChange={(e) => setFormData(prev => ({ ...prev, text_content: e.target.value }))}
              placeholder="Enter your text content here..."
              rows={6}
            />
          </div>
        );

      case 'video':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="video_url">Video URL</Label>
              <Input
                id="video_url"
                value={formData.video_url}
                onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="embed_code">Embed Code (optional)</Label>
              <Textarea
                id="embed_code"
                value={formData.embed_code}
                onChange={(e) => setFormData(prev => ({ ...prev, embed_code: e.target.value }))}
                placeholder="<iframe src='...'></iframe>"
                rows={3}
              />
            </div>
          </div>
        );

      case 'document':
        return (
          <div className="space-y-2">
            <Label htmlFor="document_url">Document URL</Label>
            <Input
              id="document_url"
              value={formData.document_url}
              onChange={(e) => setFormData(prev => ({ ...prev, document_url: e.target.value }))}
              placeholder="https://docs.google.com/document/..."
            />
          </div>
        );

      case 'link':
        return (
          <div className="space-y-2">
            <Label htmlFor="content_url">External Link URL</Label>
            <Input
              id="content_url"
              value={formData.content_url}
              onChange={(e) => setFormData(prev => ({ ...prev, content_url: e.target.value }))}
              placeholder="https://example.com"
            />
          </div>
        );

      case 'quiz':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Quiz Configuration</Label>
              <p className="text-sm text-muted-foreground">
                Quiz questions can be configured after creating the item
              </p>
            </div>
          </div>
        );

      case 'interactive':
        return (
          <div className="space-y-2">
            <Label htmlFor="interactive_embed">Interactive Content Embed</Label>
            <Textarea
              id="interactive_embed"
              value={formData.embed_code}
              onChange={(e) => setFormData(prev => ({ ...prev, embed_code: e.target.value }))}
              placeholder="<iframe src='https://h5p.org/...'></iframe>"
              rows={4}
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="text-center py-8">
          <div className="text-muted-foreground">Loading content items...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold">Content Items</h3>
          <p className="text-muted-foreground">Add learning materials to this module</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Content
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Content Item</DialogTitle>
              <DialogDescription>
                Create a new learning resource for your students
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter content title..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this content item..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="content_type">Content Type</Label>
                  <Select
                    value={formData.content_type}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      content_type: value as ContentItem['content_type'] 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimated_duration">Duration (minutes)</Label>
                  <Input
                    id="estimated_duration"
                    type="number"
                    value={formData.estimated_duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration: e.target.value }))}
                    placeholder="15"
                  />
                </div>
              </div>

              {renderContentSpecificFields()}

              <div className="space-y-2">
                <Label>File Attachments</Label>
                <FileUpload
                  bucketName="course-resources"
                  folder={`${courseId}/content-items`}
                  existingFiles={files}
                  onFilesChange={setFiles}
                  maxFiles={5}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_required"
                  checked={formData.is_required}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_required: checked }))}
                />
                <Label htmlFor="is_required">Required content</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateItem} disabled={!formData.title.trim()}>
                Create Content
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {contentItems.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No content items yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first content item to start building this module
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Content
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="content-items">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                {contentItems.map((item, index) => {
                  const IconComponent = CONTENT_TYPE_ICONS[item.content_type];
                  
                  return (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <Card 
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`${snapshot.isDragging ? 'shadow-lg' : ''} transition-shadow`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <div 
                                  {...provided.dragHandleProps}
                                  className="mt-1 cursor-grab active:cursor-grabbing"
                                >
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                </div>
                                
                                <IconComponent className="h-5 w-5 mt-0.5 text-primary" />
                                
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium">{item.title}</h4>
                                    <Badge variant="outline" className="text-xs">
                                      {CONTENT_TYPE_LABELS[item.content_type]}
                                    </Badge>
                                    {item.is_required && (
                                      <Badge variant="secondary" className="text-xs">
                                        Required
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  {item.description && (
                                    <p className="text-sm text-muted-foreground mb-2">
                                      {item.description}
                                    </p>
                                  )}

                                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    {item.estimated_duration && (
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span>{item.estimated_duration} min</span>
                                      </div>
                                    )}
                                    
                                    {item.file_attachments && item.file_attachments.length > 0 && (
                                      <div className="flex items-center gap-1">
                                        <Download className="h-3 w-3" />
                                        <span>{item.file_attachments.length} files</span>
                                      </div>
                                    )}

                                    <span>Created {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(item)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteItem(item.id)}
                                  disabled={deletingId === item.id}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Edit Content Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Content Item</DialogTitle>
            <DialogDescription>
              Update the content item information and settings
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter content title..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe this content item..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-content_type">Content Type</Label>
                <Select
                  value={formData.content_type}
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    content_type: value as ContentItem['content_type'] 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-estimated_duration">Duration (minutes)</Label>
                <Input
                  id="edit-estimated_duration"
                  type="number"
                  value={formData.estimated_duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration: e.target.value }))}
                  placeholder="15"
                />
              </div>
            </div>

            {renderContentSpecificFields()}

            <div className="space-y-2">
              <Label>File Attachments</Label>
              <FileUpload
                bucketName="course-resources"
                folder={`${courseId}/content-items`}
                existingFiles={files}
                onFilesChange={setFiles}
                maxFiles={5}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-is_required"
                checked={formData.is_required}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_required: checked }))}
              />
              <Label htmlFor="edit-is_required">Required content</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditItem} disabled={!formData.title.trim()}>
              Update Content
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};