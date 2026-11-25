# Phase 0 Research: Enrollment Application Management (入会申請管理)

**Feature**: `025-enrollment-application-mgmt` | **Date**: 2026-08-06 | **Plan**: [plan.md](plan.md)

The Technical Context carried no `NEEDS CLARIFICATION` markers — the stack is fixed by the constitution and the feature introduces no new technology. The risk in this feature is not "which library" but **"what exactly is already built, and how far is it from C-01 260624_v5"**. This document answers that, then records the design decisions that follow from it.

---

## Part 1 — Baseline: what exists on disk today

Verified by direct inspection on branch `025-enrollment-application-mgmt`, 2026-08-06.

| Layer       | Location                                                                                   | Size                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Pages       | `src/app/(private)/membership-applications/`                                               | 36 files: list (5), detail (16), create form (12), plus page shells                               |
| API routes  | `src/app/api/crm/membership-applications/`                                                 | 11 route files                                                                                    |
| Schemas     | `src/app/api/_schemas/membership-application.schema.ts`                                    | 967 lines                                                                                         |
| Mock table  | `src/app/api/_mock-db/tables/members.table.ts` L918+ (inline) + `seeds/membership.seed.ts` | table methods and list rows inline inside a 75 KB members file; detail records in a 427-line seed |
| Permissions | `src/types/permission.type.ts` L83-85, `src/constants/permission.constants.ts`             | 3 keys: View / Create / Approve                                                                   |
| Prior spec  | `specs/membership-applications/`                                                           | spec.md, plan.md, tasks.md + `detail/`, `enrollment-form/` sub-specs — all against C-01 260410_v2 |

The prior implementation is complete and coherent for **v2**. It is not abandoned scaffolding, and it must not be treated as such.

---

## Part 2 — The v2 → v5 delta

This is the substance of the feature. Each row states what is on disk, what v5 requires, and the requirement that forces the change.

### 2.1 Domain model changes

| #   | Area                   | On disk (v2)                                                                    | Required (v5)                                                                                                                         | Ref                         |
| --- | ---------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| D1  | Status set             | `pending / review / approved / rejected / cancelled` (5)                        | adds **`auto_approved`** (自動承認済) — 6 statuses                                                                                    | FR-002, FR-060              |
| D2  | Classification axis    | **申請種別** `application_type`: individual / corporate / employee_discount     | **replaced** by **入会経路** `enrollment_route`: モバイル / 手動 / 紹介経由                                                           | FR-003, FR-043              |
| D3  | Corporate enrolment    | `corporate-info-section.tsx` + `corporate-masters` endpoint + schema fields     | **removed** from the admin form; routed through the mobile app                                                                        | Scope §Out of scope, FR-043 |
| D4  | Employee discount      | `employee-discount-section.tsx` + schema fields                                 | **removed** from the admin form                                                                                                       | Scope §Out of scope, FR-043 |
| D5  | Approval flow          | every application is reviewed by a human                                        | the normal path is **auto-approved upstream**; only BL-match / minor / manual applications queue                                      | Scope, FR-060, FR-061       |
| D6  | Rejection reason       | free text: `rejection_reason: z.string().min(1)`                                | closed enum of exactly 4: 本人確認不備 / 年齢制限 / BL該当 / その他, plus an optional free-text supplement                            | FR-031                      |
| D7  | Cancellation           | stub: sets `cancelled`, returns hard-coded `refund_amount: 5000`, **no guards** | mandatory reason; blocked past the usage-start date; blocked on the 3rd same-day attempt; refund guidance derived from payment method | FR-033–FR-036               |
| D8  | Exemption              | absent                                                                          | ⚠️ **provisional** enrolment-fee exemption: campaign / re-enrolment / staff-discretionary                                             | FR-025, FR-026, FR-025a     |
| D9  | Companion upgrade      | absent                                                                          | C→A Yamauchi-ID upgrade banner with inherited visit / training counts                                                                 | FR-041                      |
| D10 | Pre-approval checklist | absent                                                                          | BL result, age vs brand minimum (+ minor consent state), usage-start within 2 months of contract start                                | FR-027                      |

