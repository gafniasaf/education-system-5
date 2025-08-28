# Lovable Expertfolio Integration

## Unpack location
- Place zip contents under `vendor/lovable/expertfolio/{version}/` (we will create this folder when unpacking).
- Expected folders:
  - `packages/expertfolio-ui/`
  - `packages/expertfolio-adapters/`
  - `contracts/` (JSON Schemas)
  - `docs/`

## Wiring
- Gate routes under `/labs/expertfolio/*` with `FEATURE_EXPERTFOLIO=1`.
- Create adapter bindings in `apps/web/src/lib/data/expertfolio.ts` that call our `/api/*` endpoints and validate with our DTOs.
- Forward `x-request-id` to server on all requests; read `x-total-count` for lists.
- Telemetry: map key events to `/api/runtime/events` using `ef.*` names.

## Test-mode
- Allow relaxed DTOs under Jest (non-UUID ids, relative URLs for downloads).
- Use MSW handlers provided by Lovable in unit tests.

## Nav and roles
- Only `admin`/`teacher` roles see Expertfolio by default; adjustable after review.

## Handoff checklist
- CI: run Jest/MSW with Lovable handlers and ensure pages mount.
- Confirm no components make direct Supabase calls; storage via finalize/download-url only.
