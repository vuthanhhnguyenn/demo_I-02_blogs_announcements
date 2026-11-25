# Quickstart / Manual Verification: Transfer Management Update

> **Superseded (2026-10-05)**: this document describes the mock-API implementation round (prototype @ 1cc2d6d, 2026-07-18). The screen now runs on the real API-091 (`/admin/transfer-applications`, commit 4fe1f967) and the prototype @ 47423ec — free-word search, the 申請中 status, the 200-row page size and the 却下 wording are gone. Current behavior: [spec.md](spec.md) › _Prototype Alignment_ and [checklists/parity.md](checklists/parity.md). Kept as a historical record.

**Feature**: `024-transfer-management` | **Date**: 2026-08-05

Per the constitution's No Testing Policy, this checklist **is** the QA artifact — there are no automated tests. Work through it against a running dev server before opening the MR.

## Setup

```bash
npm run dev          # start via the Bash tool's run_in_background, not `nohup … &`
npx tsc --noEmit     # must exit 0
npm run lint         # must pass
```

> The mock DB is a `globalThis` singleton. After editing anything under `src/app/api/_mock-db/`, **fully restart** the dev server — HMR will not reset seeded state.

Screens: `/members/transfers` (list) and `/members/transfers/[id]` (detail).

## Test accounts

From `src/app/api/_mock-db/seeds/user.seed.ts`, all `@example.com`:

| Login                        | Role        | Expected on this feature                                                 |
| ---------------------------- | ----------- | ------------------------------------------------------------------------ |
| `system@`                    | System      | Everything, all stores                                                   |
| `admin@`                     | Headquarter | Everything, all stores                                                   |
| `manager@` / `area-manager@` | Manager     | Everything, managed stores only                                          |
| `staff@` / `store-manager@`  | Staff       | View + approve own store's side only; **no** bulk approve, **no** unlock |
| `trainer@`                   | Trainer     | **No access at all** — redirected to `/403`                              |
| (observer account)           | Observer    | View own store, read-only — no approve/reject                            |

## A. Permissions — the highest-risk area

The pre-update code decoded the session JWT client-side and **defaulted to `headquarter`** on any failure. Verify that path is gone.

