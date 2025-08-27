import { z } from "zod";
import { fetchJson } from "@/lib/serverFetch";
import { isTestMode } from "@/lib/testMode";

export type ReportsGateway = {
	engagement(course_id?: string): Promise<{ lessons: number; assignments: number; submissions: number }>;
	gradeDistribution(course_id?: string): Promise<{ total: number; average: number; dist: { bucket: string; count: number }[] }>;
	activity(opts?: { from?: string; to?: string; course_id?: string; limit?: number }): Promise<{ id: string; user_id: string | null; event_type: string; entity_type: string; entity_id: string; ts: string }[]>;
	retention(opts?: { from?: string; to?: string }): Promise<{ day: string; dau: number }[]>;
};

function buildHttpGateway(): ReportsGateway {
  return {
    async engagement(course_id) {
      const schema = z.object({ lessons: z.number(), assignments: z.number(), submissions: z.number() });
      const path = course_id ? `/api/reports/engagement?course_id=${encodeURIComponent(course_id)}` : `/api/reports/engagement`;
      return fetchJson(path, schema);
    },
    async gradeDistribution(course_id) {
      const schema = z.object({ total: z.number(), average: z.number(), dist: z.array(z.object({ bucket: z.string(), count: z.number() })) });
      const path = course_id ? `/api/reports/grade-distribution?course_id=${encodeURIComponent(course_id)}` : `/api/reports/grade-distribution`;
      return fetchJson(path, schema);
    },
		async activity(opts) {
			const schema = z.array(z.object({ id: z.string().uuid(), user_id: z.string().nullable(), event_type: z.string(), entity_type: z.string(), entity_id: z.string(), ts: z.string() }));
			const q = new URLSearchParams();
			if (opts?.from) q.set('from', opts.from);
			if (opts?.to) q.set('to', opts.to);
			if (opts?.course_id) q.set('course_id', opts.course_id);
			if (typeof opts?.limit === 'number') q.set('limit', String(opts.limit));
			const path = `/api/reports/activity${q.toString() ? `?${q.toString()}` : ''}`;
			return fetchJson(path, schema);
		},
		async retention(opts) {
			const schema = z.array(z.object({ day: z.string(), dau: z.number() }));
			const q = new URLSearchParams();
			if (opts?.from) q.set('from', opts.from);
			if (opts?.to) q.set('to', opts.to);
			const path = `/api/reports/retention${q.toString() ? `?${q.toString()}` : ''}`;
			return fetchJson(path, schema);
		}
  };
}

function buildTestGateway(): ReportsGateway {
  return {
    async engagement(course_id) {
      return { lessons: 12, assignments: 7, submissions: 19 };
    },
    async gradeDistribution(course_id) {
      return {
        total: 42,
        average: 84,
        dist: [
          { bucket: '90-100', count: 10 },
          { bucket: '80-89', count: 15 },
          { bucket: '70-79', count: 9 },
          { bucket: '0-69', count: 8 },
        ]
      };
    },
		async activity() {
			return [
				{ id: '11111111-1111-1111-1111-111111111111', user_id: '22222222-2222-2222-2222-222222222222', event_type: 'lesson.complete', entity_type: 'lesson', entity_id: 'L1', ts: new Date().toISOString() },
				{ id: '33333333-3333-3333-3333-333333333333', user_id: '22222222-2222-2222-2222-222222222222', event_type: 'assignment.submit', entity_type: 'assignment', entity_id: 'A1', ts: new Date(Date.now() - 60000).toISOString() }
			];
		},
		async retention() {
			const today = new Date();
			const day = (d: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - d).toISOString();
			return [
				{ day: day(6), dau: 10 },
				{ day: day(5), dau: 12 },
				{ day: day(4), dau: 15 },
				{ day: day(3), dau: 14 },
				{ day: day(2), dau: 18 },
				{ day: day(1), dau: 21 },
				{ day: day(0), dau: 24 }
			];
		}
  } as ReportsGateway;
}

export function createHttpGateway(): ReportsGateway {
  return buildHttpGateway();
}

export function createTestGateway(): ReportsGateway {
  return buildTestGateway();
}

export function createReportsGateway(): ReportsGateway {
  // In unit tests, prefer the HTTP gateway so tests can mock global.fetch
  if ((process as any)?.env?.JEST_WORKER_ID) return createHttpGateway();
  return isTestMode() ? createTestGateway() : createHttpGateway();
}


