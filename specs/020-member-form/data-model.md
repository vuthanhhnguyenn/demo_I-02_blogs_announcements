# Data Model: Member Form Management (020-member-form)

**Date**: 2026-07-28 · **Last synced with the shipped screen**: 2026-09-15 · **Spec**: [spec.md](./spec.md) · **Research**: [research.md](./research.md)

## Entities

### Member (existing — read/write subset only)

The screen touches exactly the **personal-information subset** of the member record. The columns below track the **real** API (`GET` / `PATCH /api/v1/admin/members/{memberId}`, integrated 2026-08-25); the mock `basic_info.*` shape this table originally described is gone. All other member attributes (member type, store, contracts, status, emergency contact, memo, join info, photo, …) are read-only context or untouched.

| Attribute (form) | API field (`personalInfo` / `UpdateMemberProfileAdminDto`) | Type            | Editable | Required (client)                        | Notes                                                                                                                                                                            |
| ---------------- | ---------------------------------------------------------- | --------------- | -------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 氏名（姓）       | `lastName`                                                 | string          | ✔        | ✔ + ≤ 50 chars                           | Sent as its own field — the family/given split the form captures is never joined back                                                                                            |
| 氏名（名）       | `firstName`                                                | string          | ✔        | ✔ + ≤ 50 chars                           |                                                                                                                                                                                  |
| フリガナ（姓）   | `lastNameKana`                                             | string          | ✔        | ✔ + katakana                             | Full-width katakana (FR-016a)                                                                                                                                                    |
| フリガナ（名）   | `firstNameKana`                                            | string          | ✔        | ✔ + katakana                             |                                                                                                                                                                                  |
| 生年月日         | `dateOfBirth`                                              | ISO date string | ✔        | ✔ + past date + brand minimum age        | DatePicker; the API requires a past date; the CRM also refuses an age below the brand minimum (JOYFIT 15 / FIT365 16 — FR-016b, 「{n}歳未満の方はご利用できません」)             |
| 性別             | `gender`                                                   | `Gender` enum   | ✔        | ✔                                        | **4 values** — see Gender below                                                                                                                                                  |
| 郵便番号         | `postalCode`                                               | string          | ✔        | — format only                            | Input caps at 8 chars; `normalizePostalCode` strips non-digits, so the wire value is 7 digits                                                                                    |
| 都道府県         | `prefecture`                                               | string          | ✔        | — optional                               | Select holding the 2-digit JIS X 0401 code (`01`–`47`); omitted from the payload when blank                                                                                      |
| 番地             | `streetAddress`                                            | string          | ✔        | — optional, ≤ 200                        | Free text; omitted from the payload when blank (the API rejects `null`)                                                                                                          |
| 建物名           | `building`                                                 | string \| null  | ✔        | — optional, ≤ 100                        | Blank allowed (任意 marker); a cleared stored value is sent as `building: null` (clears it), an untouched one is not sent _(2026-11-23, Bug-No1 — was required from 2026-10-08)_ |
| 電話番号         | `phone`                                                    | string          | ✔        | ✔ + `^0\d{9,10}$` or `^\+[1-9]\d{1,14}$` | JP domestic digits or E.164 — separators dropped, a leading `+` kept on save; stored as E.164 by the API _(2026-10-30, Bug-No19)_                                                |
| メールアドレス   | `email`                                                    | string          | ✔        | ✔ + email shape                          | `type="email"` browser hint plus the Zod rule                                                                                                                                    |

**Never sent** (FR-024): `bloodType` / `rhesusFactor`, `emergencyContact*`, notes, member type, store, contract data — the `PATCH` body carries only the twelve fields above.

### Gender (extended enum)

| UI label   | Stored value        | Status                                                               |
| ---------- | ------------------- | -------------------------------------------------------------------- |
| 男性       | `male`              | existing                                                             |
| 女性       | `female`            | existing                                                             |
| その他     | `other`             | existing                                                             |
| 回答しない | `prefer_not_to_say` | carried by the real API enum since 2026-08-10 (was mock `no_answer`) |

