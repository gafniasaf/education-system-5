# @lovable/expertfolio-ui

Framework-agnostic UI components and pages for Expertfolio with comprehensive accessibility, performance optimizations, and documentation.

## 🚀 Features

- **Accessible by Design**: WCAG 2.1 AA compliant components with keyboard navigation and screen reader support
- **Performance Optimized**: Virtual scrolling, lazy loading, and optimized rendering strategies
- **Framework Agnostic**: Works with Next.js, Vite, or any React application
- **Type Safe**: Full TypeScript support with comprehensive type definitions
- **Feature Flags**: Runtime configuration and kill switches for production safety
- **Storybook Ready**: Complete component documentation and interactive examples

## 📦 Installation

```bash
npm install @lovable/expertfolio-ui @lovable/expertfolio-adapters
```

## 🎯 Quick Start

### 1. Setup Provider

```tsx
import { ExpertfolioProvider } from '@lovable/expertfolio-ui';
import { adminAuditLogsAdapter, filesAdapter } from '@lovable/expertfolio-adapters';

function App() {
  return (
    <ExpertfolioProvider
      adapters={{
        adminAuditLogs: adminAuditLogsAdapter,
        files: filesAdapter
      }}
      onNavigate={(path) => router.push(path)}
      onError={(error) => console.error(error)}
    >
      <YourApp />
    </ExpertfolioProvider>
  );
}
```

### 2. Import Styles

```tsx
import '@lovable/expertfolio-ui/styles';
```

### 3. Use Components

```tsx
import { AdminAuditLogsPage, ErrorBanner, FileInput } from '@lovable/expertfolio-ui';

function AuditLogsPage() {
  return (
    <AdminAuditLogsPage 
      onNavigateToLog={(logId) => router.push(`/logs/${logId}`)}
    />
  );
}
```

## 🧩 Components

### Error Handling
- **ErrorBanner**: Standardized error display with retry functionality
- **EmptyState**: User-friendly empty state with call-to-action

### File Management
- **FileInput**: Advanced file upload with validation and progress tracking

### Loading States
- **LoadingState**: Configurable loading indicators (spinner, dots, skeleton)
- **TableSkeleton**: Optimized skeleton for table loading states

### Utilities
- **Accessibility**: ARIA helpers, focus management, keyboard navigation
- **Performance**: Virtual scrolling, lazy loading, optimization utilities
- **Feature Flags**: Runtime configuration and emergency kill switches

## 📄 Pages

### AdminAuditLogsPage
Complete audit logs interface with:
- Real-time search and filtering
- Pagination and virtual scrolling
- Export functionality
- Accessibility optimized

```tsx
<AdminAuditLogsPage 
  onNavigateToLog={(logId) => navigate(`/logs/${logId}`)}
  className="custom-styles"
/>
```

### FilesPage
File management interface with:
- Drag & drop upload
- Progress tracking
- Download functionality
- Validation and error handling

```tsx
<FilesPage 
  onFileUploaded={(fileKey) => console.log('Uploaded:', fileKey)}
/>
```

## ♿ Accessibility

All components follow WCAG 2.1 AA guidelines:

- **Keyboard Navigation**: Full keyboard support with logical tab order
- **Screen Reader Support**: Semantic HTML and ARIA attributes
- **Color Contrast**: 4.5:1 minimum contrast ratio
- **Focus Management**: Visible focus indicators and focus trapping
- **Live Regions**: Dynamic content announcements

```tsx
import { AriaLiveRegion, useFocusTrap, SkipToContent } from '@lovable/expertfolio-ui';

// Announce dynamic changes
AriaLiveRegion.announce('Data loaded successfully', 'polite');

// Focus trap for modals
const trapRef = useFocusTrap(isModalOpen);

// Skip to main content
<SkipToContent targetId="main-content" />
```

## ⚡ Performance

