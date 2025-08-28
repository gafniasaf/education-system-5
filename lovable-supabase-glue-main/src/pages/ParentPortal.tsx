import React from 'react';
import { ParentPortal } from '@/components/ParentPortal';

const ParentPortalPage = () => {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <ParentPortal />
      </div>
    </div>
  );
};

export default ParentPortalPage;