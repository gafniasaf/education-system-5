import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCourseContent, ContentModule } from '@/hooks/useCourseContent';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { formatDistanceToNow } from 'date-fns';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Calendar,
  Clock,
  GripVertical,
  BookOpen,
  Target
} from 'lucide-react';

interface ContentModuleManagerProps {
  courseId: string;
  className?: string;
}

export const ContentModuleManager: React.FC<ContentModuleManagerProps> = ({
  courseId,
  className,
}) => {
  const {
    modules,
    loading,
    createModule,
    updateModule,
    deleteModule,
  } = useCourseContent({ courseId });

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ContentModule | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    estimated_duration: '',
    learning_objectives: '',
    prerequisites: '',
    is_published: false,
    publish_date: '',
    due_date: '',
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      estimated_duration: '',
      learning_objectives: '',
      prerequisites: '',
      is_published: false,
      publish_date: '',
      due_date: '',
    });
  };

  const handleCreateModule = async () => {
    const moduleData = {
      ...formData,
      estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration) : undefined,
      learning_objectives: formData.learning_objectives.split('\n').filter(obj => obj.trim()),
      prerequisites: formData.prerequisites.split('\n').filter(prereq => prereq.trim()),
      publish_date: formData.publish_date || undefined,
      due_date: formData.due_date || undefined,
      module_order: modules.length,
    };

    const result = await createModule(moduleData);
    if (result) {
      setIsCreateDialogOpen(false);
      resetForm();
    }
  };

  const handleEditModule = async () => {
    if (!editingModule) return;

    const updateData = {
      ...formData,
      estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration) : undefined,
      learning_objectives: formData.learning_objectives.split('\n').filter(obj => obj.trim()),
      prerequisites: formData.prerequisites.split('\n').filter(prereq => prereq.trim()),
      publish_date: formData.publish_date || undefined,
      due_date: formData.due_date || undefined,
    };

    const result = await updateModule(editingModule.id, updateData);
    if (result) {
      setEditingModule(null);
      resetForm();
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    setDeletingId(moduleId);
    const result = await deleteModule(moduleId);
    setDeletingId(null);
  };

  const openEditDialog = (module: ContentModule) => {
    setEditingModule(module);
    setFormData({
      title: module.title,
      description: module.description || '',
      estimated_duration: module.estimated_duration?.toString() || '',
      learning_objectives: module.learning_objectives?.join('\n') || '',
      prerequisites: module.prerequisites?.join('\n') || '',
      is_published: module.is_published,
      publish_date: module.publish_date ? new Date(module.publish_date).toISOString().split('T')[0] : '',
      due_date: module.due_date ? new Date(module.due_date).toISOString().split('T')[0] : '',
    });
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(modules);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order for all affected modules
    const updatePromises = items.map((module, index) => 
      updateModule(module.id, { module_order: index })
    );

    await Promise.all(updatePromises);
  };

  const togglePublished = async (module: ContentModule) => {
    await updateModule(module.id, { is_published: !module.is_published });
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="text-center py-8">
          <div className="text-muted-foreground">Loading modules...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Course Modules</h2>
          <p className="text-muted-foreground">Organize your course content into structured modules</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Module
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Module</DialogTitle>
              <DialogDescription>
                Add a new learning module to your course
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Module Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter module title..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what students will learn in this module..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimated_duration">Duration (minutes)</Label>
                  <Input
                    id="estimated_duration"
                    type="number"
                    value={formData.estimated_duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration: e.target.value }))}
                    placeholder="60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date (optional)</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="learning_objectives">Learning Objectives (one per line)</Label>
                <Textarea
                  id="learning_objectives"
                  value={formData.learning_objectives}
                  onChange={(e) => setFormData(prev => ({ ...prev, learning_objectives: e.target.value }))}
                  placeholder="Students will be able to...&#10;Understand the concepts of...&#10;Apply knowledge to..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prerequisites">Prerequisites (one per line)</Label>
                <Textarea
                  id="prerequisites"
                  value={formData.prerequisites}
                  onChange={(e) => setFormData(prev => ({ ...prev, prerequisites: e.target.value }))}
                  placeholder="Basic understanding of...&#10;Completion of Module 1..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_published"
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
                />
                <Label htmlFor="is_published">Publish immediately</Label>
              </div>

              {formData.is_published && (
                <div className="space-y-2">
                  <Label htmlFor="publish_date">Publish Date (optional)</Label>
                  <Input
                    id="publish_date"
                    type="date"
                    value={formData.publish_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, publish_date: e.target.value }))}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateModule} disabled={!formData.title.trim()}>
                Create Module
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {modules.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No modules yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first module to start organizing course content
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Module
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="modules">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                {modules.map((module, index) => (
                  <Draggable key={module.id} draggableId={module.id} index={index}>
                    {(provided, snapshot) => (
                      <Card 
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`${snapshot.isDragging ? 'shadow-lg' : ''} transition-shadow`}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <div 
                                {...provided.dragHandleProps}
                                className="mt-1 cursor-grab active:cursor-grabbing"
                              >
                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <CardTitle className="text-lg">{module.title}</CardTitle>
                                  {module.is_published ? (
                                    <Badge variant="default">
                                      <Eye className="h-3 w-3 mr-1" />
                                      Published
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">
                                      <EyeOff className="h-3 w-3 mr-1" />
                                      Draft
                                    </Badge>
                                  )}
                                </div>
                                
                                {module.description && (
                                  <CardDescription className="mb-3">
                                    {module.description}
                                  </CardDescription>
                                )}

                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  {module.estimated_duration && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-4 w-4" />
                                      <span>{module.estimated_duration} min</span>
                                    </div>
                                  )}
                                  
                                  {module.due_date && (
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-4 w-4" />
                                      <span>Due {formatDistanceToNow(new Date(module.due_date), { addSuffix: true })}</span>
                                    </div>
                                  )}

                                  {module.learning_objectives && module.learning_objectives.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Target className="h-4 w-4" />
                                      <span>{module.learning_objectives.length} objectives</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => togglePublished(module)}
                              >
                                {module.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(module)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteModule(module.id)}
                                disabled={deletingId === module.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Edit Module Dialog */}
      <Dialog open={!!editingModule} onOpenChange={() => setEditingModule(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Module</DialogTitle>
            <DialogDescription>
              Update module information and settings
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Module Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter module title..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what students will learn in this module..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-estimated_duration">Duration (minutes)</Label>
                <Input
                  id="edit-estimated_duration"
                  type="number"
                  value={formData.estimated_duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration: e.target.value }))}
                  placeholder="60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-due_date">Due Date (optional)</Label>
                <Input
                  id="edit-due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-learning_objectives">Learning Objectives (one per line)</Label>
              <Textarea
                id="edit-learning_objectives"
                value={formData.learning_objectives}
                onChange={(e) => setFormData(prev => ({ ...prev, learning_objectives: e.target.value }))}
                placeholder="Students will be able to...&#10;Understand the concepts of...&#10;Apply knowledge to..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-prerequisites">Prerequisites (one per line)</Label>
              <Textarea
                id="edit-prerequisites"
                value={formData.prerequisites}
                onChange={(e) => setFormData(prev => ({ ...prev, prerequisites: e.target.value }))}
                placeholder="Basic understanding of...&#10;Completion of Module 1..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-is_published"
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
              />
              <Label htmlFor="edit-is_published">Published</Label>
            </div>

            {formData.is_published && (
              <div className="space-y-2">
                <Label htmlFor="edit-publish_date">Publish Date (optional)</Label>
                <Input
                  id="edit-publish_date"
                  type="date"
                  value={formData.publish_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, publish_date: e.target.value }))}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingModule(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditModule} disabled={!formData.title.trim()}>
              Update Module
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};