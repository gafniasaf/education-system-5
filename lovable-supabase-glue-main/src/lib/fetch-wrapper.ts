// Fetch wrapper with x-request-id and rate-limit header handling
// [lov-03-fetch-wrapper-headers]

import { config } from './config';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
  includeTestAuth?: boolean;
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

class RateLimitError extends Error {
  constructor(public rateLimitInfo: RateLimitInfo) {
    super(`Rate limit exceeded. Remaining: ${rateLimitInfo.remaining}, Reset: ${new Date(rateLimitInfo.reset * 1000).toISOString()}`);
    this.name = 'RateLimitError';
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
  
  if (limit && remaining && reset) {
    return {
      limit: parseInt(limit, 10),
      remaining: parseInt(remaining, 10),
      reset: parseInt(reset, 10)
    };
  }
  
  return null;
};

// Enhanced fetch wrapper
export const fetchWrapper = async (
  url: string | URL, 
  options: FetchOptions = {}
): Promise<Response> => {
  const { skipAuth = false, includeTestAuth = false, ...fetchOptions } = options;
  
  // Generate request ID
  const requestId = generateRequestId();
  
  // Prepare headers
  const headers = new Headers(fetchOptions.headers);
  headers.set('x-request-id', requestId);
  headers.set('content-type', 'application/json');
  
  // Add test auth header if in test mode and not skipped
  if (config.isTestMode && includeTestAuth && config.environment !== 'production') {
    // This would typically come from a test cookie or be set by the test framework
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
  });
  
  // Handle rate limiting
  const rateLimitInfo = parseRateLimitHeaders(response.headers);
  if (response.status === 429 && rateLimitInfo) {
    throw new RateLimitError(rateLimitInfo);
  }
  
  // Log request for debugging (in development)
  if (config.environment === 'development') {
    console.debug(`[${requestId}] ${fetchOptions.method || 'GET'} ${url} -> ${response.status}`, {
      rateLimitInfo,
      headers: Object.fromEntries(response.headers.entries())
    });
  }
  
  return response;
};

// Convenience methods
export const api = {
  get: (url: string | URL, options?: FetchOptions) => 
    fetchWrapper(url, { ...options, method: 'GET' }),
    
  post: (url: string | URL, body?: any, options?: FetchOptions) =>
    fetchWrapper(url, { 
      ...options, 
      method: 'POST', 
      body: body ? JSON.stringify(body) : undefined 
    }),
    
  patch: (url: string | URL, body?: any, options?: FetchOptions) =>
    fetchWrapper(url, { 
      ...options, 
      method: 'PATCH', 
      body: body ? JSON.stringify(body) : undefined 
    }),
    
  delete: (url: string | URL, options?: FetchOptions) =>
    fetchWrapper(url, { ...options, method: 'DELETE' }),
};

export { RateLimitError };
export type { RateLimitInfo, FetchOptions };