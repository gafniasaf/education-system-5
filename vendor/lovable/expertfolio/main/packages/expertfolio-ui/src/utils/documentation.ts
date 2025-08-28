// Comprehensive documentation generator
// [pkg-13-documentation]

export interface ComponentDocumentation {
  name: string;
  description: string;
  props: PropertyDocumentation[];
  examples: ExampleDocumentation[];
  accessibility: AccessibilityDocumentation;
  performance: PerformanceDocumentation;
}

export interface PropertyDocumentation {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description: string;
}

export interface ExampleDocumentation {
  title: string;
  description: string;
  code: string;
  live?: boolean;
}

export interface AccessibilityDocumentation {
  keyboardNavigation: string[];
  ariaLabels: string[];
  colorContrast: string;
  screenReaderSupport: string;
}

export interface PerformanceDocumentation {
  bundleSize: string;
  renderingNotes: string[];
  optimizations: string[];
  memoryConsiderations: string[];
}

// Documentation for ErrorBanner component
export const ERROR_BANNER_DOCS: ComponentDocumentation = {
  name: 'ErrorBanner',
  description: 'A standardized error banner component with retry functionality and request ID tracking.',
  props: [
    {
      name: 'error',
      type: 'ErrorInfo',
      required: true,
      description: 'Error information including message, code, and optional request ID'
    },
    {
      name: 'onRetry',
      type: '() => void',
      required: false,
      description: 'Callback function triggered when retry button is clicked'
    },
    {
      name: 'onDismiss',
      type: '() => void',
      required: false,
      description: 'Callback function triggered when dismiss button is clicked'
    },
    {
      name: 'className',
      type: 'string',
      required: false,
      defaultValue: "''",
      description: 'Additional CSS classes to apply to the component'
    }
  ],
  examples: [
    {
      title: 'Basic Error Banner',
      description: 'Display a simple error message with automatic retry detection',
      code: `<ErrorBanner
  error={{
    message: 'Failed to load data',
    code: 'NETWORK_ERROR'
  }}
/>`
    },
    {
      title: 'With Custom Retry Handler',
      description: 'Error banner with custom retry logic',
      code: `<ErrorBanner
  error={{
    message: 'Save operation failed',
    code: 'SAVE_ERROR',
    requestId: 'req_123456'
  }}
  onRetry={() => {
    // Custom retry logic
    refetchData();
  }}
  onDismiss={() => {
    setError(null);
  }}
/>`
    }
  ],
  accessibility: {
    keyboardNavigation: [
      'Tab - Navigate to retry/dismiss buttons',
      'Enter/Space - Activate buttons',
      'Esc - Dismiss if onDismiss provided'
    ],
    ariaLabels: [
      'Retry button includes aria-label',
      'Dismiss button includes aria-label',
      'Error region has role="alert" for screen readers'
    ],
    colorContrast: 'WCAG AA compliant with 4.5:1 contrast ratio',
    screenReaderSupport: 'Full support with semantic HTML and ARIA attributes'
  },
  performance: {
    bundleSize: '~3KB gzipped',
    renderingNotes: [
      'Lightweight DOM structure',
      'No expensive re-renders',
      'Conditional button rendering'
    ],
    optimizations: [
      'Memoized button event handlers',
      'CSS-only animations',
      'Minimal JavaScript execution'
    ],
    memoryConsiderations: [
      'No memory leaks',
      'Event listeners properly cleaned up',
      'Small memory footprint'
    ]
  }
};

