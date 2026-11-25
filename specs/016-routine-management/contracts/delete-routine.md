# Contract: DELETE /api/crm/routines/{id}

**Feature**: 016-routine-management (Y-09)
**Phase**: Phase 1 mock route handler
**Purpose**: Logically delete a routine, blocked while published (FR-009).

---

## Request

`DELETE /api/crm/routines/{id}`

### Authorization

Requires `Permission.RoutinesDelete` (Headquarter/System only).

---

## Response 204

No body. Sets `deletedAt = now()`. Idempotent in effect — deleting an already-deleted or unknown routine returns `404 E-RTN-001` rather than a second `204`.

## Response 404

```json
{ "error": "Routine not found", "code": "E-RTN-001" }
```

## Response 409

```json
{ "error": "Cannot delete a published routine. Unpublish it first.", "code": "E-RTN-002" }
```

## Response 403

```json
{ "error": "Forbidden", "code": "E-AUTH-103" }
```

---

## Behavioral Rules

1. A published (`publishStatus: 'published'`) routine is always rejected with `409 E-RTN-002` — never merely warned, per spec FR-009 and Edge Cases.
2. An unpublished routine is always logically deletable; child `exercises`/`sets` are retained on the record for audit (not physically stripped), matching `backend-api.md`'s "child rows retained for audit."
3. A logically-deleted routine is immediately excluded from `GET /api/crm/routines` and `GET /api/crm/routines/{id}` (both filter `deletedAt === null`), and is no longer delivered to the mobile app.
4. Routines already copied by members into their personal collection (`sourceRoutineId` on the member's copy) are independent snapshots — deleting the source HQ routine does not affect them.

---

## Contract Tests (minimum)

- Happy path: deleting an unpublished routine returns `204` and the routine subsequently 404s on `GET`.
- Publish-guard path: deleting a published routine returns `409 E-RTN-002`, and the routine is unaffected (still retrievable, still published).
- Not-found path: deleting an unknown or already-deleted id returns `404 E-RTN-001`.
- Permission path: a caller without `RoutinesDelete` receives `403 E-AUTH-103`.
