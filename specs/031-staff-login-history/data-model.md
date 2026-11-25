# Data Model: Staff Detail — Login History Tab (031)

This feature introduces **no backend/schema changes** — both entities below already exist in the
real API (`src/lib/openapi.real.json`, already generated into `src/lib/api-real`). This document
describes the read shape as consumed by the frontend and the one local type needed to narrow the
generated DTO's untyped field.

## Login History Entry (read-only)

Source: `GET /api/v1/admin/staff/{id}/login-histories` → `StaffLoginHistoryListResponseDto.items`
(`src/lib/api-real/types.gen.ts:847-855`). The generated type leaves each item as
`{ [key: string]: unknown }` (the OpenAPI schema declares it `additionalProperties: true` since
it's a raw passthrough); this feature adds one local interface to narrow it, mirroring the
existing `ChangedBy` cast in `permission-history-tab.tsx`:

| Field          | Type                                                              | Notes                                                                                  |
| -------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `id`           | `string`                                                          | row id                                                                                 |
| `loggedInAt`   | `string` (ISO datetime)                                           | formatted client-side with the existing `formatDateYYYYMMDD_HHMM` util                 |
| `authProvider` | `'google' \| 'cognito' \| 'magic_link'`                           | mapped client-side to a display label — see mapping below                              |
| `result`       | `'success' \| 'failed' \| 'locked'` (optional, frontend-declared) | **Not yet returned by the real endpoint** — see the "結果 column" note below           |
| `sessionId`    | `string`                                                          | not displayed; present for potential future correlation, not part of this feature's UI |
| `ipAddress`    | `string`                                                          | displayed as-is                                                                        |
| `userAgent`    | `string`                                                          | displayed truncated with the full string in a `title` tooltip                          |

**`authProvider` → display label mapping** (new, frontend-only — no equivalent exists yet elsewhere in the codebase):

| `authProvider` value | Display label  |
| -------------------- | -------------- |
| `google`             | Google SSO     |
| `cognito`            | IDaaS          |
| `magic_link`         | マジックリンク |

### 結果 column (frontend-declared, backend-pending)

`GET /api/v1/admin/staff/{id}/login-histories` does **not** return a `result` field today —
`StaffLoginHistoryListResponseDto.items` only ever contains successful sign-ins (see `research.md`
R2). Per explicit product direction (see `research.md` R2 addendum), the frontend declares
`result` as optional on the local `LoginHistoryEntry` interface anyway and defaults it to
`'success'` whenever the field is absent — the one value guaranteed true for every row this
endpoint can currently return. This is not fabricated data (unlike a hypothetical fake device
list would be): it's a forward-compatible column ready to render real `'failed'`/`'locked'` rows
the moment the backend adds them, with zero frontend changes needed beyond removing the
`?? 'success'` fallback.

| `result` value (once backend adds it) | Display label | Badge color                                                |
| ------------------------------------- | ------------- | ---------------------------------------------------------- |
| `success` (or absent, today)          | 成功          | `bg-success/15 text-success border-success/20`             |
| `failed`                              | 失敗          | `bg-destructive/15 text-destructive border-destructive/20` |
| `locked`                              | ロック        | `bg-warning/15 text-warning border-warning/20`             |

No state transitions — this is an append-only, backend-written log; the frontend only reads it.

## Staff CRM Session (write-only, not independently readable)

> **Updated 2026-09-16** — the single-session description below is superseded. `GET /api/v1/admin/staff/{id}/sessions` returns `sessions: StaffActiveSessionDto[]` + `maxConcurrent`, each session carries `lastSeenAt`, and the revoke endpoint accepts `body: { sessionId }` to end one terminal. See `research.md` R1 Addendum 2.

Source: `POST /api/v1/admin/staff/{id}/sessions/revoke` (`AdminStaffControllerRevokeSessionsMutation`).
There is no corresponding read/list entity — the backend exposes exactly one implicit session per
staff account (a single Redis key, overwritten on each sign-in) and only an action to end it, not
a query to inspect it. The frontend therefore models this as an action, not a data entity:

| Aspect          | Value                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------- |
| Request         | `{ path: { id: staffId } }` — no request body                                                  |
| Response        | `204 No Content`, whether or not a live session existed (idempotent)                           |
| Error responses | `401` (caller unauthenticated), `403` (caller not System/Headquarter), `404` (staff not found) |

## Mock/frontend-declared entities, pending real backend support (see `research.md` R1–R2 addenda, `spec.md` Assumptions)

Per explicit product direction, these are now built ahead of backend support rather than withheld —
built as UI-first (mock rows) or forward-compatible (an optional field defaulted to a safe value),
not as fabricated claims about data that doesn't exist:

- ~~Per-device "Active Session" list~~ — **no longer descoped (2026-09-16)**: `active-sessions-card.tsx` renders real `sessions[]` rows (device label derived from `userAgent`, `ipAddress`, `lastSeenAt`, `isCurrent`) with per-row `sessionId`-targeted termination. Device _type_ is still derived client-side from the UA string — the DTO carries no `deviceType`.
- Login-result classification (成功/失敗/ロック) — see "結果 column" above; defaults to 成功 until the backend adds the field. **Still absent in the 2026-09-16 schema.**
