# Phase 1 Data Model: Enrollment Application Management (入会申請管理)

**Feature**: `025-enrollment-application-mgmt` | **Date**: 2026-08-06 | **Plan**: [plan.md](plan.md)

Storage is the in-memory mock DB (`src/app/api/_mock-db/`). Rows use `snake_case` to mirror a SQL-shaped backend; API responses are produced by explicit mapper functions in the table layer. Phase 2 replaces the table with the generated REST client without touching the UI.

**Table key**: `db.membershipApplications` (unchanged). The implementation moves out of `tables/members.table.ts` into `tables/membership-application.table.ts` with its seed in `seeds/membership-application.seed.ts`.

---

## 1. Enumerations

### 1.1 `MembershipApplicationStatus`

| Value           | Label      | Rank (sort) | Reachable from CRM?                                                                |
| --------------- | ---------- | ----------- | ---------------------------------------------------------------------------------- |
| `pending`       | 未審査     | 0           | created by the admin form (FR-061)                                                 |
| `review`        | 審査中     | 1           | display / filter / sort only — no transition into it is offered (spec Assumptions) |
| `approved`      | 承認済     | 2           | yes, via approve (FR-030)                                                          |
| `auto_approved` | 自動承認済 | 3           | **no** — decided upstream, rendered read-only (FR-060, research R2)                |
| `rejected`      | 否認       | 4           | yes, via reject (FR-032)                                                           |
| `cancelled`     | 取り消し済 | 5           | yes, via cancel (FR-036)                                                           |

`auto_approved` is **new in v5**. The rank column is the FR-010 review-flow ordering; it is a map in the table layer, not the enum's declaration order (research R5).

### 1.2 `EnrollmentRoute` — new in v5, replaces `application_type`

| Value      | Label    | Meaning                                          |
| ---------- | -------- | ------------------------------------------------ |
| `mobile`   | モバイル | submitted from the member app                    |
| `manual`   | 手動     | submitted by staff through the admin form        |
| `referral` | 紹介経由 | arrived via the friend-invite feature (APP-F-08) |

`referral` is tracked independently of whether a campaign was applied (FR-003) — a referral with no campaign and a campaign with no referral are both valid.

### 1.3 `RejectionReason` — closed set, exactly four (FR-031)

`identity_incomplete` 本人確認不備 · `age_restriction` 年齢制限 · `blacklist_match` BL該当 · `other` その他

Replaces the current free-text `rejection_reason`. A separate optional `rejection_supplement` free-text field carries any note.

### 1.4 `PaymentMethod`

`credit_card` クレジットカード（SBPS） · `bank_transfer` 口座振替（JACCS）

Drives both the fee-section warning (FR-024: a JACCS first charge may be combined into the following month) and the cancellation refund guidance (FR-035: card cancellation within 90 days vs manual refund / CASHPOST).

### 1.5 `EnrollmentFeeExemptionKind` — ⚠️ PROVISIONAL

`campaign` · `rejoin` · `staff` · `none`

> ⚠️ **Provisional (FR-025 / FR-026 / FR-025a).** Reproduced from the V0 prototype; **absent from C-01 revision 260624_v5**; precedence not PO-confirmed. Resolution order is campaign → rejoin → staff, first match wins, never stacking, and the exemption applies **only** to the 入会金 line. The code that resolves this order must carry an inline comment saying it is provisional.

### 1.6 `BlacklistCheckState`

`not_checked` · `no_match` · `matched` · `incomplete`

`incomplete` covers the edge case where the comparison could not run (spec Edge Cases): the pre-approval checklist must **not** report it as passed, and the application is held rather than approved.

---

## 2. `MembershipApplicationRow` — list-level storage

