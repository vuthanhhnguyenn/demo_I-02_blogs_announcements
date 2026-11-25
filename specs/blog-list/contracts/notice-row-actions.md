# Row actions (mock ↔ real)

## PATCH /crm/notices/{id}/publish-status ↔ PATCH /api/v1/admin/notices/{noticeId}/publish-status (real)

Body: `{ "publishStatus": "published" | "unpublished" }` (real enum also allows `draft`, `scheduled`; the list only sends these two).

- `published` on a row with `publishStartAt = null` sets it to now (FR-019).
- Idempotent: re-sending the current status → 200, no change (real behaviour).
- Deleted row → 404.
- 200 → updated `NoticeListItem`. 404 unknown id. 422 invalid transition.
- Real API applies the staff-own-article rule (403); the mock cannot identify real callers (research R3/R4), so the UI gate is the Phase 1 enforcement.

## DELETE /crm/notices/{id} ↔ DELETE /api/v1/admin/notices/{noticeId} (real)

Soft delete: sets `deletedAt = now`. **204** no body (real). Already deleted → 404. Real: Manager and above only, `403 E-NTC-005`; UI shows 「削除権限がありません」 if received.

## POST /crm/notices/{id}/restore (mock only, gap B-06)

Clears `deletedAt`, sets `publishStatus = unpublished`. 200 → `NoticeListItem`. Not deleted / unknown → 404.

## Errors

Mock: the shared `ErrorResponse { error }` used by every mock route. Real: `ErrorResponseDto { code: 'E-NTC-nnn', … }` — the UI must branch on `code` only (Phase 2), never on message text. Error toasts come from the global `MutationCache` (no local `onError` toast).
