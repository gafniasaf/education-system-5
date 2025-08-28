import React from 'react';
import { AdvancedAnalyticsDashboard } from '@/components/analytics/AdvancedAnalyticsDashboard';

const AdvancedAnalyticsPage = () => {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <AdvancedAnalyticsDashboard />
      </div>
    </div>
  );
};

export default AdvancedAnalyticsPage;