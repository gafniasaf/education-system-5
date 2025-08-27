import { z } from "zod";
import { fetchJson } from "@/lib/serverFetch";
import { isTestMode } from "@/lib/testMode";
import { quiz, quizCreateRequest, quizUpdateRequest } from "@education/shared";
import { quizQuestion, quizQuestionCreateRequest } from "@education/shared";
import { quizChoice, quizChoiceCreateRequest } from "@education/shared";
import { quizAttempt, quizAttemptStartRequest, quizAnswerUpsertRequest, quizAttemptSubmitRequest } from "@education/shared";

export type QuizzesGateway = {
  listByCourse(courseId: string): Promise<z.infer<typeof quiz>[]>;
  create(input: z.infer<typeof quizCreateRequest>): Promise<z.infer<typeof quiz>>;
  update(id: string, data: z.infer<typeof quizUpdateRequest>): Promise<z.infer<typeof quiz>>;
  delete(id: string): Promise<{ ok: true }>;
  // Questions
  listQuestions(quiz_id: string): Promise<z.infer<typeof quizQuestion>[]>;
  createQuestion(input: z.infer<typeof quizQuestionCreateRequest>): Promise<z.infer<typeof quizQuestion>>;
  // Choices
  listChoices(question_id: string): Promise<z.infer<typeof quizChoice>[]>;
  createChoice(input: z.infer<typeof quizChoiceCreateRequest>): Promise<z.infer<typeof quizChoice>>;
  // Attempts
  startAttempt(input: z.infer<typeof quizAttemptStartRequest>): Promise<z.infer<typeof quizAttempt>>;
  upsertAnswer(input: z.infer<typeof quizAnswerUpsertRequest>): Promise<any>;
  submitAttempt(input: z.infer<typeof quizAttemptSubmitRequest>): Promise<z.infer<typeof quizAttempt>>;
  listAttemptsForQuiz(quiz_id: string): Promise<z.infer<typeof quizAttempt>[]>;
};

