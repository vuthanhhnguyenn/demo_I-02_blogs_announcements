# Quickstart: Manual verification — Enrollment Application Management

**Feature**: `025-enrollment-application-mgmt` | **Plan**: [plan.md](plan.md)

Per the constitution's **No Testing Policy** this project ships no automated tests. This script, together with the 158-item [checklists/parity.md](checklists/parity.md), is the verification artefact. Walk it end to end before opening the MR.

## Setup

```bash
npm run generate-openapi && npm run generate-api   # after any _schemas/ change
npm run dev
```

> ⚠️ The mock DB is a `globalThis` singleton. Editing a seed file has **no effect** on a running dev server — HMR does not reset it. **Fully restart** `npm run dev` after any seed change, or you will be testing yesterday's data.

Sign in as a **Staff** user first — the store-scope rules are the easiest thing to get wrong and the hardest to notice, so exercise the narrow role before the wide one.

## Gate checks (must all pass before review)

```bash
npx tsc --noEmit    # 0 errors outside .next/ — stale .next/types/validator.ts noise is expected and ignorable
npm run lint
```

---

## 1. List screen — `/membership-applications`

1. **KPI cards** — exactly **two** cards (未審査, BL要注意). The 未成年 card must be **gone**. The 未審査 count includes 審査中 rows. Cross-check the numbers against the whole queue, not the visible page: set the page size to 25 with more than 25 pending rows and confirm the card does **not** change. (FR-004)
2. **BL card treatment** — with zero matches the number renders in the success treatment with no alert border; with one or more it turns destructive and the card gains a destructive border. (FR-004)
3. **Columns** — 11 columns in order: 申請ID / 氏名 / ステータス / BL照合 / ブランド / **申請店舗** / プラン / キャンペーン / 申請日時 / **入会経路** / 利用開始日. Confirm the header reads 申請店舗, not 店舗. (FR-001)
4. **Statuses** — all six render distinctly, 自動承認済 included. (FR-002)
5. **Sorting** — click each of 申請ID / 氏名 / ステータス / 申請日時 / 利用開始日; each toggles asc/desc with the active column and direction indicated. Sorting by ステータス must produce 未審査 → 審査中 → 承認済 → 自動承認済 → 否認 → 取り消し済 — **not** alphabetical. (FR-009, FR-010)
6. **Overdue** — a 未審査 row older than 24 h shows the 対応超過 badge with a threshold tooltip. (FR-011)
7. **BL rows** — a matching row is visually distinguished and its BL照合 cell shows the BL一致 badge; a non-matching row shows a neutral placeholder. (FR-012)
8. **Campaign placeholder** — a row with no campaign shows a neutral placeholder, never the literal text なし. (Edge case)
9. **Search** — a partial application ID and a partial name each narrow the list and reset it to page 1. (FR-005)
10. **Filters** — status, date range, BL result, and 入会経路 are all present; the date range defaults to the last 7 days and the calendar shows two months in Japanese. (FR-006, FR-007)
11. **Filter feedback** — with filters active: a count badge on the toggle, each changed control marked active, and a result banner reporting the filtered count against the total. Clear-all resets every filter **including** search and the date range, back to page 1. (FR-008)
12. **Pagination** — page sizes 25 / 50 / 100 / 200 with 50 selected by default; the total, page count, and visible range are all reported; any filter/search/sort/size change returns to page 1. Filter down while on a high page and confirm it clamps to the last valid page rather than showing a blank table. (FR-014, Edge case)
13. **Empty states** — filters matching nothing offer a clear-filters action; a genuinely empty dataset does not. (FR-017)
14. **Row click** — opens that application's detail screen. (FR-013)
15. **Scope** — as Staff, only your own store's applications appear, and the brand and store filters are **not offered**. As Headquarter, all stores appear and both filters are offered. (FR-015)

## 2. Approval detail — `/membership-applications/{id}`

