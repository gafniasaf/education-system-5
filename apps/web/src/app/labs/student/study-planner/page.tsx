import { headers, cookies } from "next/headers";
import { serverFetch } from "@/lib/serverFetch";
import { createEnrollmentsGateway, createLessonsGateway } from "@/lib/data";
import Trans from "@/lib/i18n/Trans";

type Enrollment = { id: string; course_id: string };
type Lesson = { id: string; title: string; order_index: number; content?: string };

export default async function StudentStudyPlannerPage() {
  const h = headers();
  const cookieHeader = h.get("cookie") ?? "";
  const testAuth = h.get("x-test-auth") ?? cookies().get("x-test-auth")?.value;

  const baseHeaders: Record<string, string> = {
    ...(cookieHeader ? { cookie: cookieHeader } : {}),
    ...(testAuth ? { "x-test-auth": testAuth } : {}),
  };

  const enrollments = await createEnrollmentsGateway().list().catch(() => [] as Enrollment[]);

  if (!testAuth && !cookieHeader) {
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
      const lessonCount = Array.isArray(lessons) ? lessons.length : 0;
      const next = (Array.isArray(lessons) ? [...lessons] : []).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))[0];
      const totalChars = (Array.isArray(lessons) ? lessons : []).reduce((sum, l) => sum + ((l.content ?? "").length), 0);
      const roughReadingTimeMin = Math.ceil(totalChars / 1000);
      return { course_id: e.course_id, lessonCount, nextUpTitle: next?.title ?? "", roughReadingTimeMin };
    })
  );

  const byCourse = new Map(details.map((d) => [d.course_id, d] as const));

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold mb-4">Study planner</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="planner-grid">
        {(enrollments ?? []).map((e) => {
          const d = byCourse.get(e.course_id);
          return (
            <a
              key={e.id}
              href={`/dashboard/teacher/${e.course_id}`}
              className="border rounded p-3 hover:bg-gray-50"
              data-testid="planner-card"
            >
              <div className="text-sm text-gray-600">Course ID</div>
              <div className="font-mono" data-testid="planner-course-id">{e.course_id}</div>
              <div className="text-sm text-gray-600 mt-2">Lessons</div>
              <div className="font-medium" data-testid="planner-lesson-count">{d?.lessonCount ?? 0}</div>
              <div className="text-sm text-gray-600 mt-2">Next up</div>
              <div className="font-medium" data-testid="planner-next-title">{d?.nextUpTitle ?? ""}</div>
              <div className="text-sm text-gray-600 mt-2">Reading time (min)</div>
              <div className="font-medium" data-testid="planner-reading-min">{d?.roughReadingTimeMin ?? 0}</div>
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


