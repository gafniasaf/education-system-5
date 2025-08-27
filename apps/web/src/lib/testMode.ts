/**
 * Test mode helpers
 *
 * Utilities to determine test-mode and extract the simulated test role
 * from headers/cookies when running automated tests.
 *
 * Guard next/headers to avoid client bundle imports. These helpers are safe to be
 * imported by client code, but only access next/headers when running on the server.
 */
let cookies: any;
let headers: any;
try {
  const nh: any = require('next/headers');
  cookies = nh.cookies;
  headers = nh.headers;
} catch {}

export type TestRole = "teacher" | "student" | "parent" | "admin";

/** True if running under automated tests (Playwright/Jest). */
export function isTestMode(): boolean {
  // Prefer explicit env flags; fall back to a runtime global for Storybook/client usage
  if (process.env.TEST_MODE === "1") return true;
  if (process.env.NEXT_PUBLIC_TEST_MODE === "1") return true;
  // Heuristic: if a simulated test auth cookie/header is present, treat as test mode
  try {
    const val = cookies?.()?.get?.("x-test-auth")?.value ?? headers?.()?.get?.("x-test-auth") ?? undefined;
    if (val && typeof val === 'string' && val.length > 0) return true;
  } catch {}
  try {
    if (typeof window !== "undefined" && (window as any).__TEST_MODE__ === true) return true;
  } catch {}
  return !!process.env.PLAYWRIGHT;
}

/** True if MVP production guard is enabled (feature-limit non-MVP routes). */
export function isMvpProdGuardEnabled(): boolean {
  return process.env.MVP_PROD_GUARD === "1";
}

/** Feature flag: interactive runtime enablement. */
export function isInteractiveRuntimeEnabled(): boolean {
  return process.env.INTERACTIVE_RUNTIME === "1";
}

/** Return the role encoded in `x-test-auth` when in test mode. */
export function getTestRoleFromCookie(): TestRole | null {
  if (!isTestMode()) return null;
  let value: string | undefined;
  try { value = cookies?.()?.get?.("x-test-auth")?.value ?? headers?.()?.get?.("x-test-auth") ?? undefined; } catch {}
  if (!value && typeof document !== 'undefined') {
    try {
      const parts = document.cookie.split(';');
      for (const p of parts) {
        const [k, ...v] = p.trim().split('=');
        if (k === 'x-test-auth') { value = decodeURIComponent(v.join('=')); break; }
      }
    } catch {}
  }
  if (value === "teacher" || value === "student" || value === "parent" || value === "admin") return value;
  return null;
}

/** Throw if test-mode header is present in non-test environments */
export function assertNoTestHeaderInProd(): void {
  if (isTestMode()) return;
  try {
    const value = cookies?.()?.get?.("x-test-auth")?.value ?? headers?.()?.get?.("x-test-auth") ?? undefined;
    if (value) throw new Error("x-test-auth not allowed in production");
  } catch {}
}


