// Performance optimization utilities
// [pkg-12-performance]

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Lazy loading with Intersection Observer
export const useLazyLoading = (threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasBeenVisible(true);
        } else {
          setIsVisible(false);
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold]);

  return { elementRef, isVisible, hasBeenVisible };
};

// Virtual scrolling for large lists
interface VirtualScrollItem {
  id: string | number;
  height?: number;
}

export const useVirtualScroll = <T extends VirtualScrollItem>({
  items,
  containerHeight,
  itemHeight = 50,
  overscan = 5
}: {
  items: T[];
  containerHeight: number;
  itemHeight?: number;
  overscan?: number;
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const { visibleItems, startIndex, endIndex, totalHeight } = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(start + visibleCount + overscan, items.length);
    const actualStart = Math.max(0, start - overscan);

    return {
      visibleItems: items.slice(actualStart, end).map((item, index) => ({
        ...item,
        index: actualStart + index
      })),
      startIndex: actualStart,
      endIndex: end,
      totalHeight: items.length * itemHeight
    };
  }, [items, scrollTop, containerHeight, itemHeight, overscan]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    scrollElementRef,
    visibleItems,
    startIndex,
    endIndex,
    totalHeight,
    handleScroll,
    offsetY: startIndex * itemHeight
  };
};

// Debounced state for search/filter inputs
export const useDebouncedState = <T>(initialValue: T, delay: number = 300) => {
  const [value, setValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return [debouncedValue, setValue, value] as const;
};

// Memoized table row component for performance
interface TableRowProps {
  item: any;
  columns: Array<{
    key: string;
    render?: (value: any, item: any) => React.ReactNode;
  }>;
  onClick?: (item: any) => void;
  className?: string;
}

export const MemoizedTableRow = React.memo<TableRowProps>(({
  item,
  columns,
  onClick,
  className = ''
}) => {
  const handleClick = useCallback(() => {
    onClick?.(item);
  }, [onClick, item]);

  return (
    <tr 
      className={`hover:bg-muted/50 cursor-pointer ${className}`}
      onClick={handleClick}
    >
      {columns.map((column) => (
        <td key={column.key} className="px-4 py-3 text-sm">
          {column.render 
            ? column.render(item[column.key], item)
            : item[column.key]
          }
        </td>
      ))}
    </tr>
  );
});

MemoizedTableRow.displayName = 'MemoizedTableRow';

// Bundle size budget checker
export const checkBundleSize = (componentName: string, maxSizeKB: number = 50) => {
  if (process.env.NODE_ENV === 'development') {
    // This would be replaced with actual bundle analysis in a real implementation
    console.group(`📦 Bundle Size Check: ${componentName}`);
    console.log(`Max allowed: ${maxSizeKB}KB`);
    console.log('Add webpack-bundle-analyzer or similar tool for actual measurements');
    console.groupEnd();
  }
};

// Image optimization with lazy loading
interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  lazy?: boolean;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  fallback = '/placeholder.svg',
  lazy = true,
  className = '',
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState(lazy ? fallback : src);
  const [imageError, setImageError] = useState(false);
  const { elementRef, hasBeenVisible } = useLazyLoading();

  useEffect(() => {
    if (lazy && hasBeenVisible && imageSrc === fallback) {
      setImageSrc(src);
    }
  }, [lazy, hasBeenVisible, src, fallback, imageSrc]);

  const handleError = useCallback(() => {
    setImageError(true);
    setImageSrc(fallback);
  }, [fallback]);

  const handleLoad = useCallback(() => {
    setImageError(false);
  }, []);

  return (
    <img
      ref={elementRef as any}
      src={imageSrc}
      alt={alt}
      onError={handleError}
      onLoad={handleLoad}
      className={`transition-opacity duration-200 ${imageError ? 'opacity-50' : ''} ${className}`}
      loading={lazy ? 'lazy' : 'eager'}
      {...props}
    />
  );
};