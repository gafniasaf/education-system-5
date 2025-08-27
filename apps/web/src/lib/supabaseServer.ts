/**
 * Supabase server helpers
 *
 * Centralizes creation of Supabase clients for Server Components and
 * Route Handlers, and helpers to obtain the current user. In test mode,
 * user identity can be simulated via the `x-test-auth` header/cookie.
 */
// Guarded imports to avoid pulling server-only modules into client bundles
// By keeping this file server-only referenced from server components or route handlers,
// we still avoid client usage, but Next's bundler sometimes follows transitive imports via
// client components. Use dynamic require to harden against accidental inclusion.
let cookies: any;
let headers: any;
try {
  const nh: any = require('next/headers');
  cookies = nh.cookies;
  headers = nh.headers;
} catch {
  // No-op in non-server contexts; functions below should not be called client-side
}
import { isTestMode } from "@/lib/testMode";
import { createServerComponentClient, createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { env } from "@/lib/env";
import type { NextRequest } from "next/server";

/** Create a Supabase client for use in Server Components. */
export function getServerComponentSupabase() {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createServerComponentClient({ cookies }, { supabaseUrl, supabaseKey });
}

/** Create a Supabase client for use in Route Handlers. */
export function getRouteHandlerSupabase() {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createRouteHandlerClient({ cookies }, { supabaseUrl, supabaseKey });
}

type CurrentUser = { id: string; email: string; user_metadata?: Record<string, unknown> } | null;

/**
 * Get the current authenticated user in a Server Component context.
 * In test mode, returns a simulated user based on `x-test-auth`.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const cookieStore = cookies();
  const testAuth = cookieStore.get("x-test-auth")?.value ?? headers().get("x-test-auth") ?? undefined;
  if (isTestMode() && (testAuth === "teacher" || testAuth === "student" || testAuth === "parent" || testAuth === "admin")) {
    const email = `${testAuth}@example.com`;
    // Align with tests that expect deterministic ids like 'test-student-id'
    const roleToId: Record<string, string> = {
      teacher: "test-teacher-id",
      student: "test-student-id",
      parent:  "test-parent-id",
      admin:   "test-admin-id",
    };
    const id = roleToId[testAuth];
    return { id, email, user_metadata: { role: testAuth } };
  }
  const supabase = getServerComponentSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user as any;
}

/**
 * Get the current authenticated user in a Route Handler context.
 * In test mode, returns a simulated user based on `x-test-auth`.
 */
export async function getCurrentUserInRoute(req?: NextRequest): Promise<CurrentUser> {
  const cookieStore = cookies();
  const hdrs = req?.headers ?? headers();
  const testAuth = cookieStore.get("x-test-auth")?.value ?? hdrs.get("x-test-auth") ?? undefined;
  if (isTestMode() && (testAuth === "teacher" || testAuth === "student" || testAuth === "parent" || testAuth === "admin")) {
    const email = `${testAuth}@example.com`;
    const roleToId: Record<string, string> = {
      teacher: "test-teacher-id",
      student: "test-student-id",
      parent:  "test-parent-id",
      admin:   "test-admin-id",
    };
    const id = roleToId[testAuth];
    return { id, email, user_metadata: { role: testAuth } };
  }
  const supabase = getRouteHandlerSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user as any;
}


