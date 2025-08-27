import { headers, cookies } from "next/headers";
import { serverFetch } from "@/lib/serverFetch";
import { createEnrollmentsGateway, createLessonsGateway } from "@/lib/data";
import Trans from "@/lib/i18n/Trans";

type Enrollment = { id: string; course_id: string };
type Lesson = { id: string; title: string; order_index: number; content?: string };

function distributeOverSevenDays(totalMinutes: number): number[] {
  const base = Math.floor(Math.max(0, totalMinutes) / 7);
  const rem = Math.max(0, totalMinutes) % 7;
  const days = Array(7).fill(base);
  for (let i = 0; i < rem; i++) days[i] += 1;
  return days;
}

function buildCsv(rows: { course_id: string; days: number[]; total: number }[]) {
  const lines: string[] = [];
  const header = ["course_id", "day_1", "day_2", "day_3", "day_4", "day_5", "day_6", "day_7", "total"];
  lines.push(header.join(","));
  for (const r of rows) {
    lines.push([r.course_id, ...r.days.map(String), String(r.total)].join(","));
  }
  return `data:text/csv;charset=utf-8,${encodeURIComponent(lines.join("\n"))}`;
}

export default async function StudentStudyTimelinePage() {
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

  const perCourse = await Promise.all(
    (enrollments ?? []).map(async (e) => {
      const lessons: Lesson[] = await createLessonsGateway().listByCourse(e.course_id).catch(() => [] as Lesson[]);
      const totalChars = (Array.isArray(lessons) ? lessons : []).reduce((sum, l) => sum + ((l.content ?? "").length), 0);
      const totalMinutes = Math.ceil(totalChars / 1000);
      const days = distributeOverSevenDays(totalMinutes);
      return { course_id: e.course_id, days, total: totalMinutes };
    })
  );

  const totals = Array(7).fill(0);
  for (const r of perCourse) {
    for (let i = 0; i < 7; i++) totals[i] += r.days[i];
  }
  const grandTotal = totals.reduce((a, b) => a + b, 0);

  const csvHref = buildCsv(perCourse);

  return (
    <main className="p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Study timeline (7 days)</h1>
        <a className="underline" href={csvHref} download="study-timeline.csv" data-testid="timeline-csv-link"><Trans keyPath="actions.downloadCsv" fallback="Download CSV" /></a>
      </div>
      <table className="min-w-full border" data-testid="timeline-table">
        <thead>
          <tr className="bg-gray-50">
            <th className="border p-2 text-left">Course</th>
            {Array.from({ length: 7 }).map((_, i) => (
              <th key={i} className="border p-2 text-center">Day {i + 1}</th>
            ))}
            <th className="border p-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {(perCourse ?? []).map((r) => (
            <tr key={r.course_id} className="odd:bg-white even:bg-gray-50" data-testid="timeline-row">
              <td className="border p-2 font-mono" data-testid="cell-course-id">{r.course_id}</td>
              {r.days.map((v, i) => (
                <td key={i} className="border p-2 text-center" data-testid={`cell-day-${i + 1}`}>{v}</td>
              ))}
              <td className="border p-2 text-right" data-testid="timeline-total-minutes">{r.total}</td>
            </tr>
          ))}
          {(!enrollments || enrollments.length === 0) && (
            <tr>
              <td className="border p-3 text-gray-500" colSpan={9}>No enrollments yet.</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-medium">
            <td className="border p-2 text-right">Totals</td>
            {totals.map((v, i) => (
              <td key={i} className="border p-2 text-center">{v}</td>
            ))}
            <td className="border p-2 text-right">{grandTotal}</td>
          </tr>
        </tfoot>
      </table>
    </main>
  );
}


