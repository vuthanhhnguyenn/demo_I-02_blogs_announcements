# API Contract: Blacklist Management (A-01 FR-015)

**Feature**: `025-blacklist-management` | **Date**: 2026-08-07
**Mirrors**: fitness-dx CRM API `0.8.0`, tag `Member Management`, blacklist section **v0.4**

Four endpoints. The mock at `src/app/api/crm/` must match the live contract branch-for-branch — that equivalence is what makes the Phase 2 switch a no-op (Constitution §II). Where the mock's path differs from the live path it is only the `/api/v1/admin` → `/crm` prefix.

Authorisation on all four: **`system` / `headquarter` only**. Any other role is refused. No store scoping — the blacklist is a cross-store HQ audit surface (FR-004).

---

## 1. `GET /crm/blacklist` — list

Backs FR-005 – FR-033.

### Query

| Name              | Type                            | Default    | Notes                                                                         |
| ----------------- | ------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| `query`           | string, 1–60                    | —          | Free-text over the member. Server-side across the whole filtered set (FR-016) |
| `source`          | `forced_withdrawal` \| `manual` | —          | The 登録理由 filter (FR-017)                                                  |
| `hasUnpaid`       | boolean                         | —          | The 未納金 filter (FR-018)                                                    |
| `isActive`        | boolean                         | **`true`** | Never overridden by any screen control (FR-033)                               |
| `page`            | int ≥ 1                         | 1          |                                                                               |
| `limit`           | int 1–100                       | 25         | The cap is why 200 is not offered (Q-08)                                      |
| `includeTotalAll` | boolean                         | false      | Set to `true` — the banner needs the baseline (FR-025)                        |

Never sent: `reasonCategories`, `level`, `brandGroup`, `brandEnum`, `registeredFrom`, `registeredTo`, `sort`, `order`. Server default ordering (`registeredAt` desc) applies.

### 200

```jsonc
{
  "items": [
    {
      "blacklistId": "8f2a…", // UUID — routes the detail
      "member": {
        "memberId": "1c9e…", // UUID — routes the member detail
        "memberNumber": "JF-0005678",
        "lastName": "田中",
        "firstName": "次郎",
        "memberStatus": "forced_withdrawal",
        "brandGroup": "JOYFIT",
        "primaryStore": {
          // nullable → 店舗名 renders an em dash
          "storeId": "…",
          "code": "S-001",
          "name": "JOYFIT渋谷店",
          "brandEnum": "Joyfit",
        },
      },
      "source": "forced_withdrawal",
      "reasonCategories": ["unpaid"], // never null; [] for legacy rows
      "reason": null, // the screen's メモ — NOT 登録理由
      "level": null,
      "unpaidAmount": 15400, // int, never null; 0 when nothing outstanding
      "isActive": true,
      "registeredAt": "2026-01-15T10:30:00+09:00",
      "registeredBy": { "staffId": "…", "displayName": "System" },
      "removedAt": null,
      "removedBy": null,
    },
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "totalItems": 42,
    "totalPages": 2,
    "totalAllItems": 58, // present only with includeTotalAll=true; may be null
  },
}
```

`totalAllItems` is the count with every optional filter reset — the number reached by pressing 条件をクリア, so **active entries only**. The banner degrades when it is null or absent rather than showing a wrong denominator.

### Errors

400 validation · 401 · 403 non-HQ · 500

---

## 2. `GET /crm/blacklist/{blacklistId}` — detail

Backs FR-053 – FR-061, FR-069, FR-069a/b.

### 200 — `BlacklistEntry` plus:

```jsonc
{
  "member": {
    // …every list field, plus:
    "legacyMemberCode": "JF-19872", // nullable → 旧No omitted
    "lastNameKana": "タナカ", // nullable
    "firstNameKana": "ジロウ", // nullable
    "memberType": "normal",
    "currentMainContract": {
      // nullable → 主契約 badge omitted, not blanked
      "contractId": "…",
      "plan": { "…": "レギュラー会員" },
      "contractStatus": "…",
      "startDate": "2025-04-01",
    },
  },
  "history": [
    // ascending by occurredAt; seed-only, rendered nowhere
    {
      "event": "registered",
      "occurredAt": "2026-01-15T10:30:00+09:00",
      "actor": null, // null for system-generated events
      "metadata": { "source": "forced_withdrawal" },
    },
  ],
}
```

**Released entries still resolve here** — release flips a flag and never deletes (FR-069a). The response then carries `isActive: false` with `removedAt` / `removedBy` set, and a `removed` history event. The screen must render it as released and offer no second release (FR-069b).

### Errors

401 · 403 · 404 entry not found · 500

---

