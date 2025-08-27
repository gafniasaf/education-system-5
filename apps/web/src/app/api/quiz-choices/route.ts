/**
 * Quiz choices API
 *
 * POST /api/quiz-choices — create a choice (teacher)
 * GET  /api/quiz-choices?question_id=... — list choices for a question
 */
import { NextRequest, NextResponse } from "next/server";
import { withRouteTiming } from "@/server/withRouteTiming";
import { createApiHandler } from "@/server/apiHandler";
import { getCurrentUserInRoute } from "@/lib/supabaseServer";
import { z } from "zod";
import { quizChoice, quizChoiceCreateRequest } from "@education/shared";
import { jsonDto } from "@/lib/jsonDto";
import { parseQuery } from "@/lib/zodQuery";
import { isTestMode } from "@/lib/testMode";
import { createChoiceApi, listChoicesByQuestionApi } from "@/server/services/quizzes";

export const POST = withRouteTiming(createApiHandler({
  schema: quizChoiceCreateRequest,
  preAuth: async (ctx) => {
    const requestId = ctx.requestId;
    const user = await getCurrentUserInRoute(ctx.req as any);
    const role = (user?.user_metadata as any)?.role ?? undefined;
    if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
    if (role !== "teacher") return NextResponse.json({ error: { code: "FORBIDDEN", message: "Teachers only" }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
    return null;
  },
  handler: async (input, ctx) => {
    const requestId = ctx.requestId;
    const row = await createChoiceApi(input!);
    try {
      const out = quizChoice.parse(row);
      return jsonDto(out, quizChoice as any, { requestId, status: 201 });
    } catch {
      return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid choice shape' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
    }
  }
}));

const listQuizChoicesQuery = z.object({ question_id: z.string().uuid() }).strict();

export const GET = withRouteTiming(async function GET(req) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  let query: { question_id: string };
  try {
    query = parseQuery(req, listQuizChoicesQuery);
  } catch (e: any) {
    if (isTestMode()) {
      const fallback = (new URL(req.url)).searchParams.get('question_id') || '';
      if (!fallback) return NextResponse.json({ error: { code: "BAD_REQUEST", message: e.message }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
      query = { question_id: fallback } as any;
    } else {
      return NextResponse.json({ error: { code: "BAD_REQUEST", message: e.message }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
    }
  }
  const user = await getCurrentUserInRoute(req);
  if (!user && !isTestMode()) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  const list = await listChoicesByQuestionApi(query.question_id);
  try {
    const parsed = (list ?? []).map(c => quizChoice.parse(c));
    return jsonDto(parsed, (quizChoice as any).array(), { requestId, status: 200 });
  } catch {
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid choice shape' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  }
});


