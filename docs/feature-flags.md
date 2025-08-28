# Feature Flags

## FEATURE_EXPERTFOLIO
- Type: boolean (`1`/`true` enables, default off)
- Reads: `FEATURE_EXPERTFOLIO` or `NEXT_PUBLIC_FEATURE_EXPERTFOLIO`
- Effect: Gates routes under `/labs/expertfolio/*` and related navigation entries.
- Usage:
  - Server components read via `process.env`.
  - Client code should not read env directly; gate rendering at server or via props.
- Notes:
  - Keep disabled in production until integration is complete.
  - Test environments may force-enable to exercise UI flows.
