let client: any = null;

export function getRedis(): any | null {
	if (client !== null) return client;
	const url = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL || '';
	if (!url) { client = null; return client; }
	try {
		// Prefer ioredis if available; use guarded dynamic require to avoid bundling crashes in dev
		// eslint-disable-next-line @typescript-eslint/no-implied-eval
		const req: any = (Function('return require'))();
		const IORedis = req('ioredis');
		client = new IORedis(url);
		return client;
	} catch {
		client = null; return client;
	}
}

export async function redisSetWithTTL(key: string, ttlSec: number): Promise<boolean> {
	const r = getRedis();
	if (!r) return false;
	try {
		await r.set(key, '1', 'EX', ttlSec, 'NX');
		const exists = await r.get(key);
		return exists === '1';
	} catch { return false; }
}

export async function redisIncrWithWindow(key: string, windowMs: number): Promise<{ count: number; resetAt: number } | null> {
	const r = getRedis();
	if (!r) return null;
	try {
		const ttlSec = Math.max(1, Math.ceil(windowMs / 1000));
		const pipeline = r.multi();
		pipeline.incr(key);
		pipeline.ttl(key);
		const resp = await pipeline.exec();
		const count = Number(resp?.[0]?.[1] ?? 1);
		let ttl = Number(resp?.[1]?.[1] ?? -1);
		if (ttl < 0) {
			await r.expire(key, ttlSec);
			ttl = ttlSec;
		}
		const resetAt = Date.now() + ttl * 1000;
		return { count, resetAt };
	} catch { return null; }
}


