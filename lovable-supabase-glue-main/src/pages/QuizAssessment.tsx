import React from 'react';
import { QuizAssessmentTools } from '@/components/QuizAssessmentTools';

const QuizAssessmentPage = () => {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <QuizAssessmentTools />
      </div>
    </div>
  );
};

export default QuizAssessmentPage;