import { NextRequest, NextResponse } from "next/server";
import { withRouteTiming } from "@/server/withRouteTiming";
import { jsonDto } from "@/lib/jsonDto";
import { z } from "zod";
import { isTestMode } from "@/lib/testMode";
import { getCurrentUserInRoute } from "@/lib/supabaseServer";
import { listTestParentChildren, addTestParentLink, removeTestParentLink } from "@/lib/testStore";

const rowSchema = z.object({ id: z.string(), parent_id: z.string(), student_id: z.string(), created_at: z.string() });
const listSchema = z.array(rowSchema);

function makeId(): string {
  const hex = '0123456789abcdef';
  const rand = (n: number) => Array.from({ length: n }, () => hex[Math.floor(Math.random() * hex.length)]).join('');
  return `${rand(8)}-${rand(4)}-${rand(4)}-${rand(4)}-${rand(12)}`;
}

export const GET = withRouteTiming(async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const user = await getCurrentUserInRoute(req);
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not signed in' }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  const q = new URL(req.url).searchParams;
  const parent_id = (q.get('parent_id') || '').trim();
  if (!parent_id) return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'parent_id is required' }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
  if (!isTestMode()) return NextResponse.json({ error: { code: 'NOT_IMPLEMENTED', message: 'Prod not implemented' }, requestId }, { status: 501, headers: { 'x-request-id': requestId } });
  const rows = (listTestParentChildren as any)(parent_id) as any[];
  return jsonDto(rows as any, listSchema as any, { requestId, status: 200 });
});

export const POST = withRouteTiming(async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const user = await getCurrentUserInRoute(req);
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not signed in' }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  const body = await req.json().catch(() => ({}));
  const parsed = z.object({ parent_id: z.string().min(1), student_id: z.string().min(1) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: 'BAD_REQUEST', message: parsed.error.message }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
  if (!isTestMode()) return NextResponse.json({ error: { code: 'NOT_IMPLEMENTED', message: 'Prod not implemented' }, requestId }, { status: 501, headers: { 'x-request-id': requestId } });
  const row = { id: makeId(), parent_id: parsed.data.parent_id, student_id: parsed.data.student_id, created_at: new Date().toISOString() };
  (addTestParentLink as any)({ id: row.id, parent_id: row.parent_id, student_id: row.student_id, created_at: row.created_at });
  return jsonDto(row as any, rowSchema as any, { requestId, status: 201 });
});

