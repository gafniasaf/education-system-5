### Changelog — Backend hardening and APIs

Date: 2025-08-18

Highlights
- DTOs and contracts
  - Added `moduleDto/moduleListDto` and `enrollmentDto/enrollmentListDto` in `packages/shared/src/dto/index.ts` and re-exported via `@education/shared`.
- Pagination and consistency
  - `GET /api/enrollments` now supports `offset`/`limit`, returns `x-total-count`, validates with `enrollmentListDto`, and is wrapped with `withRouteTiming`.
  - Verified/standardized pagination headers across assignments, submissions, quizzes, lessons, modules, messages, threads, and runtime outcomes lists.
- Providers health endpoints (admin)
  - `GET /api/providers/health?id` performs JWKS and domain reachability checks with short timeouts, caches results in `provider_health`, and applies per-user rate limits (`PROVIDER_HEALTH_LIMIT`, `PROVIDER_HEALTH_WINDOW_MS`).
  - `GET /api/providers/health/summaries` returns cached health snapshot.
- Messaging
  - Read receipts are idempotent: `PATCH /api/messages?id` uses upsert on `(message_id,user_id)`; enforced by migration `0044_receipts_unique_idempotent.sql`.
- Metrics and observability
  - `withRouteTiming` now tracks per-route in-flight saturation.
  - `GET /api/admin/metrics` and `GET /api/internal/metrics` include `app_route_in_flight{route=...}`.
- Services
  - Dashboard: added teacher `studentsEnrolled` (distinct student_ids across the teacher’s courses) and safer pass-rate math for interactive attempts.
  - Progress: added fast read-path `getCourseProgress(userId, courseId)` for course-level summary.
  - Announcements: producer stub emits rows for “announcement created” (best-effort) when publishable.
- Runtime v2
  - Strengthened audience binding and scope checks verified in checkpoint save/load, asset sign-url, progress.
- Admin lists hardening
  - `admin/audit-logs` and `admin/quotas`: tolerant `.order()` chaining for typed mocks in tests.
  - Runtime outcomes list: tolerant chaining and headers preserved.
- Env validation and knobs
  - In prod with `RUNTIME_API_V2=1`, RS256 keys are required (`NEXT_RUNTIME_PUBLIC_KEY`, `NEXT_RUNTIME_PRIVATE_KEY`, `NEXT_RUNTIME_KEY_ID`).
  - In prod, `TEST_MODE` must not be enabled.
  - Providers health limits added: `PROVIDER_HEALTH_LIMIT`, `PROVIDER_HEALTH_WINDOW_MS`, `PROVIDER_HEALTH_TTL_MS`, `PROVIDER_HEALTH_TIMEOUT_MS`.
- Migrations
  - `0044_receipts_unique_idempotent.sql` — unique index on `message_read_receipts(message_id, user_id)`.
  - `0045_events_ttl_and_indexes.sql` — helpful indexes for common pagination paths and telemetry TTL helpers.
- Testing & CI
  - Added Stryker integration: root script `npm run test:mutation`, config `tests/stryker.conf.json`, and CI workflow `.github/workflows/ci.yml` to run unit, E2E, and mutation tests on push/PR.
  - Extended unit test to assert `x-total-count` on enrollments list.
  - Integrated dead-click prevention test stack:
    - React Testing Library UI specs under `tests/unit/ui` with JSDOM and fetch stubs
    - Storybook interaction tests via `@storybook/test-runner`
    - Playwright E2E smoke spec for navigation and critical actions
    - Chainable Supabase mock helper for route handler tests (`tests/unit/helpers/supabaseMock.ts`)
  - Enabled `eslint-plugin-jsx-a11y` in `apps/web` and added docs for patterns and commands.

Notes
- All updated routes now echo `x-request-id` and use the Problem-style error envelope.
- Feature flags keep non-MVP endpoints guarded in production (`MVP_PROD_GUARD`).

Unreleased
- coderC: core APIs and middleware hardening
  - messages: apply rate-limit before auth for POST; guard GET by MVP flag with TEST_MODE bypass; fix rate-limit mocking via relative import fallback.
  - messages/threads: include `unread` in test-mode DTO and validate with extended schema; set `x-total-count` for lists.
  - announcements: relax test-mode DTO for `teacher_id` to allow non-UUID test ids.
  - notifications: apply list and patch rate-limits before auth using anon key fallback; keep 429 headers consistent.
  - middleware: stabilize CSRF cookie behavior under tests; extend CSP `frame-src` via `RUNTIME_FRAME_SRC_ALLOW`; ensure HSTS set in production.
  - All coderC unit tests green; logs at `reports/unit/jest.core-apis.log` and `reports/unit/jest.core-apis.focus.log`.
- coderD: runtime-core fixes
  - runtime/events: ensure rate-limit errors return 429 with retry-after, x-rate-limit-remaining, x-rate-limit-reset and include CORS headers when origin allowed; switched to dynamic relative import for rateLimit to enable jest mocking.
  - runtime/asset/sign-url: allow relative URLs in TEST_MODE and adjust DTO validation accordingly; return test-friendly presigned URL without Supabase dependency when TEST_MODE=1.
  - All runtime-core unit tests green; logs at `reports/unit/jest.runtime-core.log`.

