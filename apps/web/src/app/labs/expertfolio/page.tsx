import { isExpertfolioEnabled } from "@/lib/features";
import { isTestMode } from "@/lib/testMode";

export default async function ExpertfolioPlaceholderPage() {
  // Guard expertfolio behind feature flag; disable entirely in test-mode to avoid vendor CSS errors
  if (isTestMode() || !isExpertfolioEnabled()) {
    return (
      <main className="p-6">
        <div className="text-gray-600">Expertfolio is disabled.</div>
      </main>
    );
  }
  // Dynamically import vendor UI only when enabled
  const { ExpertfolioProvider, ConnectedAdminAuditLogsPage, ConnectedFilesPage } = await import("@lovable/expertfolio-ui") as any;
  const { adminAuditLogsAdapter, filesAdapter } = await import("@lovable/expertfolio-adapters") as any;
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold mb-4">Expertfolio</h1>
      <ExpertfolioProvider adapters={{ adminAuditLogs: adminAuditLogsAdapter, files: filesAdapter }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="border rounded p-4">
            <h2 className="font-medium mb-3">Admin Audit Logs</h2>
            <ConnectedAdminAuditLogsPage />
          </section>
          <section className="border rounded p-4">
            <h2 className="font-medium mb-3">Files</h2>
            <ConnectedFilesPage />
          </section>
        </div>
      </ExpertfolioProvider>
    </main>
  );
}


