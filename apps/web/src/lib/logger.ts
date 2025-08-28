/**
 * Pino logger with optional pretty transport for local development.
 *
 * Set `PINO_PRETTY=1` to enable pretty logs when not running in CI.
 * Use `getRequestLogger(requestId)` to attach tracing context.
 */
import pino from "pino";
import crypto from "crypto";

const isCI = process.env.CI === "true" || process.env.CI === "1";
const wantPretty = process.env.PINO_PRETTY === "1";
const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");
export const logger = pino(
  wantPretty && !isCI
    ? {
        level,
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard", singleLine: true }
        },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["x-test-auth"]',
            'headers.authorization',
            'headers.cookie',
            'headers["x-test-auth"]',
            'body.password',
            'body.token',
            // Additional PII fields (security audit)
            'body.email',
            'message.body',
            'attachments.object_key',
            // Common credential/env leakage
            'env.NEXT_RUNTIME_PRIVATE_KEY',
            'env.NEXT_RUNTIME_PUBLIC_KEY',
            'env.NEXT_RUNTIME_SECRET',
            'env.NEXT_PUBLIC_SUPABASE_ANON_KEY',
            // User identifiers in logs
            'user.id',
            'payload.user_id'
          ],
          censor: '[REDACTED]'
        }
      }
    : {
        level,
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["x-test-auth"]',
            'headers.authorization',
            'headers.cookie',
            'headers["x-test-auth"]',
            'body.password',
            'body.token',
            // Additional PII fields (security audit)
            'body.email',
            'message.body',
            'attachments.object_key',
            // Common credential/env leakage
            'env.NEXT_RUNTIME_PRIVATE_KEY',
            'env.NEXT_RUNTIME_PUBLIC_KEY',
            'env.NEXT_RUNTIME_SECRET',
            'env.NEXT_PUBLIC_SUPABASE_ANON_KEY',
            // User identifiers in logs
            'user.id',
            'payload.user_id'
          ],
          censor: '[REDACTED]'
        }
      }
);

/** One-way hash for correlating identifiers without logging raw values. */
export function hashIdentifier(value: string): string {
  try {
    return crypto.createHash('sha256').update(String(value)).digest('hex');
  } catch {
    return String(value);
  }
}

/** Return a child logger bound to a given request id. */
export function getRequestLogger(requestId: string) {
  const dev = process.env.DEV_ID || undefined;
  const branch = process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_REF_NAME || undefined;
  const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || undefined;
  return logger.child({ requestId, dev, branch, commit });
}

/** Child logger that also binds a hashed user id for correlation without PII. */
export function getUserLogger(requestId: string, userId?: string | null) {
  const base = getRequestLogger(requestId);
  if (!userId) return base;
  const uidHash = hashIdentifier(String(userId));
  return (base as any).child ? (base as any).child({ uidHash }) : base;
}