export const DELETE = withRouteTiming(async function DELETE(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const user = await getCurrentUserInRoute(req);
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not signed in' }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  const body = await req.json().catch(() => ({}));
  const parsed = z.object({ parent_id: z.string().min(1), student_id: z.string().min(1) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: 'BAD_REQUEST', message: parsed.error.message }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
  if (!isTestMode()) return NextResponse.json({ error: { code: 'NOT_IMPLEMENTED', message: 'Prod not implemented' }, requestId }, { status: 501, headers: { 'x-request-id': requestId } });
  (removeTestParentLink as any)(parsed.data.parent_id, parsed.data.student_id);
  return jsonDto({ ok: true } as any, z.object({ ok: z.boolean() }) as any, { requestId, status: 200 });
});

export const dynamic = 'force-dynamic';

/**
 * Parent links API
 *
 * POST /api/parent-links — create link (admin)
 * DELETE /api/parent-links — delete link (admin)
 * GET  /api/parent-links?parent_id=... — list children for a parent (admin or self)
 */
import { NextRequest, NextResponse } from "next/server";
import { createApiHandler } from "@/server/apiHandler";
import { withRouteTiming } from "@/server/withRouteTiming";
import { getCurrentUserInRoute } from "@/lib/supabaseServer";
import { isTestMode } from "@/lib/testMode";
import { z } from "zod";
import { parentLinkCreateRequest, parentLinkDeleteRequest } from "@education/shared";
import { jsonDto } from "@/lib/jsonDto";
import { parseQuery } from "@/lib/zodQuery";
import { createParentLink, deleteParentLink, listChildrenForParent } from "@/server/services/parentLinks";
import { getRouteHandlerSupabase } from "@/lib/supabaseServer";
import { checkRateLimit } from "@/lib/rateLimit";

function assertAdmin(user: any) {
  const role = (user?.user_metadata as any)?.role;
  const requestId = crypto.randomUUID();
  if (role !== 'admin') return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admins only' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
  return null;
}

export const POST = withRouteTiming(createApiHandler({
  schema: parentLinkCreateRequest,
  preAuth: async (ctx) => {
    const user = await getCurrentUserInRoute(ctx.req as any);
    const requestId = ctx.requestId;
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not signed in' }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
    const forbidden = assertAdmin(user);
    if (forbidden) return forbidden;
    return null;
  },
  handler: async (input, ctx) => {
    const user = await getCurrentUserInRoute(ctx.req as any);
    try {
      const rl = checkRateLimit(`plink:create:${user!.id}`, 60, 60000);
      if (!(rl as any).allowed) {
        const retry = Math.max(0, (rl as any).resetAt - Date.now());
        return NextResponse.json(
          { error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit' }, requestId: ctx.requestId },
          {
            status: 429,
            headers: {
              'x-request-id': ctx.requestId,
              'retry-after': String(Math.ceil(retry / 1000)),
              'x-rate-limit-remaining': String((rl as any).remaining),
              'x-rate-limit-reset': String(Math.ceil((rl as any).resetAt / 1000))
            }
          }
        );
      }
    } catch {}
    const row = await createParentLink({ parentId: input!.parent_id, studentId: input!.student_id });
    try {
      const supabase = getRouteHandlerSupabase();
      await supabase.from('audit_logs').insert({ actor_id: user!.id, action: 'parent-link.create', entity_type: 'parent_link', entity_id: `${input!.parent_id}:${input!.student_id}`, details: {} });
    } catch {}
    return jsonDto(row as any, z.any() as any, { requestId: ctx.requestId, status: 201 });
  }
}));

export const DELETE = withRouteTiming(createApiHandler({
  schema: parentLinkDeleteRequest,
  preAuth: async (ctx) => {
    const user = await getCurrentUserInRoute(ctx.req as any);
    const requestId = ctx.requestId;
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not signed in' }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
    const forbidden = assertAdmin(user);
    if (forbidden) return forbidden;
    return null;
  },
  handler: async (input, ctx) => {
    const user = await getCurrentUserInRoute(ctx.req as any);
    try {
      const rl = checkRateLimit(`plink:del:${user!.id}`, 60, 60000);
      if (!(rl as any).allowed) {
        const retry = Math.max(0, (rl as any).resetAt - Date.now());
        return NextResponse.json(
          { error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit' }, requestId: ctx.requestId },
          {
            status: 429,
            headers: {
              'x-request-id': ctx.requestId,
              'retry-after': String(Math.ceil(retry / 1000)),
              'x-rate-limit-remaining': String((rl as any).remaining),
              'x-rate-limit-reset': String(Math.ceil((rl as any).resetAt / 1000))
            }
          }
        );
      }
    } catch {}
    await deleteParentLink({ parentId: input!.parent_id, studentId: input!.student_id });
    try {
      const supabase = getRouteHandlerSupabase();
      await supabase.from('audit_logs').insert({ actor_id: user!.id, action: 'parent-link.delete', entity_type: 'parent_link', entity_id: `${input!.parent_id}:${input!.student_id}`, details: {} });
    } catch {}
    return jsonDto({ ok: true } as any, z.object({ ok: z.boolean() }) as any, { requestId: ctx.requestId, status: 200 });
  }
}));

const listParentLinksQueryProd = z.object({ parent_id: z.string().uuid() }).strict();

export const GET = withRouteTiming(async function GET(req: NextRequest) {
  const user = await getCurrentUserInRoute(req);
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not signed in' }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  let q: { parent_id: string };
  try {
    const schema = isTestMode()
      ? z.object({ parent_id: z.string().min(1) }).strict()
      : listParentLinksQueryProd;
    q = parseQuery(req, schema);
  } catch (e: any) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: e.message }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
  }
  const role = (user.user_metadata as any)?.role;
  if (role !== 'admin' && user.id !== q.parent_id) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Not allowed' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
  }
  const rows = await listChildrenForParent(q.parent_id);
  return jsonDto(rows as any, z.array(z.object({ id: z.string().uuid(), parent_id: z.string().uuid(), student_id: z.string().uuid(), created_at: z.string() })) as any, { requestId, status: 200 });
});


