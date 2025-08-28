import { NextRequest, NextResponse } from "next/server";
import { withRouteTiming } from "@/server/withRouteTiming";
import { getCurrentUserInRoute } from "@/lib/supabaseServer";
import { isTestMode, isMvpProdGuardEnabled } from "@/lib/testMode";
import { getTestFile } from "@/lib/testStore";
import { presignDownloadUrl } from "@/lib/files";
import { getRouteHandlerSupabase } from "@/lib/supabaseServer";
import { z } from "zod";
import { parseQuery } from "@/lib/zodQuery";
import { jsonDto } from "@/lib/jsonDto";

const downloadQuery = z.object({ id: z.string().min(1) }).strict();

export const GET = withRouteTiming(async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const user = await getCurrentUserInRoute(req);
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not signed in' }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  let q: { id: string };
  try {
    q = parseQuery(req, downloadQuery);
  } catch (e: any) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: e.message }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
  }
  if (isTestMode()) {
    const row = getTestFile(q.id);
    if (row) {
      const body = Buffer.from(row.data_base64, 'base64');
      const ct = row.content_type || 'application/octet-stream';
      const filename = `download-${encodeURIComponent(q.id).slice(0, 32)}`;
      return new Response(body, { status: 200, headers: { 'content-type': ct, 'content-disposition': `attachment; filename="${filename}"`, 'x-request-id': requestId } });
    }
    // Fall through to prod-like Supabase path when the in-memory store doesn't have the file
  }
  // Prod: look up attachment metadata and enforce ownership/authorization
  const supabase = getRouteHandlerSupabase();
  const { data: att } = await supabase.from('attachments').select('bucket,object_key,owner_id,owner_type,filename,content_type').eq('object_key', q.id).single();
  if (!att) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'file not found' }, requestId }, { status: 404, headers: { 'x-request-id': requestId } });
  // Owner rule: owner can read; teachers may read student submission attachments if they own the course
  if ((att as any).owner_id !== user.id) {
    if ((att as any).owner_type === 'submission') {
      // Here owner_id stores the student_id per tests; find submission matching key -> assignment -> course -> teacher
      const { data: subs } = await supabase
        .from('submissions')
        .select('assignment_id,student_id,file_url,file_urls');
      const matched = (subs ?? []).find((s: any) => s.student_id === (att as any).owner_id && (s.file_url === (att as any).object_key || (Array.isArray(s.file_urls) && s.file_urls.includes((att as any).object_key))));
      if (!matched) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Not allowed' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
      const { data: asg } = await supabase.from('assignments').select('course_id').eq('id', (matched as any).assignment_id).single();
      const { data: crs } = asg ? await supabase.from('courses').select('teacher_id').eq('id', (asg as any).course_id).single() : { data: null } as any;
      if (!crs || (crs as any).teacher_id !== user.id) {
        return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Not allowed' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
      }
    } else if ((att as any).owner_type === 'lesson' || (att as any).owner_type === 'announcement') {
      const courseId = (att as any).owner_id as string;
      // Teacher of course allowed; or enrolled student
      const { data: crs } = await supabase.from('courses').select('teacher_id').eq('id', courseId).single();
      if (crs && (crs as any).teacher_id === user.id) {
        // ok
      } else {
        const { data: enr } = await supabase.from('enrollments').select('id').eq('course_id', courseId).eq('student_id', user.id).limit(1);
        if (!Array.isArray(enr) || enr.length === 0) {
          return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Not allowed' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
        }
      }
    } else {
      // Unknown owner type: do not leak existence; return forbidden per tests
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Not allowed' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
    }
  }
  // Dev/test guard: enforce DEV_ID prefix when defined
  try {
    const dev = process.env.NODE_ENV !== 'production' ? (process.env.DEV_ID || '') : '';
    if (dev && !String((att as any).object_key || '').startsWith(`${dev}/`)) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Invalid key namespace' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
    }
  } catch {}
  const url = await presignDownloadUrl({ bucket: (att as any).bucket, objectKey: (att as any).object_key, expiresIn: 300 });
  const allowRelative = isTestMode() || !!(process as any)?.env?.JEST_WORKER_ID;
  const dto = z.object({ url: (allowRelative ? z.string().min(1) : z.string().url()), filename: z.string().nullable(), content_type: z.string().nullable() });
  return jsonDto({ url, filename: (att as any).filename ?? null, content_type: (att as any).content_type ?? null } as any, dto as any, { requestId, status: 200 });
});


