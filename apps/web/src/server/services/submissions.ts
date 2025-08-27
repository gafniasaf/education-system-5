/**
 * Submission service functions
 *
 * - createSubmissionApi: Create a submission (student)
 * - listSubmissionsByAssignment: List submissions for an assignment
 * - gradeSubmissionApi: Grade a submission (teacher)
 */
import { getRouteHandlerSupabase } from "@/lib/supabaseServer";
import { isTestMode } from "@/lib/testMode";
import {
  addTestSubmission,
  listTestSubmissionsByAssignment,
  gradeTestSubmission,
  addTestNotification
} from "@/lib/testStore";
import type { SubmissionCreateRequest, SubmissionGradeRequest } from "@education/shared";
import { recordEvent } from "@/lib/events";

export async function createSubmissionApi(input: SubmissionCreateRequest, studentId: string) {
  // Create a new submission for the given assignment by the current student.
  if (isTestMode()) {
    const ts = Date.now().toString();
    const suffix = ts.slice(-12).padStart(12, "0");
    const fake = {
      id: `dddddddd-dddd-dddd-dddd-${suffix}`,
      assignment_id: input.assignment_id,
      student_id: studentId,
      text: input.text ?? "",
      file_url: input.file_url ?? null,
      file_urls: Array.isArray((input as any).file_urls) ? (input as any).file_urls : (input.file_url ? [input.file_url] : []),
      submitted_at: new Date().toISOString(),
      score: null,
      feedback: null
    } as any;
    addTestSubmission(fake);
    try { await recordEvent({ event_type: 'assignment.submit', entity_type: 'submission', entity_id: fake.id, user_id: studentId, meta: { assignment_id: fake.assignment_id } }); } catch {}
    return fake;
  }
  const supabase = getRouteHandlerSupabase();
  const { data, error } = await supabase
    .from("submissions")
    .insert({
      assignment_id: input.assignment_id,
      student_id: studentId,
      text: input.text ?? "",
      file_url: input.file_url ?? null,
      file_urls: Array.isArray((input as any).file_urls) ? (input as any).file_urls : null
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listSubmissionsByAssignment(assignmentId: string) {
  // List all submissions for an assignment.
  if (isTestMode()) return listTestSubmissionsByAssignment(assignmentId) as any[];
  const supabase = getRouteHandlerSupabase();
  const { data, error } = await supabase
    .from("submissions")
    .select("id,assignment_id,student_id,text,file_url,file_urls,submitted_at,score,feedback")
    .eq("assignment_id", assignmentId)
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listSubmissionsByAssignmentPaged(
  assignmentId: string,
  options?: { offset?: number; limit?: number },
  viewerStudentId?: string
): Promise<{ rows: any[]; total: number }>
{
  const offset = Math.max(0, options?.offset ?? 0);
  const limit = Math.max(1, Math.min(200, options?.limit ?? 50));
  if (isTestMode()) {
    let all = (listTestSubmissionsByAssignment as any)(assignmentId) as any[];
    if (viewerStudentId) {
      all = (all ?? []).filter((r: any) => r.student_id === viewerStudentId);
    }
    const rows = (all ?? []).slice(offset, offset + limit);
    return { rows, total: (all ?? []).length };
  }
  const supabase = getRouteHandlerSupabase();
  let query = supabase
    .from('submissions')
    .select('id,assignment_id,student_id,text,file_url,file_urls,submitted_at,score,feedback', { count: 'exact' as any })
    .eq('assignment_id', assignmentId)
    .order('submitted_at', { ascending: false }) as any;
  if (viewerStudentId) {
    query = query.eq('student_id', viewerStudentId);
  }
  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);
  return { rows: data ?? [], total: typeof count === 'number' ? count : 0 };
}

export async function listUngradedSubmissionsForTeacher(
  teacherId: string,
  options?: { limit?: number; page?: number; courseId?: string; assignmentId?: string }
): Promise<{ rows: any[]; totalEstimated: number }> {
  const limit = options?.limit ?? 20;
  const page = Math.max(1, options?.page ?? 1);
  const offset = (page - 1) * limit;
  const filterCourseId = options?.courseId;
  const filterAssignmentId = options?.assignmentId;

  if (isTestMode()) {
    // Compute from test store when possible
    const { listTestCoursesByTeacher, listTestAssignmentsByCourse, listTestSubmissionsByAssignment } = await import("@/lib/testStore");
    const courses = listTestCoursesByTeacher(teacherId) as any[];
    const courseIds = filterCourseId ? courses.filter(c => c.id === filterCourseId).map(c => c.id) : courses.map(c => c.id);
    let all: any[] = [];
    for (const cid of courseIds) {
      const assignments = (listTestAssignmentsByCourse as any)(cid) as any[];
      for (const a of assignments) {
        if (filterAssignmentId && a.id !== filterAssignmentId) continue;
        const subs = (listTestSubmissionsByAssignment as any)(a.id) as any[];
        for (const s of subs) if (s.score == null) all.push({ ...s, course_id: cid });
      }
    }
    all.sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
    const totalEstimated = all.length;
    const rows = all.slice(offset, offset + limit);
    return { rows, totalEstimated };
  }
  const supabase = getRouteHandlerSupabase();
  // Find teacher's courses (optionally filter by one course)
  const { data: courseRows, error: cErr } = await supabase
    .from('courses')
    .select('id')
    .eq('teacher_id', teacherId);
  if (cErr) throw new Error(cErr.message);
  let courseIds = (courseRows ?? []).map((c: any) => c.id);
  if (filterCourseId) {
    if (!courseIds.includes(filterCourseId)) return { rows: [], totalEstimated: 0 };
    courseIds = [filterCourseId];
  }
  if (courseIds.length === 0) return { rows: [], totalEstimated: 0 };
  // Gather assignments in those courses
  const { data: assignments, error: aErr } = await supabase
    .from('assignments')
    .select('id,course_id')
    .in('course_id', courseIds)
    .limit(2000);
  if (aErr) throw new Error(aErr.message);
  let assignmentIds = (assignments ?? []).map((a: any) => a.id);
  if (filterAssignmentId) assignmentIds = assignmentIds.filter(id => id === filterAssignmentId);
  if (assignmentIds.length === 0) return { rows: [], totalEstimated: 0 };
  const assignmentIdToCourseId = new Map<string, string>();
  (assignments ?? []).forEach((a: any) => assignmentIdToCourseId.set(a.id, a.course_id));
  // Fetch ungraded submissions with pagination
  const { data: submissions, error: sErr, count } = await supabase
    .from('submissions')
    .select('id,assignment_id,student_id,submitted_at,score', { count: 'estimated' })
    .is('score', null)
    .in('assignment_id', assignmentIds)
    .order('submitted_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (sErr) throw new Error(sErr.message);
  const rows = (submissions ?? []).map((s: any) => ({
    ...s,
    course_id: assignmentIdToCourseId.get(s.assignment_id) || null,
  }));
  return { rows, totalEstimated: count ?? 0 };
}

export async function getFirstUngradedLinkForTeacher(teacherId: string): Promise<string | null> {
  const { rows } = await listUngradedSubmissionsForTeacher(teacherId, { limit: 1, page: 1 });
  if (!rows || rows.length === 0) return null;
  const r = rows[0] as any;
  if (!r.course_id) return null;
  return `/dashboard/teacher/${r.course_id}/assignments/${r.assignment_id}/submissions`;
}

export async function gradeSubmissionApi(id: string, data: SubmissionGradeRequest, actorId?: string) {
  // Update score and feedback for a submission.
  if (isTestMode()) {
    const updated = gradeTestSubmission(id, data) as any;
    if (updated) {
      // Notify student in test-mode
      try {
        addTestNotification({ user_id: updated.student_id, type: 'submission:graded', payload: { assignment_id: updated.assignment_id, submission_id: updated.id, score: updated.score ?? null } });
      } catch {}
      try { await recordEvent({ event_type: 'assignment.graded', entity_type: 'submission', entity_id: updated.id, user_id: updated.student_id, meta: { assignment_id: updated.assignment_id, score: updated.score ?? null } }); } catch {}
    }
    return updated;
  }
  const supabase = getRouteHandlerSupabase();
  const { data: row, error } = await supabase
    .from("submissions")
    .update({ score: data.score, feedback: data.feedback ?? null })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  try {
    // Producer: notify student when graded (prod)
    await supabase.from('notifications').insert({
      user_id: (row as any).student_id,
      type: 'submission:graded',
      payload: { submission_id: row.id, assignment_id: row.assignment_id, score: row.score ?? null }
    });
    // Audit: record grading action
    try {
      await supabase.from('audit_logs').insert({
        actor_id: actorId || (row as any).teacher_id || (row as any).grader_id || (row as any).student_id,
        action: 'submission.graded',
        entity_type: 'submission',
        entity_id: row.id,
        details: { assignment_id: row.assignment_id, score: row.score ?? null }
      } as any);
    } catch {}
    // Event: assignment graded
    try {
      await recordEvent({ event_type: 'assignment.graded', entity_type: 'submission', entity_id: row.id, user_id: (row as any).student_id, meta: { assignment_id: (row as any).assignment_id, score: (row as any).score ?? null } });
    } catch {}
  } catch {}
  return row;
}


