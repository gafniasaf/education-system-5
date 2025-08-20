// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { withRouteTiming } from "@/server/withRouteTiming";
import { getCurrentUserInRoute, getRouteHandlerSupabase } from "@/lib/supabaseServer";
import { isTestMode } from "@/lib/testMode";
import { getTestNotificationPreferences, setTestNotificationPreferences } from "@/lib/testStore";
import { z } from "zod";
import { parseQuery } from "@/lib/zodQuery";

export const GET = withRouteTiming(async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const user = await getCurrentUserInRoute(req);
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not signed in' }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  if (isTestMode()) {
    const prefs = getTestNotificationPreferences(user.id);
    return NextResponse.json(prefs, { status: 200, headers: { 'x-request-id': requestId } });
  }
  // Prod: read from DB notification_prefs; return defaults on first access
  const supabase = getRouteHandlerSupabase();
  const { data } = await supabase.from('notification_prefs').select('prefs').eq('user_id', user.id).single();
  const defaults = {
    'assignment:new': true,
    'submission:graded': true,
    'message:new': true,
    'announcement:published': true,
    'quiz:due-soon': true,
    'assignment:due-soon': true
  } as Record<string, boolean>;
  const merged = { ...defaults, ...((data as any)?.prefs || {}) };
  return NextResponse.json(merged, { status: 200, headers: { 'x-request-id': requestId } });
});

export const PATCH = withRouteTiming(async function PATCH(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const user = await getCurrentUserInRoute(req);
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not signed in' }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  const body = await req.json().catch(() => ({}));
  // Basic rate limit on preference writes
  try {
    const { checkRateLimit } = await import('@/lib/rateLimit');
    const rl = checkRateLimit(`notifprefs:${user.id}`, 60, 60000);
    if (!(rl as any).allowed) {
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
  if (isTestMode()) {
    const out = setTestNotificationPreferences(user.id, body || {});
    return NextResponse.json(out, { status: 200, headers: { 'x-request-id': requestId } });
  }
  // Prod: persist prefs
  const supabase = getRouteHandlerSupabase();
  const { error } = await supabase.from('notification_prefs').upsert({ user_id: user.id, prefs: body || {}, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  return NextResponse.json(body || {}, { status: 200, headers: { 'x-request-id': requestId } });
});

export const dynamic = 'force-dynamic';


