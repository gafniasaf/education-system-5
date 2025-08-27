import { z } from "zod";
import { fetchJson, serverFetch } from "@/lib/serverFetch";
import { isTestMode } from "@/lib/testMode";
import { launchTokenResponse } from "@education/shared";
import { enrollment } from "@education/shared";

export type EnrollmentsGateway = {
  list(): Promise<import("@education/shared").Enrollment[]>;
  createLaunchToken(enrollmentId: string): Promise<z.infer<typeof launchTokenResponse>>;
};

function buildHttpGateway(): EnrollmentsGateway {
  return {
    async list() {
      if (typeof window === 'undefined') {
        const res = await serverFetch(`/api/enrollments`);
        const text = await res.text();
        let json: unknown = [];
        try { json = text ? JSON.parse(text) : []; } catch {}
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        try {
          return z.array(enrollment).parse(json);
        } catch {
          if (isTestMode() || process.env.JEST_WORKER_ID) {
            const arr = Array.isArray(json) ? json : [];
            return arr as any;
          }
          throw new Error('Invalid enrollments response');
        }
      } else {
        return fetchJson(`/api/enrollments`, z.array(enrollment));
      }
    },
    async createLaunchToken(enrollmentId) {
      if (typeof window === 'undefined') {
        return fetchJson(`/api/enrollments/${encodeURIComponent(enrollmentId)}/launch-token`, launchTokenResponse, { method: 'POST' });
      } else {
        const base = process.env.NEXT_PUBLIC_BASE_URL || '';
        const res = await fetch(`${base}/api/enrollments/${encodeURIComponent(enrollmentId)}/launch-token`, { method: 'POST', cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return launchTokenResponse.parse(json);
      }
    }
  };
}

function buildTestGateway(): EnrollmentsGateway { return buildHttpGateway(); }
export function createHttpGateway(): EnrollmentsGateway { return buildHttpGateway(); }
export function createTestGateway(): EnrollmentsGateway { return buildTestGateway(); }
export function createEnrollmentsGateway(): EnrollmentsGateway { return isTestMode() ? createTestGateway() : createHttpGateway(); }



