// Accessibility utilities and ARIA helpers
// [pkg-12-accessibility]

import { useCallback, useEffect, useRef } from 'react';

// ARIA live region manager
export class AriaLiveRegion {
  private static regions: Map<string, HTMLElement> = new Map();

  static announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    let region = this.regions.get(priority);
    
    if (!region) {
      region = document.createElement('div');
      region.setAttribute('aria-live', priority);
      region.setAttribute('aria-atomic', 'true');
      region.className = 'sr-only';
      region.style.cssText = `
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      `;
      
      document.body.appendChild(region);
      this.regions.set(priority, region);
    }
    
    // Clear and set new message
    region.textContent = '';
    setTimeout(() => {
      region!.textContent = message;
    }, 100);
  }
}

// Focus management hooks
export const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const closeButton = container.querySelector('[data-close]') as HTMLElement;
        closeButton?.click();
      }
    };

    container.addEventListener('keydown', handleTabKey);
    container.addEventListener('keydown', handleEscapeKey);
    
    // Focus first element initially
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
      container.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isActive]);

  return containerRef;
};

// Skip to content link
export const SkipToContent: React.FC<{ targetId: string }> = ({ targetId }) => (
  <a
    href={`#${targetId}`}
    className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50"
    onFocus={(e) => {
      // Ensure the target exists
      const target = document.getElementById(targetId);
      if (!target) {
        e.preventDefault();
        console.warn(`Skip to content target #${targetId} not found`);
      }
    }}
  >
    Skip to main content
  </a>
);

// Keyboard navigation helpers
export const useKeyboardNavigation = (
  items: HTMLElement[],
  orientation: 'horizontal' | 'vertical' = 'vertical'
) => {
  const currentIndex = useRef(0);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const key = e.key;
    const isHorizontal = orientation === 'horizontal';
    
    let nextIndex = currentIndex.current;

    switch (key) {
      case isHorizontal ? 'ArrowLeft' : 'ArrowUp':
        nextIndex = currentIndex.current > 0 ? currentIndex.current - 1 : items.length - 1;
        break;
      case isHorizontal ? 'ArrowRight' : 'ArrowDown':
        nextIndex = currentIndex.current < items.length - 1 ? currentIndex.current + 1 : 0;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = items.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    currentIndex.current = nextIndex;
    items[nextIndex]?.focus();
  }, [items, orientation]);

  return { handleKeyDown, currentIndex: currentIndex.current };
};

// Color contrast checker
export const checkColorContrast = (foreground: string, background: string): number => {
  const getLuminance = (hex: string): number => {
    const rgb = hex.replace('#', '').match(/.{2}/g);
    if (!rgb) return 0;
    
    const [r, g, b] = rgb.map(channel => {
      const sRGB = parseInt(channel, 16) / 255;
      return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

// Accessible form field wrapper
export interface AccessibleFieldProps {
  id: string;
  label: string;
  error?: string;
  description?: string;
  required?: boolean;
  children: React.ReactElement;
}

export const AccessibleField: React.FC<AccessibleFieldProps> = ({
  id,
  label,
  error,
  description,
  required = false,
  children
}) => {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  
  const ariaDescribedBy = [descriptionId, errorId].filter(Boolean).join(' ');

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1" aria-label="required">*</span>}
      </label>
      
      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      {React.cloneElement(children, {
        id,
        'aria-describedby': ariaDescribedBy || undefined,
        'aria-invalid': error ? 'true' : undefined,
        'aria-required': required
      })}
      
      {error && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};