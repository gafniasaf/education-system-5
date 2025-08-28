import { NextResponse } from '../../tests/shims/next-server';

describe('jsonDto helper', () => {
  test('returns 500 when schema validation fails', async () => {
    const { jsonDto } = await import('../../apps/web/src/lib/jsonDto');
    const schema = (await import('zod')).z.object({ ok: (await import('zod')).z.literal(true) });
    const res = jsonDto({ ok: false } as any, schema as any, { requestId: 'rid-dto' });
    expect(res.status).toBe(500);
    expect(res.headers.get('x-request-id')).toBe('rid-dto');
    const body = await res.json();
    expect(body?.error?.code).toBe('INTERNAL');
  });

  test('passes through valid payload with x-request-id', async () => {
    const { jsonDto } = await import('../../apps/web/src/lib/jsonDto');
    const z = (await import('zod')).z;
    const schema = z.object({ ok: z.boolean() });
    const res = jsonDto({ ok: true } as any, schema as any, { requestId: 'rid-ok', status: 201 });
    expect(res.status).toBe(201);
    expect(res.headers.get('x-request-id')).toBe('rid-ok');
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});


