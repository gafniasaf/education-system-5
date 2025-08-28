import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { config } from '@/lib/config';

// [lov-02-auth-role-testmode] Read role from user_metadata.role and honor x-test-auth

export type UserRole = 'admin' | 'teacher' | 'student' | 'parent';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: UserRole | null;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isTestMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const initialized = useRef(false);
  const { toast } = useToast();

  // Extract role from user metadata
  const extractUserRole = (user: User | null): UserRole | null => {
    if (!user) return null;
    
    // Check x-test-auth in test mode
    if (config.isTestMode && config.environment !== 'production') {
      const testAuthCookie = typeof document !== 'undefined' 
        ? document.cookie.split(';').find(c => c.trim().startsWith('x-test-auth='))?.split('=')[1]
        : null;
      
      if (testAuthCookie) {
        try {
          const testAuth = JSON.parse(decodeURIComponent(testAuthCookie));
          if (testAuth.role) {
            return testAuth.role as UserRole;
          }
        } catch (e) {
          console.warn('Failed to parse x-test-auth cookie:', e);
        }
      }
    }
    
    // Read from user_metadata.role (primary source)
    const userRole = user.user_metadata?.role;
    if (userRole && ['admin', 'teacher', 'student', 'parent'].includes(userRole)) {
      return userRole as UserRole;
    }
    
    // Fallback to 'student' for existing users without explicit role
    return 'student';
  };

  useEffect(() => {
    let isMounted = true;

    // Set up listener FIRST to avoid missing events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setRole(extractUserRole(newSession?.user ?? null));
    });

    // Then fetch current session and end loading state
    supabase.auth.getSession()
      .then(({ data: { session: initialSession } }) => {
        if (!isMounted) return;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        setRole(extractUserRole(initialSession?.user ?? null));
      })
      .catch((error) => {
        console.error('Auth initialization error:', error);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Check your email for the confirmation link!",
        });
      }

      return { error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You have been signed in successfully.",
        });
      }

      return { error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Signed out",
          description: "You have been signed out successfully.",
        });
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value = {
    user,
    session,
    loading,
    role,
    signUp,
    signIn,
    signOut,
    isTestMode: config.isTestMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};