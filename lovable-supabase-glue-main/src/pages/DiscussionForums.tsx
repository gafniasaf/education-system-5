import React from 'react';
import { EnhancedDiscussionForums } from '@/components/EnhancedDiscussionForums';
import { useSearchParams } from 'react-router-dom';

const DiscussionForumsPage = () => {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId') || undefined;
  const assignmentId = searchParams.get('assignmentId') || undefined;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <EnhancedDiscussionForums courseId={courseId} assignmentId={assignmentId} />
      </div>
    </div>
  );
};

export default DiscussionForumsPage;