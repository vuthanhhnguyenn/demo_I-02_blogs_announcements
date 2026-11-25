# Data Model: Blacklist Management (A-01 FR-015)

**Feature**: `025-blacklist-management` | **Date**: 2026-08-07 | **Plan**: [plan.md](./plan.md)

Field names and casing mirror the v0.4 contract exactly, so the Phase 1 → Phase 2 switch is mechanical (research §9). Everything below lives in `src/app/api/_schemas/blacklist.schema.ts` as Zod, with TypeScript types derived by `z.infer`.

---

## Enums

### `BlacklistSource` — how the entry was created

| Value               | Screen label | Notes                                                                                    |
| ------------------- | ------------ | ---------------------------------------------------------------------------------------- |
| `forced_withdrawal` | 強制退会     | Written only by the forced-withdrawal path (A-01 FR-016). Never accepted from a request. |
| `manual`            | 手動登録     | Every entry created through the registration endpoint.                                   |

This is the **registration-path** axis. It backs the list's 登録理由 column and filter, the detail's header badge and 登録情報 badge, and the status card's tone.

### `BlacklistReasonCategory` — why the entry exists

| Value              | Screen label | Offered in the Sheet                            |
| ------------------ | ------------ | ----------------------------------------------- |
| `nuisance`         | 迷惑行為     | Yes                                             |
| `unpaid`           | 未納金       | Yes                                             |
| `fraudulent_use`   | 不正利用     | Yes                                             |
| `other`            | その他       | Yes                                             |
| `equipment_damage` | 設備破損     | **No** — retained for migrated legacy rows only |

The **reason** axis. Written by the Sheet, stored, and **read back by no screen** (FR-043a, Q-03). Auto-registered rows carry exactly `['unpaid']`.

> These two axes are distinct and both are labelled 登録理由 on screen. See spec § Backend API Contract Mapping.

### `UnpaidFilter` — list filter only

`all` (未納金：全件, the default and not sent) · `has_unpaid` (未納金：あり) · `no_unpaid` (未納金：なし). Resolves to the `hasUnpaid` boolean query parameter.

### `BlacklistHistoryEventType`

`registered` · `removed`.

---

## Entities

### `BlacklistEntry` — one member's listing (list row)

| Field              | Type                        | Null?   | Notes                                                                                                                                    |
| ------------------ | --------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `blacklistId`      | UUID                        | no      | The entry's own identity. **Not** the member number — this is the change that breaks the old shape. Routes the detail.                   |
| `member`           | `BlacklistMemberRef`        | no      | See below                                                                                                                                |
| `source`           | `BlacklistSource`           | no      | FR-010                                                                                                                                   |
| `reasonCategories` | `BlacklistReasonCategory[]` | no      | Never null. `[]` for legacy rows with no recorded reason — renderers must not assume a first element.                                    |
| `reason`           | string                      | **yes** | The screen's **メモ**. Renamed in meaning at v0.4; any code reading this as 登録理由 is stale. Max 2000.                                 |
| `level`            | int 1–5                     | yes     | Always null in Phase 1. No screen control (`TBD-BLACKLISTS-LEVEL-DEFINITION`). Renders as 未分類 whenever a surface is eventually built. |
| `unpaidAmount`     | int ≥ 0                     | no      | Never null; `0` when nothing is outstanding. Computed per request, not stored. FR-011.                                                   |
| `isActive`         | boolean                     | no      | The list always requests `true` (FR-033, Q-07).                                                                                          |
| `registeredAt`     | ISO date-time               | no      | FR-012, FR-058                                                                                                                           |
| `registeredBy`     | `StaffRef`                  | no      | FR-058. The System actor for auto-registered rows.                                                                                       |
| `removedAt`        | ISO date-time               | yes     | Set by release; null while active. FR-069b.                                                                                              |
| `removedBy`        | `StaffRef`                  | yes     | Set by release; null while active. FR-069b.                                                                                              |

**Not modelled**: `matchResult` — the contract's FR-024 placeholder, always null, and no screen consumes it (Q-01). `matchConditions` from the old shape is deleted outright (Q-02).

### `BlacklistEntryDetail` — extends `BlacklistEntry`

| Field     | Type                       | Null? | Notes                                                                                                                           |
| --------- | -------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------- |
| `member`  | `BlacklistMemberDetailRef` | no    | Widened — overrides the list's narrower ref                                                                                     |
| `history` | `BlacklistHistoryEvent[]`  | no    | Ascending by `occurredAt`. Seed-only, rendered nowhere (FR-072, Q-06), but required by the contract so the mock must return it. |

### `BlacklistMemberRef` — list projection

`memberId` (UUID, routes to the member detail) · `memberNumber` · `lastName` · `firstName` · `memberStatus` · `brandGroup` · `primaryStore` (`StoreSummary`, **nullable** — em dash when absent, FR-009).

### `BlacklistMemberDetailRef` — extends the above

`legacyMemberCode` (nullable — 旧No omitted when absent) · `lastNameKana` (nullable) · `firstNameKana` (nullable) · `memberType` · `currentMainContract` (`CurrentMainContractSummary`, **nullable** — the normal case once a forced-withdrawal contract closes; the 主契約 badge is omitted, not blanked).

Confirmed available inline by the client at QA `qa07`, with 「hội viên 退会済 vẫn lấy được」 — a withdrawn member still resolves, which is this screen's whole population.

### `BlacklistHistoryEvent`

