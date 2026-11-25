# Test Plan: B-01-01 入退館履歴 (Entry/Exit History) — 015

**Spec**: [../spec.md](../spec.md) · integration register: [`api-integration-output/entry-exit/report.md`](../../../api-integration-output/entry-exit/report.md) (no `integration-plan.md`; the report is the gap register)
**PO Spec**: `B-01` supplement **B-01-01 入退館履歴** (FR-M007), Phase 1
**Created**: 2026-10-20
**Integration round**: **Round 1 done (2026-10-20)** — store selector (`GET /admin/stores`), list with filters/sort/pagination (`GET /admin/access-logs`) and CSV export job flow (`POST /admin/access-logs/exports` → poll `GET …/exports/{id}`) are on the real API. CSV usually times out (worker runs hourly — report A.3). Quick View deferred to Phase 2.
**Environment**: **local** backend (`http://localhost:4000`), FE `http://localhost:3000`, magic-link sign-in (`docs/local-test-env.md`).
**Consumed by**: `gen-testcases` → `execute-testcases`

> Sibling plan: [`specs/013-entry-exit-management/tests/test-plan.md`](../../013-entry-exit-management/tests/test-plan.md) (B-01 monitor). Same seeded data.

---

## Scope

**In scope**

- **入退館履歴** — `/entry-exit/history`: header (title, CSV出力 with permission tooltip), search box (利用者名・会員ID), 詳細フィルター panel (期間, 店舗, 認証方式, 処理結果), filter-result banner + 条件をクリア, table (12 columns, 7 sortable), empty states, pagination (count, page size), URL/deep-link state (`?store_id=` etc.), route-level permission gate.

**Out of scope**

- **B-01 monitor** (`/entry-exit`) — plan 013.
- **Quick View on row click** (FR-012) — deferred to Phase 2; tested only as "row click opens nothing".
- **CSV file content** beyond "export carries the applied filters" — the BE worker writes the file (BAT-036), not this screen.
- **Gate judgement logic** (FR-M001–M006/M008/M009).

---

## Unit Table

| #   | Unit       | Screen(s)                                                 | Route                 | TC Doc Filename                                         |
| --- | ---------- | --------------------------------------------------------- | --------------------- | ------------------------------------------------------- |
| 1   | 入退館履歴 | search + filter panel + banner + table + CSV + pagination | `/entry-exit/history` | `TC -【Fitness CRM】- [B-01-01][Entry Exit History].md` |

**Split rationale**: one list screen; the filter panel and CSV action live only inside it → a single unit.

---

## Sources per Unit

| Unit | Spec sections                                                                               | UI prototype file                                        | FRs covered                           |
| ---- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------- |
| 1    | Clarifications 2026-07-08; US1, US3 (US2 as deferred); Edge Cases; FR-001…FR-018; Q&A #5–#8 | `.cache/fitness-crm-ui/src/pages/entry-exit-history.tsx` | FR-001 … FR-018 (FR-012 as exclusion) |

API reference: Swagger `/docs-json` — list requires `dateFrom`/`dateTo` (≤92 days, `E-VIS-004`), `memberQ` length / empty enum / from>to → 422 `E-VIS-005`, 403 `E-AUTH-100` (trainer) / `E-VIS-100` (no `can_view_gate_log`) / `E-VIS-101` (store out of scope) / `E-VIS-102` (no `can_export_gate_log_csv`), export 429 `E-VIS-006` (2 running exports, non-HQ).

---

## Spec-vs-Prototype Deltas

| #   | Item                                             | In spec                                                                                                          | In prototype (`@f2fe3f9`)                                            | How to test                                                                                                                   |
| --- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| D-1 | CSV export flow                                  | FR-016 (updated 2026-11-02): async job → poll → presigned URL; FR-019: job ID kept across reload / network error | Toast only (mock); no resume                                         | Case asserts a file downloads with the filters (TC-060–063) and the job is resumed, not duplicated (TC-076–084, [Spec-only]). |
| D-2 | Default date range                               | FE: last 30 days (today−29 → today), Q&A #8 open                                                                 | One calendar month (demo 11/1–11/30)                                 | Assert last 30 days; note Q&A #8.                                                                                             |
| D-3 | Route-level view gate                            | **Spec-only** FR-017 (Trainer blocked; Staff needs grant)                                                        | No gate                                                              | Direct URL as Trainer → 403 page.                                                                                             |
| D-4 | Export permission                                | FR-014: HQ/System/Manager by default, permission-based                                                           | Hardcoded role list; tooltip 「入退館ログCSV出力の権限がありません」 | Admin: enabled. Role without `can_export_gate_log_csv`: disabled + tooltip.                                                   |
| D-5 | Denial reason text                               | Q&A #5: only 休会中 / 主契約無効 labelled, others bare 拒否                                                      | Two reasons                                                          | Assert per seeded denial codes; unlabelled codes → bare badge.                                                                |
| D-6 | 同伴入館 badge tooltip / companion contract text | Q&A #6 open (no inviter data)                                                                                    | Tooltip with inviter; "同伴利用（C区分）"                            | Badge without tooltip is expected; `Block (B3)` for tooltip case.                                                             |
| D-7 | Member photo in 利用者 cell                      | Q&A #7 open (no photo URL in API)                                                                                | Photo                                                                | Initial-letter fallback expected; photo case `Block (B4)`.                                                                    |
| D-8 | Quick View                                       | Deferred (FR-012)                                                                                                | Phase-2-gated                                                        | Row click opens nothing.                                                                                                      |

