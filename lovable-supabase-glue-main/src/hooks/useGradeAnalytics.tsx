import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GradeStatistics {
  total_submissions: number;
  graded_submissions: number;
  average_grade: number;
  median_grade: number;
  grade_distribution: Record<string, number>;
  completion_rate: number;
}

interface GradeHistory {
  id: string;
  previous_grade: number | null;
  new_grade: number | null;
  previous_feedback: string | null;
  new_feedback: string | null;
  changed_by: string;
  change_reason: string;
  changed_at: string;
}

interface UseGradeAnalyticsOptions {
  assignmentId?: string;
  courseId?: string;
  submissionId?: string;
}

export const useGradeAnalytics = ({ 
  assignmentId, 
  courseId, 
  submissionId 
}: UseGradeAnalyticsOptions) => {
  const { toast } = useToast();
  
  const [statistics, setStatistics] = useState<GradeStatistics | null>(null);
  const [history, setHistory] = useState<GradeHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch grade statistics for an assignment
  const fetchGradeStatistics = useCallback(async (assignmentUuid: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .rpc('get_grade_statistics', { assignment_uuid: assignmentUuid });

      if (error) throw error;

      if (data && data.length > 0) {
        const stats = data[0];
        setStatistics({
          total_submissions: Number(stats.total_submissions) || 0,
          graded_submissions: Number(stats.graded_submissions) || 0,
          average_grade: Number(stats.average_grade) || 0,
          median_grade: Number(stats.median_grade) || 0,
          grade_distribution: (stats.grade_distribution && typeof stats.grade_distribution === 'object') 
            ? stats.grade_distribution as Record<string, number> 
            : {},
          completion_rate: Number(stats.completion_rate) || 0,
        });
      }
    } catch (err) {
      console.error('Error fetching grade statistics:', err);
      setError('Failed to load grade statistics');
      toast({
        title: "Error",
        description: "Failed to load grade statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch grade history for a submission
  const fetchGradeHistory = useCallback(async (submissionUuid: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('grade_history')
        .select('*')
        .eq('submission_id', submissionUuid)
        .order('changed_at', { ascending: false });

      if (error) throw error;

      setHistory(data || []);
    } catch (err) {
      console.error('Error fetching grade history:', err);
      setError('Failed to load grade history');
      toast({
        title: "Error",
        description: "Failed to load grade history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch course analytics
  const fetchCourseAnalytics = useCallback(async (courseUuid: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('grade_analytics')
        .select('*')
        .eq('course_id', courseUuid);

      if (error) throw error;

      // Process the data to calculate course-wide statistics
      if (data && data.length > 0) {
        const totalSubmissions = data.reduce((sum, item) => sum + (item.total_submissions || 0), 0);
        const totalGraded = data.reduce((sum, item) => sum + (item.graded_submissions || 0), 0);
        const weightedGrades = data.reduce((sum, item) => {
          const weight = item.graded_submissions || 0;
          const grade = item.average_grade || 0;
          return sum + (weight * grade);
        }, 0);
        const avgGrade = totalGraded > 0 ? weightedGrades / totalGraded : 0;

        setStatistics({
          total_submissions: totalSubmissions,
          graded_submissions: totalGraded,
          average_grade: avgGrade,
          median_grade: 0, // Would need more complex calculation
          grade_distribution: {},
          completion_rate: totalSubmissions > 0 ? (totalGraded / totalSubmissions) * 100 : 0,
        });
      }
    } catch (err) {
      console.error('Error fetching course analytics:', err);
      setError('Failed to load course analytics');
      toast({
        title: "Error",
        description: "Failed to load course analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Auto-fetch data when dependencies change
  useEffect(() => {
    if (assignmentId) {
      fetchGradeStatistics(assignmentId);
    } else if (courseId) {
      fetchCourseAnalytics(courseId);
    }
  }, [assignmentId, courseId, fetchGradeStatistics, fetchCourseAnalytics]);

  useEffect(() => {
    if (submissionId) {
      fetchGradeHistory(submissionId);
    }
  }, [submissionId, fetchGradeHistory]);

  // Calculate grade letter from percentage
  const getGradeLetter = useCallback((percentage: number): string => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }, []);

  // Calculate grade percentage
  const getGradePercentage = useCallback((grade: number, maxPoints: number): number => {
    if (maxPoints === 0) return 0;
    return (grade / maxPoints) * 100;
  }, []);

  // Format grade distribution for charts
  const getFormattedDistribution = useCallback(() => {
    if (!statistics?.grade_distribution) return [];
    
    return Object.entries(statistics.grade_distribution).map(([range, count]) => ({
      range,
      count: Number(count),
      percentage: statistics.graded_submissions > 0 
        ? (Number(count) / statistics.graded_submissions) * 100 
        : 0
    }));
  }, [statistics]);

  return {
    statistics,
    history,
    loading,
    error,
    fetchGradeStatistics,
    fetchGradeHistory,
    fetchCourseAnalytics,
    getGradeLetter,
    getGradePercentage,
    getFormattedDistribution,
    refetch: () => {
      if (assignmentId) fetchGradeStatistics(assignmentId);
      if (courseId) fetchCourseAnalytics(courseId);
      if (submissionId) fetchGradeHistory(submissionId);
    }
  };
};