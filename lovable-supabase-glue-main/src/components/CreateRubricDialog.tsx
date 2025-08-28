import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, X } from 'lucide-react';

interface RubricCriterion {
  id?: string;
  title: string;
  description: string;
  points: number;
  order_index: number;
}

interface CreateRubricDialogProps {
  assignmentId: string;
  onRubricCreated: () => void;
}

export const CreateRubricDialog: React.FC<CreateRubricDialogProps> = ({
  assignmentId,
  onRubricCreated,
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rubricData, setRubricData] = useState({
    title: '',
    description: '',
  });
  const [criteria, setCriteria] = useState<RubricCriterion[]>([
    { title: '', description: '', points: 10, order_index: 0 }
  ]);

  const addCriterion = () => {
    setCriteria(prev => [
      ...prev,
      { title: '', description: '', points: 10, order_index: prev.length }
    ]);
  };

  const removeCriterion = (index: number) => {
    setCriteria(prev => prev.filter((_, i) => i !== index));
  };

  const updateCriterion = (index: number, field: keyof RubricCriterion, value: string | number) => {
    setCriteria(prev =>
      prev.map((criterion, i) =>
        i === index ? { ...criterion, [field]: value } : criterion
      )
    );
  };

  const totalPoints = criteria.reduce((sum, criterion) => sum + criterion.points, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rubricData.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a rubric title",
        variant: "destructive",
      });
      return;
    }

    if (criteria.some(c => !c.title.trim() || c.points <= 0)) {
      toast({
        title: "Error",
        description: "All criteria must have a title and positive points",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create rubric
      const { data: rubric, error: rubricError } = await supabase
        .from('rubrics')
        .insert({
          assignment_id: assignmentId,
          title: rubricData.title,
          description: rubricData.description,
          total_points: totalPoints,
        })
        .select()
        .single();

      if (rubricError) throw rubricError;

      // Create criteria
      const criteriaToInsert = criteria.map((criterion, index) => ({
        rubric_id: rubric.id,
        title: criterion.title,
        description: criterion.description,
        points: criterion.points,
        order_index: index,
      }));

      const { error: criteriaError } = await supabase
        .from('rubric_criteria')
        .insert(criteriaToInsert);

      if (criteriaError) throw criteriaError;

      toast({
        title: "Success",
        description: "Rubric created successfully",
      });

      setIsOpen(false);
      setRubricData({ title: '', description: '' });
      setCriteria([{ title: '', description: '', points: 10, order_index: 0 }]);
      onRubricCreated();
    } catch (error) {
      console.error('Error creating rubric:', error);
      toast({
        title: "Error",
        description: "Failed to create rubric",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Create Rubric
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Grading Rubric</DialogTitle>
          <DialogDescription>
            Create a rubric to standardize grading for this assignment
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Rubric Title</Label>
              <Input
                id="title"
                value={rubricData.title}
                onChange={(e) => setRubricData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter rubric title"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={rubricData.description}
                onChange={(e) => setRubricData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the overall grading criteria"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium">Grading Criteria</h4>
              <div className="text-sm text-muted-foreground">
                Total Points: {totalPoints}
              </div>
            </div>

            {criteria.map((criterion, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Criterion {index + 1}</CardTitle>
                    {criteria.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCriterion(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor={`criterion-title-${index}`}>Title</Label>
                    <Input
                      id={`criterion-title-${index}`}
                      value={criterion.title}
                      onChange={(e) => updateCriterion(index, 'title', e.target.value)}
                      placeholder="e.g., Content Quality"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`criterion-description-${index}`}>Description</Label>
                    <Textarea
                      id={`criterion-description-${index}`}
                      value={criterion.description}
                      onChange={(e) => updateCriterion(index, 'description', e.target.value)}
                      placeholder="Describe what this criterion evaluates"
                      rows={2}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`criterion-points-${index}`}>Points</Label>
                    <Input
                      id={`criterion-points-${index}`}
                      type="number"
                      min="1"
                      value={criterion.points}
                      onChange={(e) => updateCriterion(index, 'points', parseInt(e.target.value) || 0)}
                      required
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addCriterion}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Criterion
            </Button>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Rubric'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};