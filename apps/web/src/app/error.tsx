"use client";

import React, { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    try {
      const rid = (document?.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('x-request-id='))?.split('=')[1] || undefined;
      fetch('/api/internal/log', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ level: 'error', message: error?.message || 'unknown_error', requestId: rid || null }) }).catch(() => {});
    } catch {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="p-8 max-w-2xl mx-auto" aria-live="polite">
          <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-700 mb-4">An unexpected error occurred. You can try again, or go back to the dashboard.</p>
          {error?.digest ? (
            <p className="text-xs text-gray-500 mb-4">Reference: {error.digest}</p>
          ) : null}
          <div className="flex items-center gap-3">
            <button onClick={() => reset()} className="rounded bg-black text-white px-3 py-1 text-sm">Try again</button>
            <a href="/dashboard" className="underline text-sm">Back to dashboard</a>
          </div>
        </main>
      </body>
    </html>
  );
}


