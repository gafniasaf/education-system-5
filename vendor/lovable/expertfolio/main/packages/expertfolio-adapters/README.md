# @lovable/expertfolio-adapters

HTTP adapters and DTOs for Expertfolio with Zod validation, MSW mocking, and comprehensive testing.

## Features

- 🔄 HTTP adapters with retry logic and rate limiting
- 📝 Zod-validated DTOs with test mode relaxations
- 🧪 MSW handlers for comprehensive testing
- 🔧 TypeScript-first with full type safety
- 📦 Framework-agnostic (works with Next.js, Vite, etc.)

## Installation

```bash
npm install @lovable/expertfolio-adapters
```

## Quick Start

```typescript
import { adminAuditLogsAdapter, filesAdapter, setTestMode } from '@lovable/expertfolio-adapters';

// Enable test mode for relaxed validation
setTestMode(true);

// Fetch audit logs
const logs = await adminAuditLogsAdapter.getLogs({
  limit: 10,
  actor_id: 'user_123'
});

// Finalize file upload
await filesAdapter.finalizeUpload({
  key: 'uploaded-file-key',
  size_bytes: 1024
});
```

## Configuration

Set environment variables:

```bash
# Next.js style (preferred)
NEXT_PUBLIC_BASE_URL=https://api.example.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Vite style (fallback)
VITE_BASE_URL=https://api.example.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Available Adapters

### Admin Audit Logs

```typescript
import { adminAuditLogsAdapter } from '@lovable/expertfolio-adapters';

// Get logs with filtering and pagination
const logs = await adminAuditLogsAdapter.getLogs({
  limit: 20,
  offset: 0,
  actor_id: 'user_123',
  action: 'create_assignment',
  from_date: '2024-01-01T00:00:00Z',
  to_date: '2024-01-31T23:59:59Z'
});

// Get single log by ID
const log = await adminAuditLogsAdapter.getLogById('audit_001');
```

### Files

```typescript
import { filesAdapter } from '@lovable/expertfolio-adapters';

// Finalize uploaded file
await filesAdapter.finalizeUpload({
  key: 'file-storage-key',
  size_bytes: 2048
});

// Get download URL
const downloadInfo = await filesAdapter.getDownloadUrl({
  id: 'file_001'
});
console.log(downloadInfo.url, downloadInfo.filename);
```

## Testing with MSW

```typescript
import { mswHandlers, setupMSW } from '@lovable/expertfolio-adapters/msw';
import { setupServer } from 'msw/node';

// Setup MSW server
const server = setupServer(...mswHandlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Or use the convenience function
setupMSW();
```

## Test Mode

Enable test mode to relax validation for testing:

```typescript
import { setTestMode } from '@lovable/expertfolio-adapters';

// Enable relaxed validation
setTestMode(true);

// Now accepts non-UUID IDs, relative URLs, etc.
const logs = await adminAuditLogsAdapter.getLogs();
```

Test mode relaxations:
- `id` fields accept any non-empty string (not just UUIDs)
- `url` fields accept relative URLs
- Optional fields in file responses
- Nullable entity fields in audit logs

## Error Handling

All adapters return typed errors with context:

```typescript
try {
  const logs = await adminAuditLogsAdapter.getLogs();
} catch (error) {
  if (error.message.includes('Rate limit')) {
    // Handle rate limiting
  } else if (error.message.includes('Network')) {
    // Handle network errors
  }
}
```

## TypeScript Support

Full TypeScript support with inferred types:

```typescript
import type { 
  AuditLogEntry, 
  AuditLogsQuery,
  FileFinalizeRequest 
} from '@lovable/expertfolio-adapters';

const query: AuditLogsQuery = {
  limit: 10,
  actor_id: 'user_123'
};

const logs: AuditLogEntry[] = await adminAuditLogsAdapter.getLogs(query);
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build package
npm run build

# Lint
npm run lint
```

## API Reference

See the full [API documentation](./docs/api.md) for detailed information about all adapters, schemas, and options.