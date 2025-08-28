// Complete integration example for Next.js
// [pkg-15-integration-example]

'use client';

import React from 'react';
import { ExpertfolioProvider, AdminAuditLogsPage, FilesPage, useI18n, I18nProvider } from '@lovable/expertfolio-ui';
import { adminAuditLogsAdapter, filesAdapter, setTestMode } from '@lovable/expertfolio-adapters';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Configure adapters for development
if (process.env.NODE_ENV === 'development') {
  setTestMode(true);
}

// Main layout component with providers
export const ExpertfolioLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const handleError = (error: any) => {
    console.error('Expertfolio Error:', error);
    toast.error(error.message || 'An error occurred');
  };

  return (
    <I18nProvider defaultLocale="en">
      <ExpertfolioProvider
        adapters={{
          adminAuditLogs: adminAuditLogsAdapter,
          files: filesAdapter
        }}
        onNavigate={handleNavigate}
        onError={handleError}
      >
        {children}
      </ExpertfolioProvider>
    </I18nProvider>
  );
};

// Example admin audit logs page
export const AdminAuditLogsPageExample: React.FC = () => {
  const router = useRouter();
  const { t } = useI18n();

  const handleNavigateToLog = (logId: string) => {
    router.push(`/admin/audit-logs/${logId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminAuditLogsPage 
        onNavigateToLog={handleNavigateToLog}
        className="max-w-7xl mx-auto"
      />
    </div>
  );
};

// Example files page
export const FilesPageExample: React.FC = () => {
  const { t } = useI18n();

  const handleFileUploaded = (fileKey: string) => {
    toast.success(t('files.uploadSuccess', { fileKey }));
    console.log('File uploaded successfully:', fileKey);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <FilesPage 
        onFileUploaded={handleFileUploaded}
        className="max-w-4xl mx-auto"
      />
    </div>
  );
};

// Example dashboard with feature flags
export const ExpertfolioDashboard: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">
            {t('common.dashboard')}
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick stats */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {t('dashboard.quickStats')}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">1,234</div>
                <div className="text-sm text-muted-foreground">{t('dashboard.totalLogs')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">56</div>
                <div className="text-sm text-muted-foreground">{t('dashboard.activeUsers')}</div>
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {t('dashboard.recentActivity')}
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-sm text-foreground">User logged in</span>
                <span className="text-xs text-muted-foreground ml-auto">2 min ago</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-sm text-foreground">File uploaded</span>
                <span className="text-xs text-muted-foreground ml-auto">5 min ago</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-sm text-foreground">Settings updated</span>
                <span className="text-xs text-muted-foreground ml-auto">10 min ago</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('auditLogs.title')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('auditLogs.description')}
            </p>
            <button className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition-colors">
              {t('common.viewDetails')}
            </button>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('files.title')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('files.description')}
            </p>
            <button className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition-colors">
              {t('common.manage')}
            </button>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('settings.title')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('settings.description')}
            </p>
            <button className="w-full bg-secondary text-secondary-foreground py-2 px-4 rounded-md hover:bg-secondary/80 transition-colors">
              {t('common.configure')}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};