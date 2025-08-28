// Main package exports
// [pkg-main-exports]

// Core utilities
export { config, setTestMode } from './config';
export { fetchWrapper, api, RateLimitError, TimeoutError } from './fetch-wrapper';
export type { FetchOptions, RateLimitInfo, ApiResult } from './fetch-wrapper';

// Hooks
export { useCancellableRequest } from './hooks/useCancellableRequest';

// Adapters
export * from './adapters';

// Schemas
export * from './schemas';

// MSW handlers (for testing)
export * from './msw';