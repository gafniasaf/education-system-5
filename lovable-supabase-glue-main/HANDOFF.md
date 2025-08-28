# Expertfolio Integration Handoff

## What's Included

### Core Packages
- **`@lovable/expertfolio-adapters`**: Type-safe API adapters with retry logic, rate limiting, and MSW handlers
- **`@lovable/expertfolio-ui`**: Production-ready React components with accessibility, i18n, and mobile optimization

### Integration Assets
- **`MANIFEST.json`**: Versions, endpoints covered, DTO versions, Node/NPM requirements
- **`contracts/`**: JSON schemas for all adapters (audit-logs.v1, files.v1)
- **`demo/index.html`**: Interactive demo showing key pages with MSW handlers
- **Storybook build**: Available in `packages/expertfolio-ui/.storybook/`

## What You'll Need from Lovable

All packages are complete and production-ready. The integration should be straightforward with minimal changes needed.

## Integration Steps (Fast Path)

### 1. Unpack to Vendor Directory
```bash
# Extract to your vendor directory
unpack expertfolio-packages.zip to vendor/lovable/expertfolio/v1.0.0/
```

### 2. Environment Configuration
```bash
# .env.local or Vercel environment variables
FEATURE_EXPERTFOLIO=1
EXPERTFOLIO_API_BASE_URL=https://your-api.com
EXPERTFOLIO_TEST_MODE=false
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Wire Adapters in Data Layer
Create `apps/web/src/lib/data/expertfolio.ts`:

```typescript
import { 
  adminAuditLogsAdapter, 
  filesAdapter,
  setTestMode 
} from '../../../vendor/lovable/expertfolio/v1.0.0/packages/expertfolio-adapters/src';

// Configure for your environment
setTestMode(process.env.EXPERTFOLIO_TEST_MODE === 'true');

// Create forwarding wrapper that handles your specific needs
export const expertfolioAdapters = {
  adminAuditLogs: {
    async getLogs(params) {
      // Forward x-request-id from your request context
      const result = await adminAuditLogsAdapter.getLogs(params);
      
      // Read x-total-count from response headers if needed
      // Handle cookie/header pass-through for your auth system
      
      return result;
    }
  },
  files: {
    async finalizeUpload(request) {
      return await filesAdapter.finalizeUpload(request);
    },
    async getDownloadUrl(id) {
      return await filesAdapter.getDownloadUrl(id);
    }
  }
};
```

### 4. Mount Routes
Add to your routing configuration:

```typescript
// apps/web/src/app/labs/expertfolio/layout.tsx
import { FeatureFlag } from '@/components/FeatureFlag';

export default function ExpertfolioLayout({ children }) {
  return (
    <FeatureFlag flag="FEATURE_EXPERTFOLIO">
      <div className="expertfolio-layout">
        {children}
      </div>
    </FeatureFlag>
  );
}

// apps/web/src/app/labs/expertfolio/audit-logs/page.tsx
import { AdminAuditLogsPage } from '../../../../../vendor/lovable/expertfolio/v1.0.0/packages/expertfolio-ui/src';
import { expertfolioAdapters } from '@/lib/data/expertfolio';

export default function AuditLogsPage() {
  return (
    <AdminAuditLogsPage 
      adminAuditLogsAdapter={expertfolioAdapters.adminAuditLogs}
      onNavigateToLog={(logId) => router.push(`/labs/expertfolio/audit-logs/${logId}`)}
    />
  );
}
```

### 5. Add Role-Gated Navigation
```typescript
// Add to your navigation component
{userRole === 'admin' || userRole === 'teacher' ? (
  <NavItem href="/labs/expertfolio" icon={FlaskConical}>
    Expertfolio Labs
  </NavItem>
) : null}
```

### 6. Verify SSR Safety
The packages are built to be SSR-safe:
- No `window` access at import time
- Lazy chart loading
- Proper hydration boundaries

### 7. Deploy Configuration
```bash
# Vercel environment variables (preview)
FEATURE_EXPERTFOLIO=1
NEXT_PUBLIC_SUPABASE_URL=your_preview_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_preview_supabase_anon_key
```

## Pre-Deploy Guardrails

### CSP/Image Domains
If UI components pull external images/fonts, add domains to your Next.js config:

```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['your-cdn-domain.com']
  },
  // CSP headers if needed
};
```

### Rate Limit Behavior
The adapters include built-in retry logic with exponential backoff. Verify it works against your endpoints:

```typescript
// Test rate limiting behavior
import { RateLimitError } from './vendor/lovable/expertfolio/v1.0.0/packages/expertfolio-adapters/src';

try {
  await expertfolioAdapters.adminAuditLogs.getLogs(params);
} catch (error) {
  if (error instanceof RateLimitError) {
    // Handles Retry-After automatically
    console.log('Rate limited, will retry after:', error.rateLimitInfo.retryAfter);
  }
}
```

### Telemetry Integration
Map Expertfolio events to your telemetry system:

```typescript
// Map ef.* events to /api/runtime/events
import { trackEvent } from '@/lib/analytics';

// In your adapter wrappers
trackEvent('ef.audit_logs.viewed', { 
  // No PII in payloads
  count: result.data.total,
  filters: sanitizeFilters(params)
});
```

### Accessibility/Performance Check
- Run `axe` on key pages (components include ARIA labels)
- Verify no CLS on list pages (skeleton loaders included)
- Check mobile responsiveness (components are mobile-optimized)

## Testing

### Run Jest with MSW
```bash
cd vendor/lovable/expertfolio/v1.0.0/packages/expertfolio-adapters
npm test
```

### Smoke Test Preview Deploy
1. Deploy to preview with `FEATURE_EXPERTFOLIO=1`
2. Navigate to `/labs/expertfolio/audit-logs`
3. Verify MSW handlers work in development
4. Test API integration in preview

### Production Readiness
- [x] Type safety with Zod schemas
- [x] Error handling with retry logic
- [x] Rate limiting support
- [x] Accessibility (WCAG AA)
- [x] Internationalization ready
- [x] Mobile responsive
- [x] SSR compatible
- [x] Performance optimized

## Effort Estimate

**If contracts align**: 0.5–1 day
**If minor DTO/SSR tweaks needed**: 1–2 days

The packages are designed to integrate seamlessly with minimal customization required.

## Support

All components include comprehensive TypeScript definitions, Storybook documentation, and test coverage. The demo page provides interactive examples of all key functionality.