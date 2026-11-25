# Contract: Create, Update, Delete CRM Maintenance Windows

Implements FR-001–FR-009, FR-015–FR-019. All three routes are **`System`-role only**; `Headquarter` (and everyone else) gets 403. Route files: `src/app/api/crm/maintenances/route.ts` (`POST`), `src/app/api/crm/maintenances/[id]/route.ts` (`PATCH`, `DELETE`).

## Shared authorization (all three)

```ts
const authResult = getAuthUserFromRequest(request);
if (!authResult.ok)
  return NextResponse.json({ error: authResult.error }, { status: authResult.status });
if (authResult.user.role !== 'System') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

---

## `POST /crm/maintenances` — Create

### Request body (`CreateCrmMaintenanceBodySchema`)

```json
{
  "title": "2026年8月定期メンテナンス",
  "startsAt": "2026-08-01T18:00:00.000Z",
  "endsAt": "2026-08-01T21:00:00.000Z",
  "message": "定期メンテナンスのため、一時的にアクセスを制限します。",
  "note": "DBバージョンアップ",
  "allowedUserIds": ["STF-001", "STF-005"]
}
```

`note` and `allowedUserIds` are optional; an empty/omitted `allowedUserIds` saves the record with zero allowed users (spec.md Edge Cases).

### Validation (in order; first failure wins)

1. Zod shape: `title` 1–255 chars; `startsAt`/`endsAt` present, valid datetime; `message` 1–1000 chars; `note` ≤1000 chars if present → 400 with per-field messages, e.g. `タイトルは必須です。` (FR-002), `開始日時の入力形式は正しくありません。`/`終了日時の入力形式は正しくありません。` (FR-003).
2. `endsAt` after `startsAt` (Zod `.refine`) → 400, message: `終了日時は開始日時より後の日時を入力してください。` (FR-004)
3. No overlapping window, of any status (table-layer, checked against every existing row) → 409, message: `登録しようとしている期間は既存のメンテナンス期間と重複しています。` (FR-005)
4. Every ID in `allowedUserIds` must reference an existing `db.staffs` row (table-layer) → 404, message: `該当するユーザーが見つかりません` (FR-009)

### Response — 201 (`CreateCrmMaintenanceResponse`)

```json
{
  "message": "CRMメンテナンスを登録しました",
  "crmMaintenance": {
    "id": "M-007",
    "title": "2026年8月定期メンテナンス",
    "startsAt": "2026-08-01T18:00:00.000Z",
    "endsAt": "2026-08-01T21:00:00.000Z",
    "message": "定期メンテナンスのため、一時的にアクセスを制限します。",
    "note": "DBバージョンアップ",
    "status": "planned",
    "allowedUsers": [
      { "staffId": "STF-001", "name": "田中 太郎", "role": "headquarter" },
      { "staffId": "STF-005", "name": "渡辺 健太", "role": "manager" }
    ],
    "createdBy": "STF-002",
    "updatedBy": null,
    "createdAt": "...",
    "updatedAt": null
  }
}
```

`id` is server-generated (`M-{NNN}`, next sequential); `createdBy` is set from the authenticated user, not the request body.

---

## `PATCH /crm/maintenances/{id}` — Update

### Request body (`UpdateCrmMaintenanceBodySchema`) — partial

```json
{ "endsAt": "2026-08-01T22:00:00.000Z", "message": "メンテナンスを延長します。" }
```

Only `title`, `startsAt`, `endsAt`, `message`, `note`, `allowedUserIds` are accepted; omitted fields are unchanged. When `allowedUserIds` is present, it **replaces the entire allowed-user set** (research.md §6) — this is how the UI's shared create/edit form persists additions/removals made in the staff-search dialog (FR-015), including while the record is `in_progress` (FR-017).

### Validation (in order)

1. Row exists → else 404, message: `該当するメンテナンス情報が見つかりません。`
2. If the patch includes `startsAt` **and** the row's current derived `status === 'in_progress'` → 409, message: `メンテナンス中のため開始日時は変更できません。` (FR-016)
3. Zod shape on whichever fields are present; effective `endsAt` (patched or existing) must be after effective `startsAt` (patched or existing) → 400/422, same message as create (FR-004).
4. No overlapping window of any status, excluding this row itself → 409, same message as create (FR-005).
5. If `allowedUserIds` is present, every ID must reference an existing `db.staffs` row → 404, same message as create (FR-009). This check runs **regardless of status** — no `in_progress` restriction (FR-017).

### Response — 200 (`UpdateCrmMaintenanceResponse`)

Same shape as create's response, `message: "CRMメンテナンスの変更を保存しました"`, with `updatedBy`/`updatedAt` now set.

---

## `DELETE /crm/maintenances/{id}` — Delete

### Validation

1. Row exists → else 404, message: `該当するメンテナンス情報が見つかりません。`
2. Current derived `status !== 'in_progress'` → else 409, message: `メンテナンス実施中のため削除できません。` (FR-019)

### Response — 200 (`DeleteCrmMaintenanceResponse`)

```json
{ "message": "CRMメンテナンス情報を削除しました", "id": "M-003" }
```

Deleting a record also removes its `crmMaintenanceAllowedUsers` join rows in the same operation (FR-018's "紐づく許可ユーザーリストも削除されます").

---

## Error response summary (all three)

| Status | When                                                                                                     |
| ------ | -------------------------------------------------------------------------------------------------------- |
| 400    | Request body fails Zod validation                                                                        |
| 401    | Missing/invalid auth token                                                                               |
| 403    | Authenticated role is not `System`                                                                       |
| 404    | `id` not found (update, delete); an `allowedUserIds` entry doesn't exist in `db.staffs` (create, update) |
| 409    | Period overlap (create, update); in-progress start-date change (update); in-progress delete (delete)     |
| 500    | Unexpected error                                                                                         |

No `code` field (e.g. no `E-MNT-001`-style error codes) — this mock layer uses the existing repo-wide `{ error: string }` shape (research.md §6), not the structured-code system from `backend-api.md`.

## Not implemented in Phase 1 (research.md §6)

`backend-api.md` additionally documents a bulk "Add allowed users" endpoint, a "Remove one allowed user" endpoint, a "Send advance notification" endpoint, and a TAS-facing "Active CRM maintenance lookup" endpoint. None has a corresponding control in the three UI mockups — the create/edit form always submits the complete `allowedUserIds` set via the endpoints above — so none is built now. They remain available as a documented Phase 2 reference if a future UI needs incremental updates or the deferred notification feature (spec.md Assumptions, 5th bullet).
