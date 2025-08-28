// MSW handlers for all adapters
// [pkg-05-msw-handlers]

import { http, HttpResponse } from 'msw';
import { auditLogFixtures } from './fixtures/audit-logs';
import { fileFixtures } from './fixtures/files';

// Base URL for handlers
const API_BASE = '/api';

export const handlers = [
  // Admin Audit Logs
  http.get(`${API_BASE}/admin/audit-logs`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const actorId = url.searchParams.get('actor_id');
    const action = url.searchParams.get('action');
    
    let logs = [...auditLogFixtures];
    
    // Apply filters
    if (actorId) {
      logs = logs.filter(log => log.actor_id === actorId);
    }
    if (action) {
      logs = logs.filter(log => log.action === action);
    }
    
    // Apply pagination
    const total = logs.length;
    const paginatedLogs = logs.slice(offset, offset + limit);
    
    return HttpResponse.json({
      logs: paginatedLogs,
      total,
      limit,
      offset
    }, {
      headers: {
        'x-total-count': total.toString(),
        'x-request-id': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    });
  }),

  http.get(`${API_BASE}/admin/audit-logs/:id`, ({ params }) => {
    const { id } = params;
    const log = auditLogFixtures.find(log => log.id === id);
    
    if (!log) {
      return new HttpResponse(null, {
        status: 404,
        statusText: 'Audit log not found'
      });
    }
    
    return HttpResponse.json(log, {
      headers: {
        'x-request-id': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    });
  }),

  // Files
  http.post(`${API_BASE}/files/finalize`, async ({ request }) => {
    const body = await request.json() as any;
    
    if (!body.key || typeof body.size_bytes !== 'number') {
      return new HttpResponse(
        JSON.stringify({
          code: 'VALIDATION_ERROR',
          message: 'Invalid finalize request'
        }), 
        { 
          status: 400,
          headers: { 'content-type': 'application/json' }
        }
      );
    }
    
    return HttpResponse.json({ ok: true }, {
      headers: {
        'x-request-id': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    });
  }),

  http.get(`${API_BASE}/files/download-url`, ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return new HttpResponse(
        JSON.stringify({
          code: 'VALIDATION_ERROR',
          message: 'File ID is required'
        }), 
        { 
          status: 400,
          headers: { 'content-type': 'application/json' }
        }
      );
    }
    
    const fileInfo = fileFixtures[id];
    if (!fileInfo) {
      return new HttpResponse(null, {
        status: 404,
        statusText: 'File not found'
      });
    }
    
    return HttpResponse.json(fileInfo, {
      headers: {
        'x-request-id': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    });
  }),

  // Rate limiting test handler
  http.get(`${API_BASE}/test/rate-limit`, () => {
    return new HttpResponse(null, {
      status: 429,
      headers: {
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': Math.floor(Date.now() / 1000 + 60).toString(),
        'retry-after': '60'
      }
    });
  }),

  // Timeout test handler
  http.get(`${API_BASE}/test/timeout`, () => {
    return new Promise(() => {
      // Never resolve to simulate timeout
    });
  }),

  // Error test handler
  http.get(`${API_BASE}/test/error`, () => {
    return new HttpResponse(
      JSON.stringify({
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong'
      }), 
      { 
        status: 500,
        headers: { 'content-type': 'application/json' }
      }
    );
  })
];

export default handlers;