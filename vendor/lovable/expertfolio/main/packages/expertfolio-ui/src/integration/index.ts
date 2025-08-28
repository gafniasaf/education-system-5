// Integration helpers for easy adoption
// [pkg-11-integration-helpers]

import React from 'react';
import type { AdminAuditLogsPageProps } from '../pages/AdminAuditLogsPage';
import type { FilesPageProps } from '../pages/FilesPage';

// Context for managing adapter integration
export interface ExpertfolioContextValue {
  adapters: {
    adminAuditLogs: any;
    files: any;
  };
  onNavigate?: (path: string) => void;
  onError?: (error: any) => void;
}

export const ExpertfolioContext = React.createContext<ExpertfolioContextValue | null>(null);

export const useExpertfolio = () => {
  const context = React.useContext(ExpertfolioContext);
  if (!context) {
    throw new Error('useExpertfolio must be used within ExpertfolioProvider');
  }
  return context;
};

// Provider component for dependency injection
export interface ExpertfolioProviderProps {
  children: React.ReactNode;
  adapters: ExpertfolioContextValue['adapters'];
  onNavigate?: (path: string) => void;
  onError?: (error: any) => void;
}

export const ExpertfolioProvider: React.FC<ExpertfolioProviderProps> = ({
  children,
  adapters,
  onNavigate,
  onError
}) => {
  const value: ExpertfolioContextValue = {
    adapters,
    onNavigate,
    onError
  };

  return (
    <ExpertfolioContext.Provider value={value}>
      {children}
    </ExpertfolioContext.Provider>
  );
};

// Router-agnostic navigation helpers
export const createNavigationHandler = (
  navigate: (path: string) => void
) => ({
  toAuditLog: (logId: string) => navigate(`/admin/audit-logs/${logId}`),
  toFiles: () => navigate('/files'),
  toAuditLogs: () => navigate('/admin/audit-logs'),
});

// Pre-configured page components with context integration
export const ConnectedAdminAuditLogsPage: React.FC<Omit<AdminAuditLogsPageProps, 'onNavigateToLog'>> = (props) => {
  const { onNavigate } = useExpertfolio();
  
  const handleNavigateToLog = (logId: string) => {
    onNavigate?.(`/admin/audit-logs/${logId}`);
  };

  return (
    <AdminAuditLogsPage
      {...props}
      onNavigateToLog={handleNavigateToLog}
    />
  );
};

export const ConnectedFilesPage: React.FC<Omit<FilesPageProps, 'onFileUploaded'>> = (props) => {
  const { onNavigate } = useExpertfolio();
  
  const handleFileUploaded = (fileKey: string) => {
    console.log('File uploaded:', fileKey);
    // Could trigger refresh or navigation
  };

  return (
    <FilesPage
      {...props}
      onFileUploaded={handleFileUploaded}
    />
  );
};

// Wiring guide types for documentation
export interface WiringGuide {
  pages: {
    [key: string]: {
      component: string;
      adapters: string[];
      testIds: string[];
      navigationEvents: string[];
    };
  };
}

export const WIRING_GUIDE: WiringGuide = {
  pages: {
    'AdminAuditLogsPage': {
      component: 'AdminAuditLogsPage',
      adapters: ['adminAuditLogsAdapter.getLogs', 'adminAuditLogsAdapter.getLogById'],
      testIds: ['audit-logs-table', 'audit-log-row', 'refresh-button', 'search-input'],
      navigationEvents: ['onNavigateToLog']
    },
    'FilesPage': {
      component: 'FilesPage',
      adapters: ['filesAdapter.finalizeUpload', 'filesAdapter.getDownloadUrl'],
      testIds: ['file-upload-zone', 'file-list', 'file-item', 'download-button'],
      navigationEvents: ['onFileUploaded']
    }
  }
};