| Field                           | Type                          | Notes                                                                                                                                                          |
| ------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                            | `string`                      | e.g. `APP-2026-0001`                                                                                                                                           |
| `applicant_name`                | `string`                      |                                                                                                                                                                |
| `applicant_kana`                | `string`                      |                                                                                                                                                                |
| `status`                        | `MembershipApplicationStatus` | §1.1                                                                                                                                                           |
| `enrollment_route`              | `EnrollmentRoute`             | **new** — §1.2                                                                                                                                                 |
| `blacklist_state`               | `BlacklistCheckState`         | **new** — replaces the bare `blacklist_match: boolean`                                                                                                         |
| `brand_id` / `brand_name`       | `string`                      | brand drives minimum age and fee composition                                                                                                                   |
| `store_id` / `store_name`       | `string`                      | `store_id` is what scope filtering runs against (FR-015)                                                                                                       |
| `plan_id` / `plan_name`         | `string`                      |                                                                                                                                                                |
| `campaign_id` / `campaign_name` | `string \| null`              | **null when absent** — the UI renders a neutral placeholder, never the literal "なし" (spec Edge Cases; the v2 seed stores the string `'なし'`, which must go) |
| `application_date`              | `string` (ISO 8601 +09:00)    | source of the 対応超過 derivation (research R4)                                                                                                                |
| `contract_start_date`           | `string` (date)               |                                                                                                                                                                |
| `usage_start_date`              | `string` (date)               | cancellation guard input (FR-034)                                                                                                                              |
| `is_minor`                      | `boolean`                     |                                                                                                                                                                |
| `updated_at`                    | `string` (ISO)                |                                                                                                                                                                |

`store_id` and `brand_id` are added because the v2 rows carry only display names, and scope enforcement cannot safely key on a display string.

## 3. `MembershipApplicationDetail` — detail-level storage

Keyed by application ID, holding everything the detail screen adds beyond the list row.

**Applicant** — `birth_date`, `age` (derived), `gender`, `phone_real` / `phone_masked`, `email_real` / `email_masked`, `address_real` / `address_masked`, `face_photo_registered: boolean`, `face_photo_registered_at: string | null`.
Masked and real values are stored as a pair so the reveal control (FR-019) needs no second request. The masked value is what renders until a reviewer deliberately reveals it (SC-009).

**Blacklist** — `blacklist_conditions: Array<{ condition: 'name_birthdate' | 'email' | 'phone' | 'address'; label: string; blacklist_entry_id: string }>`.
Each matched condition links to its blacklist entry (FR-020). Empty when `blacklist_state` is not `matched`.

**Contract** — `monthly_fee`, `prepayment_months`, `prepayment_rule_label` (FIT365 fixed at 2 months; JOYFIT from the primary-contract master), `options: string[]`, `payment_method`, `card_last4: string | null`.

**Fees** — `fee_rows: Array<{ key, label, amount, struck_through?: boolean }>` plus `fee_total`.
Composition is brand-split (FR-023): JOYFIT = 入会金 + 登録事務手数料 + 日割り初月会費 + 翌月会費; FIT365 = カード発行料 + 日割り初月会費 + 翌月会費.

**⚠️ Exemption (provisional)** — `enrollment_fee_exemption: { kind: EnrollmentFeeExemptionKind; original_amount: number; discount_amount: number; reason: string | null; rule_label: string | null; previous_withdrawal_date: string | null; qualifies: boolean } | null`.
Present only while the application is 未審査 (FR-025). `rule_label` and `previous_withdrawal_date` populate the re-enrolment explanation; `reason` is mandatory before a `staff` exemption takes effect. Declared **optional** in the response schema so a real backend that omits it stays valid.

**Pre-approval checklist inputs** (FR-027) — `parental_consent: boolean`, `parental_consent_at: string | null`, `parental_consent_method: string | null`, `brand_min_age: number`.
The checklist itself is derived, not stored: blacklist item from `blacklist_state`; age item from `age` vs `brand_min_age` plus the consent fields; usage-start item from `usage_start_date` vs `contract_start_date` + 2 months.

**Proxy / source** (FR-039, FR-028) — `application_source` (アプリ / 管理画面), `proxy_staff_name: string | null`, `proxy_staff_id: string | null`, `agreement_datetime: string | null`.
An admin-sourced application with a null `agreement_datetime` **cannot be approved** — enforced in the approve route, not only in the UI.

**Companion upgrade** (FR-041) — `companion_upgrade: { yamauchi_id: string; from_classification: 'C'; to_classification: 'A'; inherited_visit_count: number; inherited_training_count: number } | null`.

**Decision record** — `approved_by` / `approved_at`, `rejected_by` / `rejected_at` / `rejection_reason` / `rejection_supplement`, `cancelled_by` / `cancelled_at` / `cancellation_reason`.

