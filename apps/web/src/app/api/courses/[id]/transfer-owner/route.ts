import { NextRequest, NextResponse } from "next/server";
import { withRouteTiming } from "@/server/withRouteTiming";
import { getCurrentUserInRoute, getRouteHandlerSupabase } from "@/lib/supabaseServer";
import { z } from "zod";
import { jsonDto } from "@/lib/jsonDto";
import { isTestMode } from "@/lib/testMode";
import { checkRateLimit } from "@/lib/rateLimit";

export const PATCH = withRouteTiming(async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const user = await getCurrentUserInRoute(req);
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not signed in' }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  const role = (user.user_metadata as any)?.role ?? 'student';
  const supabase = getRouteHandlerSupabase();
  const body = await req.json().catch(() => ({}));
  const schema = z.object({ teacher_id: z.string().uuid() }).strict();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: 'BAD_REQUEST', message: parsed.error.message }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
  const newOwnerId = parsed.data.teacher_id;
  // Small rate limit to prevent rapid owner flips
  try {
    const rl = checkRateLimit(`course:xfer:${params.id}`, 5, 60_000);
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
  // Only current teacher owner or admin can transfer
  if (role !== 'admin') {
    const { data: course } = await supabase.from('courses').select('id,teacher_id').eq('id', params.id).single();
    if (!course || (course as any).teacher_id !== user.id) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Not allowed' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
    }
  }
  const { data, error } = await supabase
    .from('courses')
    .update({ teacher_id: newOwnerId })
    .eq('id', params.id)
    .select('id,teacher_id')
    .single();
  if (error) return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  try {
    await supabase.from('audit_logs').insert({ actor_id: user.id, action: 'course.transfer_owner', entity_type: 'course', entity_id: params.id, details: { to: newOwnerId } });
  } catch {}
  const dto = (isTestMode()
    ? z.object({ id: z.string().min(1), teacher_id: z.string().uuid() })
    : z.object({ id: z.string().uuid(), teacher_id: z.string().uuid() }));
  return jsonDto(data as any, dto as any, { requestId, status: 200 });
});