### 2.2 List screen changes

| #   | Area                   | On disk (v2)                                           | Required (v5)                                                                                                         | Ref            |
| --- | ---------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | -------------- |
| L1  | KPI cards              | 3 cards: 未審査 / BL要注意 / **未成年**                | 2 cards: 未審査 (未審査+審査中) / BL要注意 — the 未成年 card is **removed**; counts span the user's whole store scope | FR-004         |
| L2  | Columns                | 10, header `店舗`                                      | 11, header `申請店舗`, with **入会経路** added before 利用開始日                                                      | FR-001         |
| L3  | Sorting                | `sort_by` enum has a single member: `application_date` | 5 sortable columns: 申請ID / 氏名 / ステータス / 申請日時 / 利用開始日                                                | FR-009         |
| L4  | Status sort order      | n/a                                                    | review-flow order 未審査 → 審査中 → 承認済 → 自動承認済 → 否認 → 取り消し済                                           | FR-010         |
| L5  | Filters                | status, brand, store, blacklist, date range, search    | adds **enrolment route**; brand/store hidden when the user is single-store scoped                                     | FR-006, FR-015 |
| L6  | Date range default     | none                                                   | most recent **7 days**, two-month calendar, Japanese locale                                                           | FR-007         |
| L7  | Active-filter feedback | partial                                                | active-filter count badge, per-control active marking, result banner with filtered/total counts, one-action clear     | FR-008         |
| L8  | Overdue                | absent                                                 | 対応超過 badge + threshold tooltip for 未審査 beyond the threshold                                                    | FR-011         |
| L9  | Page sizes             | `limit` defaults to 50, no size selector contract      | 25 / 50 / 100 / 200, default 50; reset to page 1 on any filter/search/sort/size change                                | FR-014         |
| L10 | Empty state            | single state                                           | filtered-empty (offers clear) vs genuinely-empty (does not)                                                           | FR-017         |

### 2.3 Security and permission changes

| #   | Area               | On disk (v2)                                                                                                                             | Required (v5)                                                                                                              | Ref            |
| --- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------- |
| S1  | Store scope        | **none server-side.** `route.ts` filters only on a client-supplied `store` query param (L81-82); no route calls `getAuthUserFromRequest` | every route resolves scope via `getAllowedStoreIds()`; out-of-scope records are unreachable, including by direct ID access | FR-015, FR-062 |
| S2  | Approve permission | `MembershipApplicationsApprove` granted to **`System` only**                                                                             | also granted to Headquarter, Manager, Staff                                                                                | FR-042         |
| S3  | Observer           | already View-only ✓                                                                                                                      | unchanged                                                                                                                  | FR-063         |
| S4  | Trainer            | already has no membership-application permission ✓                                                                                       | unchanged                                                                                                                  | FR-063         |
| S5  | Cancel gating      | none                                                                                                                                     | same role set as approve/reject                                                                                            | FR-063         |

S1 is the most serious finding in this baseline audit: the current endpoints will return any store's application to any authenticated caller who asks for it by ID. It is a real gap, not a cosmetic one, and it is fixed as part of this feature rather than deferred.

### 2.4 Admin form changes