`event` (`BlacklistHistoryEventType`) · `occurredAt` (ISO date-time) · `actor` (`StaffRef`, **nullable** — null for system-generated events) · `metadata` (named record; carries `source` matching the entry's).

### `StaffRef`

`staffId` (UUID) · `displayName`.

### `StoreSummary`

`storeId` (UUID) · `code` · `name` · `brandEnum`.

---

## Lifecycle

```
                 ┌─────────────────────────────────────────┐
   (no entry) ───┤ POST /members/{id}/blacklist  (manual)   ├──▶ ACTIVE
                 │ forced-withdrawal batch (auto)           │    isActive = true
                 └─────────────────────────────────────────┘    + history: registered
                                                                       │
                                    PATCH /blacklist/{id}/active       │
                                          { isActive: false }          ▼
                                                                  RELEASED
                                                                  isActive = false
                                                                  removedAt/By set
                                                                  + history: removed
```

Invariants:

- **One active entry per member.** Enforced in the write path, not client-side. A second registration while one is active is refused (FR-050).
- **Released is terminal.** A released row is never revived. Re-listing creates a **new** entry (FR-067) — reviving would put two rows in contention for the one-active invariant and erase the audit boundary between the old offence and the new.
- **No deletion.** Release flips a flag and stamps who/when; the row is retained (FR-065).
- **The member's own status is untouched by release** (FR-066). Releasing a force-withdrawn member means "may enrol again", not "the withdrawal is undone". This is also what stops the forced-withdrawal batch re-listing a released member: its candidate pool excludes force-withdrawn members.

### Visibility

| State    | In the list           | By direct URL                                                |
| -------- | --------------------- | ------------------------------------------------------------ |
| Active   | Yes                   | Yes                                                          |
| Released | **No** (FR-033, Q-07) | Yes, rendered as released with no release action (FR-069a/b) |

After a successful release the screen returns to the list (FR-064a, Q-11), where the entry is now absent — that absence is the operator's confirmation.

---

## Validation

### Registration — `POST /crm/members/{id}/blacklist`

| Field              | Rule                                                                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reasonCategories` | Required, 1–5 items, unique, each a `BlacklistReasonCategory`. Empty array or missing → 400. The Sheet is single-select, so it sends a one-element array. |
| `memo`             | Optional, max 2000, nullable. Stored as `reason`.                                                                                                         |
| `level`            | Optional, 1–5. No screen sends it; stored null.                                                                                                           |
| `source`           | **Not accepted.** Written server-side as `manual` (FR-049).                                                                                               |

Guards, in order: member not found → 404 · member has an active entry (including one auto-created by forced withdrawal) → 409. Not idempotent.

### Release — `PATCH /crm/blacklist/{id}/active`

| Field      | Rule                                                 |
| ---------- | ---------------------------------------------------- |
| `isActive` | Required, and must be exactly `false`. `true` → 400. |

Guards, in order: entry not found → 404 · body not `false` → 400 · entry already released → 409.

### List query — `GET /crm/blacklist`

| Parameter         | Rule                                 | Backs                                                        |
| ----------------- | ------------------------------------ | ------------------------------------------------------------ |
| `query`           | Optional string, 1–60                | FR-015, FR-016                                               |
| `source`          | Optional `BlacklistSource`           | FR-017                                                       |
| `hasUnpaid`       | Optional boolean                     | FR-018                                                       |
| `isActive`        | Optional boolean, **default `true`** | FR-033                                                       |
| `page`            | Optional int ≥ 1, default 1          | FR-028                                                       |
| `limit`           | Optional int 1–100, default 25       | FR-032 — the 100 cap is why V0's 200 is not offered (Q-08)   |
| `includeTotalAll` | Optional boolean, default false      | FR-025 — request it only because the banner shows a baseline |

Not sent by this feature (no screen control): `reasonCategories`, `level`, `brandGroup`, `brandEnum`, `registeredFrom`, `registeredTo`, `sort`, `order`. Server defaults apply — `registeredAt` descending.

`totalAllItems` means the count with every optional filter reset — the number reached by pressing 条件をクリア, so **active entries only**, not every row in the table. It may be absent or null under load; the banner degrades rather than showing a wrong denominator (FR-025).

---

## Additions to the member-list projection

Required by the registration Sheet, absent from both the mock and the real contract's list item (research §3). Mock-first: implemented here, requested from the client separately.

| Field            | Type               | Used by                                                                                                  |
| ---------------- | ------------------ | -------------------------------------------------------------------------------------------------------- |
| `date_of_birth`  | ISO date, nullable | The identity card's 生年月日 (FR-042)                                                                    |
| `face_photo_url` | string, nullable   | The identity card's photo and the combobox rows (FR-039, FR-042)                                         |
| `has_blacklist`  | boolean            | The already-blacklisted pre-check (FR-050a). HQ / System only, matching the real contract's restriction. |

Search behaviour: matching is **prefix-based** on each searchable field except the member number and legacy member code, which match exactly (FR-038a). Delivered as an opt-in flag on the member-list route so existing callers keep substring matching (research §4).

---

## Seed coverage

Per research §10, the seed must produce: both `source` values; auto-registered rows carrying exactly `['unpaid']`; `unpaidAmount` both zero and non-zero; at least one **released** entry with `removedAt` / `removedBy`; a member with no `primaryStore`; one with no `currentMainContract`; one with no `legacyMemberCode`; a `registered` history event on every entry plus `removed` on released ones, with `actor: null` on system registrations; and more than 25 active rows so pagination is exercised at the default page size.