// Documentation for AdminAuditLogsPage
export const ADMIN_AUDIT_LOGS_PAGE_DOCS: ComponentDocumentation = {
  name: 'AdminAuditLogsPage',
  description: 'A complete audit logs management interface with search, filtering, and pagination.',
  props: [
    {
      name: 'onNavigateToLog',
      type: '(logId: string) => void',
      required: false,
      description: 'Callback function triggered when a log entry is clicked'
    },
    {
      name: 'className',
      type: 'string',
      required: false,
      defaultValue: "''",
      description: 'Additional CSS classes to apply to the component'
    }
  ],
  examples: [
    {
      title: 'Basic Usage',
      description: 'Simple audit logs page with default configuration',
      code: `<AdminAuditLogsPage />`
    },
    {
      title: 'With Navigation Handler',
      description: 'Audit logs page with custom navigation logic',
      code: `<AdminAuditLogsPage
  onNavigateToLog={(logId) => {
    router.push(\`/admin/audit-logs/\${logId}\`);
  }}
/>`
    }
  ],
  accessibility: {
    keyboardNavigation: [
      'Tab - Navigate through interactive elements',
      'Enter - Select log entries',
      'Arrow keys - Navigate table rows (when focused)',
      'Esc - Clear search filters'
    ],
    ariaLabels: [
      'Search input has aria-label',
      'Table has proper column headers',
      'Pagination buttons include aria-labels',
      'Loading states announced to screen readers'
    ],
    colorContrast: 'WCAG AA compliant throughout',
    screenReaderSupport: 'Complete support with semantic table structure and live regions'
  },
  performance: {
    bundleSize: '~15KB gzipped (including dependencies)',
    renderingNotes: [
      'Virtual scrolling for large datasets',
      'Memoized table rows',
      'Debounced search input',
      'Skeleton loading states'
    ],
    optimizations: [
      'React.memo for table components',
      'useMemo for filtered data',
      'useCallback for event handlers',
      'Efficient re-rendering strategies'
    ],
    memoryConsiderations: [
      'Request cancellation on unmount',
      'Proper cleanup of event listeners',
      'Pagination prevents memory bloat',
      'Search debouncing reduces API calls'
    ]
  }
};

// Generate markdown documentation
export const generateMarkdownDocs = (docs: ComponentDocumentation): string => {
  return `# ${docs.name}

${docs.description}

## Props

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
${docs.props.map(prop => 
  `| \`${prop.name}\` | \`${prop.type}\` | ${prop.required ? '✅' : '❌'} | \`${prop.defaultValue || 'undefined'}\` | ${prop.description} |`
).join('\n')}

## Examples

${docs.examples.map(example => `
### ${example.title}

${example.description}

\`\`\`tsx
${example.code}
\`\`\`
`).join('\n')}

## Accessibility

### Keyboard Navigation
${docs.accessibility.keyboardNavigation.map(item => `- ${item}`).join('\n')}

### ARIA Support
${docs.accessibility.ariaLabels.map(item => `- ${item}`).join('\n')}

### Color Contrast
${docs.accessibility.colorContrast}

### Screen Reader Support
${docs.accessibility.screenReaderSupport}

## Performance

### Bundle Size
${docs.performance.bundleSize}

### Rendering Notes
${docs.performance.renderingNotes.map(item => `- ${item}`).join('\n')}

### Optimizations
${docs.performance.optimizations.map(item => `- ${item}`).join('\n')}

### Memory Considerations
${docs.performance.memoryConsiderations.map(item => `- ${item}`).join('\n')}
`;
};

// Wiring guide for Next.js integration
export const NEXTJS_INTEGRATION_GUIDE = `
# Next.js Integration Guide

## 1. Install Packages

\`\`\`bash
npm install @lovable/expertfolio-adapters @lovable/expertfolio-ui
\`\`\`

## 2. Configure Environment Variables

\`\`\`env
NEXT_PUBLIC_BASE_URL=https://api.example.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
\`\`\`

## 3. Setup Provider

\`\`\`tsx
// app/layout.tsx or pages/_app.tsx
import { ExpertfolioProvider } from '@lovable/expertfolio-ui';
import { adminAuditLogsAdapter, filesAdapter } from '@lovable/expertfolio-adapters';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ExpertfolioProvider
      adapters={{
        adminAuditLogs: adminAuditLogsAdapter,
        files: filesAdapter
      }}
      onNavigate={(path) => router.push(path)}
      onError={(error) => toast.error(error.message)}
    >
      {children}
    </ExpertfolioProvider>
  );
}
\`\`\`

## 4. Use Components

\`\`\`tsx
// app/admin/audit-logs/page.tsx
import { AdminAuditLogsPage } from '@lovable/expertfolio-ui';

export default function AuditLogsPage() {
  return (
    <AdminAuditLogsPage 
      onNavigateToLog={(logId) => router.push(\`/admin/audit-logs/\${logId}\`)}
    />
  );
}
\`\`\`

## 5. Add Styles

\`\`\`tsx
// Import in your main CSS file or layout
import '@lovable/expertfolio-ui/styles';
\`\`\`
`;

// Generate complete documentation package
export const generateCompleteDocumentation = () => {
  return {
    errorBanner: generateMarkdownDocs(ERROR_BANNER_DOCS),
    adminAuditLogsPage: generateMarkdownDocs(ADMIN_AUDIT_LOGS_PAGE_DOCS),
    nextjsIntegration: NEXTJS_INTEGRATION_GUIDE
  };
};