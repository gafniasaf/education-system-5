// SSR and Next.js compatibility utilities
// [pkg-14-ssr]

import React, { useEffect, useState } from 'react';

// Safe client-side only hook
export const useIsClient = (): boolean => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
};

// Safe local storage hook with SSR support
export const useLocalStorage = <T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] => {
  const isClient = useIsClient();
  
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (!isClient) return initialValue;
    
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (isClient) {
        localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
};

// Safe media query hook with SSR support
export const useMediaQuery = (query: string): boolean => {
  const isClient = useIsClient();
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (!isClient) return;

    const media = window.matchMedia(query);
    
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [matches, query, isClient]);

  return matches;
};

// Dynamic import wrapper for client-side components
export const withClientOnly = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<P> | React.ReactNode
) => {
  const ClientOnlyComponent: React.FC<P> = (props) => {
    const isClient = useIsClient();
    
    if (!isClient) {
      if (React.isValidElement(fallback)) {
        return fallback;
      }
      if (fallback && typeof fallback === 'function') {
        return React.createElement(fallback as React.ComponentType<P>, props);
      }
      return null;
    }
    
    return React.createElement(Component, props);
  };
  
  ClientOnlyComponent.displayName = `ClientOnly(${Component.displayName || Component.name})`;
  
  return ClientOnlyComponent;
};

// Safe document/window access utilities
export const safeDocument = {
  getElementById: (id: string): HTMLElement | null => {
    if (typeof document === 'undefined') return null;
    return document.getElementById(id);
  },
  
  querySelector: (selector: string): Element | null => {
    if (typeof document === 'undefined') return null;
    return document.querySelector(selector);
  },
  
  createElement: (tagName: string): HTMLElement | null => {
    if (typeof document === 'undefined') return null;
    return document.createElement(tagName);
  }
};

export const safeWindow = {
  addEventListener: (event: string, handler: EventListener): void => {
    if (typeof window !== 'undefined') {
      window.addEventListener(event, handler);
    }
  },
  
  removeEventListener: (event: string, handler: EventListener): void => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(event, handler);
    }
  },
  
  getComputedStyle: (element: Element): CSSStyleDeclaration | null => {
    if (typeof window === 'undefined') return null;
    return window.getComputedStyle(element);
  }
};

// Lazy loading component with SSR support
interface LazyComponentProps {
  loader: () => Promise<{ default: React.ComponentType<any> }>;
  fallback?: React.ReactNode;
  error?: React.ComponentType<{ error: Error; retry: () => void }>;
}

export const LazyComponent: React.FC<LazyComponentProps & any> = ({
  loader,
  fallback = null,
  error: ErrorComponent,
  ...props
}) => {
  const isClient = useIsClient();
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);

  const loadComponent = async () => {
    if (!isClient || Component || loading) return;
    
    setLoading(true);
    setLoadError(null);
    
    try {
      const module = await loader();
      setComponent(() => module.default);
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error('Component loading failed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComponent();
  }, [isClient]);

  if (!isClient || loading) {
    return <>{fallback}</>;
  }

  if (loadError) {
    if (ErrorComponent) {
      return <ErrorComponent error={loadError} retry={loadComponent} />;
    }
    return <div>Error loading component: {loadError.message}</div>;
  }

  if (!Component) {
    return <>{fallback}</>;
  }

  return <Component {...props} />;
};

// Next.js specific utilities
export const getServerSideConfig = () => {
  // Only available in server-side context
  if (typeof window !== 'undefined') return {};
  
  return {
    baseUrl: process.env.BASE_URL || '',
    supabaseUrl: process.env.SUPABASE_URL || '',
    // Don't expose sensitive keys client-side
  };
};

// Hydration-safe component wrapper
export const NoSSR: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isClient = useIsClient();
  return isClient ? <>{children}</> : null;
};