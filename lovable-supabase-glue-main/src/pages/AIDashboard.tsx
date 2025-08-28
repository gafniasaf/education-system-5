import React from 'react';
import { AIDashboard } from '@/components/ai/AIDashboard';

const AIDashboardPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <AIDashboard />
      </div>
    </div>
  );
};

export default AIDashboardPage;