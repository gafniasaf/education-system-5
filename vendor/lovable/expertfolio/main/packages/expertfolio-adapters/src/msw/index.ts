// MSW exports
// [pkg-05-msw-index]

export { handlers as mswHandlers, default as defaultHandlers } from './handlers';
export { auditLogFixtures } from './fixtures/audit-logs';
export { fileFixtures } from './fixtures/files';

// Setup utilities
export const setupMSW = () => {
  if (typeof window !== 'undefined') {
    // Browser environment
    import('msw/browser').then(({ setupWorker }) => {
      const worker = setupWorker(...handlers);
      worker.start({
        onUnhandledRequest: 'warn'
      });
    });
  } else {
    // Node environment
    import('msw/node').then(({ setupServer }) => {
      const server = setupServer(...handlers);
      server.listen({
        onUnhandledRequest: 'warn'
      });
    });
  }
};

import { handlers } from './handlers';