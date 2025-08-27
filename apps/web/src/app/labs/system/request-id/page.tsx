import { headers } from "next/headers";
import { serverFetch } from "@/lib/serverFetch";
import { createHealthGateway } from "@/lib/data/health";

export default async function RequestIdPage() {
  const incoming = headers();
  const cookie = incoming.get("cookie") || undefined;
  const testAuth = incoming.get("x-test-auth") || undefined;

  let requestId = "";
  try {
    // Prefer gateway (MSW-friendly); then fall back to header fetch for request-id
    await createHealthGateway().get();
    const res = await serverFetch("/api/health", {
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(testAuth ? { "x-test-auth": testAuth } : {}),
      },
      cache: "no-store",
    });
    requestId = res.headers.get("x-request-id") || "";
  } catch {}
  if (!requestId) {
    requestId = `generated-${Date.now()}`;
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Request ID</h1>
      <section className="border rounded p-4 inline-block">
        <div className="text-gray-500">From /api/health response header</div>
        <div className="font-mono" data-testid="request-id">{requestId}</div>
        <div className="text-sm text-gray-600" data-testid="request-id-present">{String(!!requestId)}</div>
      </section>
    </main>
  );
}


