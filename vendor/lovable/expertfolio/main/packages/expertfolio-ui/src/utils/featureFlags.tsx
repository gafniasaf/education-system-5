// Feature flags and runtime configuration
// [pkg-12-feature-flags]

import React from 'react';

interface FeatureFlags {
  FEATURE_EXPERTFOLIO: boolean;
  FEATURE_ADVANCED_ANALYTICS: boolean;
  FEATURE_FILE_MANAGEMENT: boolean;
  FEATURE_AUDIT_LOGS: boolean;
  FEATURE_REAL_TIME_UPDATES: boolean;
}

interface RuntimeConfig {
  features: FeatureFlags;
  performance: {
    enableVirtualScrolling: boolean;
    enableLazyLoading: boolean;
    maxTableRows: number;
    debounceDelay: number;
  };
  accessibility: {
    enableHighContrast: boolean;
    enableReducedMotion: boolean;
    announceChanges: boolean;
  };
}

// Default configuration
const DEFAULT_CONFIG: RuntimeConfig = {
  features: {
    FEATURE_EXPERTFOLIO: true,
    FEATURE_ADVANCED_ANALYTICS: false,
    FEATURE_FILE_MANAGEMENT: true,
    FEATURE_AUDIT_LOGS: true,
    FEATURE_REAL_TIME_UPDATES: false
  },
  performance: {
    enableVirtualScrolling: true,
    enableLazyLoading: true,
    maxTableRows: 100,
    debounceDelay: 300
  },
  accessibility: {
    enableHighContrast: false,
    enableReducedMotion: false,
    announceChanges: true
  }
};

class FeatureFlagManager {
  private config: RuntimeConfig;
  private listeners: ((config: RuntimeConfig) => void)[] = [];

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): RuntimeConfig {
    try {
      // Try to load from environment variables
      const envFlags: Partial<FeatureFlags> = {};
      
      Object.keys(DEFAULT_CONFIG.features).forEach(key => {
        const envKey = key as keyof FeatureFlags;
        const envValue = process.env[`NEXT_PUBLIC_${key}`] || process.env[`VITE_${key}`];
        if (envValue !== undefined) {
          envFlags[envKey] = envValue === 'true';
        }
      });

      // Try to load from localStorage (client-side only)
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('expertfolio-config');
        if (stored) {
          const parsedConfig = JSON.parse(stored);
          return { ...DEFAULT_CONFIG, ...parsedConfig };
        }
      }

      return {
        ...DEFAULT_CONFIG,
        features: { ...DEFAULT_CONFIG.features, ...envFlags }
      };
    } catch (error) {
      console.warn('Failed to load feature flags, using defaults:', error);
      return DEFAULT_CONFIG;
    }
  }

  getConfig(): RuntimeConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<RuntimeConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('expertfolio-config', JSON.stringify(this.config));
      } catch (error) {
        console.warn('Failed to persist config:', error);
      }
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(this.config));
  }

  isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    return this.config.features[feature];
  }

  subscribe(listener: (config: RuntimeConfig) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Kill switch for emergency feature disabling
  emergencyDisable(feature: keyof FeatureFlags): void {
    console.warn(`Emergency disabling feature: ${feature}`);
    this.updateConfig({
      features: {
        ...this.config.features,
        [feature]: false
      }
    });
  }
}

// Singleton instance
export const featureFlagManager = new FeatureFlagManager();

// React hook for using feature flags
export const useFeatureFlags = () => {
  const [config, setConfig] = React.useState(() => featureFlagManager.getConfig());

  React.useEffect(() => {
    return featureFlagManager.subscribe(setConfig);
  }, []);

  return {
    config,
    isFeatureEnabled: featureFlagManager.isFeatureEnabled.bind(featureFlagManager),
    updateConfig: featureFlagManager.updateConfig.bind(featureFlagManager),
    emergencyDisable: featureFlagManager.emergencyDisable.bind(featureFlagManager)
  };
};

// HOC for feature gating components
export const withFeatureFlag = <P extends object>(
  feature: keyof FeatureFlags,
  fallback?: React.ComponentType<P> | null
) => {
  return (Component: React.ComponentType<P>) => {
    const FeatureGatedComponent: React.FC<P> = (props) => {
      const { isFeatureEnabled } = useFeatureFlags();
      
      if (!isFeatureEnabled(feature)) {
        return fallback ? React.createElement(fallback, props) : null;
      }
      
      return React.createElement(Component, props);
    };
    
    FeatureGatedComponent.displayName = `withFeatureFlag(${Component.displayName || Component.name})`;
    
    return FeatureGatedComponent;
  };
};

// Feature flag component wrapper
interface FeatureGateProps {
  feature: keyof FeatureFlags;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  fallback = null,
  children
}) => {
  const { isFeatureEnabled } = useFeatureFlags();
  
  return isFeatureEnabled(feature) ? <>{children}</> : <>{fallback}</>;
};