/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { ExpertfolioProvider, ConnectedAdminAuditLogsPage, ConnectedFilesPage } from '@lovable/expertfolio-ui';

describe('Expertfolio preview (labs)', () => {
  test('renders Admin Audit Logs with stubbed adapters', async () => {
    const adapters = {
      adminAuditLogs: {
        getLogs: jest.fn().mockResolvedValue({
          logs: [
            { id: '1', actor_id: 'u-1', action: 'test', entity_type: null, entity_id: null, created_at: new Date().toISOString() },
          ],
          total: 1,
        }),
        getLogById: jest.fn(),
      },
      files: {
        finalizeUpload: jest.fn().mockResolvedValue({ ok: true }),
        getDownloadUrl: jest.fn().mockResolvedValue({ url: '/file', filename: 'readme.txt', content_type: 'text/plain' }),
      },
    } as any;

    render(
      <ExpertfolioProvider adapters={adapters}>
        <ConnectedAdminAuditLogsPage />
      </ExpertfolioProvider>
    );

    expect(await screen.findByText(/Audit Logs/i)).toBeInTheDocument();
  });

  test('renders Files page container with stubbed adapters', async () => {
    const adapters = {
      adminAuditLogs: { getLogs: jest.fn().mockResolvedValue({ logs: [], total: 0 }), getLogById: jest.fn() },
      files: {
        finalizeUpload: jest.fn().mockResolvedValue({ ok: true }),
        getDownloadUrl: jest.fn().mockResolvedValue({ url: '/file', filename: 'readme.txt', content_type: 'text/plain' }),
      },
    } as any;

    render(
      <ExpertfolioProvider adapters={adapters}>
        <ConnectedFilesPage />
      </ExpertfolioProvider>
    );

    expect(await screen.findByText(/Files/i)).toBeInTheDocument();
  });
});


