import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetails from "./pages/CourseDetails";
import AssignmentDetails from "./pages/AssignmentDetails";
import Analytics from "./pages/Analytics";
import Communications from "./pages/Communications";
import DiscussionForums from "./pages/DiscussionForums";
import CalendarPage from "./pages/CalendarPage";
import ProfilePage from "./pages/ProfilePage";
import Assignments from "./pages/Assignments";
import AssignmentManagement from "./pages/AssignmentManagement";
import RealTimeDashboardPage from "./pages/RealTimeDashboard";
import AdvancedAnalyticsPage from "./pages/AdvancedAnalytics";
import ParentPortalPage from "./pages/ParentPortal";
import QuizAssessmentPage from "./pages/QuizAssessment";
import AIDashboardPage from "./pages/AIDashboard";
import MobileDashboardPage from "./pages/MobileDashboard";
import Admin from "./pages/Admin";
import Students from "./pages/Students";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/courses" element={
              <ProtectedRoute>
                <Layout>
                  <Courses />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/courses/:courseId" element={
              <ProtectedRoute>
                <Layout>
                  <CourseDetails />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/assignments" element={
              <ProtectedRoute>
                <Layout>
                  <Assignments />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/assignment-management" element={
              <ProtectedRoute>
                <Layout>
                  <AssignmentManagement />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/assignments/:assignmentId" element={
              <ProtectedRoute>
                <Layout>
                  <AssignmentDetails />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <Layout>
                  <Analytics />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/communications" element={<ProtectedRoute><Layout><Communications /></Layout></ProtectedRoute>} />
            <Route path="/discussions" element={<ProtectedRoute><Layout><DiscussionForums /></Layout></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><Layout><CalendarPage /></Layout></ProtectedRoute>} />
            <Route path="/realtime-dashboard" element={<ProtectedRoute><Layout><RealTimeDashboardPage /></Layout></ProtectedRoute>} />
            <Route path="/advanced-analytics" element={<ProtectedRoute><Layout><AdvancedAnalyticsPage /></Layout></ProtectedRoute>} />
            <Route path="/parent-portal" element={<ProtectedRoute><Layout><ParentPortalPage /></Layout></ProtectedRoute>} />
            <Route path="/quiz-assessment" element={<ProtectedRoute><Layout><QuizAssessmentPage /></Layout></ProtectedRoute>} />
            <Route path="/ai-dashboard" element={<ProtectedRoute><Layout><AIDashboardPage /></Layout></ProtectedRoute>} />
            <Route path="/mobile-dashboard" element={<ProtectedRoute><Layout><MobileDashboardPage /></Layout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />
            <Route path="/students" element={
              <ProtectedRoute>
                <Layout>
                  <Students />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <Layout>
                  <Admin />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;