# Expertfolio Package Suite

A comprehensive, production-ready package suite for building educational management applications with React. Framework-agnostic, accessible, and performance-optimized.

## 📦 Packages

### @lovable/expertfolio-adapters
HTTP adapters and data transfer objects with comprehensive error handling, retry logic, and type safety.

**Features:**
- 🔄 Robust fetch wrapper with retry logic and rate limiting
- 📝 Zod-validated DTOs with test mode relaxations  
- 🧪 MSW handlers for comprehensive testing
- 🔧 TypeScript-first with full type safety
- 📦 Framework-agnostic (works with Next.js, Vite, etc.)

### @lovable/expertfolio-ui
Framework-agnostic UI components and pages with comprehensive accessibility and performance optimizations.

**Features:**
- ♿ **Accessible by Design**: WCAG 2.1 AA compliant with keyboard navigation and screen reader support
- ⚡ **Performance Optimized**: Virtual scrolling, lazy loading, and optimized rendering strategies
- 🌐 **Framework Agnostic**: Works seamlessly with Next.js, Vite, or any React application
- 🔒 **Type Safe**: Full TypeScript support with comprehensive type definitions
- 🚩 **Feature Flags**: Runtime configuration and emergency kill switches for production safety
- 📚 **Storybook Ready**: Complete component documentation and interactive examples
- 🌍 **Internationalized**: Built-in i18n support with multiple languages
- 📱 **Mobile Optimized**: Responsive design with touch gestures and mobile-specific optimizations

## 🚀 Quick Start

### Installation

```bash
npm install @lovable/expertfolio-adapters @lovable/expertfolio-ui
```

### Basic Setup

```tsx
import { ExpertfolioProvider } from '@lovable/expertfolio-ui';
import { adminAuditLogsAdapter, filesAdapter } from '@lovable/expertfolio-adapters';
import '@lovable/expertfolio-ui/styles';

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

### Using Components

```tsx
import { AdminAuditLogsPage, FilesPage, ErrorBanner } from '@lovable/expertfolio-ui';

// Complete audit logs interface
<AdminAuditLogsPage 
  onNavigateToLog={(logId) => navigate(`/logs/${logId}`)}
/>

// File management interface  
<FilesPage 
  onFileUploaded={(fileKey) => console.log('Uploaded:', fileKey)}
/>

// Error handling
<ErrorBanner
  error={{ message: 'Something went wrong', code: 'NETWORK_ERROR' }}
  onRetry={() => refetch()}
/>
```

## 🎯 Core Features

### 🔌 HTTP Adapters

Robust data fetching with comprehensive error handling:

```tsx
import { adminAuditLogsAdapter, useCancellableRequest } from '@lovable/expertfolio-adapters';

// Direct adapter usage
const logs = await adminAuditLogsAdapter.getLogs({
  limit: 20,
  actor_id: 'user_123'
});

// React hook with cancellation
const { execute, cancel } = useCancellableRequest('/api/data', {
  immediate: true,
  onSuccess: (data) => setData(data),
  onError: (error) => setError(error)
});
```

### 🎨 UI Components

Production-ready components with accessibility and performance built-in:

```tsx
import { 
  ErrorBanner, 
  EmptyState, 
  FileInput, 
  LoadingState,
  useVirtualScroll,
  AriaLiveRegion 
} from '@lovable/expertfolio-ui';

// Virtual scrolling for large datasets
const { visibleItems, scrollElementRef, handleScroll } = useVirtualScroll({
  items: largeDataset,
  containerHeight: 400,
  itemHeight: 50
});

// Accessibility announcements
AriaLiveRegion.announce('Data loaded successfully', 'polite');
```

### 🚩 Feature Management

Runtime feature control with emergency kill switches:

```tsx
import { useFeatureFlags, FeatureGate, withFeatureFlag } from '@lovable/expertfolio-ui';

// Hook usage
const { isFeatureEnabled, emergencyDisable } = useFeatureFlags();

// Component wrapper
<FeatureGate feature="FEATURE_AUDIT_LOGS" fallback={<div>Feature disabled</div>}>
  <AdminAuditLogsPage />
</FeatureGate>

// HOC usage
const GatedComponent = withFeatureFlag('FEATURE_EXPERTFOLIO')(MyComponent);
```

### 🌍 Internationalization

Complete i18n support with multiple languages:

```tsx
import { I18nProvider, useI18n, formatDate } from '@lovable/expertfolio-ui';

function App() {
  return (
    <I18nProvider defaultLocale="en">
      <MyComponent />
    </I18nProvider>
  );
}

function MyComponent() {
  const { t, locale, setLocale } = useI18n();
  
  return (
    <div>
      <h1>{t('auditLogs.title')}</h1>
      <p>{formatDate(new Date(), locale)}</p>
      <select value={locale} onChange={(e) => setLocale(e.target.value)}>
        <option value="en">English</option>
        <option value="es">Español</option>
      </select>
    </div>
  );
}
```

### 📱 Mobile Optimization

Touch-friendly interfaces with responsive design:

```tsx
import { 
  useIsMobile, 
  useTouchGestures, 
  ResponsiveTable,
  MobileDrawer 
} from '@lovable/expertfolio-ui';

