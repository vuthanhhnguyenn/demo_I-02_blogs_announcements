# API Contracts: Staff Detail — Login History Tab (031)

Both endpoints below **already exist** in the real backend and are **already generated** into
`src/lib/api-real` (from `src/lib/openapi.real.json`). This feature adds no endpoint, no OpenAPI
edit, and no regeneration — it is a new frontend consumer of existing generated code (Constitution
Principle II). Endpoints are marked **(existing, consumed as-is)** to make that explicit.

## GET /api/v1/admin/staff/{id}/login-histories — (existing, consumed as-is)

Paginated list of a staff account's successful CRM sign-ins, newest first.

- **Generated hook**: `adminStaffPermissionControllerStaffLoginHistoriesOptions` (+
  `...InfiniteOptions` variant, unused by this feature) in
  `src/lib/api-real/@tanstack/react-query.gen.ts`.
- **Path param**: `id` (staff UUID).
- **Query params**: `page` (default 1), `limit` (default 20, max 100) — this feature pages the
  endpoint itself rather than pulling one large page: `{ path: { id: staffId }, query: { page,
limit } }` with `limit` **10** by default, chosen by the page-size control the tab renders
  (10/20/50/100). Amended 2026-09-18 (BUG-P2-05-03): the contract previously described a single
  `limit: 100` fetch copied from `permission-history-tab.tsx`, but an account with a long history
  then rendered 100 rows inside the tab and the whole detail screen had to be scrolled to reach
  anything below it. The screen keeps server-side paging; this line now matches it.
- **Response** (`StaffLoginHistoryListResponseDto`): `{ items: Array<{ id, loggedInAt, authProvider, sessionId, ipAddress, userAgent }>, pagination: PaginationWithPageItemsDto }` — see `data-model.md` for the field-level shape and the local narrowing type this feature adds.
- **Authorization**: System/Headquarter only — `403` (`E-AUTH-103`) for any other caller role. This is enforced server-side regardless of what the frontend renders (spec.md FR-007).
- **Errors used by this feature**: `401` (expired/missing JWT — handled by the existing global session-expiry flow, not custom-handled here), `403` (surfaced as the tab simply not being reachable for non-HQ/System callers — the frontend never calls this endpoint for those roles since the tab itself is gated the same way).

## GET /api/v1/admin/staff/{id}/sessions — (existing, consumed as-is)

Lists every CRM terminal the staff currently holds. Added after this spec was first written; see
`research.md` R1 Addendum 2.

- **Generated hook**: `adminStaffControllerActiveSessionOptions` in
  `src/lib/api-real/@tanstack/react-query.gen.ts`.
- **Path param**: `id` (staff UUID). No query params.
- **Response**: `200 StaffActiveSessionResponseDto` — `sessions: StaffActiveSessionDto[]` (newest
  first, empty when nobody is signed in), `maxConcurrent: number` (the cap auth-svc enforces — the
  card's footer copy reads this rather than hard-coding 「3デバイス」), and a `@deprecated`
  singular `session` kept only so the pre-multi-session shape keeps resolving. **Read `sessions`.**
- **Per-session fields consumed**: `sessionId`, `userAgent` (device/browser label is derived from
  it client-side — there is no `deviceType`), `ipAddress`, `lastSeenAt` (最終アクティブ; may trail
  real activity by up to 60s, `null` for pre-capture sessions — fall back to `loggedInAt` then
  `createdAt`), `isCurrent` (marks 現在のセッション). `expiresAt` is available but unused.
- **Authorization**: System/Headquarter only — same gate as the login-history endpoint.

## POST /api/v1/admin/staff/{id}/sessions/revoke — (existing, consumed as-is)

Force-terminates one of the staff account's CRM sessions, or all of them.

- **Generated hook**: `adminStaffControllerRevokeSessionsMutation` in
  `src/lib/api-real/@tanstack/react-query.gen.ts`.
- **Path param**: `id` (staff UUID).
- **Request body**: optional `RevokeStaffSessionRequestDto`. This feature **always** sends
  `{ sessionId }` — the per-row 強制終了 button ends exactly the terminal it sits on. Omitting the
  body ends _every_ session the staff holds (the pre-FR-S002 behaviour, intended for a lost
  account); this screen has no UI for that. A non-UUID `sessionId` or an unknown body key is a
  `400` (`E-VAL-001`).
- **Response**: `204 No Content` — returned identically whether a live session existed or not
  (idempotent by design). The confirm-dialog copy names the specific device + IP being ended,
  which the `sessions[]` row now makes accurate.
- **Authorization**: System/Headquarter only — `403` (`E-AUTH-103`) for Manager and below; `404`
  (`E-STF-001`) if the staff record itself doesn't exist (not expected in normal UI flow, since the
  action only appears on an already-loaded staff detail page).
- **Side effect** (backend-owned, informational only): the staff's browser gets `E-AUTH-039` on its
  next request and its refresh token stops working. Nothing on the frontend needs to poll for or
  react to this beyond showing the success toast — the affected user's own session simply stops
  working next time they interact with the CRM.

## Superseded note: "no session-listing endpoint"

This section previously stated that no `GET .../sessions` endpoint existed and that multi-device
session management would be a separate feature. That is no longer true — the endpoint shipped and
is documented above. Kept as a pointer only, since `research.md` R1's original body still reads as
if it were absent (its Addendum 2 records the change).
