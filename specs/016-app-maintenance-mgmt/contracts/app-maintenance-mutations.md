# Contract: Create, Update, Delete App Maintenance Windows

Implements FR-008–FR-012, FR-014, FR-015, FR-016. All three routes are restricted to **`System`** and **`Headquarter`**; every other role gets 403. (Updated 2026-07-23 per the Y-06 v2 権限マトリクス — see spec FR-014; previously `System`-only.) Route files: `src/app/api/crm/app-maintenances/route.ts` (`POST`), `src/app/api/crm/app-maintenances/[id]/route.ts` (`PATCH`, `DELETE`).

## Shared authorization (all three)

```ts
const authResult = getAuthUserFromRequest(request);
if (!authResult.ok)
  return NextResponse.json({ error: authResult.error }, { status: authResult.status });
if (authResult.user.role !== 'System' && authResult.user.role !== 'Headquarter') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

---

## `POST /crm/app-maintenances` — Create

### Request body (`CreateAppMaintenanceBodySchema`)

```json
{
  "targetBrand": "joyfit",
  "startsAt": "2026-08-01T18:00:00.000Z",
  "endsAt": "2026-08-01T20:00:00.000Z",
  "message": "定期メンテナンスを実施します。"
}
```

### Validation (in order; first failure wins)

1. Zod shape: `targetBrand` ∈ `{joyfit, fit365}`; `startsAt`/`endsAt` present; `message` 1–1000 chars → 400 with per-field messages on failure.
2. `endsAt` after `startsAt` (Zod `.refine`) → 400, message: `終了日時は開始日時より後の日時を入力してください。`
3. No overlapping window for the same `targetBrand` (table-layer, checked against every existing row for that brand, including `completed`) → 409, message: `登録しようとしている期間は既存のメンテナンス期間と重複しています。`

### Response — 201 (`CreateAppMaintenanceResponse`)

```json
{
  "message": "メンテナンス設定を登録しました",
  "appMaintenance": {
    "id": "AM-007",
    "targetBrand": "joyfit",
    "startsAt": "...",
    "endsAt": "...",
    "message": "...",
    "status": "planned",
    "createdBy": "STF-001",
    "updatedBy": null,
    "createdAt": "...",
    "updatedAt": null
  }
}
```

`id` is server-generated (`AM-{NNN}`, next sequential); `createdBy` is set from the authenticated user, not the request body.

---

## `PATCH /crm/app-maintenances/{id}` — Update

### Request body (`UpdateAppMaintenanceBodySchema`) — partial, no `targetBrand`

```json
{ "endsAt": "2026-08-01T21:00:00.000Z", "message": "メンテナンスを延長します。" }
```

Only `startsAt`, `endsAt`, `message` are accepted; omitted fields are unchanged. `targetBrand` in the request body is ignored/rejected by the schema (not present in the type at all — immutable, Q4).

### Validation (in order)

1. Row exists → else 404, message: `該当するメンテナンス情報が見つかりません。`
2. If the patch includes `startsAt` **and** the row's current derived `status === 'in_progress'` → 409, message: `メンテナンス中のため開始日時は変更できません。` (FR-010)
3. Zod shape on whichever fields are present; effective `endsAt` (patched or existing) must be after effective `startsAt` (patched or existing) → 400/422, same message as create.
4. No overlapping window for the same `targetBrand`, excluding this row itself → 409, same message as create.

### Response — 200 (`UpdateAppMaintenanceResponse`)

Same shape as create's response, `message: "メンテナンス設定の変更を保存しました"`, with `updatedBy`/`updatedAt` now set.

---

## `DELETE /crm/app-maintenances/{id}` — Delete

### Validation

1. Row exists → else 404, message: `該当するメンテナンス情報が見つかりません。`
2. Current derived `status !== 'in_progress'` → else 409, message: `メンテナンス実施中のため削除できません。` (FR-011)

### Response — 200 (`DeleteAppMaintenanceResponse`)

```json
{ "message": "メンテナンス情報を削除しました", "id": "AM-003" }
```

---

## Error response summary (all three)

| Status | When                                                                                                 |
| ------ | ---------------------------------------------------------------------------------------------------- |
| 400    | Request body fails Zod validation                                                                    |
| 401    | Missing/invalid auth token                                                                           |
| 403    | Authenticated role is not `System`                                                                   |
| 404    | `id` not found (update, delete)                                                                      |
| 409    | Period overlap (create, update); in-progress start-date change (update); in-progress delete (delete) |
| 500    | Unexpected error                                                                                     |

No `code` field (e.g. no `E-MNT-001`-style error codes) — this mock layer uses the existing repo-wide `{ error: string }` shape (research.md §2), not the structured-code system from the external backend-API-design reference.
