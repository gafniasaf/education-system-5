/**
 * Health check endpoint.
 * Avoids next/headers in dev to reduce overlay/bundling flakiness.
 */
import { NextResponse, NextRequest } from "next/server";
import { getRouteHandlerSupabase } from "@/lib/supabaseServer";
import { jsonDto } from "@/lib/jsonDto";
import { z } from "zod";

export async function GET(req: NextRequest) {
  try {
    const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
    const h = req.headers;
    const cookieHeader = h.get("cookie") || "";
    const cookieMap: Record<string, string> = {};
    for (const part of cookieHeader.split(";")) {
      const [k, ...v] = part.trim().split("=");
      if (!k) continue;
      cookieMap[k] = decodeURIComponent(v.join("="));
    }
    const val = cookieMap["x-test-auth"] || h.get("x-test-auth") || undefined;
    const testRole = val === "teacher" || val === "student" || val === "parent" || val === "admin" ? val : null;
    const testMode = process.env.TEST_MODE === "1" || !!process.env.PLAYWRIGHT;
    const interactive = process.env.INTERACTIVE_RUNTIME === '1';
    // Check DB connectivity (lightweight head query)
    let dbOk = false;
    let storageOk = false;
    try {
      const supabase = getRouteHandlerSupabase();
      const { error } = await supabase.from('courses').select('id', { count: 'exact', head: true } as any).limit(1);
      dbOk = !error;
      try {
        const bucket = process.env.NEXT_PUBLIC_UPLOAD_BUCKET || 'public';
        const { data, error: stErr } = await (supabase as any).storage.from(bucket).createSignedUrl('healthcheck.txt', 60);
        storageOk = !!data && !stErr;
      } catch { storageOk = false; }
    } catch { dbOk = false; }
    // Provider reachability (best effort): check a few JWKS URLs when not in test mode
    let providers = { okCount: 0, total: 0 } as { okCount: number; total: number };
    try {
      const supabase = getRouteHandlerSupabase();
      const isTest = process.env.TEST_MODE === '1' || !!process.env.PLAYWRIGHT;
      if (!isTest) {
        const { data } = await supabase.from('course_providers').select('jwks_url').limit(3);
        const list: string[] = Array.isArray(data) ? (data as any[]).map(r => String(r.jwks_url || '')).filter(Boolean) : [];
        providers.total = list.length;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 1500);
        for (const url of list) {
          try {
            const res = await fetch(url, { method: 'GET', signal: controller.signal });
            if (res.ok) providers.okCount += 1;
          } catch {}
        }
        clearTimeout(timer);
      }
    } catch {}
    const flags = {
      TEST_MODE: process.env.TEST_MODE === '1' || !!process.env.PLAYWRIGHT,
      MVP_PROD_GUARD: process.env.MVP_PROD_GUARD === '1',
      RUNTIME_API_V2: process.env.RUNTIME_API_V2 === '1',
    } as const;
    // Required envs (best-effort): surface status for ops
    const requiredEnvs = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    } as Record<string, boolean>;
    if (process.env.RUNTIME_API_V2 === '1') {
      requiredEnvs['NEXT_RUNTIME_PUBLIC_KEY'] = !!process.env.NEXT_RUNTIME_PUBLIC_KEY;
      requiredEnvs['NEXT_RUNTIME_PRIVATE_KEY'] = !!process.env.NEXT_RUNTIME_PRIVATE_KEY;
      requiredEnvs['NEXT_RUNTIME_KEY_ID'] = !!process.env.NEXT_RUNTIME_KEY_ID;
    }
    const csrfDoubleSubmit = process.env.CSRF_DOUBLE_SUBMIT === '1';
    const dto = z.object({ ok: z.boolean(), ts: z.number().int(), testRole: z.string().nullable(), testMode: z.boolean(), interactive: z.boolean(), dbOk: z.boolean(), storageOk: z.boolean(), providers: z.object({ okCount: z.number().int().nonnegative(), total: z.number().int().nonnegative() }), flags: z.record(z.boolean()), requiredEnvs: z.record(z.boolean()), csrfDoubleSubmit: z.boolean(), version: z.string().nullable() });
    return jsonDto({ ok: true, ts: Date.now(), testRole, testMode, interactive, dbOk, storageOk, providers, flags, requiredEnvs, csrfDoubleSubmit, version: process.env.VERCEL_GIT_COMMIT_SHA || null } as any, dto as any, { requestId, status: 200 });
  } catch (err: any) {
    const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
    const dto = z.object({ ok: z.boolean(), error: z.string().min(1) });
    return jsonDto({ ok: false, error: err?.message ?? "health_error" } as any, dto as any, { requestId, status: 200 });
  }
}


