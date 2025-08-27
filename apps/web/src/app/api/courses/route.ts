/**
 * Courses API
 *
 * POST /api/courses — create a course (teacher only)
 * GET  /api/courses — list courses for the current teacher
 *
 * Uses `createApiHandler` for validation and `withRouteTiming` for logging.
 */
import { NextResponse } from "next/server";
import { courseCreateRequest, course } from "@education/shared";
import { jsonDto } from "@/lib/jsonDto";
import { getRouteHandlerSupabase, getCurrentUserInRoute } from "@/lib/supabaseServer";
import { isTestMode } from "@/lib/testMode";
import { listTestCoursesByTeacher } from "@/lib/testStore";
import { createApiHandler } from "@/server/apiHandler";
import { withRouteTiming } from "@/server/withRouteTiming";
import { createCourseApi } from "@/server/services/courses";

export const POST = withRouteTiming(createApiHandler({
	schema: courseCreateRequest,
	handler: async (input, ctx) => {
		const requestId = ctx.requestId;
		// Fast-path for test mode to avoid dev bundler header/cookie timing
		const hdrs = ctx.headers;
		const cookieHeader = hdrs.get('cookie') || '';
		const cookiesMap: Record<string, string> = {};
		for (const part of cookieHeader.split(';')) {
			const [k, ...v] = part.trim().split('=');
			if (!k) continue;
			cookiesMap[k] = decodeURIComponent(v.join('='));
		}
		const val = cookiesMap['x-test-auth'] || hdrs.get('x-test-auth') || undefined;
		const testRole = val === 'teacher' || val === 'student' || val === 'parent' || val === 'admin' ? val : null;
		if (isTestMode() && testRole) {
			if (testRole !== 'teacher') return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Teachers only' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
			const fakeUser = { id: 'test-teacher-id' } as any;
			const data = await createCourseApi(fakeUser, input!);
			// Map service row to API DTO shape expected by `course` schema
			const mapped = {
				id: (data as any).id,
				title: (data as any).title,
				description: (data as any).description ?? null,
				teacherId: String(fakeUser.id),
				createdAt: (data as any).created_at
			};
			return jsonDto(mapped as any, course as any, { requestId, status: 201 });
		}

		const supabase = getRouteHandlerSupabase();
		const user = await getCurrentUserInRoute(ctx.req as any);
		const role = (user?.user_metadata as any)?.role ?? undefined;
		if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
		if (role !== "teacher") return NextResponse.json({ error: { code: "FORBIDDEN", message: "Teachers only" }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });

		const data = await createCourseApi(user as any, input!);
		return jsonDto(data, course, { requestId, status: 201 });
	}
}));

export const GET = withRouteTiming(async function GET(req: Request) {
	const supabase = getRouteHandlerSupabase();
	const user = await getCurrentUserInRoute(req as any);
	const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
	if (!user) {
		return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
	}
	if (isTestMode()) {
		const rows = listTestCoursesByTeacher(user.id);
		try {
			const mapped = (rows ?? []).map((r: any) => ({
				id: r.id,
				title: r.title,
				description: r.description ?? null,
				teacherId: r.teacher_id,
				createdAt: r.created_at
			}));
			const parsed = mapped.map(r => course.parse(r));
			return jsonDto(parsed, (course as any).array(), { requestId, status: 200 });
		} catch {
			return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid course shape' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
		}
	}
	const { data, error } = await supabase
		.from("courses")
		.select("id,title,description,created_at")
		.eq("teacher_id", user.id)
		.order("created_at", { ascending: false });
	if (error) return NextResponse.json({ error: { code: "DB_ERROR", message: error.message }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
	try {
		const parsed = (data ?? []).map(r => course.parse(r));
		return jsonDto(parsed, (course as any).array(), { requestId, status: 200 });
	} catch {
		return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid course shape' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
	}
});