- [ ] `grep -rn "decodeJWT\|getCurrentUserRole" src/app/\(private\)/members/transfers/` returns **nothing**
- [ ] Trainer opening `/members/transfers` lands on `/403`; the 移籍管理 sidebar item is dimmed with a deny tooltip
- [ ] Observer sees the list but **no** approve/reject buttons on detail and **no** approve/否認 items in the row menu
- [ ] Staff sees approve/reject only on rows where their store is the correct side at the current stage; a row awaiting the _other_ store's approval offers no action
- [ ] Staff sees **no** bulk-approve button (the selection bar's action is HQ/Manager-only) and **no** 手動解除 button
- [ ] Manager sees only managed-store transfers; switching the header store selector narrows further
- [ ] With devtools, call `PATCH /api/crm/transfers/{id}/approve` directly as Observer → **403**, not 200
- [ ] Call `GET /api/crm/transfers` with no auth header → **401**
- [ ] As Staff, `GET /api/crm/transfers/{id}` for a transfer at two unrelated stores → **404** (not 403 — existence must not leak)

## B. List screen — new/changed UI (FR-001…FR-005, FR-014, FR-015)

- [ ] Header renders via `PageHeader` with the result count in a `badge` (not the old hand-rolled `h1`)
- [ ] Column order is exactly: checkbox, 会員ID, 会員名, ブランド, 移籍元店舗, 移籍先店舗, 申請日, 移籍予定日, 自動移籍可否, ステータス, row-action
- [ ] 会員ID column is present (the old table showed 申請ID instead) and monospaced
- [ ] ブランド column renders `BrandBadge`
- [ ] Status badges show a colored dot for 申請中 / 移籍元承認待ち / 移籍先承認待ち / 否認, and a plain `secondary` badge with **no** dot for 完了
- [ ] Page-size selector offers 25 / 50 / 100 / 200 and the summary reads 全 N 件 / M ページ / X-Y を表示
- [ ] Changing page size resets to page 1
- [ ] Clearing all filters/search shows the plain empty state; filtering to zero results shows the `filtered` variant **with** a 条件をクリア button
- [ ] `FilterResultBanner` appears whenever a filter or search is active, and its total/filtered counts match the table
- [ ] Row click navigates to detail; clicking the checkbox or the row-action menu does **not** navigate
- [ ] Filters and search survive a page reload (nuqs URL state) and the browser back button

## C. Filters (FR-002, FR-003)

- [ ] All six controls present: ステータス, 移籍元店舗, 移籍先店舗, ブランド, 申請日, 自動移籍
- [ ] **Regression**: selecting the "all" option on 移籍元店舗 actually clears the filter (the old code compared against `'all '` with a trailing space, so it never cleared)
- [ ] Store dropdowns list stores from the API, not the old hardcoded 8-store array, and only stores the user can access
- [ ] 自動移籍 filter: 自動可のみ shows only JOYFIT eligible rows; 除外あり shows only JOYFIT excluded rows; neither shows FIT365 rows
- [ ] Active-filter count badge on the 詳細フィルター toggle matches the number of non-default filters
- [ ] Each active control renders the highlighted border/background
- [ ] Combining several filters narrows correctly and resets to page 1

## D. Auto-transfer eligibility (FR-006)

- [ ] FIT365 rows show `—` in 自動移籍可否 (never a badge)
- [ ] JOYFIT eligible rows show a success 自動可 badge
- [ ] 除外: 未納あり badge tooltip shows the yen amount
- [ ] 除外: 縛り期間中 badge tooltip shows 残り N日
- [ ] A row seeded with **both** exclusions shows **both** badges stacked
- [ ] Excluded JOYFIT rows have a **disabled** checkbox with the tooltip 除外理由のため個別対応が必要です
- [ ] FIT365 rows show no checkbox at all

## E. Bulk approve (FR-013)

- [ ] Selection bar appears only when ≥1 row is selected, showing N件選択中
- [ ] 選択解除 clears the selection
- [ ] Header select-all selects only _selectable_ rows on the current page, and shows the indeterminate state on partial selection
- [ ] Confirm dialog title reads {N}件のJOYFIT自動移籍を承認しますか？ and warns the action is irreversible
- [ ] After confirming, the selection clears, the list refetches, and the approved rows show 完了
- [ ] Server-side re-validation: craft a bulk-approve request containing an **excluded** JOYFIT id and a FIT365 id → both appear in `failed[]` with reasons; eligible ids still succeed
- [ ] A partial failure is surfaced in the UI, not silently swallowed

## F. Detail screen (FR-005, FR-007)

- [ ] `BackLink` reads 移籍管理に戻る and returns to the list
- [ ] Title reads `{会員名} さんの移籍申請`; request-ID badge is monospace; status badge matches the list's styling
- [ ] Member head-up card renders memberId, old member no, name, kana, member type, contract name, store
- [ ] Member detail page still renders correctly after the head-up card was extracted to `src/components/common/` (verify both consumers)
- [ ] 移籍情報 card field order: 申請ID, 移籍先店舗, 移籍理由 (full width), 移籍希望日, ブランド, 申請者, 申請日時
- [ ] 承認フロー card badge reads 自動移籍 for JOYFIT and 手動移籍（2段階承認） for FIT365, with the matching explanatory note
- [ ] **JOYFIT timeline has exactly 3 steps**; step 3 is システム自動移籍実行 with a 自動実行 badge and `Bot` icon while pending
- [ ] **FIT365 timeline has exactly 4 steps**; steps 2 and 3 carry 移籍元 / 移籍先 badges
- [ ] Completed steps show a success check and a success-colored connector; pending steps are muted with a `Clock`
- [ ] A transfer **created from member detail** (not seeded) has a brand-correct timeline — the old `create()` hardcoded a 3-step FIT365 shape for every brand
- [ ] Status card is the shared `StatusCard`; meta lines show 申請日 and 最終更新, plus 移籍先店舗の承認待ちです only for FIT365 at 移籍先承認待ち
- [ ] Approve button label becomes 移籍先として承認 for FIT365 at 移籍先承認待ち
- [ ] Action buttons disappear entirely once status is 完了 or 否認

## G. Approve / reject / unlock flows (FR-008…FR-012)

- [ ] Approve dialog: names the member and both stores; comment textarea is optional with an `OptionalMark`
- [ ] Reject dialog: warns the action is irreversible; comment optional
- [ ] **Comment is persisted** — reopen the detail after approving with a comment and confirm it is recorded (the old implementation discarded it)
- [ ] Textarea enforces `maxLength=1000`
- [ ] **JOYFIT approve at 移籍元承認待ち → status becomes 完了** and step 3 marks complete (the old code left JOYFIT permanently stuck at the intermediate state and never reached 完了)
- [ ] **The member's contracted store actually changes to the destination store** — verify on the member detail screen (this side effect was never implemented)
- [ ] FIT365 approve at 移籍元承認待ち → 移籍先承認待ち; approving again as the destination store → 完了
- [ ] Rejecting at either stage → 否認, and the timeline reflects it
- [ ] Approving an excluded JOYFIT transfer via a direct API call → **409**
- [ ] 手動解除 dialog: confirm button stays **disabled** until a non-whitespace reason is entered
- [ ] After unlocking, the warning alert is replaced by the success alert showing 解除理由, 実行者, and timestamp — and approval then proceeds
- [ ] A row with **both** unpaid and campaign_lock stays excluded after unlock (unlock releases only the campaign lock)
- [ ] Unlock on a row with no campaign lock → **409**

## H. Cross-cutting

- [ ] `grep -rn "'pending' | 'from_store_approved'" src/app/\(private\)/members/transfers/` finds no hand-declared status union — all statuses come from `types.gen.ts`
- [ ] No reference to the removed `approved` status remains anywhere (`tsc --noEmit` is the check)
- [ ] `DataTable` is **not** wrapped in `DataStateBoundary` on the list; query errors surface as a `sonner` toast with filters still mounted
- [ ] Detail screen still uses `DataStateBoundary` + its skeleton
- [ ] Dates render via `src/utils/date.util.ts` helpers — no inline `format()` calls
- [ ] Navigation uses `navigate()` and `<Link>`; no `router.push()` with string literals
- [ ] Sort tooltip does not blink on refetch (columns array is memoized)
- [ ] Layout holds at a 768px viewport

## I. Parity gate

- [ ] Every item in [checklists/parity.md](./checklists/parity.md) (PAR001–PAR063) is verified and ticked

`/speckit.implement` will refuse to report done while parity items remain unchecked.
