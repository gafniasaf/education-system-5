import React from 'react';
import { ProfileSettings } from '@/components/ProfileSettings';

const ProfilePage = () => {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <ProfileSettings />
      </div>
    </div>
  );
};

export default ProfilePage;