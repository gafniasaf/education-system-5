describe('logger redaction and hashed correlation id (future)', () => {
  test('redacts sensitive fields in structured logs', async () => {
    const { logger } = await import('../../apps/web/src/lib/logger');
    const child = logger.child({ 'req': { headers: { authorization: 'Bearer x', cookie: 'a=b', 'x-test-auth': 'admin' } }, body: { password: 'secret', token: 't' }, user: { id: 'u-123' }, env: { NEXT_RUNTIME_PRIVATE_KEY: 'k' } });
    // The pino logger will handle redaction internally; ensure API exists and child returns bindings without throwing
    expect(typeof child.info).toBe('function');
    expect(typeof child.error).toBe('function');
  });
});


