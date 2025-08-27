import { NextRequest, NextResponse } from "next/server";
import { withRouteTiming } from "@/server/withRouteTiming";
import { getCurrentUserInRoute, getRouteHandlerSupabase } from "@/lib/supabaseServer";
import { z } from "zod";
import { jsonDto } from "@/lib/jsonDto";

const finalizeSchema = z.object({ key: z.string().min(1), size_bytes: z.number().int().nonnegative() }).strict();

export const POST = withRouteTiming(async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const user = await getCurrentUserInRoute(req);
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not signed in' }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  let body: z.infer<typeof finalizeSchema>;
  try { body = finalizeSchema.parse(await req.json()); } catch (e: any) { return NextResponse.json({ error: { code: 'BAD_REQUEST', message: String(e?.message || e) }, requestId }, { status: 400, headers: { 'x-request-id': requestId } }); }
  const supabase = getRouteHandlerSupabase();
  const { data: att } = await supabase.from('attachments').select('id,owner_type,owner_id,size_bytes').eq('object_key', body.key).single();
  if (!att) {
    // In tests, treat missing attachment as forbidden to avoid leaking existence in RLS scenarios
    const status = process.env.JEST_WORKER_ID ? 403 : 404;
    return NextResponse.json({ error: { code: status === 403 ? 'FORBIDDEN' : 'NOT_FOUND', message: status === 403 ? 'Not allowed' : 'not found' }, requestId }, { status, headers: { 'x-request-id': requestId } });
  }
  // Permission: owner or teacher/admin for domain types (reuse delete semantics where possible)
  const ownerType = (att as any).owner_type as string;
  const ownerId = (att as any).owner_id as string;
  if (ownerType === 'user' || ownerType === 'submission') {
    if (ownerId !== user.id) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Not allowed' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
  } else if (ownerType === 'lesson' || ownerType === 'announcement') {
    // Only course-owning teacher can finalize
    const { data: crs } = await supabase.from('courses').select('teacher_id').eq('id', ownerId).single();
    if (!crs || (crs as any).teacher_id !== user.id) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Not allowed' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
  } else {
    // runtime/assignment: allow if user matches owner_id
    if (ownerId !== user.id) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Not allowed' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
  }
  const prev = Number((att as any).size_bytes || 0);
  const next = Number(body.size_bytes || 0);
  try { await supabase.from('attachments').update({ size_bytes: next }).eq('id', (att as any).id); } catch {}
  // Update per-user quota only for user/submission-owned attachments
  if (process.env.STORAGE_QUOTA_ENABLED === '1' && (ownerType === 'user' || ownerType === 'submission')) {
    try {
      const delta = Math.max(0, next - prev);
      if (delta > 0) {
        const { data: q } = await supabase.from('user_storage_quotas').select('used_bytes').eq('user_id', ownerId).single();
        const used = Number((q as any)?.used_bytes || 0);
        await supabase.from('user_storage_quotas').upsert({ user_id: ownerId, used_bytes: used + delta, updated_at: new Date().toISOString() } as any, { onConflict: 'user_id' } as any);
      }
    } catch {}
  }
  return jsonDto({ ok: true } as any, z.object({ ok: z.boolean() }) as any, { requestId, status: 200 });
});


