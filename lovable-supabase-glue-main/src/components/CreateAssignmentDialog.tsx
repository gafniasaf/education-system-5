import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FileUpload } from "@/components/FileUpload";

interface Course {
  id: string;
  title: string;
}

interface CreateAssignmentDialogProps {
  courseId?: string; // Optional courseId to pre-select a course
  onAssignmentCreated: () => void;
}

export const CreateAssignmentDialog = ({ courseId, onAssignmentCreated }: CreateAssignmentDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    course_id: "",
    due_date: "",
    points_possible: "100",
  });
  const [resourceFiles, setResourceFiles] = useState<any[]>([]);

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('courses')
          .select('id, title')
          .order('title');

        if (error) {
          console.error('Error fetching courses:', error);
          return;
        }

        setCourses(data || []);
        // Set courseId if provided, otherwise set first course as default
        if (courseId) {
          setFormData(prev => ({ ...prev, course_id: courseId }));
        } else if (data && data.length > 0) {
          setFormData(prev => ({ ...prev, course_id: data[0].id }));
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };

    if (open) {
      fetchCourses();
    }
  }, [user, open, courseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.course_id) return;

    setLoading(true);
    try {
        const { error } = await supabase
          .from('assignments')
          .insert({
            title: formData.title,
            description: formData.description,
            course_id: formData.course_id,
            due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
            points_possible: parseInt(formData.points_possible),
            resource_files: JSON.parse(JSON.stringify(resourceFiles)),
          });

      if (error) {
        console.error('Error creating assignment:', error);
        toast({
          title: "Error",
          description: "Failed to create assignment",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Assignment created successfully",
      });
      
      setFormData({ title: "", description: "", course_id: "", due_date: "", points_possible: "100" });
      setResourceFiles([]);
      setOpen(false);
      onAssignmentCreated();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to create assignment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          {courseId ? "Add Assignment" : "Create New Assignment"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Assignment</DialogTitle>
            <DialogDescription>
              Add a new assignment to {courseId ? "this course" : "one of your courses"}. Fill in the assignment details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="course">Course</Label>
              <Select
                value={formData.course_id}
                onValueChange={(value) => setFormData({ ...formData, course_id: value })}
                disabled={!!courseId} // Disable if courseId is provided
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
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
            <div className="grid gap-2">
              <Label htmlFor="title">Assignment Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter assignment title"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter assignment description"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="datetime-local"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="points_possible">Points Possible</Label>
              <Input
                id="points_possible"
                type="number"
                min="0"
                value={formData.points_possible}
                onChange={(e) => setFormData({ ...formData, points_possible: e.target.value })}
                placeholder="100"
              />
            </div>
            <div className="grid gap-2">
              <Label>Assignment Resources</Label>
              <FileUpload
                bucketName="course-resources"
                folder={formData.course_id || 'temp'}
                existingFiles={resourceFiles}
                onFilesChange={setResourceFiles}
                maxFiles={3}
                acceptedTypes={['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png']}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.title.trim() || !formData.course_id}
            >
              {loading ? "Creating..." : "Create Assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};