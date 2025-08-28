// Config adapter that reads NEXT_PUBLIC_SUPABASE_* with VITE_* fallback
// [lov-01-config-adapter]

interface Config {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isTestMode: boolean;
  environment: 'development' | 'production' | 'test';
}

// Read environment variables with fallback logic
const getEnvVar = (name: string, fallback?: string): string => {
  // Try Next.js style first
  const nextPublicValue = (import.meta.env as any)?.[`NEXT_PUBLIC_${name}`] || 
                         (typeof window !== 'undefined' && (window as any).process?.env?.[`NEXT_PUBLIC_${name}`]);
  
  // Fall back to Vite style
  const viteValue = (import.meta.env as any)?.[`VITE_${name}`];
  
  // Fall back to provided default
  const value = nextPublicValue || viteValue || fallback;
  
  if (!value) {
    throw new Error(`Environment variable NEXT_PUBLIC_${name} or VITE_${name} is required`);
  }
  
  return value;
};

// Detect test mode from headers or environment
const isTestMode = (): boolean => {
  // Check for test environment
  if (import.meta.env?.MODE === 'test' || import.meta.env?.NODE_ENV === 'test') {
    return true;
  }
  
  // Check for x-test-auth header in non-production environments
  if (typeof window !== 'undefined' && import.meta.env?.MODE !== 'production') {
    // In browser, we'll rely on the fetch wrapper to handle x-test-auth
    return false;
  }
  
  return false;
};

export const config: Config = {
  supabaseUrl: getEnvVar('SUPABASE_URL', 'https://ukeqjiattiaokdqjqncf.supabase.co'),
  supabaseAnonKey: getEnvVar('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrZXFqaWF0dGlhb2tkcWpxbmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwOTI3NzIsImV4cCI6MjA3MDY2ODc3Mn0.sYYDUgwCt4X4k9ME6a_G2R3BA6GftI3WAcWVqBv2h2E'),
  isTestMode: isTestMode(),
  environment: (import.meta.env?.MODE || 'development') as 'development' | 'production' | 'test'
};

export default config;