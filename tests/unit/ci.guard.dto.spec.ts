import fs from 'fs';
import path from 'path';

/**
 * Guardrail test: ensure all JSON API routes set x-request-id via jsonDto or headers.set.
 * This is a heuristic static test to raise awareness in CI when new routes lack tracing.
 */
describe('CI guard: x-request-id on 2xx JSON routes', () => {
  test('route files reference jsonDto or set x-request-id', () => {
    const root = path.resolve(__dirname, '../../apps/web/src/app/api');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir)) {
        const p = path.join(dir, entry);
        const stat = fs.statSync(p);
        if (stat.isDirectory()) walk(p);
        else if (/route\.(ts|tsx)$/.test(entry)) files.push(p);
      }
    };
    walk(root);
    const offenders: string[] = [];
    for (const f of files) {
      const txt = fs.readFileSync(f, 'utf8');
      const mentionsJsonDto = /jsonDto\(/.test(txt);
      const setsHeader = /headers\.set\(['\"]x-request-id['\"]/.test(txt) || /'x-request-id'\s*:\s*/.test(txt);
      if (!mentionsJsonDto && !setsHeader) offenders.push(path.relative(process.cwd(), f));
    }
    // Only warn via test failure list; developers can mark exceptions per route if needed.
    expect(offenders).toEqual([]);
  });
});


