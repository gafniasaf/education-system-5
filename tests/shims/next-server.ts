export type NextRequest = Request;

export class NextResponse extends Response {
  cookies: { set: (name: string, value: string, opts?: any) => void };
  constructor(body?: BodyInit | null, init?: ResponseInit) {
    super(body as any, init);
    (this as any).cookies = { set: (_name: string, _value: string, _opts?: any) => {} };
  }
  static json(body: any, init?: any) {
    const res = new NextResponse(JSON.stringify(body), {
      ...(init || {}),
      headers: { 'content-type': 'application/json', ...(init?.headers || {}) }
    } as any);
    return res as any;
  }
  static next(init?: any) {
    // Minimal shim returning a Response-like object with headers map
    const res = new NextResponse(null, { status: 200, headers: new Headers() } as any);
    if (init?.request?.headers) {
      // no-op: tests may inspect returned headers only
    }
    return res as any;
  }
}

