/**
 * Messages API (test-mode first)
 *
 * GET  /api/messages?thread_id=... — list messages in thread
 * POST /api/messages — send message { thread_id, body }
 * PATCH /api/messages?id=... — mark message read
 */
// @ts-nocheck

import { NextRequest, NextResponse } from "next/server";
import { withRouteTiming } from "@/server/withRouteTiming";
import { createApiHandler } from "@/server/apiHandler";
import { z } from "zod";
import { message, messageCreateRequest, messageListDto, messageDto } from "@education/shared";
import { parseQuery } from "@/lib/zodQuery";
import { getCurrentUserInRoute, getRouteHandlerSupabase } from "@/lib/supabaseServer";
import { isTestMode, isMvpProdGuardEnabled } from "@/lib/testMode";
import { checkRateLimit } from "@/lib/rateLimit";
import { addTestMessage, listTestMessagesByThread, markTestMessageReadForUser, addTestNotification, listTestParticipantsByThread } from "@/lib/testStore";

const listMessagesQuery = z.object({ thread_id: z.string().uuid(), offset: z.string().optional(), limit: z.string().optional() }).strict();

export const GET = withRouteTiming(async function GET(req: NextRequest) {
  const user = await getCurrentUserInRoute(req);
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  let q: { thread_id: string; offset?: string; limit?: string };
  try {
    q = parseQuery(req, listMessagesQuery);
  } catch (e: any) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: e.message }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
  }
  const offset = Math.max(0, parseInt(q.offset || '0', 10) || 0);
  const limit = Math.max(1, Math.min(200, parseInt(q.limit || '100', 10) || 100));
  // Add read limit to prevent scraping
  try {
    const { checkRateLimit } = await import('@/lib/rateLimit');
    const rl = checkRateLimit(`messages:list:${user.id}`, Number(process.env.MESSAGES_LIST_LIMIT || 240), Number(process.env.MESSAGES_LIST_WINDOW_MS || 60000));
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
    const all = listTestMessagesByThread(q.thread_id) as any[];
    const rows = all.slice(offset, offset + limit);
    try {
      const parsed = messageListDto.parse(rows ?? []);
      return NextResponse.json(parsed, { status: 200, headers: { 'x-request-id': requestId, 'x-total-count': String((all ?? []).length) } });
    } catch {
      return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid message shape' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
    }
  }
  const supabase = getRouteHandlerSupabase();
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true } as any)
    .eq('thread_id', q.thread_id);
  const { data, error } = await supabase
    .from('messages')
    .select('id,thread_id,sender_id,body,created_at,read_at')
    .eq('thread_id', q.thread_id)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  try {
    const parsed = messageListDto.parse(data ?? []);
    const headers: Record<string, string> = { 'x-request-id': requestId };
    if (typeof count === 'number') headers['x-total-count'] = String(count);
    return NextResponse.json(parsed, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid message shape' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  }
});

export const POST = withRouteTiming(createApiHandler({
  schema: messageCreateRequest,
  handler: async (input, ctx) => {
    const requestId = ctx.requestId;
    const user = await getCurrentUserInRoute();
    if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
    const rl = checkRateLimit(`msg:${user.id}`, 60, 60000);
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
    if (isTestMode()) {
      const msg = addTestMessage({ thread_id: input!.thread_id, sender_id: user.id, body: input!.body });
      const parts = listTestParticipantsByThread(input!.thread_id);
      for (const p of parts) {
        addTestNotification({ user_id: p.user_id, type: 'message:new', payload: { thread_id: msg.thread_id, message_id: msg.id } });
      }
      try {
        const out = messageDto.parse(msg);
        return NextResponse.json(out, { status: 201 });
      } catch {
        return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid message shape' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
      }
    }
    const supabase = getRouteHandlerSupabase();
    const { data: row, error } = await supabase
      .from('messages')
      .insert({ thread_id: input!.thread_id, sender_id: user.id, body: input!.body })
      .select()
      .single();
    if (error) return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
    try {
      const { data: parts } = await supabase
        .from('message_thread_participants')
        .select('user_id')
        .eq('thread_id', input!.thread_id);
      const notifRows = (parts ?? []).map((p: any) => ({ user_id: p.user_id, type: 'message:new', payload: { thread_id: (row as any).thread_id, message_id: (row as any).id } }));
      if (notifRows.length > 0) await supabase.from('notifications').insert(notifRows);
    } catch {}
    try {
      const out = messageDto.parse(row);
      return NextResponse.json(out, { status: 201, headers: { 'x-request-id': requestId } });
    } catch {
      return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid message shape' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
    }
  }
}));

export const PATCH = withRouteTiming(async function PATCH(req: NextRequest) {
  const user = await getCurrentUserInRoute(req);
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  const rl = checkRateLimit(`msg:${user.id}`, 120, 60000);
  // Rate limit configurable via env
  try {
    const limit = Number(process.env.MESSAGES_LIMIT || 120);
    const windowMs = Number(process.env.MESSAGES_WINDOW_MS || 60000);
    const dynamicRl = checkRateLimit(`msg:${user.id}`, limit, windowMs);
    if (!dynamicRl.allowed) {
      const retry = Math.max(0, dynamicRl.resetAt - Date.now());
      return NextResponse.json(
        { error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit' }, requestId },
        {
          status: 429,
          headers: {
            'x-request-id': requestId,
            'retry-after': String(Math.ceil(retry / 1000)),
            'x-rate-limit-remaining': String(dynamicRl.remaining),
            'x-rate-limit-reset': String(Math.ceil(dynamicRl.resetAt / 1000))
          }
        }
      );
    }
  } catch {}
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
  const idSchema = z.object({ id: z.string().uuid() }).strict();
  let q: { id: string };
  try {
    q = parseQuery(req, idSchema);
  } catch (e: any) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: e.message }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
  }
  if (isTestMode()) {
    const updated = markTestMessageReadForUser(q.id, user.id);
    if (!updated) return NextResponse.json({ error: { code: "NOT_FOUND", message: "message not found" }, requestId }, { status: 404, headers: { 'x-request-id': requestId } });
    return NextResponse.json(updated, { status: 200 });
  }
  const supabase = getRouteHandlerSupabase();
  // Insert per-user read receipt for this message
  const { data, error } = await supabase
    .from('message_read_receipts')
    .upsert({ message_id: q.id, user_id: user.id }, { onConflict: 'message_id,user_id' } as any)
    .select()
    .single();
  if (error) return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  return NextResponse.json(data, { status: 200, headers: { 'x-request-id': requestId } });
});


