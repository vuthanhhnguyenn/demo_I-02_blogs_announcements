# Test Plan: B-01 入退館管理 (来館モニター, Phase 1 baseline) — 013

**Spec**: [../spec.md](../spec.md) · integration register: [`api-integration-output/entry-exit/report.md`](../../../api-integration-output/entry-exit/report.md) (no `integration-plan.md` exists for this feature; the report is the gap register)
**PO Spec**: `B-01` — 入退館管理（来館モニター） (`crm/requirements/B-01.md`)
**Created**: 2026-10-20
**Integration round**: **Round 1 done (2026-10-20)** — the activity tables (`GET /api/v1/admin/visit-monitor/activity`), the hourly chart (`GET /api/v1/admin/visit-monitor/daily-stats`) and the store selector (`GET /api/v1/admin/stores`) are on the real API. Member Quick View is deferred to Phase 2 (no endpoint).
**Environment**: **local** backend (`NEXT_PUBLIC_REAL_API_URL=http://localhost:4000`), FE `http://localhost:3000`, sign-in by **magic link** (see `docs/local-test-env.md`).
**Consumed by**: `gen-testcases` → `execute-testcases`

> Sibling plan: [`specs/015-entry-exit-history/tests/test-plan.md`](../../015-entry-exit-history/tests/test-plan.md) (B-01-01 入退館履歴). Both are run in the same session against the same seeded data.

---

## Scope

**In scope**

- **入退館 (来館モニター, Phase 1 view)** — `/entry-exit`: page header (title 入退館, 履歴データ badge, store select, 前日/翌日 + calendar), 時間帯別入館者数 chart, 入館 / 退館 activity tables (最新5件, badges, empty/loading states), footer links 「入退館履歴ですべて表示」.

**Out of scope**

- **B-01-01 入退館履歴** (`/entry-exit/history`) — separate unit in plan 015; this unit only checks that the footer link lands there.
- **Phase 2 elements** (FR-B01-12): KPI counter, 本日の入退館状況 bar, 在館者 tab, tab switcher, notification panel + bell. Tested only as "not rendered".
- **Member Quick View** (FR-B01-05/06) — deferred to Phase 2 (spec US2, report row B.3). Tested only as "row click opens nothing".
- **Gate logic** (FR-B01-14, FR-M001–M006) — the data is produced by the gate API during seeding; its judgement rules are not tested here.

---

## Unit Table

| #   | Unit                     | Screen(s)                         | Route         | TC Doc Filename                                      |
| --- | ------------------------ | --------------------------------- | ------------- | ---------------------------------------------------- |
| 1   | 入退館 (来館モニター P1) | header + chart + 入館/退館 tables | `/entry-exit` | `TC -【Fitness CRM】- [B-01][Entry Exit Monitor].md` |

**Split rationale**: one screen with no modal or sub-route of its own in Phase 1 (Quick View deferred) → a single unit.

---

## Sources per Unit

| Unit | Spec sections                                                                            | UI prototype file                                                                         | FRs covered                                                                                                        |
| ---- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1    | Scope; US1, US3, US4 (US2 only as "deferred"); Edge Cases; FR list; UI States; Q&A #7/#8 | `.cache/fitness-crm-ui/src/pages/entry-exit.tsx` (Phase-1 branch, `currentPhase !== "2"`) | FR-B01-01, -02, -03, -04, -07, -08, -09, -10, -11, -12, -15, -16, -17, -18; FR-B01-05/06/13/14 as exclusion checks |

API reference (contract, not oracle): Swagger `http://localhost:4000/docs-json` — activity (`limit` default 5, `date`, `storeId`; 403 `E-VIS-100/101`, 404 `E-VIS-007`, 422 `E-VIS-005`, 429 `E-RATE-001`), daily-stats (24 zero-filled bins, clipped at current hour today).

---

## Spec-vs-Prototype Deltas

| #   | Item                           | In spec                                                                                                 | In prototype (`@f2fe3f9`)                                                 | How to test                                                                                                                                                                           |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-1 | Member Quick View on row click | Deferred to Phase 2 (US2, FR-B01-05/06)                                                                 | `entry-exit.tsx` still opens `MemberQuickViewSheet` ungated (Q&A #7 open) | Row click → nothing opens. Note cites Q&A #7.                                                                                                                                         |
| D-2 | Future-date guard              | **Spec-only** FR-B01-09: 翌日 disabled on today, future days disabled in calendar (API 422 `E-VIS-005`) | No guard                                                                  | Assert disabled; a deep link/ manual future date must not show a raw error.                                                                                                           |
| D-3 | Data source of chart/tables    | Spec text (Edge Cases, Assumptions) still says static mock, not reacting to date/store                  | Static mock                                                               | **Report wins over the stale spec text**: Round 1 made them real. Cases assert tables/chart follow the selected date and store. Note: "spec Assumption outdated by real-API Round 1". |
| D-4 | Current hour / today           | Real current time (Assumptions)                                                                         | Fixed demo 2026-04-08 14:00                                               | Assert against the real clock (JST).                                                                                                                                                  |
| D-5 | Frequency badge 常連/久しぶり  | FR-B01-03: mock values                                                                                  | Mock arrays                                                               | Now from API `badge` object; with fresh local data likely none → covered by "---" placeholder; badge tooltip case runs only if a row carries a badge, else **N/A (no data)**.         |
| D-6 | Status-text colour tokens      | Q&A #8 open (tokens not ported)                                                                         | `--*-text` tokens                                                         | Colour cases do not fail on the lighter shade; note Q&A #8.                                                                                                                           |

