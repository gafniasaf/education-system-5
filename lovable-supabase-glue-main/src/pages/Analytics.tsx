import React from 'react';
import { StudentAnalytics } from '@/components/StudentAnalytics';

const Analytics = () => {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Student Analytics</h1>
          <p className="text-muted-foreground">Track your academic progress and performance</p>
        </div>
        
        <StudentAnalytics />
      </div>
    </div>
  );
};

export default Analytics;