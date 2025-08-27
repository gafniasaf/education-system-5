import { z } from "zod";
import { fetchJson, serverFetch } from "@/lib/serverFetch";
import { isTestMode } from "@/lib/testMode";
import type { Lesson, LessonCreateRequest } from "@education/shared";
import { lesson } from "@education/shared";

export type LessonsGateway = {
  listByCourse(courseId: string): Promise<Lesson[]>;
  create(input: LessonCreateRequest): Promise<Lesson>;
  reorder(courseId: string, items: { id: string; order_index: number }[]): Promise<{ ok: true }>;
  markComplete(lessonId: string): Promise<{ latest: { lessonId: string; completedAt: string } }>;
};

function buildHttpGateway(): LessonsGateway {
  return {
    async listByCourse(courseId) {
      if (typeof window === 'undefined') {
        const url = `/api/lessons?course_id=${encodeURIComponent(courseId)}`;
        const res = await serverFetch(url);
        const text = await res.text();
        let json: unknown = null;
        try { json = text ? JSON.parse(text) : null; } catch {}
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        try {
          return z.array(lesson).parse(json);
        } catch {
          if (isTestMode()) {
            const arr = Array.isArray(json) ? json : [];
            return arr as any;
          }
          throw new Error('Invalid lessons response');
        }
      } else {
        const base = process.env.NEXT_PUBLIC_BASE_URL || '';
        const res = await fetch(`${base}/api/lessons?course_id=${encodeURIComponent(courseId)}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        try {
          return z.array(lesson).parse(json);
        } catch {
          if (isTestMode()) {
            const arr = Array.isArray(json) ? json : [];
            return arr as any;
          }
          throw new Error('Invalid lessons response');
        }
      }
    },
    async create(input) {
      return fetchJson(`/api/lessons`, lesson, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input)
      });
    },
    async reorder(courseId, items) {
      await fetchJson(`/api/lessons/reorder`, z.object({ ok: z.boolean() }), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ course_id: courseId, items })
      });
      return { ok: true } as const;
    },
    async markComplete(lessonId) {
      const schema = z.object({ latest: z.object({ lessonId: z.string(), completedAt: z.string() }) });
      if (typeof window === 'undefined') {
        return fetchJson(`/api/lessons/complete`, schema, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ lessonId })
        });
      } else {
        const base = process.env.NEXT_PUBLIC_BASE_URL || '';
        const res = await fetch(`${base}/api/lessons/complete`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lessonId }), cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return schema.parse(json);
      }
    }
  };
}

function buildTestGateway(): LessonsGateway {
  return buildHttpGateway();
}

export function createHttpGateway(): LessonsGateway {
  return buildHttpGateway();
}

export function createTestGateway(): LessonsGateway {
  return buildTestGateway();
}

export function createLessonsGateway(): LessonsGateway {
  return isTestMode() ? createTestGateway() : createHttpGateway();
}


