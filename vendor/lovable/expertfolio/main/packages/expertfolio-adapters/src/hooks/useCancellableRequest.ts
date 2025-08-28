// Hook for cancellable requests with cleanup
// [pkg-08-cancellable-hook]

import { useCallback, useEffect, useRef } from 'react';
import { fetchWrapper, FetchOptions, ApiResult } from '@lovable/expertfolio-adapters';

export interface UseCancellableRequestOptions extends FetchOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  immediate?: boolean;
}

export const useCancellableRequest = <T = any>(
  url: string | URL,
  options: UseCancellableRequestOptions = {}
) => {
  const controllerRef = useRef<AbortController | null>(null);
  const { immediate = false, onSuccess, onError, ...fetchOptions } = options;

  const execute = useCallback(async (): Promise<ApiResult<T> | null> => {
    // Cancel any existing request
    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    // Create new controller
    controllerRef.current = new AbortController();

    try {
      const result = await fetchWrapper<T>(url, {
        ...fetchOptions,
        signal: controllerRef.current.signal
      });

      if (result.error) {
        onError?.(result.error);
      } else {
        onSuccess?.(result.data);
      }

      return result;
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        onError?.(error);
      }
      return null;
    }
  }, [url, fetchOptions, onSuccess, onError]);

  const cancel = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return {
    execute,
    cancel,
    isActive: !!controllerRef.current
  };
};