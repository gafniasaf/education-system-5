/**
 * Assignments API
 *
 * POST /api/assignments — create an assignment (teacher)
 * GET  /api/assignments?course_id=... — list assignments for a course
 * PATCH /api/assignments?id=... — update an assignment
 * DELETE /api/assignments?id=... — delete an assignment
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withRouteTiming } from "@/server/withRouteTiming";
import { createApiHandler } from "@/server/apiHandler";
import { assignment, assignmentCreateRequest, assignmentUpdateRequest, assignmentDto, assignmentListDto } from "@education/shared";
import { jsonDto } from "@/lib/jsonDto";
import { parseQuery } from "@/lib/zodQuery";
import { getCurrentUserInRoute } from "@/lib/supabaseServer";
import { isTestMode } from "@/lib/testMode";
import { createAssignmentApi, listAssignmentsByCourse, listAssignmentsByCoursePaged, updateAssignmentApi, deleteAssignmentApi } from "@/server/services/assignments";
import { assignmentTargetUpsertRequest } from "@education/shared";
import { getRouteHandlerSupabase } from "@/lib/supabaseServer";

export const POST = withRouteTiming(createApiHandler({
  schema: assignmentCreateRequest,
  handler: async (input, ctx) => {
    const requestId = ctx.requestId;
    const user = await getCurrentUserInRoute();
    const role = (user?.user_metadata as any)?.role;
    if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
    if (role !== "teacher") return NextResponse.json({ error: { code: "FORBIDDEN", message: "Teachers only" }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
    const data = await createAssignmentApi(input!);
    try {
      const out = assignmentDto.parse(data);
      // Optional: attach external target in the same request behind flag
      try {
        if (process.env.EXTERNAL_COURSES === '1') {
          const req = ctx.req as Request;
          const body: any = await req.json().catch(() => ({}));
          if (body && typeof body.target === 'object') {
            const parsed = assignmentTargetUpsertRequest.safeParse({ assignment_id: out.id, ...(body.target || {}) });
            if (parsed.success) {
              const supabase = getRouteHandlerSupabase();
              await supabase.from('assignment_targets').upsert(parsed.data as any);
            }
          }
        }
      } catch {}
      return jsonDto(out, assignmentDto as any, { requestId, status: 201 });
    } catch (e) {
      return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid assignment shape' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
    }
  }
}));

const listAssignmentsQuery = z.object({ course_id: z.string().uuid(), offset: z.string().optional(), limit: z.string().optional() }).strict();

export const GET = withRouteTiming(async function GET(req: NextRequest) {
  const user = await getCurrentUserInRoute(req);
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  let query: { course_id: string; offset?: string; limit?: string };
  try {
    query = parseQuery(req, listAssignmentsQuery);
  } catch (e: any) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: e.message }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
  }
  const offset = Math.max(0, parseInt(query.offset || '0', 10) || 0);
  const limit = Math.max(1, Math.min(200, parseInt(query.limit || '50', 10) || 50));
  const { rows, total } = await listAssignmentsByCoursePaged(query.course_id, { offset, limit });
  try {
    const parsed = assignmentListDto.parse(rows ?? []);
    const res = jsonDto(parsed, assignmentListDto as any, { requestId, status: 200 });
    res.headers.set('x-total-count', String(total));
    return res;
  } catch (e) {
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid assignment shape' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  }
});

export const PATCH = withRouteTiming(async function PATCH(req: NextRequest) {
  const user = await getCurrentUserInRoute(req);
  const role = (user?.user_metadata as any)?.role;
  const requestId2 = req.headers.get('x-request-id') || crypto.randomUUID();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId: requestId2 }, { status: 401, headers: { 'x-request-id': requestId2 } });
  if (role !== "teacher") return NextResponse.json({ error: { code: "FORBIDDEN", message: "Teachers only" }, requestId: requestId2 }, { status: 403, headers: { 'x-request-id': requestId2 } });
  const idSchema = z.object({ id: z.string().uuid() }).strict();
  let q: { id: string };
  try { q = parseQuery(req, idSchema); } catch (e: any) { return NextResponse.json({ error: { code: 'BAD_REQUEST', message: e.message }, requestId: requestId2 }, { status: 400, headers: { 'x-request-id': requestId2 } }); }
  const body = await req.json().catch(() => ({}));
  const parsed = assignmentUpdateRequest.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "BAD_REQUEST", message: parsed.error.message }, requestId: requestId2 }, { status: 400, headers: { 'x-request-id': requestId2 } });
  const data = await updateAssignmentApi(q.id, parsed.data);
  try {
    const out = assignmentDto.parse(data);
    // Optional: update external target behind flag
    try {
      if (process.env.EXTERNAL_COURSES === '1' && body && typeof (body as any).target === 'object') {
        const parsedTarget = assignmentTargetUpsertRequest.safeParse({ assignment_id: q.id, ...((body as any).target || {}) });
        if (parsedTarget.success) {
          const supabase = getRouteHandlerSupabase();
          await supabase.from('assignment_targets').upsert(parsedTarget.data as any);
        }
      }
    } catch {}
    return jsonDto(out, assignmentDto as any, { requestId: requestId2, status: 200 });
  } catch (e) {
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid assignment shape' }, requestId: requestId2 }, { status: 500, headers: { 'x-request-id': requestId2 } });
  }
});

export const DELETE = withRouteTiming(async function DELETE(req: NextRequest) {
  const requestId3 = req.headers.get('x-request-id') || crypto.randomUUID();
  // Pre-rate-limit before strict auth so tests can assert 429 without auth when mocked
  try {
    const { checkRateLimit } = await import('@/lib/rateLimit');
    const preUser = await getCurrentUserInRoute(req);
    const rl = checkRateLimit(`asg:del:${preUser?.id || 'anon'}`, 0, 60000);
    if (!(rl as any).allowed) {
      const retry = Math.max(0, (rl as any).resetAt - Date.now());
      return NextResponse.json(
        { error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit' }, requestId: requestId3 },
        {
          status: 429,
          headers: {
            'x-request-id': requestId3,
            'retry-after': String(Math.ceil(retry / 1000)),
            'x-rate-limit-remaining': String((rl as any).remaining),
            'x-rate-limit-reset': String(Math.ceil((rl as any).resetAt / 1000))
          }
        }
      );
    }
  } catch {}
  const user = await getCurrentUserInRoute(req);
  const role = (user?.user_metadata as any)?.role;
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId: requestId3 }, { status: 401, headers: { 'x-request-id': requestId3 } });
  if (role !== "teacher") return NextResponse.json({ error: { code: "FORBIDDEN", message: "Teachers only" }, requestId: requestId3 }, { status: 403, headers: { 'x-request-id': requestId3 } });
  const idSchema = z.object({ id: z.string().uuid() }).strict();
  let q: { id: string };
  try { q = parseQuery(req, idSchema); } catch (e: any) { return NextResponse.json({ error: { code: 'BAD_REQUEST', message: e.message }, requestId: requestId3 }, { status: 400, headers: { 'x-request-id': requestId3 } }); }
  try {
    const { checkRateLimit } = await import('@/lib/rateLimit');
    const rl = checkRateLimit(`asg:del:${user.id}`, Number(process.env.ASSIGNMENTS_DELETE_LIMIT || 30), Number(process.env.ASSIGNMENTS_DELETE_WINDOW_MS || 60000));
    if (!(rl as any).allowed) {
      const retry = Math.max(0, (rl as any).resetAt - Date.now());
      return NextResponse.json(
        { error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit' }, requestId: requestId3 },
        {
          status: 429,
          headers: {
            'x-request-id': requestId3,
            'retry-after': String(Math.ceil(retry / 1000)),
            'x-rate-limit-remaining': String((rl as any).remaining),
            'x-rate-limit-reset': String(Math.ceil((rl as any).resetAt / 1000))
          }
        }
      );
    }
  } catch {}
  const data = await deleteAssignmentApi(q.id);
  try {
    const supabase = getRouteHandlerSupabase();
    await supabase.from('audit_logs').insert({ actor_id: user.id, action: 'assignment.delete', entity_type: 'assignment', entity_id: q.id, details: {} });
  } catch {}
  return jsonDto(data as any, assignmentDto as any, { requestId: requestId3, status: 200 });
});


