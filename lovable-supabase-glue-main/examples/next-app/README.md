# Next.js App Router Example

This example demonstrates how to integrate the Expertfolio packages in a Next.js 13+ application using the App Router.

## Installation

```bash
npm install @lovable/expertfolio-ui @lovable/expertfolio-adapters
npm install next react react-dom sonner
```

## Setup

### 1. Configure Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_BASE_URL=https://api.example.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Feature Flags
NEXT_PUBLIC_FEATURE_EXPERTFOLIO=true
NEXT_PUBLIC_FEATURE_AUDIT_LOGS=true
NEXT_PUBLIC_FEATURE_FILE_MANAGEMENT=true
```

### 2. Root Layout with Providers

```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ExpertfolioLayout } from '../components/ExpertfolioIntegration';
import '@lovable/expertfolio-ui/styles';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Expertfolio Dashboard',
  description: 'Educational platform management dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ExpertfolioLayout>
          {children}
        </ExpertfolioLayout>
      </body>
    </html>
  );
}
```

### 3. Dashboard Page

```tsx
// app/page.tsx
import { ExpertfolioDashboard } from '../components/ExpertfolioIntegration';

export default function Home() {
  return <ExpertfolioDashboard />;
}
```

### 4. Admin Audit Logs Page

```tsx
// app/admin/audit-logs/page.tsx
import { AdminAuditLogsPageExample } from '../../../components/ExpertfolioIntegration';

export default function AuditLogsPage() {
  return <AdminAuditLogsPageExample />;
}
```

### 5. Files Management Page

```tsx
// app/files/page.tsx
import { FilesPageExample } from '../../components/ExpertfolioIntegration';

export default function FilesPage() {
  return <FilesPageExample />;
}
```

## Configuration

### Security Headers

Add security headers in `next.config.js`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### Tailwind Configuration

Update `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@lovable/expertfolio-ui/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
    },
  },
  plugins: [],
};
```

## Features

### Internationalization

The example includes i18n support with language switching:

```tsx
import { useI18n } from '@lovable/expertfolio-ui';

function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  
  return (
    <select value={locale} onChange={(e) => setLocale(e.target.value)}>
      <option value="en">English</option>
      <option value="es">Español</option>
      <option value="fr">Français</option>
    </select>
  );
}
```

### Feature Flags

Control features at runtime:

```tsx
import { FeatureGate, useFeatureFlags } from '@lovable/expertfolio-ui';

function AdminPanel() {
  const { isFeatureEnabled } = useFeatureFlags();
  
  if (!isFeatureEnabled('FEATURE_AUDIT_LOGS')) {
    return <div>Audit logs feature is disabled</div>;
  }
  
  return (
    <FeatureGate feature="FEATURE_AUDIT_LOGS">
      <AdminAuditLogsPage />
    </FeatureGate>
  );
}
```

### Mobile Optimization

The components automatically adapt to mobile devices:

```tsx
import { useIsMobile, ResponsiveTable } from '@lovable/expertfolio-ui';

function DataTable() {
  const isMobile = useIsMobile();
  
  return (
    <ResponsiveTable
      headers={['Name', 'Email', 'Role']}
      rows={data}
      onRowClick={(row) => console.log(row)}
    />
  );
}
```

## Production Deployment

1. Set production environment variables
2. Build the application: `npm run build`
3. Deploy to your hosting platform
4. Configure security headers and CSP
5. Monitor performance and accessibility

## Troubleshooting

### Common Issues

1. **Hydration errors**: Ensure all components use SSR-safe utilities
2. **Bundle size**: Enable code splitting in Next.js config
3. **Accessibility**: Run Lighthouse audits and fix issues
4. **Performance**: Use the performance utilities provided

### Debug Mode

Enable debug mode in development:

```env
NODE_ENV=development
NEXT_PUBLIC_DEBUG_MODE=true
```

This will enable additional logging and development features.