| #   | Area                | On disk (v2)                               | Required (v5)                                                                                                                                                                                     | Ref            |
| --- | ------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| F1  | Enrolment route     | absent (application-type selector instead) | read-only **手動** with an explanation                                                                                                                                                            | FR-043         |
| F2  | Minimum age         | uniform                                    | brand-dependent: JOYFIT 15 / FIT365 16                                                                                                                                                            | FR-046         |
| F3  | Minor handling      | `minor-consent-dialog.tsx`                 | inline minor warning + mandatory consent checkbox gating submission                                                                                                                               | FR-047         |
| F4  | No-brand-yet state  | n/a                                        | explicit "the brand determines the age condition" hint                                                                                                                                            | FR-049         |
| F5  | Agreement timestamp | present but not blocking                   | **required**; submission blocked while empty; proxy applicant read-only from session                                                                                                              | FR-051, FR-056 |
| F6  | Payment method      | generic                                    | クレジットカード（SBPS） / 口座振替（JACCS）                                                                                                                                                      | FR-050         |
| F7  | Fee calculation     | flat                                       | brand-split (FIT365: card-issue fee; JOYFIT: enrolment fee from master + registration handling fee), prorated first month, following month, campaign discount as its own line, total floored at 0 | FR-053, FR-054 |
| F8  | Pre-fill            | absent                                     | applicant name / kana / phone / e-mail carried from a matched visit-trial record, with a notice that values were pre-filled                                                                       | FR-058         |

---

## Part 3 — Decisions

### R1 — Rework the existing route in place (do not build a parallel route)

- **Decision**: rework `src/app/(private)/membership-applications/` and its API routes in place. Keep the URL, the folder name, the three permission keys, the `db.membershipApplications` table key, and the `/api/crm/membership-applications` endpoint prefix.
- **Rationale**: the v2 implementation's component decomposition already matches the v5 screen structure card-for-card (applicant info, blacklist result, contract info, fee/payment, timeline, meta, status-action, four dialogs). The delta is field-level and rule-level, not structural. Renaming to `enrollment-applications` would additionally churn `routes.config.ts`, `permission.constants.ts`, `app-sidebar.tsx`, the inbound link in `visit-experiences/[id]/_components/permit-actions.tsx`, all 11 API paths, and the entire generated client — for no user-visible change, since users read the Japanese copy (入会申請管理), which is already right.
- **Alternatives considered**: (a) build a new `/enrollment-applications` route and delete the old one — rejected: duplicates 30+ files and leaves two live routes during the transition, with the permission matrix and sidebar temporarily pointing at the wrong one. (b) Keep v2 and layer v5 behind a flag — rejected: the two revisions disagree about the primary classification axis (申請種別 vs 入会経路), so both cannot be coherently true of one record at once.

### R2 — The CRM does not perform auto-approval

- **Decision**: the CRM never transitions an application into 自動承認済. Such records arrive already decided and render read-only, showing the system timeline entries for the passed checks, the generated member record, and the completion e-mail.
- **Rationale**: C-01 places the auto-approval decision on receipt of the application, upstream of these screens. Spec Assumptions state this explicitly, and FR-060 describes auto-approved applications as an approval **log**.
- **Alternatives considered**: implementing the auto-approval evaluation in the mock's `createDirect`/receive path so the demo can show a record flipping to 自動承認済 — rejected: it would fabricate a CRM responsibility the requirement assigns elsewhere, and the admin-form path (the only creation path this feature owns) always produces 未審査 + 手動 regardless (FR-061), so nothing in scope would ever exercise it. Seeded 自動承認済 rows cover the display requirement.

### R3 — KPI counts are computed server-side

- **Decision**: the list response carries `summary: { pending_count, blacklist_count }`, computed over the caller's full store scope **after** filters that define the queue and **before** pagination.
- **Rationale**: FR-004 defines the cards as counts of the user's scope. A paginated client sees at most one page and cannot compute them.
- **Alternatives considered**: (a) count client-side over the current page — rejected: it reports the page, not the queue, and is simply wrong. (b) A second unpaginated request purely for counting — rejected: unbounded payload for two integers.
- **Note**: this is a documented divergence from C-01, recorded in the plan's Complexity Tracking.

### R4 — The overdue flag is derived, never stored

- **Decision**: 対応超過 is computed at render time from `application_date` + a threshold constant (24 hours, matching the prototype), in the client.
- **Rationale**: the flag depends on the current clock. A stored boolean is stale the moment it is written; a server-computed one is stale by the age of the response. Deriving it at render keeps it honest and needs no contract field.
- **Alternatives considered**: a stored `is_overdue` column refreshed on read — rejected as gratuitous state for a pure function of two values the client already holds.

