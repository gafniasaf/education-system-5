// Mobile optimization utilities and responsive design helpers
// [pkg-14-mobile]

import React, { useEffect, useState, useRef } from 'react';

// Mobile detection utilities
export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      setIsMobile(mobileRegex.test(userAgent) || window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
};

// Touch gesture detection
export const useTouchGestures = (
  element: React.RefObject<HTMLElement>
) => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    const isUpSwipe = distanceY > minSwipeDistance;
    const isDownSwipe = distanceY < -minSwipeDistance;

    return { isLeftSwipe, isRightSwipe, isUpSwipe, isDownSwipe };
  };

  useEffect(() => {
    const el = element.current;
    if (!el) return;

    el.addEventListener('touchstart', onTouchStart);
    el.addEventListener('touchmove', onTouchMove);
    el.addEventListener('touchend', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [element]);

  return { onTouchEnd };
};

// Responsive table component for mobile
interface ResponsiveTableProps {
  headers: string[];
  rows: Array<Record<string, React.ReactNode>>;
  onRowClick?: (row: any) => void;
  mobileBreakpoint?: number;
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  headers,
  rows,
  onRowClick,
  mobileBreakpoint = 768
}) => {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < mobileBreakpoint;

  if (isMobile) {
    // Mobile card layout
    return (
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={index}
            className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:bg-muted/50"
            onClick={() => onRowClick?.(row)}
          >
            {Object.entries(row).map(([key, value], cellIndex) => (
              <div key={cellIndex} className="flex justify-between items-center py-1">
                <span className="text-sm font-medium text-muted-foreground">
                  {headers[cellIndex]}:
                </span>
                <span className="text-sm text-foreground text-right">
                  {value}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Desktop table layout
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            {headers.map((header, index) => (
              <th key={index} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, index) => (
            <tr
              key={index}
              className="hover:bg-muted/50 cursor-pointer"
              onClick={() => onRowClick?.(row)}
            >
              {Object.values(row).map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 text-sm text-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Mobile-optimized drawer component
interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  title,
  children
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const { onTouchEnd } = useTouchGestures(elementRef);

  const handleTouchEnd = () => {
    const gesture = onTouchEnd();
    if (gesture?.isDownSwipe) {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div
        ref={elementRef}
        className="fixed bottom-0 left-0 right-0 bg-background border-t border-border rounded-t-lg transform transition-transform duration-300 ease-out max-h-[80vh] overflow-hidden"
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull indicator */}
        <div className="flex justify-center py-2">
          <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
        </div>
        
        {/* Header */}
        {title && (
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          </div>
        )}
        
        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-4rem)]">
          {children}
        </div>
      </div>
    </div>
  );
};

// Responsive grid utilities
export const getResponsiveColumns = (
  totalItems: number,
  minItemWidth: number = 280
): string => {
  if (typeof window === 'undefined') return 'grid-cols-1';
  
  const containerWidth = window.innerWidth - 32; // Account for padding
  const maxColumns = Math.floor(containerWidth / minItemWidth);
  const columns = Math.min(maxColumns, totalItems, 4); // Max 4 columns
  
  return `grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.max(1, columns)}`;
};

// Mobile-friendly infinite scroll
export const useInfiniteScroll = (
  hasMore: boolean,
  loading: boolean,
  onLoadMore: () => void
) => {
  useEffect(() => {
    const handleScroll = () => {
      if (loading || !hasMore) return;
      
      const scrollTop = document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      
      if (scrollTop + clientHeight >= scrollHeight - 5) {
        onLoadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore, onLoadMore]);
};