function DataView() {
  const isMobile = useIsMobile();
  
  return (
    <ResponsiveTable
      headers={['Name', 'Email', 'Role']}
      rows={data}
      onRowClick={(row) => handleRowClick(row)}
      mobileBreakpoint={768}
    />
  );
}
```

### 🔒 Security

Built-in security features and sanitization:

```tsx
import { 
  sanitizeHtml, 
  validateInput,
  SecureContent,
  generateCSPHeader 
} from '@lovable/expertfolio-ui';

// Content sanitization
<SecureContent 
  content={userGeneratedContent}
  allowHtml={true}
  maxLength={1000}
/>

// Input validation
const isValid = validateInput.email('user@example.com');
const isFileSafe = validateInput.fileName('document.pdf');
```

## 📚 Documentation

### API Documentation
- [Adapters API](./packages/expertfolio-adapters/README.md)
- [UI Components API](./packages/expertfolio-ui/README.md)
- [Storybook Documentation](./packages/expertfolio-ui/.storybook/)

### Integration Guides
- [Next.js Integration](./examples/next-app/README.md)
- [Production Deployment](./PRODUCTION_DEPLOYMENT.md)
- [Security Best Practices](./packages/expertfolio-ui/src/utils/security.tsx)

### Development
- [Contributing Guidelines](./CONTRIBUTING.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Testing Strategy](./TESTING.md)

## 🎨 Storybook

Interactive component documentation and examples:

```bash
cd packages/expertfolio-ui
npm run storybook
```

Visit `http://localhost:6006` to explore components, try different props, and see accessibility features in action.

## 🧪 Testing

Comprehensive testing with Jest, MSW, and accessibility checks:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:ci

# Run accessibility tests
npm run test:a11y
```

## 🚀 Production Ready

### Performance
- **Bundle Size**: <50KB per component (monitored and enforced)
- **Virtual Scrolling**: Handle thousands of items efficiently
- **Lazy Loading**: Progressive image and component loading
- **Code Splitting**: Automatic chunking for optimal loading

### Accessibility
- **WCAG 2.1 AA Compliant**: Comprehensive accessibility features
- **Keyboard Navigation**: Full keyboard support with logical tab order
- **Screen Reader Support**: Semantic HTML and ARIA attributes
- **Color Contrast**: 4.5:1 minimum contrast ratio verified

### Security
- **Input Sanitization**: XSS protection and content validation
- **CSP Headers**: Content Security Policy configuration
- **Rate Limiting**: Client-side and adapter-level protection
- **Secure Defaults**: Safe configuration out of the box

### Mobile
- **Responsive Design**: Mobile-first approach with touch optimization
- **Touch Gestures**: Swipe, pinch, and tap interactions
- **Performance**: Optimized for mobile networks and devices
- **PWA Ready**: Service worker and offline capability support

## 🌟 Examples

Complete integration examples for popular frameworks:

- **[Next.js App Router](./examples/next-app/)**: Complete setup with App Router, security headers, and i18n
- **[Vite + React](./examples/vite-app/)**: Modern Vite setup with hot reload and optimization
- **[Storybook](./packages/expertfolio-ui/.storybook/)**: Interactive component documentation

## 🔧 Configuration

### Environment Variables

```env
# Required
NEXT_PUBLIC_BASE_URL=https://api.yourapp.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Feature Flags
NEXT_PUBLIC_FEATURE_EXPERTFOLIO=true
NEXT_PUBLIC_FEATURE_AUDIT_LOGS=true
NEXT_PUBLIC_FEATURE_FILE_MANAGEMENT=true

# Performance
NEXT_PUBLIC_ENABLE_VIRTUAL_SCROLLING=true
NEXT_PUBLIC_MAX_TABLE_ROWS=100

# i18n
NEXT_PUBLIC_DEFAULT_LOCALE=en
NEXT_PUBLIC_SUPPORTED_LOCALES=en,es,fr
```

### Runtime Configuration

```tsx
import { featureFlagManager } from '@lovable/expertfolio-ui';

// Update configuration at runtime
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

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone repository
git clone https://github.com/lovable/expertfolio.git
cd expertfolio

# Install dependencies
npm install

# Start development
npm run dev

# Run tests
npm test

# Build packages
npm run build
```

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🏗️ Architecture

Built with modern tools and best practices:

- **TypeScript**: Full type safety and IntelliSense support
- **React 18**: Latest React features with concurrent rendering
- **Zod**: Runtime type validation and schema definition
- **Tailwind CSS**: Utility-first CSS with design system tokens
- **MSW**: Mock Service Worker for comprehensive testing
- **Jest**: Unit and integration testing framework
- **Storybook**: Component documentation and development

## 🎯 Use Cases

Perfect for building:

- **Educational Platforms**: Student management, course administration
- **Learning Management Systems**: Content delivery, progress tracking
- **Administrative Dashboards**: User management, audit trails
- **File Management Systems**: Upload, organization, sharing
- **Analytics Dashboards**: Data visualization, reporting

---

**Built with ❤️ by the Lovable team**

---

## Original Lovable Project

This project was originally created with Lovable:

**URL**: https://lovable.dev/projects/a6ceedf2-8e35-4ef3-b229-6f3acfc2482f

The packages in this repository represent a production-ready extraction and enhancement of components originally prototyped in the Lovable platform.