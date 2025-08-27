function makeHandler(method: string, matcher: any, resolver: any) {
  return { __msw: { method, matcher, resolver } } as any;
}

export const http: any = {
  get: (matcher: any, resolver: any) => makeHandler('GET', matcher, resolver),
  post: (matcher: any, resolver: any) => makeHandler('POST', matcher, resolver)
};

export const HttpResponse: any = {
  json: (data: any, init?: any) => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' }, ...(init||{}) })
};