The form's `Gender` type is derived from `UpdateMemberProfileAdminDto['gender']`, so a change to the API enum breaks the build instead of failing at runtime.

Round-trip requirement (Q12): `prefer_not_to_say` survives GET → form → PATCH → GET distinct from `other`.

### MemberFormValues (client form model — rewritten)

```
last_name        string   required, ≤ 50
first_name       string   required, ≤ 50
last_name_kana   string   required, ≤ 50, full-width katakana
first_name_kana  string   required, ≤ 50, full-width katakana
birthday         string   required, ISO date in the past
gender           Gender   required                      // 4-value enum
postal_code      string   optional, ≤ 8 chars, /^\d{3}-?\d{4}$/ when non-blank   // no input maxLength, no digit truncation (2026-11-06)
prefecture       string   optional, one of the 47 JIS codes
street_address   string   optional, ≤ 200   // the API's cap, not the project's 255 default
building         string   optional, ≤ 100   // ditto; blank → null when cleared (2026-11-23, Bug-No1)
phone            string   required, ≤ 16 chars, /^0\d{9,10}$|^\+[1-9]\d{1,14}$/ on digits (+ kept), normalized to digits (+ kept) on save   // no input maxLength, no digit truncation — over-long input is rejected, not cut (2026-11-06)
email            string   required, email shape
```

Removed from the previous schema: `emergency_contact_*`, `join_date`, `join_route`, `referrer_member_id`, `member_photo_url`, `notes`. The blank-only reading of R1/R7 no longer holds — FR-016a/FR-017 restored full semantic validation (session 2026-07-28), and `address` became three fields (customer decision 2026-08-21).

Validation messages (verbatim, FR-016): 氏名（姓）を入力してください / 氏名（名）を入力してください / フリガナ（姓）を入力してください / フリガナ（名）を入力してください / 生年月日を入力してください / 性別を選択してください / 電話番号を入力してください / メールアドレスを入力してください.

### Change-history entry (server-written on save)

The client issues no history request: the save is a single `PATCH` against the member's personal information, and the **backend** appends the audit row for it. The row is this feature's FR-028 outcome, read back on the member detail 変更履歴 tab (`GET /api/v1/admin/members/{memberId}/change-history`, source `member_change_histories`) and expected to carry the timestamp, the operator's name, and the changed attributes with their before/after values. _(Updated 2026-09-21 — the earlier 「seed only, not touched by this feature」 reading is removed.)_

## Screen state machine

```
        ┌─────────────┐  role ∉ {System, Headquarter}
URL ───►│  role check  ├────────────────────────────► [Permission-denied state]   (FR-032)
        └──────┬──────┘
               │ role ok
        ┌──────▼──────┐  fetch error ──► [Error state + retry]                    (FR-030)
        │   loading    │                                                          (FR-029)
        └──────┬──────┘
               │ loaded
        ┌──────▼──────┐  status ∈ {退会済み, 強制退会}
        │ status check ├────────────────────────────► [Withdrawn block screen]    (FR-033)
        └──────┬──────┘
               │ editable
        ┌──────▼──────────────────────────────────────────────┐
        │                    FORM (pristine)                   │
        │  any change ► dirty ─┐                               │
        │                      │ cancel/back while dirty       │
        │                      ▼                               │
        │              [Discard dialog] ─ 破棄する ► navigate   │ (FR-020)
        │                      └ 編集を続ける ► stay            │
        │  保存する ► validate ─ fail ► [field errors + footer  │
        │                               summary + scroll]      │ (FR-018)
        │                     └ pass ► PATCH ─ fail ► toast,   │ (FR-031)
        │                                     stay dirty       │
        │                              └ ok ► toast 「会員情報を │
        │                                更新しました」, dirty=  │
        │                                false, → member detail│ (FR-024)
        └──────────────────────────────────────────────────────┘
```

## Relationships

- `Member 1 ── n ChangeHistoryEntry` — read-only elsewhere (member detail tab); this feature creates none.
- Entry points: member list row (`/members` → 編集) and member detail header (`/members/[id]` → 編集) both navigate to `/members/[id]/edit`; both already role-gated (FR-026).