### Virtual Scrolling
```tsx
import { useVirtualScroll } from '@lovable/expertfolio-ui';

const { visibleItems, scrollElementRef, handleScroll } = useVirtualScroll({
  items: largeDataset,
  containerHeight: 400,
  itemHeight: 50
});
```

### Lazy Loading
```tsx
import { useLazyLoading, OptimizedImage } from '@lovable/expertfolio-ui';

const { elementRef, isVisible } = useLazyLoading();

<OptimizedImage
  src="/large-image.jpg"
  alt="Description"
  lazy={true}
  fallback="/placeholder.svg"
/>
```

### Debounced State
```tsx
import { useDebouncedState } from '@lovable/expertfolio-ui';

const [debouncedSearch, setSearch, immediateValue] = useDebouncedState('', 300);
```

## 🚩 Feature Flags

Control features at runtime with comprehensive flag management:

```tsx
import { useFeatureFlags, FeatureGate, withFeatureFlag } from '@lovable/expertfolio-ui';

// Hook usage
const { isFeatureEnabled, updateConfig, emergencyDisable } = useFeatureFlags();

// Component wrapper
<FeatureGate feature="FEATURE_AUDIT_LOGS" fallback={<div>Feature disabled</div>}>
  <AdminAuditLogsPage />
</FeatureGate>

// HOC usage
const GatedComponent = withFeatureFlag('FEATURE_EXPERTFOLIO')(MyComponent);

// Emergency disable
emergencyDisable('FEATURE_REAL_TIME_UPDATES');
```

## 🎨 Storybook

Run Storybook for interactive component documentation:

```bash
cd packages/expertfolio-ui
npm run storybook
```

## 🧪 Testing

Components include comprehensive test suites:

```bash
npm run test          # Run all tests
npm run test:ci       # CI mode with coverage
```

## 📊 Bundle Analysis

Monitor bundle sizes and performance:

```tsx
import { checkBundleSize } from '@lovable/expertfolio-ui';

checkBundleSize('AdminAuditLogsPage', 50); // 50KB limit
```

## 🔧 Configuration

### Environment Variables

```env
# Feature Flags
NEXT_PUBLIC_FEATURE_EXPERTFOLIO=true
NEXT_PUBLIC_FEATURE_AUDIT_LOGS=true
NEXT_PUBLIC_FEATURE_FILE_MANAGEMENT=true

# Performance Settings  
NEXT_PUBLIC_ENABLE_VIRTUAL_SCROLLING=true
NEXT_PUBLIC_MAX_TABLE_ROWS=100
```

### Runtime Configuration

```tsx
import { featureFlagManager } from '@lovable/expertfolio-ui';

featureFlagManager.updateConfig({
  performance: {
    enableVirtualScrolling: true,
    maxTableRows: 200
  },
  accessibility: {
    enableHighContrast: true,
    announceChanges: true
  }
});
```

## 📚 Integration Guides

### Next.js App Router

```tsx
// app/layout.tsx
import { ExpertfolioProvider } from '@lovable/expertfolio-ui';
import '@lovable/expertfolio-ui/styles';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ExpertfolioProvider adapters={adapters}>
          {children}
        </ExpertfolioProvider>
      </body>
    </html>
  );
}
```

### Vite/React

```tsx
// main.tsx
import { ExpertfolioProvider } from '@lovable/expertfolio-ui';
import '@lovable/expertfolio-ui/styles';

ReactDOM.render(
  <ExpertfolioProvider adapters={adapters}>
    <App />
  </ExpertfolioProvider>,
  document.getElementById('root')
);
```

## 📖 API Reference

See the complete [API documentation](./docs/api.md) for detailed information about all components, props, and utilities.

## 🤝 Contributing

1. Follow accessibility guidelines (WCAG 2.1 AA)
2. Include comprehensive tests
3. Add Storybook stories for new components
4. Update documentation
5. Performance budgets: <50KB per component

## 📄 License

MIT License - see LICENSE file for details.