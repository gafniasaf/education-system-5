// Internationalization support
// [pkg-14-i18n]

import React, { createContext, useContext, useState, useEffect } from 'react';

// Supported locales
export type SupportedLocale = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'zh';

// Translation structure
export interface Translations {
  common: {
    loading: string;
    error: string;
    retry: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    close: string;
    search: string;
    filter: string;
    export: string;
    refresh: string;
    previous: string;
    next: string;
    required: string;
  };
  auditLogs: {
    title: string;
    description: string;
    noResults: string;
    searchPlaceholder: string;
    columns: {
      time: string;
      actor: string;
      action: string;
      entity: string;
      id: string;
    };
    pagination: {
      showing: string;
      of: string;
      results: string;
    };
  };
  files: {
    title: string;
    description: string;
    uploadZone: string;
    maxSize: string;
    maxFiles: string;
    noFiles: string;
    uploading: string;
    finalizing: string;
    complete: string;
    error: string;
  };
  errors: {
    networkError: string;
    serverError: string;
    notFound: string;
    unauthorized: string;
    forbidden: string;
    validationError: string;
    fileTooBig: string;
    invalidFileType: string;
    tooManyFiles: string;
  };
}

// Default English translations
const EN_TRANSLATIONS: Translations = {
  common: {
    loading: 'Loading...',
    error: 'Error',
    retry: 'Retry',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    refresh: 'Refresh',
    previous: 'Previous',
    next: 'Next',
    required: 'Required'
  },
  auditLogs: {
    title: 'Audit Logs',
    description: 'Track system activity and user actions',
    noResults: 'No audit logs found',
    searchPlaceholder: 'Search logs...',
    columns: {
      time: 'Time',
      actor: 'Actor',
      action: 'Action',
      entity: 'Entity',
      id: 'ID'
    },
    pagination: {
      showing: 'Showing',
      of: 'of',
      results: 'results'
    }
  },
  files: {
    title: 'File Management',
    description: 'Upload and manage your files',
    uploadZone: 'Drop files here or browse',
    maxSize: 'Max {{size}}MB per file',
    maxFiles: 'up to {{count}} files',
    noFiles: 'No files uploaded',
    uploading: 'Uploading...',
    finalizing: 'Finalizing...',
    complete: 'Complete',
    error: 'Error'
  },
  errors: {
    networkError: 'Network connection error. Please check your internet connection.',
    serverError: 'Server error. Please try again later.',
    notFound: 'The requested resource was not found.',
    unauthorized: 'You are not authorized to perform this action.',
    forbidden: 'Access denied. You do not have permission.',
    validationError: 'Please check your input and try again.',
    fileTooBig: 'File size exceeds the maximum allowed limit.',
    invalidFileType: 'File type is not supported.',
    tooManyFiles: 'Too many files selected.'
  }
};

// Spanish translations
const ES_TRANSLATIONS: Translations = {
  common: {
    loading: 'Cargando...',
    error: 'Error',
    retry: 'Reintentar',
    cancel: 'Cancelar',
    save: 'Guardar',
    delete: 'Eliminar',
    edit: 'Editar',
    close: 'Cerrar',
    search: 'Buscar',
    filter: 'Filtrar',
    export: 'Exportar',
    refresh: 'Actualizar',
    previous: 'Anterior',
    next: 'Siguiente',
    required: 'Requerido'
  },
  auditLogs: {
    title: 'Registros de Auditoría',
    description: 'Rastrear actividad del sistema y acciones de usuario',
    noResults: 'No se encontraron registros de auditoría',
    searchPlaceholder: 'Buscar registros...',
    columns: {
      time: 'Hora',
      actor: 'Actor',
      action: 'Acción',
      entity: 'Entidad',
      id: 'ID'
    },
    pagination: {
      showing: 'Mostrando',
      of: 'de',
      results: 'resultados'
    }
  },
  files: {
    title: 'Gestión de Archivos',
    description: 'Subir y gestionar tus archivos',
    uploadZone: 'Arrastra archivos aquí o navega',
    maxSize: 'Máximo {{size}}MB por archivo',
    maxFiles: 'hasta {{count}} archivos',
    noFiles: 'No hay archivos subidos',
    uploading: 'Subiendo...',
    finalizing: 'Finalizando...',
    complete: 'Completo',
    error: 'Error'
  },
  errors: {
    networkError: 'Error de conexión de red. Verifica tu conexión a internet.',
    serverError: 'Error del servidor. Inténtalo de nuevo más tarde.',
    notFound: 'El recurso solicitado no fue encontrado.',
    unauthorized: 'No estás autorizado para realizar esta acción.',
    forbidden: 'Acceso denegado. No tienes permisos.',
    validationError: 'Verifica tu entrada e inténtalo de nuevo.',
    fileTooBig: 'El tamaño del archivo excede el límite máximo permitido.',
    invalidFileType: 'El tipo de archivo no es compatible.',
    tooManyFiles: 'Demasiados archivos seleccionados.'
  }
};

