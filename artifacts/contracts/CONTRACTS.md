# HTTP Contracts Summary (for Lovable)

All endpoints set `x-request-id` in responses. Lists include `x-total-count` when applicable.

## Admin Audit Logs
- GET `/api/admin/audit-logs?limit=number`
- 200: `Array<{ id: string; actor_id: string; action: string; entity_type?: string|null; entity_id?: string|null; created_at: string }>`
- Test-mode: ids not guaranteed UUID.

## Files
- POST `/api/files/finalize` body `{ key: string, size_bytes: number }` → 200 `{ ok: true }`
- GET `/api/files/download-url?id=string` → 200 `{ url: string, filename: string|null, content_type: string|null }`
- Test-mode: `url` may be relative; may serve inline bytes for known test ids.

## Quizzes
- GET `/api/quizzes` → 200 list (zod-validated)
- PATCH `/api/quizzes` → 200 updated quiz (safe-parse inputs; 400 on invalid)

## Notifications Preferences
- GET `/api/notifications/preferences` → 200 prefs dto
- PATCH `/api/notifications/preferences` → 200 updated prefs dto

## Runtime
- POST `/api/runtime/events` → 202 or 200, fire-and-forget behavior
- GET `/api/runtime/outcomes` → 200 list
- GET `/api/runtime/teacher/outcomes` → 200 list

## Submissions
- GET `/api/submissions?assignment_id=&offset=&limit=` → 200 list, header `x-total-count`
- PATCH `/api/submissions?id=` → 200 updated submission
- Test-mode: relaxed shapes: non-UUID `student_id`, optional `file_url`, optional `file_urls: string[]`.

## Providers Health
- GET `/api/providers/health` → 200 `{ ok: true }` (shape may include provider details)

## Parent Links
- GET/POST/DELETE `/api/parent-links`
- Row: `{ id: string; parent_id: string; student_id: string; created_at: string }`

## Errors
- JSON `{ error: { code: string, message: string }, requestId }`
- Common codes: `UNAUTHENTICATED`, `FORBIDDEN`, `BAD_REQUEST`, `NOT_FOUND`, `DB_ERROR`, `INTERNAL`.


