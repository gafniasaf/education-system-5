/**
 * Minimal in-memory metrics collector for p50/p95 route timings and error counts.
 * Intended for local/dev visibility. For production, wire to a metrics backend.
 */
type Sample = number;
type RouteKey = string;

const timings = new Map<RouteKey, Sample[]>();
const errors = new Map<RouteKey, number>();
const counters = new Map<string, number>();
const inFlight = new Map<RouteKey, number>();

function sanitizeKey(key: string): string {
  try {
    // Keep path only, strip query and collapse UUIDs to :id to control cardinality
    const url = new URL(key, 'http://local');
    const path = url.pathname || key;
    return path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/ig, ':id');
  } catch {
    return (key || '').split('?')[0].replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/ig, ':id');
  }
}

export function recordTiming(routeKey: RouteKey, ms: number) {
  const safeKey = sanitizeKey(routeKey);
  const arr = timings.get(safeKey) ?? [];
  arr.push(ms);
  if (arr.length > 1000) arr.shift();
  timings.set(safeKey, arr);
}

export function recordError(routeKey: RouteKey) {
  const safeKey = sanitizeKey(routeKey);
  errors.set(safeKey, (errors.get(safeKey) ?? 0) + 1);
}

export function incrInFlight(routeKey: RouteKey) {
  const safeKey = sanitizeKey(routeKey);
  inFlight.set(safeKey, (inFlight.get(safeKey) ?? 0) + 1);
}

export function decrInFlight(routeKey: RouteKey) {
  const safeKey = sanitizeKey(routeKey);
  const cur = (inFlight.get(safeKey) ?? 0) - 1;
  inFlight.set(safeKey, Math.max(0, cur));
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx] ?? sorted[sorted.length - 1] ?? 0;
}

export function snapshot() {
  const out: Record<string, any> = {};
  const keys = new Set<string>([...timings.keys(), ...errors.keys(), ...inFlight.keys()]);
  for (const k of keys) {
    const arr = timings.get(k) ?? [];
    out[k] = {
      count: arr.length,
      p50: percentile(arr, 50),
      p95: percentile(arr, 95),
      p99: percentile(arr, 99),
      errors: errors.get(k) ?? 0,
      in_flight: inFlight.get(k) ?? 0
    };
  }
  return out;
}

export function incrCounter(name: string, by: number = 1) {
  counters.set(name, (counters.get(name) ?? 0) + by);
}

export function getCounters() {
  return Object.fromEntries(counters.entries());
}


