import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { Menu, X } from 'lucide-react';

interface MobileOptimizedLayoutProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
}

export const MobileOptimizedLayout: React.FC<MobileOptimizedLayoutProps> = ({
  children,
  title,
  actions,
}) => {
  const { isMobile, openMobile, setOpenMobile } = useSidebar();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      {isMobile && (
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpenMobile(!openMobile)}
              >
                {openMobile ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
              {title && <h1 className="text-lg font-semibold truncate">{title}</h1>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {!isMobile && title && (
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold">{title}</h1>
                {actions && <div className="flex items-center gap-2">{actions}</div>}
              </div>
            </div>
          )}
          
          <div className="space-y-4 sm:space-y-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// Mobile-optimized card wrapper
export const MobileCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-4 sm:p-6">
        {children}
      </CardContent>
    </Card>
  );
};

// Responsive grid wrapper
export const ResponsiveGrid: React.FC<{
  children: React.ReactNode;
  cols?: 'auto' | 1 | 2 | 3 | 4;
}> = ({ children, cols = 'auto' }) => {
  const getGridClass = () => {
    switch (cols) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-1 sm:grid-cols-2';
      case 3:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 4:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
      default:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
    }
  };

  return (
    <div className={`grid gap-4 sm:gap-6 ${getGridClass()}`}>
      {children}
    </div>
  );
};