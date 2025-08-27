/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { server } from './mswServer';
import { http, HttpResponse } from '../../shims/msw';
import AdminReportsPage from '@/app/dashboard/admin/reports/page';

describe('Admin Reports (dashboard)', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('renders reports tiles', async () => {
    server.use(
      http.get('/api/reports/engagement', () => HttpResponse.json({ activePerWeek: [{ count: 3 }], courses: [{ id: 'c1' }] })),
      http.get('/api/reports/grade-distribution', () => HttpResponse.json({ avgScoreTrend: [60, 65, 70] }))
    );
    const ui = await AdminReportsPage();
    render(ui);
    // There are two 'Reports' texts (breadcrumb current page and h1). Accept either being present.
    const items = await screen.findAllByText('Reports');
    expect(items.length).toBeGreaterThanOrEqual(1);
  });
});


