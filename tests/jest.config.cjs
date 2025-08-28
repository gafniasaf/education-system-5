/** @type {import('jest').Config} */
const maybeZod = (() => { try { return require.resolve('zod'); } catch { return 'zod'; } })();

module.exports = {
  testEnvironment: process.env.JSDOM === '1' ? 'jsdom' : 'node',
  roots: ['<rootDir>/unit'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.(ts|tsx)$': '<rootDir>/jest.ts-transformer.cjs'
  },
  moduleNameMapper: {
    '^next/server$': '<rootDir>/shims/next-server.ts',
    '^next/headers$': '<rootDir>/shims/next-headers.ts',
    '^@supabase/auth-helpers-nextjs$': '<rootDir>/shims/supabase-auth-helpers-nextjs.ts',
    '^msw/node$': '<rootDir>/shims/msw-node.ts',
    '^msw$': '<rootDir>/shims/msw.ts',
    '^react-hook-form$': '<rootDir>/shims/react-hook-form.ts',
    '^zod$': maybeZod,
    '^@lovable/expertfolio-adapters$': '<rootDir>/unit/shims/lovable-expertfolio-adapters.ts',
    '^@lovable/expertfolio-ui$': '<rootDir>/unit/shims/lovable-expertfolio-ui.ts',
    '^lucide-react$': '<rootDir>/unit/shims/lucide-react.ts',
    '^@shared$': '<rootDir>/../packages/shared/src/index.ts',
    '^@shared/(.*)$': '<rootDir>/../packages/shared/src/$1',
    '^@education/shared$': '<rootDir>/../packages/shared/src/index.ts',
    '^@education/shared/(.*)$': '<rootDir>/../packages/shared/src/$1',
    '^@/(.*)$': '<rootDir>/../apps/web/src/$1',
    '^react-hook-form$': '<rootDir>/shims/react-hook-form.ts',
    '^\.\./helpers/supabaseMock$': '<rootDir>/unit/helpers/supabaseMock.ts'
  },
  moduleFileExtensions: ['ts','tsx','js','jsx','json','node'],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    },
    // Critical services should stay very high
    '<rootDir>/../apps/web/src/server/services/**/*.ts': {
      statements: 95,
      branches: 95,
      functions: 95,
      lines: 95
    },
    // API route handlers should remain at or above 90
    '<rootDir>/../apps/web/src/app/api/**/*.ts': {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90
    }
  },
  coverageDirectory: '<rootDir>/../reports/unit/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    '<rootDir>/../apps/web/src/server/**/*.{ts,tsx}',
    '!<rootDir>/../apps/web/src/server/**/route.ts',
    '<rootDir>/../packages/shared/src/**/*.ts'
  ],
  coverageProvider: 'babel'
};


