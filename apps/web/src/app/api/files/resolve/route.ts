import { NextRequest, NextResponse } from "next/server";
import { withRouteTiming } from "@/server/withRouteTiming";
import { createApiHandler } from "@/server/apiHandler";
import { z } from "zod";
import { getCurrentUserInRoute, getRouteHandlerSupabase } from "@/lib/supabaseServer";
import { jsonDto } from "@/lib/jsonDto";
import { isTestMode } from "@/lib/testMode";
import { presignDownloadUrl } from "@/lib/files";

const resolveRequest = z.object({ keys: z.array(z.string()).min(1).max(50) }).strict();

export const POST = withRouteTiming(createApiHandler({
  schema: resolveRequest,
  handler: async (input, ctx) => {
    const requestId = ctx.requestId;
    const user = await getCurrentUserInRoute(ctx.req as any);
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not signed in' }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
    const keys = input!.keys;
    if (isTestMode()) {
      const out: Record<string, { filename: string | null; content_type: string | null; url: string }> = {};
      for (const k of keys) out[k] = { filename: null, content_type: null, url: `/api/files/download-url?id=${encodeURIComponent(k)}` };
      const dto = z.record(z.object({ filename: z.string().nullable(), content_type: z.string().nullable(), url: z.string().min(1) }));
      return jsonDto(out as any, dto as any, { requestId, status: 200 });
    }
    const supabase = getRouteHandlerSupabase();
    const { data: rows, error } = await supabase.from('attachments').select('owner_type,owner_id,bucket,object_key,filename,content_type').in('object_key', keys);
    if (error) return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
    const result: Record<string, { filename: string | null; content_type: string | null; url: string | null }> = {};
    for (const r of (rows ?? []) as any[]) {
      let allowed = false;
      const currentUserId = (await getCurrentUserInRoute(ctx.req as any))?.id;
      if (r.owner_id === currentUserId) allowed = true;
      if (!allowed && r.owner_type === 'submission') {
        // Authorize course teacher
        const { data: sub } = await supabase.from('submissions').select('assignment_id,student_id').eq('id', r.owner_id).single();
        if (sub) {
          const { data: asg } = await supabase.from('assignments').select('course_id').eq('id', (sub as any).assignment_id).single();
          if (asg) {
            const { data: course } = await supabase.from('courses').select('teacher_id').eq('id', (asg as any).course_id).single();
            if (course && currentUserId && (course as any).teacher_id === currentUserId) allowed = true;
          }
        }
      }
      if (!allowed) continue;
      try {
        const dev = process.env.NODE_ENV !== 'production' ? (process.env.DEV_ID || '') : '';
        if (dev && !String(r.object_key || '').startsWith(`${dev}/`)) continue;
        const url = await presignDownloadUrl({ bucket: r.bucket, objectKey: r.object_key, expiresIn: 300 });
        result[r.object_key] = { filename: r.filename ?? null, content_type: r.content_type ?? null, url };
      } catch {
        result[r.object_key] = { filename: r.filename ?? null, content_type: r.content_type ?? null, url: null };
      }
    }
    const dto = z.record(z.object({ filename: z.string().nullable(), content_type: z.string().nullable(), url: z.string().min(1).nullable() }));
    return jsonDto(result as any, dto as any, { requestId, status: 200 });
  }
}));


