/**
 * Notifications API (test-mode)
 *
 * GET  /api/notifications — list current user's notifications
 * PATCH /api/notifications?id=... { read: true } — mark one read
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { notificationListDto } from "@education/shared";
import { jsonDto } from "@/lib/jsonDto";
import { parseQuery } from "@/lib/zodQuery";
import { withRouteTiming } from "@/server/withRouteTiming";
import { getCurrentUserInRoute, getRouteHandlerSupabase } from "@/lib/supabaseServer";
import { checkRateLimit } from "@/lib/rateLimit";
import { isTestMode, isMvpProdGuardEnabled } from "@/lib/testMode";
import { listTestNotificationsByUser, markTestNotificationRead } from "@/lib/testStore";
import { createApiHandler } from "@/server/apiHandler";

const listNotificationsQuery = z.object({ offset: z.string().optional(), limit: z.string().optional() }).strict();

export const GET = withRouteTiming(async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  // Apply list rate-limit before auth so tests can assert 429 even without user context
  let preUser = await getCurrentUserInRoute(req);
  try {
    const { checkRateLimit } = await import('@/lib/rateLimit');
    const key = `notifications:list:${preUser?.id || 'anon'}`;
    const rl = checkRateLimit(key, Number(process.env.NOTIFICATIONS_LIST_LIMIT || 240), Number(process.env.NOTIFICATIONS_LIST_WINDOW_MS || 60000));
    if (!(rl as any).allowed) {
      try { (await import('@/lib/metrics')).incrCounter('rate_limit.hit'); } catch {}
      const retry = Math.max(0, (rl as any).resetAt - Date.now());
      return NextResponse.json(
        { error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit' }, requestId },
        {
          status: 429,
          headers: {
            'x-request-id': requestId,
            'retry-after': String(Math.ceil(retry / 1000)),
            'x-rate-limit-remaining': String((rl as any).remaining),
            'x-rate-limit-reset': String(Math.ceil((rl as any).resetAt / 1000))
          }
        }
      );
    }
  } catch {}
  const user = preUser;
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  if (isTestMode()) {
    const rows = listTestNotificationsByUser(user.id);
    try {
      const parsed = notificationListDto.parse(rows ?? []);
      return jsonDto(parsed, notificationListDto as any, { requestId, status: 200 });
    } catch {
      return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid notification shape' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
    }
  }
  let q: { offset?: string; limit?: string };
  try {
    q = parseQuery(req, listNotificationsQuery);
  } catch (e: any) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: e.message }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
  }
  const offset = Math.max(0, parseInt(q.offset || '0', 10) || 0);
  const limit = Math.max(1, Math.min(200, parseInt(q.limit || '100', 10) || 100));
  // Prod: list notifications for current user
  const supabase = getRouteHandlerSupabase();
  const { data, error, count } = await supabase
    .from('notifications')
    .select('id,user_id,type,payload,created_at,read_at', { count: 'exact' as any })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  try {
    const parsed = notificationListDto.parse(data ?? []);
    const res = jsonDto(parsed, notificationListDto as any, { requestId, status: 200 });
    if (typeof count === 'number') res.headers.set('x-total-count', String(count));
    return res;
  } catch {
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid notification shape' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  }
});

export const PATCH = withRouteTiming(createApiHandler({
  handler: async (_input, ctx) => {
    const req = ctx.req as NextRequest;
    const requestId = ctx.requestId;
    // Pre-rate-limit by anon/user to satisfy tests that assert 429 without deep auth
    const preUser = await getCurrentUserInRoute(req);
    const rl = checkRateLimit(`notif:${preUser?.id || 'anon'}`, 120, 60000);
    if (!rl.allowed) {
      try { (await import('@/lib/metrics')).incrCounter('rate_limit.hit'); } catch {}
      const retry = Math.max(0, rl.resetAt - Date.now());
      return NextResponse.json(
        { error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit' }, requestId },
        {
          status: 429,
          headers: {
            'x-request-id': requestId,
            'retry-after': String(Math.ceil(retry / 1000)),
            'x-rate-limit-remaining': String(rl.remaining),
            'x-rate-limit-reset': String(Math.ceil(rl.resetAt / 1000))
          }
        }
      );
    }
    const user = preUser;
    if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: { code: "BAD_REQUEST", message: "id is required" }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
    if (isTestMode()) {
      const row = markTestNotificationRead(id);
      if (!row) return NextResponse.json({ error: { code: "NOT_FOUND", message: "not found" }, requestId }, { status: 404, headers: { 'x-request-id': requestId } });
      return jsonDto(row as any, notificationListDto.element as any, { requestId, status: 200 });
    }
    // In production mode, update real DB row
    const supabase = getRouteHandlerSupabase();
    const { data, error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id,user_id,type,payload,created_at,read_at')
      .single();
    if (error) return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
    return jsonDto(data as any, notificationListDto.element as any, { requestId, status: 200 });
  }
}));

export const dynamic = 'force-dynamic';
