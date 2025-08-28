// Adapter configuration with NEXT_PUBLIC_* and VITE_* fallback support
// [pkg-02-config]

interface AdapterConfig {
  baseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  testMode: boolean;
  environment: 'development' | 'production' | 'test';
}

// Read environment variables with fallback logic
const getEnvVar = (name: string, fallback?: string): string => {
  // Try Next.js style first
  const nextPublicValue = (globalThis as any)?.process?.env?.[`NEXT_PUBLIC_${name}`] ||
                          (typeof window !== 'undefined' && (window as any).process?.env?.[`NEXT_PUBLIC_${name}`]);
  
  // Fall back to Vite style (for build-time)
  const viteValue = (import.meta.env as any)?.[`VITE_${name}`];
  
  // Fall back to provided default
  const value = nextPublicValue || viteValue || fallback;
  
  if (!value && !fallback) {
    throw new Error(`Environment variable NEXT_PUBLIC_${name} or VITE_${name} is required`);
  }
  
  return value || fallback || '';
};

// Detect test mode
const isTestMode = (): boolean => {
  // Check Node.js test environment
  if (typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID)) {
    return true;
  }
  
  // Check Vite test mode
  if ((import.meta.env as any)?.MODE === 'test') {
    return true;
  }
  
  return false;
};

let testModeOverride: boolean | null = null;

export const setTestMode = (enabled: boolean): void => {
  testModeOverride = enabled;
};

export const config: AdapterConfig = {
  baseUrl: getEnvVar('BASE_URL', ''),
  supabaseUrl: getEnvVar('SUPABASE_URL', 'https://ukeqjiattiaokdqjqncf.supabase.co'),
  supabaseAnonKey: getEnvVar('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrZXFqaWF0dGlhb2tkcWpxbmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwOTI3NzIsImV4cCI6MjA3MDY2ODc3Mn0.sYYDUgwCt4X4k9ME6a_G2R3BA6GftI3WAcWVqBv2h2E'),
  get testMode() {
    return testModeOverride !== null ? testModeOverride : isTestMode();
  },
  environment: (typeof process !== 'undefined' ? process.env.NODE_ENV : (import.meta.env as any)?.MODE || 'development') as 'development' | 'production' | 'test'
};

export default config;