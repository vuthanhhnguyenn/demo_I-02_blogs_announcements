# Contract: PATCH /api/crm/routines/{id}/publish-status

**Feature**: 016-routine-management (Y-09)
**Phase**: Phase 1 mock route handler
**Purpose**: Publish or unpublish a routine, gated by a minimum-exercise-count safeguard (FR-010).

---

## Request

`PATCH /api/crm/routines/{id}/publish-status`

```json
{ "publishStatus": "published" }
```

| Field           | Type                           | Required |
| --------------- | ------------------------------ | -------- |
| `publishStatus` | `'unpublished' \| 'published'` | yes      |

### Authorization

Requires `Permission.RoutinesPublish` (Headquarter/System only). Idempotent (no-op transitions return `200`, not an error).

---

## Response 200

```json
{
  "id": "RT-001",
  "publishStatus": "published",
  "publishedAt": "2026-07-10T10:00:00.000Z"
}
```

## Response 404

```json
{ "error": "Routine not found", "code": "E-RTN-001" }
```

## Response 422

```json
{ "error": "At least one exercise is required to publish", "code": "E-RTN-003" }
```

## Response 403

```json
{ "error": "Forbidden", "code": "E-AUTH-103" }
```

---

## Behavioral Rules

1. `'unpublished' → 'published'` with `exercises.length === 0` is rejected: `422 E-RTN-003` (FR-010, spec User Story 1 Acceptance Scenario 6 / User Story 4 Acceptance Scenario 3).
2. `'unpublished' → 'published'` with `exercises.length >= 1` sets `publishStatus: 'published'`; sets `publishedAt = now()` only if it was previously `null` (first publish is retained thereafter, matching `backend-api.md`) — `200`.
3. `'published' → 'unpublished'` always succeeds, no constraint; does not affect any member's already-copied personal routine (FR-010) — `200`.
4. No-op transitions (`published → published`, `unpublished → unpublished`) return `200` unchanged (idempotent), not an error.

---

## Contract Tests (minimum)

- Publish-blocked path: a routine with 0 exercises attempting `'published'` returns `422 E-RTN-003`.
- Publish-allowed path: a routine with ≥ 1 exercise transitions to `'published'`, `publishedAt` set.
- First-publish-only path: `publishedAt` is not overwritten on a second publish/unpublish/publish cycle.
- Unpublish-always-allowed path: any routine (any exercise count) can transition to `'unpublished'`.
- Idempotent path: repeating the same target status returns `200` without error.
- Not-found path: unknown/deleted/non-official id returns `404 E-RTN-001`.
- Permission path: a caller without `RoutinesPublish` receives `403 E-AUTH-103`.
