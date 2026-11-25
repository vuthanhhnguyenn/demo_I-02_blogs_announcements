# Contract: Enrollment application detail

**Endpoint**: `GET /api/crm/membership-applications/{id}`
**Status**: existing route, **reworked** (`src/app/api/crm/membership-applications/[id]/route.ts`)
**Requirements**: FR-018 – FR-028, FR-039 – FR-041, FR-062

## Scope enforcement (FR-062)

401 unauthenticated → 403 without `MembershipApplicationsView` → **404** when the application exists but falls outside `getAllowedStoreIds(user)`. Out-of-scope IDs return 404 rather than 403 so the endpoint does not confirm that an application exists in another store.

## Response `200`

Extends the list item with the blocks below. Fields absent from the current v2 response are marked **NEW**.

```jsonc
{
  "application": {
    // …all list-item fields…

    // ── Applicant (FR-018, FR-019) ──
    "applicant_kana": "ヤマダ タロウ",
    "birth_date": "1990-01-15",
    "age": 36,
    "gender_label": "男性",
    "phone_masked": "090-****-5678",
    "phone_real": "090-1234-5678",
    "email_masked": "ya***@example.jp",
    "email_real": "yamada@example.jp",
    "address_masked": "東京都渋谷区***",
    "address_real": "東京都渋谷区1-2-3",
    "face_photo_registered": true, // NEW
    "face_photo_registered_at": "2026-03-30T09:10:00+09:00", // NEW

    // ── Blacklist (FR-020, FR-021) ──
    "blacklist_state": "matched", // NEW (was a boolean)
    "blacklist_conditions": [
      // NEW shape — was string[]
      { "condition": "name_birthdate", "label": "氏名＋生年月日", "blacklist_entry_id": "BL-0007" },
    ],

    // ── Contract (FR-022) ──
    "monthly_fee": 7700,
    "prepayment_months": 2, // NEW
    "prepayment_rule_label": "FIT365は2ヶ月固定", // NEW
    "options": ["タオルレンタル"],
    "payment_method": "bank_transfer", // NEW as an enum (was a label string)
    "card_last4": null,

    // ── Fees (FR-023, FR-024) ──
    "fee_rows": [
      { "key": "enrollment_fee", "label": "入会金", "amount": 2200, "struck_through": true },
      { "key": "registration_fee", "label": "登録事務手数料", "amount": 3300 },
      { "key": "prorated_first_month", "label": "日割り初月会費", "amount": 4620 },
      { "key": "next_month", "label": "翌月会費", "amount": 7700 },
    ],
    "fee_total": 15620,

    // ── ⚠️ PROVISIONAL — enrolment-fee exemption (FR-025, FR-026, FR-025a) ──
    "enrollment_fee_exemption": {
      // NEW, OPTIONAL
      "kind": "rejoin",
      "original_amount": 2200,
      "discount_amount": 2200,
      "reason": null,
      "rule_label": "退会から180日以内の再入会",
      "previous_withdrawal_date": "2026-01-20",
      "qualifies": true,
    },

    // ── Pre-approval checklist inputs (FR-027) ──
    "brand_min_age": 16, // NEW
    "parental_consent": false, // exists
    "parental_consent_at": null, // NEW
    "parental_consent_method": null, // NEW
    "contract_start_date": "2026-04-01", // NEW

    // ── Application meta (FR-039, FR-028) ──
    "application_source": "アプリ",
    "enrollment_route": "mobile", // NEW
    "proxy_staff_name": null,
    "proxy_staff_id": null,
    "agreement_datetime": null,
    "updated_at": "2026-03-30T09:20:00+09:00",

    // ── Companion upgrade (FR-041) ──
    "companion_upgrade": {
      // NEW, nullable
      "yamauchi_id": "YM-00012345",
      "from_classification": "C",
      "to_classification": "A",
      "inherited_visit_count": 8,
      "inherited_training_count": 3,
    },

    // ── Decision record (FR-040) ──
    "approved_by": null,
    "approved_at": null,
    "rejected_by": null,
    "rejected_at": null,
    "rejection_reason": null, // now the 4-value enum
    "rejection_supplement": null, // NEW
    "cancelled_by": null,
    "cancelled_at": null,
    "cancellation_reason": null,

    // ── Cancellation state (FR-034, FR-036) ──
    "same_day_cancel_count": 0, // NEW
    "same_day_cancel_date": null, // NEW

    // ── Timeline (FR-037) ──
    "timeline": [
      {
        "id": "tl-001",
        "kind": "system",
        "datetime": "2026-03-30T09:15:00+09:00",
        "operator": "システム",
        "content": "申請受付（アプリ経由）",
      },
    ],
  },
}
```

## ⚠️ Provisional block

`enrollment_fee_exemption` has **no counterpart in C-01 revision 260624_v5** and is declared `.optional()` in the response schema so a real Phase-2 backend that omits it remains contract-valid; the client treats a missing value as "no exemption". It is populated only while the application is 未審査 (FR-025). The code that resolves which exemption wins must carry the provisional comment required by FR-025a.

## Derived on the client, not transmitted

- The pre-approval checklist rows (FR-027) — computed from `blacklist_state`, `age` vs `brand_min_age`, the consent fields, and `usage_start_date` vs `contract_start_date` + 2 months.
- The approval block (FR-028) — `application_source === '管理画面' && agreement_datetime === null`. Also enforced server-side in the approve route; the client copy exists to explain, not to protect.
- Refund guidance (FR-035) — from `payment_method`.
- Masking is **not** client-side: the masked and real strings both arrive, and the reveal control swaps between them (FR-019). Nothing is masked by truncating in the browser.

## Errors

| Code | When                                                      |
| ---- | --------------------------------------------------------- |
| 401  | unauthenticated                                           |
| 403  | caller lacks `MembershipApplicationsView`                 |
| 404  | unknown ID, **or** an ID outside the caller's store scope |

</content>
