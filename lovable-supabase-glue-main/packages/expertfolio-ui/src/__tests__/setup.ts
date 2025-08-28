// Test setup with MSW and React Testing Library
// [pkg-10-test-setup]

import '@testing-library/jest-dom';
import { setupServer } from 'msw/node';
import { handlers } from '@lovable/expertfolio-adapters/msw';

// Setup MSW server for UI tests
const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};