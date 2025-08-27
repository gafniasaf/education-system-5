/**
 * Message threads API (test-mode)
 *
 * POST /api/messages/threads — create thread with participants
 * GET  /api/messages/threads — list threads for current user
 */
import { NextRequest, NextResponse } from "next/server";
import { withRouteTiming } from "@/server/withRouteTiming";
import { createApiHandler } from "@/server/apiHandler";
import { messageThread, messageThreadCreateRequest } from "@education/shared";
import { getCurrentUserInRoute, getRouteHandlerSupabase } from "@/lib/supabaseServer";
import { isTestMode, isMvpProdGuardEnabled } from "@/lib/testMode";
import { checkRateLimit } from "@/lib/rateLimit";
import { createTestThread, listTestThreadsByUser, countUnreadForThread } from "@/lib/testStore";
import { z } from "zod";
import { parseQuery } from "@/lib/zodQuery";
import { jsonDto } from "@/lib/jsonDto";

export const POST = withRouteTiming(createApiHandler({
  schema: messageThreadCreateRequest,
  handler: async (input, ctx) => {
    const requestId = ctx.requestId;
    const user = await getCurrentUserInRoute();
    if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
    const rl = checkRateLimit(`threads:${user.id}`, 30, 60000);
    if (!rl.allowed) {
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
    const participants = Array.from(new Set([user.id, ...input!.participant_ids]));
    if (isTestMode()) {
      const thread = createTestThread(participants);
      try {
        const out = messageThread.parse(thread);
        return jsonDto(out, messageThread as any, { requestId, status: 201 });
      } catch {
        return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid thread shape' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
      }
    }
    const supabase = getRouteHandlerSupabase();
    const { data: threadRow, error: tErr } = await supabase.from('message_threads').insert({}).select().single();
    if (tErr) return NextResponse.json({ error: { code: 'DB_ERROR', message: tErr.message }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
    const partRows = participants.map(uid => ({ thread_id: (threadRow as any).id, user_id: uid, role: uid === user.id ? ((user.user_metadata as any)?.role ?? 'teacher') : 'student' }));
    await supabase.from('message_thread_participants').insert(partRows);
    return jsonDto(threadRow as any, messageThread as any, { requestId, status: 201 });
  }
}));

export const GET = withRouteTiming(async function GET(req: NextRequest) {
  const user = await getCurrentUserInRoute(req);
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  const qSchema = z.object({ offset: z.string().optional(), limit: z.string().optional() }).strict();
  let q: { offset?: string; limit?: string };
  try { q = parseQuery(req, qSchema); } catch (e: any) { return NextResponse.json({ error: { code: 'BAD_REQUEST', message: e.message }, requestId }, { status: 400, headers: { 'x-request-id': requestId } }); }
  const offset = Math.max(0, parseInt(q.offset || '0', 10) || 0);
  const limit = Math.max(1, Math.min(200, parseInt(q.limit || '100', 10) || 100));
  // Add read limit to prevent scraping
  try {
    const { checkRateLimit } = await import('@/lib/rateLimit');
    const rl = checkRateLimit(`threads:list:${user.id}`, Number(process.env.MESSAGES_LIST_LIMIT || 120), Number(process.env.MESSAGES_LIST_WINDOW_MS || 60000));
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
  if (isTestMode()) {
    const all = listTestThreadsByUser(user.id);
    const slice = all.slice(offset, offset + limit);
    const withUnread = slice.map(r => ({ id: r.id, created_at: r.created_at, unread: countUnreadForThread(r.id, user.id) }));
    try {
      const threadWithUnread = messageThread.extend({ unread: (z as any).number() });
      const schema = z.array(threadWithUnread as any);
      const res = jsonDto(withUnread as any, schema as any, { requestId, status: 200 });
      res.headers.set('x-total-count', String((all ?? []).length));
      return res;
    } catch {
      return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid thread shape' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
    }
  }
  const supabase = getRouteHandlerSupabase();
  const { data: threads, error, count } = await supabase
    .from('message_threads')
    .select('id,created_at', { count: 'exact' as any })
    .in('id', (
      (await supabase.from('message_thread_participants').select('thread_id').eq('user_id', user.id)).data || []
    ).map((r: any) => r.thread_id))
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  // Compute unread per thread via per-user receipts
  const results = [] as any[];
  for (const t of threads ?? []) {
    const { data: msgIds } = await supabase
      .from('messages')
      .select('id')
      .eq('thread_id', (t as any).id);
    const ids = (msgIds ?? []).map((m: any) => m.id);
    let unread = 0;
    if (ids.length > 0) {
      const { data: readRows } = await supabase
        .from('message_read_receipts')
        .select('message_id')
        .eq('user_id', user.id)
        .in('message_id', ids);
      const readSet = new Set((readRows ?? []).map((r: any) => r.message_id));
      unread = ids.reduce((acc, id) => acc + (readSet.has(id) ? 0 : 1), 0);
    }
    results.push({ ...t, unread });
  }
  try {
    const parsed = (results ?? []).map(r => ({ ...messageThread.parse(r), unread: (r as any).unread as number }));
    const res = jsonDto(parsed, (messageThread as any).array(), { requestId, status: 200 });
    if (typeof count === 'number') res.headers.set('x-total-count', String(count));
    return res;
  } catch {
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid thread shape' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  }
});