### R5 — Status sorting uses an explicit rank map

- **Decision**: server-side sort by status maps each status to a rank (未審査 0, 審査中 1, 承認済 2, 自動承認済 3, 否認 4, 取り消し済 5) and orders by rank.
- **Rationale**: FR-010 requires review-flow order. Sorting on the stored enum string would order alphabetically (`approved, auto_approved, cancelled, pending, rejected, review`), which puts decided applications above the queue — the opposite of what a reviewer needs.
- **Alternatives considered**: relying on enum declaration order — rejected as an implicit dependency on a literal's ordering that any future reordering would silently break; the rank map states the intent where a reader will find it.

### R6 — Cancel reuses the approve permission key

- **Decision**: cancellation is gated by `Permission.MembershipApplicationsApprove`. No new permission key.
- **Rationale**: FR-042 and FR-063 give approve, reject, and cancel exactly the same role set (Headquarter / Manager / Staff / System; not Observer; not Trainer). A separate key would encode a distinction the requirement does not make, and would need its own row in every role block.
- **Alternatives considered**: a dedicated `MembershipApplicationsCancel` — reconsider only if C-01 later separates the two role sets. Recorded here so a future reader knows the reuse was deliberate rather than an oversight.

### R7 — ⚠️ The exemption model is provisional

- **Decision (2026-08-06, from the PO conversation)**: build the enrolment-fee exemption exactly as the V0 prototype does — precedence **campaign → re-enrolment → staff-discretionary**, first match wins, exactly one exemption ever applies, and it applies only to the 入会金 line (never to the registration handling fee, card-issue fee, or membership fees). The re-enrolment window defaults to 180 days after withdrawal. A staff-discretionary exemption requires a written reason before it takes effect.
- **Status**: **not finalised.** These rules come from a prototype, not an approved requirement. C-01 revision 260624_v5 does not describe the exemption at all, and the prototype's own source carries the note `複数免除が同時成立した場合の優先順位は要確認` ("the precedence when several exemptions hold at once needs confirmation").
- **Obligation (FR-025a)**: the implementing code must carry an inline comment saying so, at the site where precedence is decided — the mock table's exemption resolution and the detail screen's fee card. Not a README note; a comment where the next reader will be standing.
- **Alternatives considered and deferred (not rejected)**: largest-discount-wins; additive stacking. Both remain live possibilities and should be revisited when C-01 documents the exemption model.

### R8 — Removals are deletions, not hidden branches

- **Decision**: `application-type-section.tsx`, `corporate-info-section.tsx`, `employee-discount-section.tsx`, the `corporate-masters` route, the 未成年 KPI card, and the corresponding schema fields are **deleted**, not feature-flagged or conditionally hidden.
- **Rationale**: v5 does not make corporate/employee-discount enrolment optional in this screen — it moves it to the mobile app. Code retained "just in case" for a path no route can reach becomes indistinguishable from a live feature on the next read, and would keep the removed vocabulary (申請種別) alive in the schema and generated client.
- **Alternatives considered**: keeping the sections behind a disabled flag for a possible v6 return — rejected; git history is the correct place to retrieve deleted code, and `specs/membership-applications/` preserves the v2 design intent in full.

---

## Part 4 — Verification approach

Per the constitution's **No Testing Policy** this feature ships **no automated tests** — no unit, integration, or e2e tests, and no test-writing tasks in `tasks.md`. Quality is established by:

1. `tsc --noEmit` exiting 0,
2. ESLint + Prettier via husky/lint-staged,
3. the manual script in [quickstart.md](quickstart.md),
4. the 158-item [checklists/parity.md](checklists/parity.md) gate, which `/speckit.implement` refuses to pass while items remain unchecked,
5. code review before merge to `dev`.
   </content>