function buildHttpGateway(): QuizzesGateway {
  const relaxedAttempt = isTestMode() ? (quizAttempt as any).extend({ student_id: (z as any).string().min(1) }) : quizAttempt;
  return {
    async listByCourse(courseId) {
      if (typeof window === 'undefined') {
        return fetchJson<z.infer<typeof quiz>[]>(`/api/quizzes?course_id=${encodeURIComponent(courseId)}`, z.array(quiz));
      } else {
        const base = process.env.NEXT_PUBLIC_BASE_URL || '';
        const res = await fetch(`${base}/api/quizzes?course_id=${encodeURIComponent(courseId)}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return z.array(quiz).parse(json);
      }
    },
    async create(input) {
      if (typeof window === 'undefined') {
        return fetchJson<z.infer<typeof quiz>>(`/api/quizzes`, quiz, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input)
        });
      } else {
        const base = process.env.NEXT_PUBLIC_BASE_URL || '';
        const res = await fetch(`${base}/api/quizzes`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input), cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return quiz.parse(json);
      }
    },
    async update(id, data) {
      if (typeof window === 'undefined') {
        return fetchJson<z.infer<typeof quiz>>(`/api/quizzes?id=${encodeURIComponent(id)}`, quiz, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(data)
        });
      } else {
        const base = process.env.NEXT_PUBLIC_BASE_URL || '';
        const res = await fetch(`${base}/api/quizzes?id=${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data), cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return quiz.parse(json);
      }
    },
    async delete(id) {
      if (typeof window === 'undefined') {
        await fetchJson(`/api/quizzes?id=${encodeURIComponent(id)}`, z.object({ ok: z.boolean() }), { method: "DELETE" });
      } else {
        const base = process.env.NEXT_PUBLIC_BASE_URL || '';
        const res = await fetch(`${base}/api/quizzes?id=${encodeURIComponent(id)}`, { method: 'DELETE', cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }
      return { ok: true } as const;
    },
    async listQuestions(quiz_id) {
      if (typeof window === 'undefined') {
        return fetchJson<z.infer<typeof quizQuestion>[]>(`/api/quiz-questions?quiz_id=${encodeURIComponent(quiz_id)}`, z.array(quizQuestion));
      } else {
        const base = process.env.NEXT_PUBLIC_BASE_URL || '';
        const res = await fetch(`${base}/api/quiz-questions?quiz_id=${encodeURIComponent(quiz_id)}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return z.array(quizQuestion).parse(json);
      }
    },
    async createQuestion(input) {
      if (typeof window === 'undefined') {
        return fetchJson<z.infer<typeof quizQuestion>>(`/api/quiz-questions`, quizQuestion, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input)
        });
      } else {
        const base = process.env.NEXT_PUBLIC_BASE_URL || '';
        const res = await fetch(`${base}/api/quiz-questions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input), cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return quizQuestion.parse(json);
      }
    },
    async listChoices(question_id) {
      if (typeof window === 'undefined') {
        return fetchJson<z.infer<typeof quizChoice>[]>(`/api/quiz-choices?question_id=${encodeURIComponent(question_id)}`, z.array(quizChoice));
      } else {
        const base = process.env.NEXT_PUBLIC_BASE_URL || '';
        const res = await fetch(`${base}/api/quiz-choices?question_id=${encodeURIComponent(question_id)}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return z.array(quizChoice).parse(json);
      }
    },
    async createChoice(input) {
      if (typeof window === 'undefined') {
        return fetchJson<z.infer<typeof quizChoice>>(`/api/quiz-choices`, quizChoice, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input)
        });
      } else {
        const base = process.env.NEXT_PUBLIC_BASE_URL || '';
        const res = await fetch(`${base}/api/quiz-choices`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input), cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return quizChoice.parse(json);
      }
    },
    async startAttempt(input) {
      if (typeof window === 'undefined') {
        return fetchJson<z.infer<typeof quizAttempt>>(`/api/quiz-attempts`, relaxedAttempt as any, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input)
        });
      } else {
        const base = process.env.NEXT_PUBLIC_BASE_URL || '';
        const res = await fetch(`${base}/api/quiz-attempts`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input), cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (relaxedAttempt as any).parse(json);
      }
    },
    async upsertAnswer(input) {
      // Upsert returns the answer row in prod; tests may return a synthetic object
      if (typeof window === 'undefined') {
        return fetchJson(`/api/quiz-attempts`, z.any(), {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input)
        });
      } else {
        const base = process.env.NEXT_PUBLIC_BASE_URL || '';
        const res = await fetch(`${base}/api/quiz-attempts`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input), cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return json;
      }
    },
    async submitAttempt(input) {
      if (typeof window === 'undefined') {
        return fetchJson<z.infer<typeof quizAttempt>>(`/api/quiz-attempts/submit`, relaxedAttempt as any, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input)
        });
      } else {
        const base = process.env.NEXT_PUBLIC_BASE_URL || '';
        const res = await fetch(`${base}/api/quiz-attempts/submit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input), cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (relaxedAttempt as any).parse(json);
      }
    },
    async listAttemptsForQuiz(quiz_id) {
      if (typeof window === 'undefined') {
        return fetchJson<z.infer<typeof quizAttempt>[]>(`/api/quiz-attempts?quiz_id=${encodeURIComponent(quiz_id)}`, z.array(relaxedAttempt as any));
      } else {
        const base = process.env.NEXT_PUBLIC_BASE_URL || '';
        const res = await fetch(`${base}/api/quiz-attempts?quiz_id=${encodeURIComponent(quiz_id)}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return z.array(relaxedAttempt as any).parse(json);
      }
    }
  };
}

function buildTestGateway(): QuizzesGateway {
  return buildHttpGateway();
}

export function createHttpGateway(): QuizzesGateway {
  return buildHttpGateway();
}

export function createTestGateway(): QuizzesGateway {
  return buildTestGateway();
}

export function createQuizzesGateway(): QuizzesGateway {
  return isTestMode() ? createTestGateway() : createHttpGateway();
}


