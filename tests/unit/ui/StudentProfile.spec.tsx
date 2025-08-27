/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { server } from './mswServer';
import { http, HttpResponse } from '../../shims/msw';
import StudentProfilePage from '@/app/labs/student/profile/page';

describe('Student Profile (labs)', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('renders email and role when authenticated', async () => {
    server.use(http.get('/api/user/profile', () => HttpResponse.json({ id: 'u1', email: 's@example.com', role: 'student' })));
    const ui = await StudentProfilePage();
    render(ui);
    expect(await screen.findByTestId('profile-email')).toHaveTextContent(/@example\.com$/);
    expect(await screen.findByTestId('profile-role')).toHaveTextContent(/(student|teacher)/);
  });
});