---

## Coverage Focus

On top of gen-testcases' full checklist walk:

- **Real-API behaviours**: tables show ≤5 rows each even when >5 events exist (6th event proves the cap); newest first; 入館 table = `entry`/`companion_entry`, 退館 = `exit`; denied scans — which table, how labelled (spec silent → observe, note); data follows the store select (全店舗 vs ZZQA-JOY vs ZZQA-FIT) and the date (today vs a past date with no data → empty state); hourly chart sums match the number of entries seeded per hour; future date blocked (D-2); 401 expiry → redirect to login; persistence after reload (selected date/store kept or reset — record what happens, spec silent).
- **Role × scope**: HQ admin sees store select (2 stores, 全店舗 scope); a role with one store / without `can_view_gate_log` → 403 page or no select (FR-B01-11). Local roles other than admin have **every permission false** → expect `/403` (record as observed, not NG, unless the spec says otherwise).
- **UI breakage under stress**: long member name / furigana / long contract name (line-clamp 2 + `title`) at **1024px**, two tables side by side must not overflow; long store name in the select. Only data that exists can be rendered — long-value rows depend on the seeding report (else **Block (env-data)**).
- **States**: empty (`Empty`, entityLabel 入館/退館) on a past date with no data; loading skeleton (throttle network); avatar fallback for members without `facePhotoUrl`.
- **Phase-2 exclusions** (FR-B01-12) and the footer link (FR-B01-07) → `/entry-exit/history`.

---

## Known Round 1 Gaps

| Bn  | Blocker                                             | UI behaviour in Round 1 | Test treatment                                                                                |
| --- | --------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| B1  | Member Quick View has no API (report B.3) — Phase 2 | Rows not clickable      | Spec says deferred → the "no panel" case is a normal pass; any Quick View case → `Block (B1)` |
| B2  | Status-text colour tokens not ported (Q&A #8)       | Lighter coloured text   | Colour-shade cases → `Block (B2)` if they differ only by shade                                |

---

## Traceability

| FR                       | Unit | Note                                         |
| ------------------------ | ---- | -------------------------------------------- |
| FR-B01-01, -02, -03, -04 | 1    | -03 badge tooltip may be N/A (no badge data) |
| FR-B01-05, -06           | 1    | exclusion check only (deferred)              |
| FR-B01-07                | 1    | link only; destination in 015                |
| FR-B01-08, -09, -10, -11 | 1    |                                              |
| FR-B01-12, -13, -14      | 1    | exclusion checks                             |
| FR-B01-15, -16, -17, -18 | 1    |                                              |

Every FR lands in unit 1. No orphan requirement.

---

## Execution Notes (for execute-testcases)

- **Credentials (local)**: magic link, no passwords. `admin@example.com` (Headquarters Admin) for every positive case. Role checks: `crm-manager@…` (Territory Manager), `crm-staff@…` (Store Manager), `crm-observer@…` (View-only), `crm-trainer@…` (Trainer). Request: `POST localhost:4000/api/v1/auth/crm/magic-link {"email":…}`; link: `grep 'crm magic-link email' ~/Documents/fitness-backend-v2/be.log | tail -1`. Single-use, 15 min. Save a storage-state per role. The 「デモ: ユーザー切替」 switcher shows because `NEXT_PUBLIC_APP_ENV=development`, but it does not mint a real session on the local BE — re-login instead.
- **Environment**: FE `http://localhost:3000` → BE `http://localhost:4000` (bff + auth-svc + contracts-svc + gate-svc). Local DB on this machine, shared only with the developer's own work.
- **Data policy**: entry/exit rows are created through the device API `POST /api/v1/gate/authenticate` by the seeding script (scratchpad `seed-entry-exit.sh`); created controllers/devices use prefix `ZZQA_`. Members used are the `JF-9000xxx` fixtures — never edit them, except a temporary manual gate-stop that the seed script removes. Access logs cannot be deleted through the API → leave them, note in the result. No seed reset exists.
- **Time**: gate timestamps are "now" (no back-dating) → past-date cases use dates before the seed (expect empty state) unless older data exists.
- **Known-gap policy**: failure matching B1/B2 → `Block (Bn)`; missing test data → `Block (env-data)`; any other failure → `NG`.
- **Viewport**: 1024×768 for layout cases; 1440×900 for the wide check.
- **Account safety**: no password cases here (magic link only).

---

## Suggested Order

1. Seed data (gate API) — the screen reads what the seed creates.
2. Unit 1 as HQ admin: render → tables/cap → date navigation → store scope → states → stress → exclusions.
3. Role cases last (re-login per role).
4. Then plan 015 (history) reuses the same data.

## Definition of Done

- `TC -【Fitness CRM】- [B-01][Entry Exit Monitor].md` created under `tests/cases/`, every FR above traced.
- Executed once; every case OK / NG / Block / N/A with evidence.
- Seeded data listed in the run notes (access logs stay — not deletable).
