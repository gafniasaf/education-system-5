// Standardized error banner with retry and context
// [pkg-07-error-banner]

import React from 'react';

export interface ErrorInfo {
  code?: string;
  message: string;
  requestId?: string;
  statusCode?: number;
  retryable?: boolean;
}

export interface ErrorBannerProps {
  error: ErrorInfo;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  error,
  onRetry,
  onDismiss,
  className = ''
}) => {
  const isRetryable = error.retryable ?? (error.statusCode && error.statusCode >= 500);
  
  return (
    <div className={`bg-destructive/10 border border-destructive/20 rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <svg 
              className="h-4 w-4 text-destructive flex-shrink-0" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-destructive">
              {error.code ? `Error ${error.code}` : 'Error'}
            </span>
          </div>
          
          <p className="text-sm text-foreground break-words">
            {error.message}
          </p>
          
          {error.requestId && (
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              Request ID: {error.requestId}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {isRetryable && onRetry && (
            <button
              onClick={onRetry}
              className="text-xs px-3 py-1 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
            >
              Retry
            </button>
          )}
          
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss error"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorBanner;