import { NextRequest, NextResponse } from "next/server";
import { withRouteTiming } from "@/server/withRouteTiming";
import { getCurrentUserInRoute, getRouteHandlerSupabase } from "@/lib/supabaseServer";
import { jsonDto } from "@/lib/jsonDto";
import { z } from "zod";
import { isTestMode } from "@/lib/testMode";
import { getTestProfile, upsertTestProfile } from "@/lib/testStore";

const profileDto = z.object({ display_name: z.string().max(100).optional().nullable(), bio: z.string().max(4000).optional().nullable() });

export const GET = withRouteTiming(async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const user = await getCurrentUserInRoute(req);
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not signed in' }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  if (isTestMode()) {
    const row = getTestProfile(user.id);
    const out = { display_name: (row as any)?.display_name ?? null, bio: (row as any)?.bio ?? null };
    return jsonDto(out as any, profileDto as any, { requestId, status: 200 });
  }
  try {
    const supabase = getRouteHandlerSupabase();
    const { data } = await supabase.from('profiles').select('display_name,bio').eq('id', user.id).single();
    const out = { display_name: (data as any)?.display_name ?? null, bio: (data as any)?.bio ?? null };
    return jsonDto(out as any, profileDto as any, { requestId, status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: e?.message || 'Failed to load profile' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  }
});

export const PUT = withRouteTiming(async function PUT(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const user = await getCurrentUserInRoute(req);
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not signed in' }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  const body = await req.json().catch(() => ({}));
  const parsed = profileDto.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: parsed.error.message }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
  }
  if (isTestMode()) {
    upsertTestProfile({ id: user.id, email: (user as any).email || 'test@example.com', role: ((user.user_metadata as any)?.role || 'student') as any } as any);
    const cur = getTestProfile(user.id) as any;
    if (cur) { cur.display_name = parsed.data.display_name ?? null; cur.bio = parsed.data.bio ?? null; }
    return jsonDto({ display_name: cur?.display_name ?? null, bio: cur?.bio ?? null } as any, profileDto as any, { requestId, status: 200 });
  }
  try {
    const supabase = getRouteHandlerSupabase();
    const { error } = await supabase.from('profiles').upsert({ id: user.id, display_name: parsed.data.display_name ?? null, bio: parsed.data.bio ?? null }, { onConflict: 'id' } as any);
    if (error) return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
    return jsonDto(parsed.data as any, profileDto as any, { requestId, status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: e?.message || 'Failed to save profile' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  }
});

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { profileResponse, profileUpdateRequest } from "@education/shared";
import { getCurrentUserInRoute, getRouteHandlerSupabase } from "@/lib/supabaseServer";
import { withRouteTiming } from "@/server/withRouteTiming";
import { isTestMode } from "@/lib/testMode";
import { getTestProfile } from "@/lib/testStore";
import { jsonDto } from "@/lib/jsonDto";
import { z } from "zod";

export const GET = withRouteTiming(async function GET(req: NextRequest) {
  const user = await getCurrentUserInRoute(req);
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  }
  if (isTestMode()) {
    const p = getTestProfile(user.id) ?? { id: user.id, email: user.email ?? "", role: (user.user_metadata as any)?.role ?? "student" };
    const parsed = profileResponse.parse({
      id: p.id,
      email: p.email,
      role: (p as any).role,
      display_name: null,
      avatar_url: null,
      bio: null,
      preferences: {}
    });
    return jsonDto(parsed as any, profileResponse as any, { requestId, status: 200 });
  } else {
    const supabase = getRouteHandlerSupabase();
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,role,display_name,avatar_url,bio,preferences')
      .eq('id', user.id)
      .single();
    if (error) return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
    const role = (user.user_metadata as any)?.role ?? data?.role ?? "student";
    const parsed = profileResponse.parse({
      id: user.id,
      email: user.email ?? data?.email ?? "",
      role,
      display_name: (data as any)?.display_name ?? null,
      avatar_url: (data as any)?.avatar_url ?? null,
      bio: (data as any)?.bio ?? null,
      preferences: (data as any)?.preferences ?? {}
    });
    return jsonDto(parsed as any, profileResponse as any, { requestId, status: 200 });
  }
});

export const PUT = withRouteTiming(async function PUT(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const user = await getCurrentUserInRoute(req);
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not signed in' }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  const body = await req.json().catch(() => ({}));
  const parsed = profileUpdateRequest.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: 'BAD_REQUEST', message: parsed.error.message }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
  const supabase = getRouteHandlerSupabase();
  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: parsed.data.display_name ?? null,
      avatar_url: parsed.data.avatar_url ?? null,
      bio: parsed.data.bio ?? null,
      preferences: parsed.data.preferences ?? undefined
    })
    .eq('id', user.id);
  if (error) return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  return jsonDto({ ok: true } as any, z.object({ ok: z.boolean() }) as any, { requestId, status: 200 });
});


