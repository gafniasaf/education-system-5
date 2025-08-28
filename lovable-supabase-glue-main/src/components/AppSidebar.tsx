import React, { useMemo, useCallback } from 'react';
import { 
  BookOpen, 
  FileText, 
  Users, 
  GraduationCap, 
  BarChart3, 
  Calendar,
  Trophy,
  Star,
  Settings,
  Home,
  MessageSquare,
  Activity,
  TrendingUp,
  Award,
  Brain,
  Smartphone,
  Shield
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

// Static navigation items to prevent recreation - only existing routes
const NAVIGATION_ITEMS = {
  teacher: [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Courses", url: "/courses", icon: BookOpen },
    { title: "Assignments", url: "/assignments", icon: FileText },
    { title: "Assignment Manager", url: "/assignment-management", icon: BarChart3 },
    { title: "Communications", url: "/communications", icon: MessageSquare },
    { title: "Discussions", url: "/discussions", icon: Users },
    { title: "Calendar", url: "/calendar", icon: Calendar },
    { title: "Real-Time Dashboard", url: "/realtime-dashboard", icon: Activity },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
    { title: "Advanced Analytics", url: "/advanced-analytics", icon: TrendingUp },
    { title: "Quiz Assessment", url: "/quiz-assessment", icon: Award },
    { title: "AI Dashboard", url: "/ai-dashboard", icon: Brain },
    { title: "Mobile Dashboard", url: "/mobile-dashboard", icon: Smartphone },
    { title: "Students", url: "/students", icon: Users },
  { title: "Profile", url: "/profile", icon: Settings },
  ],
  student: [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "My Courses", url: "/courses", icon: BookOpen },
    { title: "Assignments", url: "/assignments", icon: FileText },
    { title: "Communications", url: "/communications", icon: MessageSquare },
    { title: "Discussions", url: "/discussions", icon: Users },
    { title: "Calendar", url: "/calendar", icon: Calendar },
    { title: "Real-Time Dashboard", url: "/realtime-dashboard", icon: Activity },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Profile", url: "/profile", icon: Settings },
  ],
  parent: [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Parent Portal", url: "/parent-portal", icon: Users },
    { title: "Profile", url: "/profile", icon: Settings },
  ],
  admin: [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Admin Panel", url: "/admin", icon: Shield },
    { title: "Courses", url: "/courses", icon: BookOpen },
    { title: "Students", url: "/students", icon: Users },
    { title: "Profile", url: "/profile", icon: Settings },
  ],
} as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const { user, signOut, role } = useAuth();
  const { profile } = useProfile();
  const location = useLocation();

  // Get user role from auth hook (which reads from user_metadata)
  const userRole = useMemo(() => role || profile?.role || "student", [role, profile?.role]);

  // Memoize navigation items
  const items = useMemo(() => {
    return NAVIGATION_ITEMS[userRole as keyof typeof NAVIGATION_ITEMS] || NAVIGATION_ITEMS.teacher;
  }, [userRole]);

  // Memoize collapsed state
  const collapsed = useMemo(() => state === "collapsed", [state]);

  // Memoize className function
  const getNavCls = useCallback(({ isActive }: { isActive: boolean }) => {
    return isActive 
      ? "bg-accent text-accent-foreground font-medium" 
      : "hover:bg-accent/50";
  }, []);

  // Don't render sidebar if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"}>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          {!collapsed && (
            <span className="font-semibold text-lg">EduPlatform</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={getNavCls}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {profile?.first_name && profile?.last_name 
                  ? `${profile.first_name} ${profile.last_name}`
                  : user?.email
                }
              </p>
              <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={signOut}
            className="mt-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign Out
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}