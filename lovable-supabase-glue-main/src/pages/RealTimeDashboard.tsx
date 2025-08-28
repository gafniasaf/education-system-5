import React from 'react';
import { RealTimeDashboard } from '@/components/RealTimeDashboard';
import { RealTimeCollaboration } from '@/components/RealTimeCollaboration';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchParams } from 'react-router-dom';

const RealTimeDashboardPage = () => {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId') || undefined;
  const assignmentId = searchParams.get('assignmentId') || undefined;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">Real-Time Dashboard</TabsTrigger>
            <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard">
            <RealTimeDashboard />
          </TabsContent>
          
          <TabsContent value="collaboration">
            <RealTimeCollaboration courseId={courseId} assignmentId={assignmentId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RealTimeDashboardPage;