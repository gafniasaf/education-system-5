/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Only ignore during local dev if explicitly opted in; enforce in CI by default
    ignoreDuringBuilds: process.env.CI !== 'true' && process.env.STRICT_LINT !== '1' ? true : false,
  },
  experimental: {
    typedRoutes: true,
    optimizePackageImports: ["react", "react-dom"],
    externalDir: true,
  },
  transpilePackages: ['@shared', '@education/shared', '@lovable/expertfolio-ui', '@lovable/expertfolio-adapters'],
  output: 'standalone',
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-DNS-Prefetch-Control", value: "on" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=(), interest-cohort=()" },
        // HSTS: enable in production only (can be overridden via platform)
        { key: "Strict-Transport-Security", value: process.env.NODE_ENV === 'production' ? "max-age=15552000; includeSubDomains" : "max-age=0" }
        // Note: CSP is applied via middleware in production. We skip CSP header here in dev to avoid blocking Next.js dev overlay and HMR.
        // In production, set NEXT_PUBLIC_CSP or rely on middleware default.
      ]
    }
  ]
};

export default nextConfig;


