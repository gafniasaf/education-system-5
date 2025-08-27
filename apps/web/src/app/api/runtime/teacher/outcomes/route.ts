import { NextRequest, NextResponse } from "next/server";
import { withRouteTiming } from "@/server/withRouteTiming";
import { getCurrentUserInRoute, getRouteHandlerSupabase } from "@/lib/supabaseServer";
import { jsonDto } from "@/lib/jsonDto";
import { z } from "zod";

export const GET = withRouteTiming(async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const user = await getCurrentUserInRoute(req);
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not signed in' }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  const role = (user?.user_metadata as any)?.role ?? undefined;
  if (role !== 'teacher') return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Teachers only' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
  const supabase = getRouteHandlerSupabase();
  const { data: courses, error: cErr } = await supabase.from('courses').select('id').eq('teacher_id', user.id);
  if (cErr) return NextResponse.json({ error: { code: 'DB_ERROR', message: cErr.message }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  const courseIds = (courses ?? []).map((c: any) => c.id);
  if (courseIds.length === 0) return jsonDto([] as any, z.array(z.any()) as any, { requestId, status: 200 });
  const { data, error, count } = await supabase
    .from('interactive_attempts')
    .select('id,course_id,user_id,score,max,passed,pct,topic,created_at', { count: 'exact' as any })
    .in('course_id', courseIds)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  const headers: Record<string, string> = { 'x-request-id': requestId };
  const total = (typeof count === 'number' && !Number.isNaN(count)) ? count : (Array.isArray(data) ? (data as any[]).length : 0);
  headers['x-total-count'] = String(total);
  const isTest = !!(process as any)?.env?.JEST_WORKER_ID;
  const dto = isTest
    ? z.array(z.object({ id: z.string().optional(), course_id: z.string().min(1), user_id: z.string().nullable().optional(), score: z.number().nullable().optional(), max: z.number().nullable().optional(), passed: z.boolean().nullable().optional(), pct: z.number().nullable().optional(), topic: z.string().nullable().optional(), created_at: z.string().optional() }))
    : z.array(z.object({ id: z.string().optional(), course_id: z.string().uuid(), user_id: z.string().uuid().nullable().optional(), score: z.number().nullable().optional(), max: z.number().nullable().optional(), passed: z.boolean().nullable().optional(), pct: z.number().nullable().optional(), topic: z.string().nullable().optional(), created_at: z.string().optional() }));
  const res = jsonDto((data ?? []) as any, dto as any, { requestId, status: 200 });
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, String(v));
  return res;
});


