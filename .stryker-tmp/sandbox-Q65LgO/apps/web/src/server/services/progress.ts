// @ts-nocheck
import { getRouteHandlerSupabase } from "@/lib/supabaseServer";
import { isTestMode } from "@/lib/testMode";
import { listTestLessonsByCourse } from "@/lib/testStore";
import { logger } from "@/lib/logger";

export async function markLessonComplete(userId: string, lessonId: string) {
  const t0 = Date.now();
  if (isTestMode()) {
    // For test-mode, we don't persist per-lesson state yet; return a synthetic item
    const out = { lessonId, completedAt: new Date().toISOString() } as const;
    logger.info({ lessonId, userId, ms: Date.now() - t0 }, "progress_marked");
    return out;
  }
  const supabase = getRouteHandlerSupabase();
  const { error } = await supabase.from("progress").upsert({ user_id: userId, lesson_id: lessonId }, { onConflict: "user_id,lesson_id" });
  if (error) throw new Error(error.message);
  const out = { lessonId, completedAt: new Date().toISOString() } as const;
  logger.info({ lessonId, userId, ms: Date.now() - t0 }, "progress_marked");
  return out;
}

export async function getLessonCompletionMap(userId: string, courseId: string) {
  if (isTestMode()) {
    // No persistence in test-mode; return empty map by default
    return {} as Record<string, true>;
  }
  const supabase = getRouteHandlerSupabase();
  const { data: lessons, error: errLessons } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", courseId);
  if (errLessons) throw new Error(errLessons.message);
  const lessonIds = (lessons ?? []).map((l: any) => l.id);
  if (lessonIds.length === 0) return {} as Record<string, true>;
  const { data, error } = await supabase
    .from("progress")
    .select("lesson_id")
    .eq("user_id", userId)
    .in("lesson_id", lessonIds);
  if (error) throw new Error(error.message);
  const map: Record<string, true> = {};
  for (const row of data ?? []) map[(row as any).lesson_id] = true;
  return map;
}

/**
 * Fast read-path: return a summary of course-level progress for a user.
 * This avoids repeated joins in callers by doing minimal selects here.
 */
export async function getCourseProgress(userId: string, courseId: string): Promise<{ totalLessons: number; completedLessons: number; percent: number }> {
  if (isTestMode()) {
    const lessons = listTestLessonsByCourse(courseId) as any[];
    const total = (lessons ?? []).length;
    return { totalLessons: total, completedLessons: 0, percent: 0 };
  }
  const supabase = getRouteHandlerSupabase();
  const { count: total, error: lErr } = await supabase
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId);
  if (lErr) throw new Error(lErr.message);
  let completed = 0;
  if ((total ?? 0) > 0) {
    // Find lesson ids, then count completed rows. Use minimal fetch; for large courses consider a DB-side count via join to avoid client-side list.
    const { data: lessonRows } = await supabase
      .from('lessons')
      .select('id')
      .eq('course_id', courseId)
      .limit(2000);
    const lessonIds = (lessonRows ?? []).map((r: any) => r.id);
    if (lessonIds.length > 0) {
      const { count: comp } = await supabase
        .from('progress')
        .select('lesson_id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('lesson_id', lessonIds);
      completed = comp ?? 0;
    }
  }
  const pct = (total && total > 0) ? Math.round(((completed / (total as number)) * 100)) : 0;
  return { totalLessons: total ?? 0, completedLessons: completed, percent: pct };
}


