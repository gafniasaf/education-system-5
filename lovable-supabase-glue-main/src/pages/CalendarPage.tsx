import React from 'react';
import { CalendarView } from '@/components/CalendarView';

const CalendarPage = () => {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <CalendarView />
      </div>
    </div>
  );
};

export default CalendarPage;