**Cancellation state** (FR-034, FR-036) — `same_day_cancel_count: number`, `same_day_cancel_date: string | null`.
The counter resets when `same_day_cancel_date` is not today. Once at least one cancellation has occurred the count stays visible as evidence.

**Timeline** — `timeline: Array<{ id, kind: 'system' | 'memo', datetime, operator, content }>`, newest first. `system` entries are never deletable (FR-037).

## 4. `EnrollmentFeeMaster`

`id`, `name`, `amount`, `brand_id`, `is_active`. The admin form offers only active entries matching the selected brand; when none match, the selector offers nothing and the amount stays empty rather than silently defaulting to zero (spec Edge Cases, FR-053).

---

## 5. State machine

```text
                    ┌────────────── (upstream, not CRM) ───────────────┐
                    │  mobile + no BL match + adult  ⇒  auto_approved  │
                    └──────────────────────────────────────────────────┘

  admin form ──► pending ──approve──► approved ──cancel──► cancelled
   (FR-061)        │                      ▲                    ▲
                   ├──reject──► rejected  │                    │
                   │                      └───── cancel ───────┘
                   └──cancel──► cancelled       (also from pending)

  review  — display / filter / sort only; no CRM transition enters or leaves it
```

**Guards** (all enforced server-side in the table layer, mirrored in the UI):

| Transition    | Guard                                                            | Failure                   | Ref            |
| ------------- | ---------------------------------------------------------------- | ------------------------- | -------------- |
| → `approved`  | caller holds `MembershipApplicationsApprove` **and** is in scope | 403                       | FR-042, FR-062 |
| → `approved`  | source is 管理画面 ⇒ `agreement_datetime` is non-null            | 409                       | FR-028         |
| → `approved`  | status is `pending`                                              | 409                       | FR-027         |
| → `approved`  | a blacklist match does **not** block — the reviewer decides      | —                         | FR-021         |
| → `rejected`  | `rejection_reason` ∈ the four-value enum                         | 400                       | FR-031         |
| → `cancelled` | `usage_start_date` is strictly in the future                     | 409 `usage_start_reached` | FR-034         |
| → `cancelled` | `same_day_cancel_count < 2` for today                            | 409 `same_day_limit`      | FR-034         |
| → `cancelled` | `cancellation_reason` non-empty                                  | 400                       | FR-033         |
| memo delete   | entry `kind === 'memo'`                                          | 409                       | FR-037         |

Every mutating route additionally re-checks store scope, so an out-of-scope ID is unreachable even with a hand-crafted request (FR-062).

---

## 6. Derived values (computed, never stored)

| Value                    | Derived from                                                               | Where                                                   | Ref                 |
| ------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------- |
| 対応超過                 | `application_date` + threshold (24 h default) vs now, only while `pending` | client                                                  | FR-011, research R4 |
| Status sort rank         | status → rank map                                                          | server                                                  | FR-010, research R5 |
| KPI `pending_count`      | scoped rows with status `pending` or `review`                              | server                                                  | FR-004, research R3 |
| KPI `blacklist_count`    | that same set where `blacklist_state === 'matched'`                        | server                                                  | FR-004              |
| Age                      | `birth_date` vs today                                                      | server (detail) / client (form, live as the user types) | FR-046              |
| Prorated first-month fee | `usage_start_date` → month end, against `monthly_fee`                      | client (form) / server (detail)                         | FR-054              |
| Pre-approval checklist   | §3 checklist inputs                                                        | client                                                  | FR-027              |
| Refund guidance          | `payment_method`                                                           | client                                                  | FR-035              |

## 7. Seed coverage requirements

The seed must contain at least one row for each of: all six statuses; all three enrolment routes; a blacklist match (multi-condition) and an `incomplete` check; a minor with consent and a minor without; a companion-upgrade candidate; a JACCS payer; an application already overdue against the 24 h threshold; an admin-sourced application **missing** its agreement timestamp (to exercise the FR-028 block); a row with no campaign (`campaign_id: null`); each brand; ⚠️ one row per provisional exemption kind (campaign / rejoin / staff / none); and rows in at least two different stores so scope filtering is observable.

> **Reminder** — editing a seed file has **no effect on a running dev server**: the mock DB is a `globalThis` singleton and HMR does not reset it. Restart the dev server fully after any seed change.
> </content>
