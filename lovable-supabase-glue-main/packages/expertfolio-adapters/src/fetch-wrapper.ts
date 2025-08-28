// Enhanced fetch wrapper with retry, timeout, and rate limiting
// [pkg-02-fetch-wrapper]

import { config } from './config';

export interface FetchOptions extends Omit<RequestInit, 'signal'> {
  timeout?: number;
  retries?: number;
  idempotencyKey?: string;
  skipAuth?: boolean;
  signal?: AbortSignal;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export interface ApiResult<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    requestId?: string;
    statusCode?: number;
  };
  meta?: {
    requestId: string;
    rateLimitInfo?: RateLimitInfo;
    totalCount?: number;
    retryCount?: number;
  };
}

export class RateLimitError extends Error {
  constructor(public rateLimitInfo: RateLimitInfo, public requestId: string) {
    super(`Rate limit exceeded. Remaining: ${rateLimitInfo.remaining}, Reset: ${new Date(rateLimitInfo.reset * 1000).toISOString()}`);
    this.name = 'RateLimitError';
  }
}

export class TimeoutError extends Error {
  constructor(public timeout: number, public requestId: string) {
    super(`Request timed out after ${timeout}ms`);
    this.name = 'TimeoutError';
  }
}

// Generate a unique request ID
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Parse rate limit headers
const parseRateLimitHeaders = (headers: Headers): RateLimitInfo | null => {
  const limit = headers.get('x-ratelimit-limit');
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = headers.get('x-ratelimit-reset');
  const retryAfter = headers.get('retry-after');
  
  if (limit && remaining && reset) {
    return {
      limit: parseInt(limit, 10),
      remaining: parseInt(remaining, 10),
      reset: parseInt(reset, 10),
      retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined
    };
  }
  
  return null;
};

// Calculate exponential backoff delay
const calculateBackoffDelay = (attempt: number, rateLimitInfo?: RateLimitInfo): number => {
  // Respect Retry-After header if present
  if (rateLimitInfo?.retryAfter) {
    return rateLimitInfo.retryAfter * 1000;
  }
  
  // Exponential backoff: 100ms, 200ms, 400ms
  return Math.min(100 * Math.pow(2, attempt), 1000);
};

