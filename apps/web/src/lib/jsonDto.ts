import { NextResponse } from "next/server";
import type { z } from "zod";
import { getRequestLogger } from "@/lib/logger";

function redactIssues(issues: readonly { path: (string | number)[]; message: string }[]) {
  try {
    return issues.map(i => ({ path: i.path.join('.'), message: i.message }));
  } catch {
    return [] as any[];
  }
}

export function jsonDto<T extends z.ZodTypeAny>(
  data: unknown,
  schema: T,
  opts: { requestId: string; status?: number } = { requestId: crypto.randomUUID(), status: 200 }
) {
  const { requestId } = opts;
  const status = typeof opts.status === 'number' ? opts.status : 200;
  const canValidate = schema && typeof (schema as any).safeParse === 'function';
  const parsed = canValidate ? (schema as any).safeParse(data) : { success: true, data };
  if (!parsed.success) {
    try { getRequestLogger(requestId).error({ issues: redactIssues(parsed.error.issues) }, 'dto_response_validation_failed'); } catch {}
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid response shape' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  }
  return NextResponse.json(parsed.data, { status, headers: { 'x-request-id': requestId } });
}


