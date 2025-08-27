import { headers, cookies } from "next/headers";
import { serverFetch } from "@/lib/serverFetch";
import { createEnrollmentsGateway, createLessonsGateway } from "@/lib/data";
import Trans from "@/lib/i18n/Trans";
import { isTestMode } from "@/lib/testMode";

type Enrollment = { id: string; course_id: string };
type Lesson = { id: string; title: string; order_index: number };

export default async function StudentLearningOverviewDetailedPage() {
  const h = headers();
  const cookieHeader = h.get("cookie") ?? "";
  let testAuth = h.get("x-test-auth") ?? cookies().get("x-test-auth")?.value;
  if (!testAuth) {
    try { const store: any = (globalThis as any).__TEST_HEADERS_STORE__; const v = store?.cookies?.get?.('x-test-auth'); if (v) testAuth = String(v); } catch {}
  }

  const baseHeaders: Record<string, string> = {
    ...(cookieHeader ? { cookie: cookieHeader } : {}),
    ...(testAuth ? { "x-test-auth": testAuth } : {}),
  };

  const enrollments = await createEnrollmentsGateway().list().catch(() => [] as Enrollment[]);

  if (!testAuth && !cookieHeader && !isTestMode()) {
    return (
      <main className="p-6">
        <p className="text-gray-700">
          <Trans keyPath="auth.notSignedIn" fallback="You are not signed in." /> {" "}
          <a className="underline" href="/login"><Trans keyPath="auth.signin" fallback="Sign in" /></a>
        </p>
      </main>
    );
  }

  const details = await Promise.all(
    (enrollments ?? []).map(async (e) => {
      const lessons: Lesson[] = await createLessonsGateway().listByCourse(e.course_id).catch(() => [] as Lesson[]);
      const count = Array.isArray(lessons) ? lessons.length : 0;
      const next = (Array.isArray(lessons) ? [...lessons] : []).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))[0];
      return { course_id: e.course_id, count, nextTitle: next?.title ?? null };
    })
  );

  const byCourse = new Map(details.map((d) => [d.course_id, d] as const));

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold mb-4">Learning overview (detailed)</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="learning-grid">
        {(enrollments ?? []).map((e) => {
          const d = byCourse.get(e.course_id);
          return (
            <a
              key={e.id}
              href={`/dashboard/teacher/${e.course_id}`}
              className="border rounded p-3 hover:bg-gray-50"
              data-testid="learning-card"
            >
              <div className="text-sm text-gray-600">Course ID</div>
              <div className="font-mono" data-testid="learning-course-id">{e.course_id}</div>
              <div className="text-sm text-gray-600 mt-2">Lessons</div>
              <div className="font-medium" data-testid="learning-lesson-count">{d?.count ?? 0}</div>
              <div className="text-sm text-gray-600 mt-2">Next up</div>
              <div className="font-medium" data-testid="learning-next-title">{d?.nextTitle ?? ""}</div>
            </a>
          );
        })}
        {(!enrollments || enrollments.length === 0) && (
          <div className="text-gray-500">No enrollments yet.</div>
        )}
      </div>
    </main>
  );
}