## 3. `POST /crm/members/{memberId}/blacklist` — register

Backs FR-034 – FR-052 (the list Sheet) and FR-074 (the member-detail dialog). **The single registration endpoint** — the old list-scoped `POST /crm/blacklist` is removed (FR-073).

### Request

```jsonc
{
  "reasonCategories": ["nuisance"], // required, 1–5, unique. Sheet is single-select → one element
  "memo": "館内での他会員への迷惑行為。", // optional, ≤2000, nullable → stored as `reason`
  "level": 1, // optional 1–5; no screen sends it
}
```

`source` is **not accepted**. Every entry created here is written as `manual` server-side; `forced_withdrawal` is reachable only from the forced-withdrawal path (FR-049).

### Guards — evaluated in this order, under a write lock

1. member not found → **404**
2. member is force-withdrawn **and** already has an active entry → **409**
3. any active entry exists for the member → **409** (the one-active-row invariant)

Not idempotent — a second call while an entry is active returns 409, it does not succeed silently.

### Effects, in one transaction

- insert the entry: `source = 'manual'`, `reasonCategories`, `reason = memo`, `level`, `registeredBy = caller`, `registeredAt = now`, `isActive = true`
- append a `registered` history event carrying `metadata.source = 'manual'`
- no member-facing notification

### 201

The created `BlacklistEntry`.

### Errors

400 validation (empty/missing `reasonCategories`) · 401 · 403 · 404 · 409 already blacklisted · 500

---

## 4. `PATCH /crm/blacklist/{blacklistId}/active` — release

Backs FR-062 – FR-068. New — no counterpart exists on `dev` today.

### Request

```jsonc
{ "isActive": false }
```

`false` only. `true` → 400. Re-listing goes through endpoint 3, which creates a **fresh** entry; reviving a released row would put two rows in contention for the one-active invariant and erase the audit boundary between the old offence and the new (FR-067).

### Guards — in order, under a write lock

1. entry not found → **404**
2. body is not exactly `false` → **400**
3. entry already released → **409**

### Effects, in one transaction

- `isActive = false`, `removedBy = caller`, `removedAt = now`
- append a `removed` history event
- **`memberStatus` is left untouched** (FR-066) — releasing a force-withdrawn member means "may enrol again", not "the withdrawal is undone". This is also what keeps the forced-withdrawal batch from re-listing a released member: its candidate pool excludes force-withdrawn members.
- no member-facing notification

### 200

The updated `BlacklistEntryDetail`.

### Errors

400 · 401 · 403 · 404 entry not found · 409 already released · 500

---

## 5. Additions to `GET /crm/members` — the Sheet's lookup

Not a blacklist endpoint, but this feature depends on it (Q-04, research §3–§4). Three fields are added to the member-list item, and an opt-in matching flag.

### Added response fields

| Field            | Type               | Used by                                                                                        |
| ---------------- | ------------------ | ---------------------------------------------------------------------------------------------- |
| `date_of_birth`  | ISO date, nullable | The identity card's 生年月日 (FR-042)                                                          |
| `face_photo_url` | string, nullable   | Combobox rows and the identity card (FR-039, FR-042)                                           |
| `has_blacklist`  | boolean            | The already-blacklisted pre-check (FR-050a). **HQ / System only**, matching the real contract. |

### Matching

The Sheet opts into **prefix** matching (`ILIKE 'kw%'`) across member number, legacy member code, email, phone, family/given name and their kana — with the two unique keys matching exactly (FR-038a). Existing callers keep the current substring behaviour; the flag is opt-in precisely so A-01's own member list and the other pickers are unaffected.

**Mock-first**: all three fields and the flag are implemented in the mock now. `dateOfBirth` and `facePhotoUrl` already exist on the real `PersonalInfo` in the member-detail response, so the ask is a projection request rather than new data; it goes to the client through the API QA process alongside this feature.

---

## Error envelope

Every error follows the project's existing shape. The live contract's codes are recorded here so the mock's branches map onto them one-to-one:

| Live code    | Meaning                          | Where             |
| ------------ | -------------------------------- | ----------------- |
| `E-BLK-001`  | Blacklist entry not found        | endpoints 2, 4    |
| `E-BLK-200`  | Member already blacklisted       | endpoint 3        |
| `E-BLK-201`  | Blacklist entry already released | endpoint 4        |
| `E-MEM-001`  | Member not found / out of scope  | endpoint 3        |
| `E-VAL-001`  | Validation failure               | endpoints 1, 3, 4 |
| `E-AUTH-100` | Role not permitted               | all               |

The user-facing message from the response is what the screen surfaces on refusal (FR-050, FR-051, FR-068, FR-069) — the UI does not compose its own copy for these branches.
