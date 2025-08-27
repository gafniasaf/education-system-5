export function setupServer(...initialHandlers: any[]) {
  const G: any = globalThis as any;
  const reg = (G.__MSW_REG__ = G.__MSW_REG__ || { defaults: [], current: [] });
  if (Array.isArray(initialHandlers)) reg.defaults = [...initialHandlers];
  return {
    listen: () => { reg.current = [...reg.defaults]; },
    use: (...handlers: any[]) => { reg.current.push(...handlers); },
    resetHandlers: () => { reg.current = [...reg.defaults]; },
    close: () => { reg.current = []; }
  } as any;
}
export const http: any = {
  get: (matcher: any, resolver: any) => ({ __msw: { method: 'GET', matcher, resolver } }),
  post: (matcher: any, resolver: any) => ({ __msw: { method: 'POST', matcher, resolver } })
};
export const HttpResponse: any = { json: (data: any, init?: any) => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' }, ...(init||{}) }) };


