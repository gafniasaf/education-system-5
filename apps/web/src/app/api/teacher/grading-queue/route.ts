import { NextRequest, NextResponse } from "next/server";
import { withRouteTiming } from "@/server/withRouteTiming";
import { createApiHandler } from "@/server/apiHandler";
import { getCurrentUserInRoute, getRouteHandlerSupabase } from "@/lib/supabaseServer";
import { parseQuery } from "@/lib/zodQuery";
import { z } from "zod";
import { gradingQueueListV1 } from "@education/shared";
import { jsonDto } from "@/lib/jsonDto";
import { isTestMode } from "@/lib/testMode";

const listQuery = z.object({ courseId: z.string().uuid().optional(), assignmentId: z.string().uuid().optional(), page: z.string().optional(), limit: z.string().optional() }).strict();

export const GET = withRouteTiming(async function GET(req: NextRequest) {
  const user = await getCurrentUserInRoute(req);
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  const role = (user?.user_metadata as any)?.role;
  if (role !== 'teacher') return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Teachers only' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
  let q: { courseId?: string; assignmentId?: string; page?: string; limit?: string };
  try {
    q = parseQuery(req, listQuery);
  } catch (e: any) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: e?.message || 'Invalid query' }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
  }
  const page = Math.max(1, parseInt(q.page || '1', 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(q.limit || '20', 10) || 20));
  const offset = (page - 1) * limit;
  const supabase = getRouteHandlerSupabase();
  // Test-mode: compute queue from in-memory store to avoid DB joins
  if (isTestMode()) {
    const { listTestCoursesByTeacher, listTestAssignmentsByCourse, listTestSubmissionsByAssignment } = await import('@/lib/testStore');
    const courses = listTestCoursesByTeacher(user.id) as any[];
    const candidateCourseIds = q.courseId ? courses.filter(c => c.id === q.courseId).map(c => c.id) : courses.map(c => c.id);
    let all: any[] = [];
    for (const cid of candidateCourseIds) {
      const assignments = (listTestAssignmentsByCourse as any)(cid) as any[];
      for (const a of assignments) {
        if (q.assignmentId && a.id !== q.assignmentId) continue;
        const subs = (listTestSubmissionsByAssignment as any)(a.id) as any[];
        for (const s of subs) if (s.score == null) all.push({ ...s, course_id: cid });
      }
    }
    all.sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
    const total = all.length;
    const rows = all.slice(offset, offset + limit).map(r => ({ id: r.id, assignment_id: r.assignment_id, student_id: r.student_id, course_id: r.course_id ?? null, submitted_at: r.submitted_at, score: r.score ?? null }));
    const parsed = gradingQueueListV1.safeParse(rows);
    if (!parsed.success) return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid DTO' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
    const res = jsonDto(parsed.data as any, gradingQueueListV1 as any, { requestId, status: 200 });
    res.headers.set('x-total-count', String(total));
    return res;
  }
  // Base query: submissions without score (prod)
  let builder = supabase
    .from('submissions')
    .select('id,assignment_id,student_id,submitted_at,score,assignments:assignment_id(course_id),courses:assignments.course_id(teacher_id)', { count: 'exact' })
    .is('score', null)
    .range(offset, offset + limit - 1);
  if (q.assignmentId) builder = builder.eq('assignment_id', q.assignmentId);
  if (q.courseId) builder = builder.eq('assignments.course_id', q.courseId);
  const { data, count, error } = await builder as any;
  if (error) return NextResponse.json({ error: { code: 'INTERNAL', message: 'DB error' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  // Enforce ownership: teacher_id must match
  const rows = (data || []).filter((r: any) => r?.courses?.teacher_id === user.id).map((r: any) => ({
    id: r.id,
    assignment_id: r.assignment_id,
    student_id: r.student_id,
    course_id: r?.assignments?.course_id ?? null,
    submitted_at: r.submitted_at,
    score: r.score ?? null
  }));
  // Validate and send
  const parsed = gradingQueueListV1.safeParse(rows);
  if (!parsed.success) return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid DTO' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  const headers: Record<string, string> = { 'x-request-id': requestId };
  if (typeof count === 'number') headers['x-total-count'] = String(count);
  const res = jsonDto(parsed.data as any, gradingQueueListV1 as any, { requestId, status: 200 });
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, String(v));
  return res;
});


