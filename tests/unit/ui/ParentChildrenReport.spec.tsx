/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { server } from './mswServer';
import { http, HttpResponse } from '../../shims/msw';
import ParentChildrenReportPage from '@/app/labs/parent/children-report/page';

describe('Parent Children Report (labs)', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('renders total and items', async () => {
    server.use(http.get('/api/parent-links', () => HttpResponse.json([
      { id: 'pl-1', parent_id: 'p-1', student_id: 's-1', created_at: new Date().toISOString() }
    ])));
    const ui = await ParentChildrenReportPage();
    render(ui);
    expect(await screen.findByTestId('children-total')).toHaveTextContent('1');
  });
});