// Translation storage
const TRANSLATIONS: Record<SupportedLocale, Translations> = {
  en: EN_TRANSLATIONS,
  es: ES_TRANSLATIONS,
  fr: EN_TRANSLATIONS, // Fallback to English for now
  de: EN_TRANSLATIONS, // Fallback to English for now
  pt: EN_TRANSLATIONS, // Fallback to English for now
  zh: EN_TRANSLATIONS  // Fallback to English for now
};

// I18n Context
interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
}

const I18nContext = createContext<I18nContextValue | null>(null);

// Simple interpolation function
const interpolate = (text: string, variables: Record<string, string | number> = {}): string => {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key]?.toString() || match;
  });
};

// Get nested object value by dot notation
const getNestedValue = (obj: any, path: string): string => {
  return path.split('.').reduce((current, key) => current?.[key], obj) || path;
};

// I18n Provider
export interface I18nProviderProps {
  children: React.ReactNode;
  defaultLocale?: SupportedLocale;
  onLocaleChange?: (locale: SupportedLocale) => void;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({
  children,
  defaultLocale = 'en',
  onLocaleChange
}) => {
  const [locale, setLocaleState] = useState<SupportedLocale>(defaultLocale);

  const setLocale = (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    onLocaleChange?.(newLocale);
    
    // Update document language
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLocale;
    }
  };

  const t = (key: string, variables?: Record<string, string | number>): string => {
    const translations = TRANSLATIONS[locale];
    const text = getNestedValue(translations, key);
    return interpolate(text, variables);
  };

  const dir = 'ltr'; // All supported locales are LTR for now

  useEffect(() => {
    // Set initial document language
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      document.documentElement.dir = dir;
    }
  }, [locale, dir]);

  const value: I18nContextValue = {
    locale,
    setLocale,
    t,
    dir
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

// Hook for using translations
export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};

// HOC for adding translations to components
export const withI18n = <P extends object>(
  Component: React.ComponentType<P & { t: I18nContextValue['t'] }>
) => {
  const I18nComponent: React.FC<P> = (props) => {
    const { t } = useI18n();
    return React.createElement(Component, { ...props, t } as P & { t: I18nContextValue['t'] });
  };
  
  I18nComponent.displayName = `withI18n(${Component.displayName || Component.name})`;
  
  return I18nComponent;
};

// Locale detector utility
export const detectLocale = (): SupportedLocale => {
  if (typeof navigator === 'undefined') return 'en';
  
  const browserLocale = navigator.language.toLowerCase();
  const supportedLocales: SupportedLocale[] = ['en', 'es', 'fr', 'de', 'pt', 'zh'];
  
  // Check exact match
  for (const locale of supportedLocales) {
    if (browserLocale.startsWith(locale)) {
      return locale;
    }
  }
  
  return 'en'; // Default fallback
};

// Date formatting with locale support
export const formatDate = (date: Date | string, locale: SupportedLocale): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  } catch {
    return dateObj.toLocaleString();
  }
};

// Number formatting with locale support
export const formatNumber = (number: number, locale: SupportedLocale): string => {
  try {
    return new Intl.NumberFormat(locale).format(number);
  } catch {
    return number.toString();
  }
};