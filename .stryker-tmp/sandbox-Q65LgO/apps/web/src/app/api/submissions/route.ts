/**
 * Submissions API
 *
 * POST /api/submissions — create a submission (student)
 * GET  /api/submissions?assignment_id=... — list submissions for an assignment
 * PATCH /api/submissions?id=... — grade a submission (teacher)
 */
// @ts-nocheck

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withRouteTiming } from "@/server/withRouteTiming";
import { createApiHandler } from "@/server/apiHandler";
import { submission, submissionCreateRequest, submissionGradeRequest, submissionDto, submissionListDto } from "@education/shared";
import { getCurrentUserInRoute } from "@/lib/supabaseServer";
import { createSubmissionApi, listSubmissionsByAssignment, listSubmissionsByAssignmentPaged, gradeSubmissionApi } from "@/server/services/submissions";
import { parseQuery } from "@/lib/zodQuery";

export const POST = withRouteTiming(createApiHandler({
  schema: submissionCreateRequest,
  handler: async (input, ctx) => {
    const requestId = ctx.requestId;
    const user = await getCurrentUserInRoute();
    const role = (user?.user_metadata as any)?.role;
    if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
    if (role !== "student") return NextResponse.json({ error: { code: "FORBIDDEN", message: "Students only" }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
    try {
      const { checkRateLimit } = await import('@/lib/rateLimit');
      const limit = Number(process.env.SUBMISSIONS_CREATE_LIMIT || 30);
      const windowMs = Number(process.env.SUBMISSIONS_CREATE_WINDOW_MS || 60000);
      const rl = checkRateLimit(`sub:create:${user.id}`, limit, windowMs);
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
    const data = await createSubmissionApi(input!, user.id);
    try {
      const out = submissionDto.parse(data);
      return NextResponse.json(out, { status: 201 });
    } catch (e) {
      return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid submission shape' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
    }
  }
}));

const listSubmissionsQuery = z.object({ assignment_id: z.string().uuid(), offset: z.string().optional(), limit: z.string().optional() }).strict();

export const GET = withRouteTiming(async function GET(req: NextRequest) {
  const user = await getCurrentUserInRoute(req);
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  let query: { assignment_id: string; offset?: string; limit?: string };
  try {
    query = parseQuery(req, listSubmissionsQuery);
  } catch (e: any) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: e.message }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
  }
  // Teachers must own the course of the assignment to view others' submissions
  const role = (user?.user_metadata as any)?.role;
  if (role === 'teacher') {
    try {
      const { getRouteHandlerSupabase } = await import("@/lib/supabaseServer");
      const supabase = getRouteHandlerSupabase();
      const { data: asg } = await supabase.from('assignments').select('course_id').eq('id', query.assignment_id).single();
      const { data: course } = asg ? await supabase.from('courses').select('teacher_id').eq('id', (asg as any).course_id).single() : { data: null } as any;
      if (!course || (course as any).teacher_id !== user.id) {
        return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Not owner of course' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
      }
    } catch {}
  }
  const offset = Math.max(0, parseInt(query.offset || '0', 10) || 0);
  const limit = Math.max(1, Math.min(200, parseInt(query.limit || '50', 10) || 50));
  const isTeacher = (user?.user_metadata as any)?.role === 'teacher';
  const viewerStudentId = isTeacher ? undefined : user.id;
  const { rows, total } = await listSubmissionsByAssignmentPaged(query.assignment_id, { offset, limit }, viewerStudentId);
  try {
    const parsed = submissionListDto.parse(rows ?? []);
    const headers: Record<string, string> = { 'x-request-id': requestId };
    headers['x-total-count'] = String(total);
    return NextResponse.json(parsed, { status: 200, headers });
  } catch (e) {
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid submission shape' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  }
});

export const PATCH = withRouteTiming(async function PATCH(req: NextRequest) {
  const user = await getCurrentUserInRoute(req);
  const role = (user?.user_metadata as any)?.role;
  const requestId2 = req.headers.get('x-request-id') || crypto.randomUUID();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId: requestId2 }, { status: 401, headers: { 'x-request-id': requestId2 } });
  if (role !== "teacher") return NextResponse.json({ error: { code: "FORBIDDEN", message: "Teachers only" }, requestId: requestId2 }, { status: 403, headers: { 'x-request-id': requestId2 } });
  // TODO: Verify teacher owns the course of the assignment before grading
  try {
    const { checkRateLimit } = await import('@/lib/rateLimit');
    const limit = Number(process.env.GRADING_LIMIT || 120);
    const windowMs = Number(process.env.GRADING_WINDOW_MS || 60000);
    const rl = checkRateLimit(`grade:${user.id}`, limit, windowMs);
    if (!(rl as any).allowed) {
      const retry = Math.max(0, (rl as any).resetAt - Date.now());
      return NextResponse.json(
        { error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit' }, requestId: requestId2 },
        {
          status: 429,
          headers: {
            'x-request-id': requestId2,
            'retry-after': String(Math.ceil(retry / 1000)),
            'x-rate-limit-remaining': String((rl as any).remaining),
            'x-rate-limit-reset': String(Math.ceil((rl as any).resetAt / 1000))
          }
        }
      );
    }
  } catch {}
  const idSchema = z.object({ id: z.string().uuid() }).strict();
  let q: { id: string };
  try { q = parseQuery(req, idSchema); } catch (e: any) { return NextResponse.json({ error: { code: 'BAD_REQUEST', message: e.message }, requestId: requestId2 }, { status: 400, headers: { 'x-request-id': requestId2 } }); }
  const body = await req.json().catch(() => ({}));
  const parsed = submissionGradeRequest.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "BAD_REQUEST", message: parsed.error.message }, requestId: requestId2 }, { status: 400, headers: { 'x-request-id': requestId2 } });
  // Verify that the teacher owns the course of the assignment before grading
  try {
    const { getRouteHandlerSupabase } = await import("@/lib/supabaseServer");
    const supabase = getRouteHandlerSupabase();
    const { data: sub } = await supabase.from('submissions').select('assignment_id').eq('id', q.id).single();
    const assignmentId = (sub as any)?.assignment_id as string | undefined;
    if (!assignmentId) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'submission not found' }, requestId: requestId2 }, { status: 404, headers: { 'x-request-id': requestId2 } });
    const { data: asg } = await supabase.from('assignments').select('course_id').eq('id', assignmentId).single();
    const courseId = (asg as any)?.course_id as string | undefined;
    if (!courseId) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'assignment not found' }, requestId: requestId2 }, { status: 404, headers: { 'x-request-id': requestId2 } });
    const { data: course } = await supabase.from('courses').select('teacher_id').eq('id', courseId).single();
    if ((course as any)?.teacher_id !== user.id) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Not owner of course' }, requestId: requestId2 }, { status: 403, headers: { 'x-request-id': requestId2 } });
    }
  } catch {}
  const data = await gradeSubmissionApi(q.id, parsed.data, user.id);
  try {
    const out = submissionDto.parse(data);
    return NextResponse.json(out, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid submission shape' }, requestId: requestId2 }, { status: 500, headers: { 'x-request-id': requestId2 } });
  }
});


