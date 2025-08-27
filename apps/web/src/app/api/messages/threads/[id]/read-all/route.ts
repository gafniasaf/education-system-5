import { NextRequest, NextResponse } from "next/server";
import { withRouteTiming } from "@/server/withRouteTiming";
import { getCurrentUserInRoute, getRouteHandlerSupabase } from "@/lib/supabaseServer";
import { jsonDto } from "@/lib/jsonDto";
import { z } from "zod";
import { isTestMode } from "@/lib/testMode";
import { markAllThreadMessagesReadForUser } from "@/lib/testStore";

export const PATCH = withRouteTiming(async function PATCH(req: NextRequest, ctx?: { params?: { id: string } }) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const user = await getCurrentUserInRoute(req);
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not signed in' }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  const threadId = ctx?.params?.id || new URL(req.url).pathname.split('/').slice(-2)[0];
  if (isTestMode()) {
    const out = markAllThreadMessagesReadForUser(threadId, user.id);
    // In test-mode, respond with a minimal ok flag per specs
    return jsonDto({ ok: true } as any, z.object({ ok: z.boolean() }) as any, { requestId, status: 200 });
  }
  const supabase = getRouteHandlerSupabase();
  // Fetch message ids for the thread and insert missing receipts for user
  const { data: msgs, error: mErr } = await supabase.from('messages').select('id').eq('thread_id', threadId);
  if (mErr) return NextResponse.json({ error: { code: 'DB_ERROR', message: mErr.message }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  const ids = (msgs ?? []).map((m: any) => m.id);
  if (ids.length > 0) {
    try {
      const rows = ids.map(id => ({ message_id: id, user_id: user.id }));
      await supabase.from('message_read_receipts').upsert(rows, { onConflict: 'message_id,user_id' } as any);
    } catch (e: any) {
      return NextResponse.json({ error: { code: 'DB_ERROR', message: e?.message || 'receipt upsert failed' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
    }
  }
  return jsonDto({ ok: true } as any, z.object({ ok: z.boolean() }) as any, { requestId, status: 200 });
});


