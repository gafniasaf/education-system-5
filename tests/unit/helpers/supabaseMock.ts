export type SupabaseSelectResult = { data: any; error: any } | Promise<{ data: any; error: any }>;

export function supabaseError(message = 'db failed'): SupabaseSelectResult {
  return { data: null, error: { message } } as any;
}

export function supabaseOk(data: any): SupabaseSelectResult {
  return { data, error: null } as any;
}

/**
 * Build a minimal chainable supabase mock supporting `.from(tbl).select(...).eq(...).in(...).order(...).limit(...).single()`.
 * The resolver map keys are table names; values are handlers returning { data, error }.
 */
export function makeSupabaseMock(resolvers: Record<string, (params: Record<string, any>) => SupabaseSelectResult>) {
  const exec = async (tbl: string, params: Record<string, any>) => {
    const out = await (resolvers[tbl]?.(params) ?? supabaseOk(null));
    // Normalize to { data, count, error } shape when needed
    if (out && typeof out === 'object' && 'data' in out && 'error' in out) {
      return out as any;
    }
    return { data: out, count: 0, error: null } as any;
  };
  const chain = (tbl: string, params: Record<string, any> = {}) => {
    const obj: any = {
      select: (_sel?: string) => chain(tbl, { ...params, select: true }),
      eq: (k: string, v: any) => chain(tbl, { ...params, [k]: v, eq: { ...(params as any).eq, [k]: v } }),
      gte: (k: string, v: any) => chain(tbl, { ...params, gte: { ...(params as any).gte, [k]: v } }),
      lte: (k: string, v: any) => chain(tbl, { ...params, lte: { ...(params as any).lte, [k]: v } }),
      is: (k: string, v: any) => chain(tbl, { ...params, [k]: v }),
      in: (k: string, v: any[]) => chain(tbl, { ...params, [k]: v }),
      order: (_field: string, _opts?: any) => chain(tbl, params),
      limit: (_n: number) => chain(tbl, params),
      range: (_from: number, _to: number) => chain(tbl, params),
      insert: (row: any) => chain(tbl, { ...params, insert: row }),
      upsert: (row: any) => chain(tbl, { ...params, upsert: row }),
      update: (row: any) => chain(tbl, { ...params, update: row }),
      delete: () => chain(tbl, { ...params, delete: true }),
      single: async () => await exec(tbl, params),
      then: (onFulfilled: any, onRejected: any) => exec(tbl, params).then(onFulfilled, onRejected),
    };
    return obj;
  };
  return {
    from: (tbl: string) => ({
      select: (_sel?: string) => chain(tbl, { select: true }),
      // Allow chaining .is right after initial select for patterns like select(...).is(...)
      is: (k: string, v: any) => chain(tbl, { [k]: v }),
      insert: (row: any) => chain(tbl, { insert: row }),
      upsert: (row: any) => chain(tbl, { upsert: row }),
      update: (row: any) => chain(tbl, { update: row }),
      delete: () => chain(tbl, { delete: true }),
    }),
    // Minimal storage mock for routes using Supabase storage
    storage: {
      from: (_bucket: string) => ({
        createSignedUrl: async (_objectKey: string, _expires: number) => ({ data: { signedUrl: `/test-signed/${encodeURIComponent(_objectKey)}` }, error: null }),
        createSignedUploadUrl: async (_objectKey: string, _expires: number, _opts?: any) => ({ data: { url: `/test-upload/${encodeURIComponent(_objectKey)}`, path: _objectKey }, error: null }),
        list: async (_prefix: string, _opts?: any) => ({ data: [], error: null }),
        remove: async (_files: any[]) => ({ data: true, error: null })
      })
    }
  } as any;
}

// Default to an in-memory mock for unit tests; tests can replace via jest.spyOn on this module
let __DEFAULT = makeSupabaseMock({});
export function setDefaultSupabaseMock(resolvers: Record<string, (p: any) => SupabaseSelectResult>) {
  __DEFAULT = makeSupabaseMock(resolvers);
}
export function getRouteHandlerSupabase() {
  return __DEFAULT as any;
}
// Bridge to the real module, but allow tests to spy on our exported function and have routes use it
// eslint-disable-next-line @typescript-eslint/no-var-requires
const real = require('@/lib/supabaseServer');
const realGetCurrentUserInRoute = (real as any).getCurrentUserInRoute?.bind(real);
export function getCurrentUserInRoute(...args: any[]) {
  // Default behavior: delegate to original real implementation
  return realGetCurrentUserInRoute?.(...args);
}

try {
  // Route handlers will now call back into our exported fns, enabling jest.spyOn on this module
  (real as any).getRouteHandlerSupabase = () => (exports as any).getRouteHandlerSupabase();
  (real as any).getCurrentUserInRoute = (...args: any[]) => (exports as any).getCurrentUserInRoute(...args);
} catch {}


