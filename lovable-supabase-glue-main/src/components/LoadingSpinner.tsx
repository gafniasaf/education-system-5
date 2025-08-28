import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
  variant?: 'spinner' | 'pulse' | 'bars';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = '',
  text,
  variant = 'spinner',
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  if (variant === 'pulse') {
    return (
      <div className={cn('flex flex-col items-center justify-center space-y-3', className)}>
        <div className={cn('animate-pulse bg-primary/20 rounded-full', sizeClasses[size])} />
        {text && (
          <p className={cn('text-muted-foreground animate-pulse', textSizeClasses[size])}>
            {text}
          </p>
        )}
      </div>
    );
  }

  if (variant === 'bars') {
    return (
      <div className={cn('flex flex-col items-center justify-center space-y-3', className)}>
        <div className="flex space-x-1">
          <div className="h-6 w-1 bg-primary animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="h-6 w-1 bg-primary animate-pulse" style={{ animationDelay: '150ms' }} />
          <div className="h-6 w-1 bg-primary animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
        {text && (
          <p className={cn('text-muted-foreground', textSizeClasses[size])}>
            {text}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-center space-y-3', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {text && (
        <p className={cn('text-muted-foreground', textSizeClasses[size])}>
          {text}
        </p>
      )}
    </div>
  );
};

interface PageLoadingProps {
  text?: string;
  className?: string;
}

export const PageLoading: React.FC<PageLoadingProps> = ({
  text = 'Loading...',
  className = '',
}) => {
  return (
    <div className={cn('min-h-screen bg-background flex items-center justify-center', className)}>
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
};

interface ComponentLoadingProps {
  text?: string;
  className?: string;
  variant?: 'spinner' | 'pulse' | 'bars';
}

export const ComponentLoading: React.FC<ComponentLoadingProps> = ({
  text = 'Loading...',
  className = '',
  variant = 'spinner',
}) => {
  return (
    <div className={cn('flex items-center justify-center py-8', className)}>
      <LoadingSpinner size="md" text={text} variant={variant} />
    </div>
  );
};

interface ButtonLoadingProps {
  className?: string;
}

export const ButtonLoading: React.FC<ButtonLoadingProps> = ({
  className = '',
}) => {
  return (
    <Loader2 className={cn('animate-spin h-4 w-4', className)} />
  );
};