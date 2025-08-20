/**
 * Quiz attempts API
 *
 * POST /api/quiz-attempts — start an attempt (student)
 * PATCH /api/quiz-attempts — upsert an answer (student)
 * POST /api/quiz-attempts/submit — submit an attempt (student)
 * GET  /api/quiz-attempts?quiz_id=... — list attempts for a quiz (teacher)
 */
// @ts-nocheck

import { NextRequest, NextResponse } from "next/server";
import { withRouteTiming } from "@/server/withRouteTiming";
import { createApiHandler } from "@/server/apiHandler";
import { getCurrentUserInRoute } from "@/lib/supabaseServer";
import { z } from "zod";
import { quizAttemptStartRequest, quizAnswerUpsertRequest, quizAttemptSubmitRequest, quizAttempt } from "@education/shared";
import { parseQuery } from "@/lib/zodQuery";
import { startAttemptApi, upsertAnswerApi, submitAttemptApi, listAttemptsForQuiz } from "@/server/services/quizAttempts";

export const POST = withRouteTiming(createApiHandler({
  schema: quizAttemptStartRequest,
  handler: async (input) => {
    const user = await getCurrentUserInRoute();
    const role = (user?.user_metadata as any)?.role ?? undefined;
    const requestId = (new Headers()).get('x-request-id') || crypto.randomUUID();
    if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
    if (role !== "student") return NextResponse.json({ error: { code: "FORBIDDEN", message: "Students only" }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
    const row = await startAttemptApi({ quiz_id: input!.quiz_id, student_id: user.id });
    try { return NextResponse.json(quizAttempt.parse(row as any), { status: 201 }); } catch { return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid attempt shape' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } }); }
  }
}));

export const PATCH = withRouteTiming(createApiHandler({
  schema: quizAnswerUpsertRequest,
  handler: async (input) => {
    const user = await getCurrentUserInRoute();
    const role = (user?.user_metadata as any)?.role ?? undefined;
    const requestId = (new Headers()).get('x-request-id') || crypto.randomUUID();
    if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
    if (role !== "student") return NextResponse.json({ error: { code: "FORBIDDEN", message: "Students only" }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
    const row = await upsertAnswerApi(input!);
    return NextResponse.json(row, { status: 200 });
  }
}));

const listAttemptsQuery = z.object({ quiz_id: z.string().uuid() }).strict();

export const GET = withRouteTiming(async function GET(req) {
  const requestId2 = req.headers.get('x-request-id') || crypto.randomUUID();
  let q: { quiz_id: string };
  try {
    q = parseQuery(req, listAttemptsQuery);
  } catch (e: any) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: e.message }, requestId: requestId2 }, { status: 400, headers: { 'x-request-id': requestId2 } });
  }
  const user = await getCurrentUserInRoute(req as any);
  const role = (user?.user_metadata as any)?.role ?? undefined;
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId: requestId2 }, { status: 401, headers: { 'x-request-id': requestId2 } });
  if (role !== "teacher") return NextResponse.json({ error: { code: "FORBIDDEN", message: "Teachers only" }, requestId: requestId2 }, { status: 403, headers: { 'x-request-id': requestId2 } });
  const rows = await listAttemptsForQuiz(q.quiz_id);
  // Attempts list schema not standardized; return raw rows
  return NextResponse.json(rows, { status: 200 });
});


