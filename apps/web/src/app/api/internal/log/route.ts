import { NextRequest, NextResponse } from 'next/server';
import { withRouteTiming } from '@/server/withRouteTiming';
import { getRequestLogger } from '@/lib/logger';

export const POST = withRouteTiming(async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  try {
    const body = await req.json().catch(() => ({}));
    const msg = String(body?.message || 'client_log');
    const level = String(body?.level || 'info');
    const log = getRequestLogger(requestId);
    if (level === 'error') log.error({ msg }, 'client_error');
    else if (level === 'warn') log.warn({ msg }, 'client_warn');
    else log.info({ msg }, 'client_info');
  } catch {}
  return NextResponse.json({ ok: true, ts: Date.now() }, { status: 200, headers: { 'x-request-id': requestId } });
});


