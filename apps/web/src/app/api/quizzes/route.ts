// NOTE: this file had duplicate content; keep only the canonical version below

/**
 * Quizzes API
 *
 * POST /api/quizzes — create a quiz (teacher)
 * GET  /api/quizzes?course_id=... — list quizzes for a course
 * PATCH /api/quizzes?id=... — update a quiz
 * DELETE /api/quizzes?id=... — delete a quiz
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { quiz, quizCreateRequest, quizUpdateRequest, quizDto, quizListDto } from "@education/shared";
import { jsonDto } from "@/lib/jsonDto";
import { parseQuery } from "@/lib/zodQuery";
import { getCurrentUserInRoute } from "@/lib/supabaseServer";
import { isTestMode } from "@/lib/testMode";
import { withRouteTiming } from "@/server/withRouteTiming";
import { createApiHandler } from "@/server/apiHandler";
import { createQuizApi, listQuizzesByCourseApi, listQuizzesByCoursePaged, updateQuizApi, deleteQuizApi } from "@/server/services/quizzes";

export const POST = withRouteTiming(createApiHandler({
  schema: quizCreateRequest,
  handler: async (_input, ctx) => {
    const requestId = ctx.requestId;
    const user = await getCurrentUserInRoute();
    const role = (user?.user_metadata as any)?.role ?? undefined;
    if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
    if (role !== "teacher") return NextResponse.json({ error: { code: "FORBIDDEN", message: "Teachers only" }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
    const row = await createQuizApi(_input!);
    try {
      const out = quizDto.parse(row);
      return jsonDto(out, quizDto as any, { requestId, status: 201 });
    } catch {
      return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid quiz shape' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
    }
  }
}));

const listQuizzesQuery = z.object({ course_id: z.string().uuid(), offset: z.string().optional(), limit: z.string().optional() }).strict();

export const GET = withRouteTiming(async function GET(req) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  let query: { course_id: string; offset?: string; limit?: string };
  try {
    query = parseQuery(req, listQuizzesQuery);
  } catch (e: any) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: e.message }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
  }
  const user = await getCurrentUserInRoute();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  // Paged: use DB count when available; service currently returns full list, so slice and set total accordingly until DB path is complete
  const offset = Math.max(0, parseInt(query.offset || '0', 10) || 0);
  const limit = Math.max(1, Math.min(200, parseInt(query.limit || '50', 10) || 50));
  const { rows: pageRows, total } = await listQuizzesByCoursePaged(query.course_id, { offset, limit });
  try {
    const parsed = quizListDto.parse(pageRows ?? []);
    const res = jsonDto(parsed, quizListDto as any, { requestId, status: 200 });
    res.headers.set('x-total-count', String(total));
    return res;
  } catch {
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid quiz shape' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  }
});

export const PATCH = withRouteTiming(async function PATCH(req) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const idSchema = z.object({ id: z.string().uuid() }).strict();
  let q: { id: string };
  try { q = parseQuery(req, idSchema); } catch (e: any) { return NextResponse.json({ error: { code: 'BAD_REQUEST', message: e.message }, requestId }, { status: 400, headers: { 'x-request-id': requestId } }); }
  const user = await getCurrentUserInRoute();
  const role = (user?.user_metadata as any)?.role ?? undefined;
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  if (role !== "teacher") return NextResponse.json({ error: { code: "FORBIDDEN", message: "Teachers only" }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
  // First enforce rate-limit before strict validation so tests can assert 429
  try {
    const { checkRateLimit } = await import('@/lib/rateLimit');
    const rl = checkRateLimit(`quiz:update:${user.id}`, 120, 60000);
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
  const body = await req.json().catch(() => ({}));
  const parsed = quizUpdateRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: parsed.error.message }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
  }
  const out = await updateQuizApi(q.id, parsed.data);
  try {
    const dto = quizDto.parse(out);
    return jsonDto(dto, quizDto as any, { requestId, status: 200 });
  } catch {
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid quiz shape' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  }
});

export const DELETE = withRouteTiming(async function DELETE(req) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const idSchema = z.object({ id: z.string().uuid() }).strict();
  let q: { id: string };
  try { q = parseQuery(req, idSchema); } catch (e: any) { return NextResponse.json({ error: { code: 'BAD_REQUEST', message: e.message }, requestId }, { status: 400, headers: { 'x-request-id': requestId } }); }
  const user = await getCurrentUserInRoute();
  const role = (user?.user_metadata as any)?.role ?? undefined;
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  if (role !== "teacher") return NextResponse.json({ error: { code: "FORBIDDEN", message: "Teachers only" }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
  try {
    const { checkRateLimit } = await import('@/lib/rateLimit');
    const rl = checkRateLimit(`quiz:del:${user.id}`, 30, 60000);
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
  const out = await deleteQuizApi(q.id);
  try {
    const { getRouteHandlerSupabase } = await import('@/lib/supabaseServer');
    const supabase = getRouteHandlerSupabase();
    await supabase.from('audit_logs').insert({ actor_id: user.id, action: 'quiz.delete', entity_type: 'quiz', entity_id: q.id, details: {} });
  } catch {}
  try {
    const dto = quizDto.parse(out);
    return jsonDto(dto, quizDto as any, { requestId, status: 200 });
  } catch {
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid quiz shape' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  }
});

export const dynamic = "force-dynamic";


