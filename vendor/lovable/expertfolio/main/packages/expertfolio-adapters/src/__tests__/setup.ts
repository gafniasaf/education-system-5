// Jest setup for MSW
// [pkg-tests-setup]

import { setupServer } from 'msw/node';
import { handlers } from '../msw/handlers';

// Setup MSW server for tests
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