16. **Masking** — phone, e-mail, and address are masked on load; each reveals individually and a single control toggles all three. (FR-019, SC-009)
17. **Blacklist card** — on a match: destructive treatment, every matched condition listed, each linking to its blacklist entry, plus a warning above the action buttons and an approve button reading **リスクを確認して承認する**. On no match: a plain confirmation the check ran. (FR-020, FR-021)
18. **Pre-approval checklist** (未審査 only) — BL result; age against the brand minimum with the minor state and any recorded consent (timestamp + method); usage start within two months of the contract start. A usage start beyond two months **warns** rather than blocks. (FR-027, Edge case)
19. **Incomplete BL check** — the checklist must **not** report an unfinished comparison as passed. (Edge case)
20. **Fee breakdown** — JOYFIT shows 入会金 + 登録事務手数料 + 日割り初月会費 + 翌月会費; FIT365 shows カード発行料 + 日割り初月会費 + 翌月会費. A JACCS payer sees the combined-charge warning. (FR-023, FR-024)
21. **⚠️ Exemption (provisional)** — on a 未審査 row with an exemption, the enrolment fee shows struck through against zero with the discount, the total drops accordingly, and the rule is stated (for a re-enrolment: the previous withdrawal date and whether it qualifies). A staff-discretionary exemption takes effect only once a reason is written. **Verify the inline provisional comment exists in the code** at the exemption-resolution sites — this is FR-025a and it is part of the deliverable, not a nicety.
22. **Agreement gate** — an admin-sourced application with no agreement timestamp cannot be approved, and says why above the action buttons. (FR-028, SC-006)
23. **Approve** — the dialog restates applicant, store, plan, any exemption, and the initial charge total; confirming sets 承認済, records approver and timestamp, and writes the timeline entries (including the exemption entry when one applied). (FR-029, FR-030)
24. **Reject** — exactly four reasons (本人確認不備 / 年齢制限 / BL該当 / その他), the action disabled until one is chosen, an optional supplement, and the release/notification notice. Confirming sets 否認 with attribution and both timeline entries. (FR-031, FR-032)
25. **Cancel — blocked cases** — an application whose usage start date has passed is blocked with an explanatory dialog; a third cancellation attempt for the same application on the same day is blocked with the limit stated. The two blocked reasons are **distinct** dialogs. (FR-034, SC-005)
26. **Cancel — success** — the dialog shows the same-day count against the limit of 2 (escalating at 1 and at 2) and refund guidance matching the payment method; the reason is mandatory; confirming sets 取り消し済, increments the counter, and writes the timeline entry with reason and refund handling. (FR-033, FR-035, FR-036)
27. **Timeline** — newest first, memos distinguished from system records, memos deletable, system records **not** deletable and with no delete affordance. The add action is disabled on empty or whitespace-only input. (FR-037, FR-038)
28. **Companion upgrade** — a companion applicant shows the upgrade banner with the Yamauchi-ID, the C→A transition, and the inherited visit and training counts. A non-companion applicant shows no banner. (FR-041)
29. **Decided applications** — for 承認済 / 自動承認済 / 否認 / 取り消し済 the checklist and the approve/reject actions are not offered; the screen reads as a record. A 自動承認済 row shows the system entries for the passed checks, the generated member record, and the completion e-mail. (FR-060, Edge case)
30. **Role gating** — as Observer, view works but approve / reject / cancel / admin-enrolment are unavailable with an explanation. As Trainer, the feature is unreachable entirely. (FR-042, FR-063, SC-010)
31. **Out-of-scope access** — as Staff, open another store's application ID directly in the URL: it must be refused, not rendered. (FR-062)

## 3. Admin enrolment form — `/membership-applications/create`

32. **Entry point** — the 管理画面から入会登録 action is present for Headquarter / System / Manager / Staff and unavailable with an explanation for Trainer / Observer. (FR-016)
33. **Route display** — 入会経路 shows read-only **手動** with an explanation. There is **no** 申請種別 selector, **no** corporate section, and **no** employee-discount section. (FR-043, R8)
34. **Required fields** — family name, given name, both kana fields, birth date, gender, phone, e-mail, and face photo are marked required; address is optional. Gender offers 男性 / 女性 / その他 / 回答しない. (FR-044, FR-045)
35. **Age — below minimum** — with JOYFIT, a birth date giving age 14 blocks registration with an explanatory error; with FIT365, age 15 does the same. (FR-046, SC-007)
36. **Age — minor** — at or above the brand minimum but under 18: a minor warning plus a mandatory parental-consent checkbox; registration stays blocked until it is checked. (FR-047, SC-007)
37. **Age — adult** — confirms the condition is satisfied, naming the brand's minimum. (FR-048)
38. **Birth date before brand** — states that the brand determines the age condition rather than judging against a default. (FR-049)
39. **Agreement timestamp** — empty blocks registration with the field explaining why; the proxy applicant shows read-only from the session. (FR-051, FR-056)
40. **Fees** — FIT365: card-issue fee + prorated first month + following month. JOYFIT: enrolment fee selected from the active brand masters + registration handling fee + prorated first month + following month. A campaign discount is its own line and the total never goes below zero. Before a brand is selected the section says the items depend on the brand. (FR-053, FR-055)
41. **No applicable fee master** — the selector offers nothing and the amount stays empty rather than defaulting to 0. (Edge case)
42. **Proration** — change the usage start date within a month and confirm the first-month figure tracks it against the plan's monthly fee. (FR-054)
43. **Blacklist section** — three distinguishable states: not yet checked, checked with no match, checked with a match. (FR-052)
44. **Pre-fill** — arriving from a matched visit/trial record pre-fills name, kana, phone, and e-mail, and tells the user the values were pre-filled. (FR-058)
45. **Register** — the confirmation dialog restates route, brand, store, plan, payment method, and age with any confirmed consent; the completion dialog states the application was added as 未審査 and that the member record follows only after approval; returning to the list shows it as 未審査 with the 手動 route. (FR-057, FR-061)
46. **Cancel** — returns to the list without registering. (FR-059)

## 4. Removal verification

47. `GET /api/crm/membership-applications/corporate-masters` returns 404 — the route is deleted, and `application_type`, the corporate block, and the employee-discount block no longer appear in the generated client. (R8)

## 5. Parity gate

48. Walk [checklists/parity.md](checklists/parity.md) top to bottom against the built screens and tick each of the 158 `PAR###` items only after confirming the element, field order, and copy match V0. **PAR064–PAR073 and PAR100 are the ⚠️ provisional exemption items** — build them to parity, and confirm the FR-025a code comment is present. `/speckit.implement` will not report done while items remain unchecked.
    </content>