---

## Coverage Focus

- **Real-API behaviours**: keyword matches name (kanji/kana) and member number (`publicId`) → server `memberQ`; over-long keyword → 422 handled (no raw error); date range > 92 days → handled message (`E-VIS-004`); from > to blocked; store/auth/result filters narrow the real total; banner "全 N 件中 M 件を抽出中" uses real totals; all 7 sort columns hit the server (asc ⇄ desc, 日時 starts desc, others asc, page → 1); pagination totals & page size; clear keeps sort + page size; in-progress visit shows "—" exit/dwell; denied row shows attempt time only; filters survive reload via URL (record behaviour); deep link `?store_id=<uuid>` shows the store name, not the UUID (report A.1 fix); 401 expiry → login.
- **Role × scope**: HQ sees store filter (2 stores); single-store user → no store filter (FR-004); Trainer → blocked (FR-017); Observer/Staff/Manager — local DB grants **no** permissions to these positions → expect 403 (`E-VIS-100`); positive role-scope cases → `Block (env-perm)` unless the position is granted `can_view_gate_log` for the run.
- **CSV**: admin click → job created with the current filters (inspect the POST body via network log) → result toast; failure toast 「CSVの出力に失敗しました」 on timeout → `Block (B1)`.
- **UI breakage under stress** at **1024px**: 12 columns horizontal scroll inside the table, not the page; long name/kana/contract (line-clamp + title), long store names in both store columns and the select (140px), banner with every filter active, long keyword in the search box.
- **States**: filtered-empty (with clear action) vs truly-empty (no clear action) (FR-018); loading skeleton.

---

## Known Round 1 Gaps

| Bn  | Blocker                                                              | UI behaviour in Round 1                                                             | Test treatment                                                                |
| --- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| B1  | CSV worker BAT-036 runs hourly (`:40`), FE polls ≤2 min (report A.3) | 「CSVの出力に失敗しました」 after the wait, unless the cron fires inside the window | Download case → `Block (B1)`; the request/job creation part is still verified |
| B2  | Quick View has no API (report A.4) — Phase 2                         | Row not clickable                                                                   | Quick View cases → `Block (B2)`; "no panel" is a pass                         |
| B3  | No inviter data on access-log API (Q&A #6)                           | 同伴入館 badge without tooltip                                                      | Tooltip case → `Block (B3)`                                                   |
| B4  | No photo URL on access-log API (Q&A #7)                              | Initial-letter avatar                                                               | Photo case → `Block (B4)`                                                     |

---

## Traceability

| FR                     | Unit | Note                             |
| ---------------------- | ---- | -------------------------------- |
| FR-001 … FR-011        | 1    |                                  |
| FR-012                 | 1    | exclusion (deferred)             |
| FR-013, FR-014, FR-016 | 1    | download part `Block (B1)`       |
| FR-015, FR-017, FR-018 | 1    | FR-017 partly `Block (env-perm)` |

Every FR lands in unit 1.

---

## Execution Notes (for execute-testcases)

- **Credentials / environment / data policy / time**: identical to plan 013 → Execution Notes (magic link per role, local BE 4000, `ZZQA_` prefix, `JF-9000xxx` fixtures read-only, access logs not deletable, timestamps = now).
- **CSV jobs**: each click creates an export job (`access_log_exports`). Keep clicks minimal (≤3); non-HQ is capped at 2 running jobs (`E-VIS-006`).
- **Known-gap policy**: failure matching B1–B4 → `Block (Bn)`; missing data → `Block (env-data)`; role cases needing permission the local DB lacks → `Block (env-perm)`; anything else → `NG`.
- **Viewport**: 1024×768 layout; 1440×900 wide check.

## Suggested Order

1. After plan 013's seed + monitor run (same data).
2. Default load → search → each filter → banner/clear → sort (7 columns) → pagination → states → stress → CSV (few clicks) → role cases last.

## Definition of Done

- `TC -【Fitness CRM】- [B-01-01][Entry Exit History].md` created, every FR traced.
- Executed once; results recorded; export jobs created by the run listed in the notes.