// Sleep utility
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced fetch wrapper with retry logic
export const fetchWrapper = async <T = any>(
  url: string | URL, 
  options: FetchOptions = {}
): Promise<ApiResult<T>> => {
  const { 
    timeout = 10000,
    retries = 3,
    idempotencyKey,
    skipAuth = false,
    signal: externalSignal,
    ...fetchOptions 
  } = options;
  
  const requestId = generateRequestId();
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // If external signal is aborted, abort our controller too
    if (externalSignal?.aborted) {
      controller.abort();
    }
    
    // Listen for external abort
    const abortHandler = () => controller.abort();
    externalSignal?.addEventListener('abort', abortHandler);
    
    try {
      // Prepare headers
      const headers = new Headers(fetchOptions.headers);
      headers.set('x-request-id', requestId);
      
      if (!headers.has('content-type') && (fetchOptions.method === 'POST' || fetchOptions.method === 'PATCH')) {
        headers.set('content-type', 'application/json');
      }
      
      if (idempotencyKey) {
        headers.set('x-idempotency-key', idempotencyKey);
      }
      
      // Add test auth header if in test mode
      if (config.testMode && !skipAuth) {
        const testAuthCookie = typeof document !== 'undefined' 
          ? document.cookie.split(';').find(c => c.trim().startsWith('x-test-auth='))?.split('=')[1]
          : null;
        
        if (testAuthCookie) {
          headers.set('x-test-auth', testAuthCookie);
        }
      }
      
      // Make the request
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', abortHandler);
      
      // Parse rate limit info
      const rateLimitInfo = parseRateLimitHeaders(response.headers);
      
      // Handle rate limiting with retry
      if (response.status === 429) {
        if (attempt < retries) {
          const delay = calculateBackoffDelay(attempt, rateLimitInfo);
          if (config.environment === 'development') {
            console.debug(`[${requestId}] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${retries + 1})`);
          }
          await sleep(delay);
          continue;
        } else {
          return {
            error: {
              code: 'RATE_LIMITED',
              message: 'Rate limit exceeded',
              requestId,
              statusCode: 429
            },
            meta: {
              requestId,
              rateLimitInfo,
              retryCount: attempt
            }
          };
        }
      }
      
      // Parse total count from headers
      const totalCount = response.headers.get('x-total-count');
      
      // Handle non-JSON responses
      if (!response.headers.get('content-type')?.includes('application/json')) {
        if (!response.ok) {
          return {
            error: {
              code: 'HTTP_ERROR',
              message: `HTTP ${response.status}: ${response.statusText}`,
              requestId,
              statusCode: response.status
            },
            meta: {
              requestId,
              rateLimitInfo,
              retryCount: attempt,
              totalCount: totalCount ? parseInt(totalCount, 10) : undefined
            }
          };
        }
        
        return {
          data: await response.text() as T,
          meta: {
            requestId,
            rateLimitInfo,
            retryCount: attempt,
            totalCount: totalCount ? parseInt(totalCount, 10) : undefined
          }
        };
      }
      
      // Parse JSON response
      const data = await response.json();
      
      if (!response.ok) {
        return {
          error: {
            code: data.code || 'HTTP_ERROR',
            message: data.message || `HTTP ${response.status}: ${response.statusText}`,
            requestId,
            statusCode: response.status
          },
          meta: {
            requestId,
            rateLimitInfo,
            retryCount: attempt,
            totalCount: totalCount ? parseInt(totalCount, 10) : undefined
          }
        };
      }
      
      // Log successful request in development
      if (config.environment === 'development') {
        console.debug(`[${requestId}] ${fetchOptions.method || 'GET'} ${url} -> ${response.status}`, {
          rateLimitInfo,
          totalCount,
          retryCount: attempt
        });
      }
      
      return {
        data,
        meta: {
          requestId,
          rateLimitInfo,
          retryCount: attempt,
          totalCount: totalCount ? parseInt(totalCount, 10) : undefined
        }
      };
      
    } catch (error) {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', abortHandler);
      lastError = error as Error;
      
      // Handle abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        if (attempt < retries) {
          const delay = calculateBackoffDelay(attempt);
          if (config.environment === 'development') {
            console.debug(`[${requestId}] Request timed out, retrying in ${delay}ms (attempt ${attempt + 1}/${retries + 1})`);
          }
          await sleep(delay);
          continue;
        } else {
          return {
            error: {
              code: 'TIMEOUT',
              message: `Request timed out after ${timeout}ms`,
              requestId
            },
            meta: {
              requestId,
              retryCount: attempt
            }
          };
        }
      }
      
      // Handle network errors with retry
      if (error instanceof Error && (error.message.includes('fetch') || error.name === 'TypeError')) {
        if (attempt < retries) {
          const delay = calculateBackoffDelay(attempt);
          if (config.environment === 'development') {
            console.debug(`[${requestId}] Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${retries + 1})`);
          }
          await sleep(delay);
          continue;
        }
      }
      
      // Don't retry other errors
      break;
    }
  }
  
  // All retries exhausted
  return {
    error: {
      code: 'NETWORK_ERROR',
      message: lastError?.message || 'Network request failed',
      requestId
    },
    meta: {
      requestId,
      retryCount: retries
    }
  };
};

// Convenience methods
export const api = {
  get: <T = any>(url: string | URL, options?: FetchOptions) => 
    fetchWrapper<T>(url, { ...options, method: 'GET' }),
    
  post: <T = any>(url: string | URL, body?: any, options?: FetchOptions) =>
    fetchWrapper<T>(url, { 
      ...options, 
      method: 'POST', 
      body: body ? JSON.stringify(body) : undefined 
    }),
    
  patch: <T = any>(url: string | URL, body?: any, options?: FetchOptions) =>
    fetchWrapper<T>(url, { 
      ...options, 
      method: 'PATCH', 
      body: body ? JSON.stringify(body) : undefined 
    }),
    
  delete: <T = any>(url: string | URL, options?: FetchOptions) =>
    fetchWrapper<T>(url, { ...options, method: 'DELETE' }),
};

export { config } from './config';