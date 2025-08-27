import { headers, cookies } from "next/headers";
import { serverFetch } from "@/lib/serverFetch";
import { createEnrollmentsGateway, createLessonsGateway } from "@/lib/data";
import Trans from "@/lib/i18n/Trans";
import { isTestMode } from "@/lib/testMode";

type Enrollment = { id: string; course_id: string };
type Lesson = { id: string; title: string; order_index: number; content?: string };

function toCsvValue(value: string | number | null | undefined) {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export default async function StudentStudyDigestPage() {
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

  const perCourse = await Promise.all(
    (enrollments ?? []).map(async (e) => {
      const lessons: Lesson[] = await createLessonsGateway().listByCourse(e.course_id).catch(() => [] as Lesson[]);
      const sorted = (Array.isArray(lessons) ? [...lessons] : []).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      const nextThree = sorted.slice(0, 3);
      const totalChars = nextThree.reduce((sum, l) => sum + ((l.content ?? "").length), 0);
      const readingMin = Math.ceil(totalChars / 1000);
      return { course_id: e.course_id, nextThree, readingMin };
    })
  );

  // Build CSV: one row per next lesson with readingMin repeated for the course
  const csvLines = [
    ["course_id", "order_index", "title", "readingMin"].map(toCsvValue).join(",")
  ];
  for (const row of perCourse) {
    for (const l of row.nextThree) {
      csvLines.push([
        toCsvValue(row.course_id),
        toCsvValue(l.order_index),
        toCsvValue(l.title),
        toCsvValue(row.readingMin)
      ].join(","));
    }
  }
  const csvContent = csvLines.join("\n");
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;

  return (
    <main className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Study digest</h1>
        <a className="underline" href={csvHref} download="study-digest.csv" data-testid="digest-csv-link"><Trans keyPath="actions.downloadCsv" fallback="Download CSV" /></a>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="digest-grid">
        {(perCourse ?? []).map((d) => (
          <div key={d.course_id} className="border rounded p-3" data-testid="digest-card">
            <div className="text-sm text-gray-600">Course ID</div>
            <div className="font-mono" data-testid="digest-course-id">{d.course_id}</div>
            <div className="text-sm text-gray-600 mt-2">Next up</div>
            <ul className="list-disc list-inside">
              {d.nextThree.map((l) => (
                <li key={l.id} data-testid="digest-next-title">{l.title}</li>
              ))}
              {d.nextThree.length === 0 && <li className="text-gray-500" data-testid="digest-next-title"></li>}
            </ul>
            <div className="text-sm text-gray-600 mt-2">Reading time (min)</div>
            <div className="font-medium" data-testid="digest-reading-min">{d.readingMin}</div>
          </div>
        ))}
        {(!enrollments || enrollments.length === 0) && (
          <div className="text-gray-500">No enrollments yet.</div>
        )}
      </div>
    </main>
  );
}


