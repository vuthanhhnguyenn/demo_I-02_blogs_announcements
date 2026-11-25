# Contract: Admin-side enrolment (管理画面から入会登録)

**Endpoints**: `POST /api/crm/membership-applications/direct`, `GET …/enrollment-fee-masters`, `GET …/blacklist-check`
**Status**: all three exist and are **reworked / extended**; `GET …/corporate-masters` is **deleted**
**Requirements**: FR-016, FR-043 – FR-059, FR-061

---

## 1. Register — `POST /direct`

**Permission**: `Permission.MembershipApplicationsCreate` — Headquarter, System, Manager, Staff. Trainer and Observer receive 403 (FR-016, FR-063). The enrolling store must lie inside the caller's scope.

### Request (v5 shape)

```jsonc
{
  "applicant": {
    "family_name": "山田",
    "given_name": "太郎",
    "family_name_kana": "ヤマダ",
    "given_name_kana": "タロウ",
    "birth_date": "2009-05-20",
    "gender": "male", // male | female | other | no_answer  (FR-045)
    "phone": "090-1234-5678",
    "email": "yamada@example.jp",
    "address": "東京都渋谷区1-2-3", // optional
    "face_photo_id": "UP-0001", // required (FR-044)
  },
  "contract": {
    "brand_id": "BRD-001",
    "store_id": "STR-004",
    "plan_id": "PLN-010",
    "usage_start_date": "2026-09-01",
    "payment_method": "credit_card", // credit_card (SBPS) | bank_transfer (JACCS)  (FR-050)
    "campaign_id": null, // optional
    "enrollment_fee_master_id": "EF001", // JOYFIT only — see §2
  },
  "consent": {
    "agreement_datetime": "2026-08-06T10:30:00+09:00", // REQUIRED (FR-051)
    "parental_consent": true, // required when 15/16 ≤ age < 18 (FR-047)
  },
}
```

### Removed from the v2 request (FR-043, research R8)

- `application_type` (個人 / 法人 / 従業員割引) — the 申請種別 axis is gone; the route is always 手動.
- the entire `corporate` block and its `corporate-masters` lookup.
- the entire `employee_discount` block.

These are **deleted** from the schema, the form, and the generated client — not hidden behind a flag.

### Server-side validation (FR-046, FR-047, FR-051, FR-056)

| Rule                                                                         | Failure                            |
| ---------------------------------------------------------------------------- | ---------------------------------- |
| age at `usage_start_date` ≥ the brand minimum (JOYFIT 15, FIT365 16)         | 400 `below_min_age`                |
| `parental_consent === true` when the applicant is under 18                   | 400 `parental_consent_required`    |
| `agreement_datetime` present and not in the future                           | 400 `agreement_required`           |
| `enrollment_fee_master_id` refers to an active master for the selected brand | 400 `invalid_fee_master`           |
| duplicate active member for the e-mail address                               | 409 (existing behaviour, retained) |

The brand minimum age lives in one constant map shared by the form and the route — the client blocks early to explain, the server blocks to guarantee.

### Effects (FR-061)

Creates the application with `status: "pending"` and `enrollment_route: "manual"`, **always**, regardless of the blacklist or age outcome; records `proxy_staff_id` / `proxy_staff_name` from the caller's session and the `agreement_datetime`; runs the blacklist comparison and stores its result; writes an initial system timeline entry recording the admin-screen submission and the proxy staff member.

**Response `201`**: `{ "application": { "id": "APP-2026-0042", … } }`.

**UI notes** (FR-057): a confirmation dialog restates the enrolment route, brand, store, plan, payment method, and the applicant's age with any confirmed parental consent; a completion dialog then states the application was added as 未審査 and that the member record is created only after review and approval, before returning to the list.

---

## 2. Enrolment-fee masters — `GET /enrollment-fee-masters?brand_id=…`

Returns only `is_active` entries for the given brand (FR-053).

```jsonc
{ "masters": [{ "id": "EF001", "name": "通常入会金", "amount": 2200, "brand_id": "BRD-001" }] }
```

Applies to **JOYFIT only** — FIT365 charges a card-issue fee instead and shows no master selector. When the query returns an empty list the selector offers nothing and the amount stays empty; it must not silently fall back to 0 (spec Edge Cases).

## 3. Blacklist pre-check — `GET /blacklist-check?…`

Unchanged. Returns one of three states so the form can render them distinguishably (FR-052): not yet checked, checked with no match, checked with a match (the last carrying guidance to review carefully).

## 4. Deleted — `GET /corporate-masters`

Removed along with `corporate-info-section.tsx` and `employee-discount-section.tsx`. The route file, its schema entries, and its registration in `_routes/index.ts` all go; the generated client is regenerated afterwards so the dead operation disappears from `sdk.gen.ts` too.

---

## 5. Fee calculation (client-side, FR-053 / FR-054 / FR-055)

Recomputed live from brand + plan + usage start date + campaign:

| Brand  | Line items                                                                     |
| ------ | ------------------------------------------------------------------------------ |
| FIT365 | カード発行料 → 日割り初月会費 → 翌月会費                                       |
| JOYFIT | 入会金 (from the selected master) → 登録事務手数料 → 日割り初月会費 → 翌月会費 |

The prorated first-month fee runs from the usage start date to the end of that month against the plan's monthly fee (FR-054). A campaign discount is its own line, and the total is floored at zero — never negative (FR-053). Before a brand is chosen the section states that the fee items depend on the brand rather than showing an arbitrary set (FR-055).

The exemption logic of the **detail** screen does **not** appear on this form: the ⚠️ provisional exemption (FR-025/FR-026) is a review-time determination, not an input the enrolling staff member makes here.
</content>
