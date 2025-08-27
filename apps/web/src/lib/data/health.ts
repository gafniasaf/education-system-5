import { z } from "zod";
import { fetchJson } from "@/lib/serverFetch";

export type Health = { ok: boolean; ts: number; testMode?: boolean } & Record<string, any>;

export type HealthGateway = {
	get(): Promise<Health>;
};

function buildHttpGateway(): HealthGateway {
	return {
		async get() {
			if (typeof window === 'undefined') {
				return fetchJson(`/api/health`, z.any());
			} else {
				const base = process.env.NEXT_PUBLIC_BASE_URL || '';
				const url = `${base}/api/health`;
				const res = await fetch(url, { cache: 'no-store' });
				const json = await res.json();
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return z.any().parse(json) as any;
			}
		}
	};
}

export function createHttpGateway(): HealthGateway { return buildHttpGateway(); }
export function createTestGateway(): HealthGateway { return buildHttpGateway(); }
export function createHealthGateway(): HealthGateway { return buildHttpGateway(); }


