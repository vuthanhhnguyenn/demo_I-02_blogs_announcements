# Test Plan: Y-03 FC Company Master Management (FC企業管理) — 023 · Phase 2 (real API)

**Spec**: [../spec.md](../spec.md) · [../integration-plan.md](../integration-plan.md) · [../checklists/parity.md](../checklists/parity.md)
**PO Spec**: `Y-03` — FC企業管理（マスタ） (`crm/requirements/Y-03.md`, doc version **`260901_v4`**)
**UI prototype**: `fc-company-list.tsx`, `fc-company-detail.tsx`, `fc-company-form.tsx` (dx-fitness/fitness-crm-ui @ `47d60ac`, 2026-09-26)
**Created**: 2026-09-29 — replaces the mock-phase plan of 2026-08-03 (archived with its four TC docs in [cases/\_archive-phase1-mock/](cases/_archive-phase1-mock/); do **not** copy cases from there — they assert mock seed data and the pre-8/13 prototype)
**Integration round**: **Round 2 done (2026-09-29)** — all three screens are on the real API (`src/lib/api-real` → `NEXT_PUBLIC_REAL_API_URL`). No mock route is called. B1/B2/B5/B7 closed; B3 closed and B4 resolved (decision) on 2026-10-01 (see §Re-test plan); **B6 and G6 still open** (see Known Gaps). Round 2 lives on branch `feat/fc-company-integration-api` (uncommitted at plan time) — the run must use a build of that branch, not `dev`.
**Consumed by**: `gen-testcases` (reads this plan to know WHAT to author, per unit) → `execute-testcases` (reads this plan for run order + execution notes)

> ⚠️ **Shared-data directive**: the dev backend holds **real master data** for FC companies **and stores**.
> No case may edit, deactivate, delete, link or unlink a pre-existing FC company, and no case may move a
> store away from a pre-existing company. Every write works on records the run creates itself (prefix
> `ZZQA_FC_`) plus **at most two designated 直営 stores** that are restored to 直営 before the run ends.
> See **Execution Notes → Data policy** — it is binding on every unit.

---

## Scope

**In scope** (three screens, four units):

- **FC企業一覧** — `fc-company-list.tsx` → `/franchise-companies`. Header total badge, 法人名 search, 区分 filter (3 values), ステータス filter, filter-result banner, sort by FC企業ID / 法人名（表示名）, pagination 25/50/100, row → detail, row ⋯ menu (編集 / 削除 / 削除できません), delete dialog, both empty states, permission state.
- **FC企業詳細** — `fc-company-detail.tsx` → `/franchise-companies/[id]`. Header (status badge → 区分 badge, 削除 / 編集), 基本情報 tab with StatusCard (無効化 / 有効化 + dialogs), 管轄店舗 tab (+ 店舗を紐づけ dialog, 付け替え confirmation, 解除 dialog), 変更履歴 tab, delete dialog, not-found / permission states. Split in two units (below).
- **FC企業登録・編集フォーム** — `fc-company-form.tsx` → `/franchise-companies/create`, `/franchise-companies/[id]/edit`. 法人基本情報 / 担当者情報 / 契約情報 / 備考 sections, validation (client and server), discard dialog, create-vs-edit differences.

**Out of scope** (no unit may expand into these):

- **店舗詳細 `/stores/[id]`** (Y-02) — only the link target (URL carries the real store UUID) is checked. The stores screen is still on the mock API (integration-plan D17), so what it renders for a real UUID is not judged here.
- **Store-side operating-company setting** and "an inactive company is not offered from the store side" (Y-02). Only the company-side link/unlink is tested.
- **Y-11 職位管理** — the FC企業管理者 職位 is consumed, not maintained. **Y-13 sign-in routing** — 認証方式 is tested as a stored value only. **Y-14** domain-vs-company reconciliation.
- **集計 tab (FR-007/FR-008, Phase 2)** — commented out in code until Round 3 (R301). FR-041 (absent in Phase 1) is in scope; FR-040 is written and recorded `Block (R301)`.
- Royalty calculation, KPI/sales figures, legacy-data migration.
- Login/logout and password flows (specs 023-first-time-login / 028 / 029) — login is a pre-condition only.

---

## Unit Table

| #   | Unit                                 | Screen(s)                                                                                                     | Route                                                           | TC doc filename                                                          |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | FC Company List                      | FC企業一覧（検索・区分/ステータス・バナー・ソート・ページング・行メニュー・削除ダイアログ・空状態・権限状態） | `/franchise-companies`                                          | `TC -【Fitness CRM】- [Y-03-A][FC企業一覧].md`                           |
| 2   | FC Company Detail — Info & Lifecycle | FC企業詳細（ヘッダー、基本情報タブ、StatusCard、無効化/有効化ダイアログ、削除ダイアログ、not-found/権限状態） | `/franchise-companies/[id]`                                     | `TC -【Fitness CRM】- [Y-03-B1][FC企業詳細 基本情報・ライフサイクル].md` |
| 3   | FC Company Detail — Stores & History | FC企業詳細（管轄店舗タブ、店舗を紐づけダイアログ、付け替え確認、解除ダイアログ、変更履歴タブ）                | `/franchise-companies/[id]`                                     | `TC -【Fitness CRM】- [Y-03-B2][FC企業詳細 管轄店舗・変更履歴].md`       |
| 4   | FC Company Form (Create & Edit)      | FC企業新規登録／FC企業編集（4セクション、クライアント＋サーバーバリデーション、離脱確認、部分PATCH）          | `/franchise-companies/create`, `/franchise-companies/[id]/edit` | `TC -【Fitness CRM】- [Y-03-C][FC企業登録・編集フォーム].md`             |

All four docs go under `specs/023-fc-company-management/tests/cases/` and are written **fresh**.

**Split rationale**:

- List, detail and form are three routes and three prototype files → never clustered.
- **Create + edit = one unit**: one prototype component, shared fields/validation/discard; the unit carries a mode-difference block instead of a duplicated field walk.
- **Detail = two units**: (1) volume — the detail screen carries FR-019…FR-035 and five dialogs; (2) in phase 2 the split also separates **data risk**: Unit 2 writes only to `ZZQA_FC_` companies, Unit 3 is the only unit that touches **store** data (the designated 直営 stores), so its restore duty stays in one document.
- Dialogs have no route → folded into their parent unit.

---

## Sources per Unit

Each unit reads **only** its slice. Spec first, prototype second (see Deltas).

| Unit                         | Spec sections                                                                                                                                                                                                                                                                                                | UI prototype file       | FRs covered                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------- |
| 1 — List                     | Clarifications 2026-09-24 (search scope, 3 区分 values, Staff scoping); US1 AS1–AS10; US6 AS3 (row-menu half), AS4 (list exclusion); US7 AS1–AS3 (list side); Edge Cases: zero-store delete, duplicate names, search-matches-ID, filtered-vs-true empty, page clamp; Assumptions (page size 50 of 25/50/100) | `fc-company-list.tsx`   | FR-001–FR-007, FR-010 (filter), FR-030 (row menu), FR-031 (list exclusion), FR-032, FR-036–FR-039 |
| 2 — Detail: Info & Lifecycle | US2 AS1–AS4, AS9–AS10; US6 AS1–AS5; US7 AS1–AS2 (detail side); Edge Cases: classification-vs-flag, unset royalty, remarks line breaks, last-store-released → delete enabled; Clarifications (status on detail only, 無効化理由 prototype-only)                                                               | `fc-company-detail.tsx` | FR-011 (display), FR-013 (status half), FR-019–FR-022, FR-029–FR-032, FR-036–FR-042 (display)     |
| 3 — Detail: Stores & History | US2 AS5–AS8; US5 AS1–AS7; US4 AS4; US6 (history retained); Edge Cases: deactivated company keeps its stores, last store released; Clarifications (link disabled while inactive, 付け替え, 「現在: 〇〇」)                                                                                                    | `fc-company-detail.tsx` | FR-023–FR-028, FR-033–FR-036, FR-039                                                              |
| 4 — Form                     | US3 AS1–AS9; US4 AS1–AS3, AS5; Edge Cases: renewal < start, duplicate names, remarks line breaks; Clarifications (contact split, renewal rule, status not on form); Assumptions (royalty from Phase 1, name uniqueness not enforced)                                                                         | `fc-company-form.tsx`   | FR-008–FR-018, FR-036, FR-042 (input), FR-043                                                     |

**Cross-references every unit reads directly**:

- `Y-03.md` → **権限マトリクス** (一覧・詳細参照: ○ System / ○ HQ 全企業 / × Manager / △ Staff FC企業管理者職位・自社のみ / × Trainer / × Observer; 登録・編集 / 削除 / 店舗紐づけ: System + HQ only).
- `Y-03.md` → **FR-002** (v4 contact split, renewal ≥ start, 認証方式 Google SSO / IDaaS) and **補足 UI設計方針** (区分 badge wins over 直営店フラグ; royalty input in Phase 1; status 2 values).
- `tests/checklists/common-function-checklist.md`, `tests/checklists/common-gui-validate-checklist.md` — full coverage walk and the **Default field constraints** table for every field the spec leaves unbounded.
- [integration-plan.md](../integration-plan.md) → **Blockers**, **D6** (which count is which), **D7** (error-code → UI state), **D9** (server-side bounds) — as a **register of server behaviour to probe**, not as the expected result. The expected result is always the spec's.

---

## Spec-vs-Prototype Deltas

`gen-testcases` marks each row in the Notes of every case it affects. Spec wins on conflict.

| #    | Item                                      | In spec                                                                                                                           | In prototype (47d60ac)                                                                        | How to test                                                                                                                                                                             |
| ---- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-1  | 区分 values                               | FR-010: **three** — 直営 / FC（form: フランチャイズ（FC）） / **業務委託**, in form **and** list filter                           | Two values only (直営 / FC)                                                                   | Conflict → spec. Assert three options in the form select and the list filter, 業務委託 badge on list/detail. Two options only = `NG`.                                                   |
| D-2  | Search matches FC企業ID?                  | **Internal spec conflict**: US1 AS2 says "name or FC company ID"; FR-002 + Edge Case + Clarification 2026-09-24 say **name only** | Placeholder 「法人名で検索...」                                                               | Follow FR-002 (newest clarification): searching `FC-00` returns no ID-only match → `OK`. Note the stale US1 AS2 wording for spec cleanup.                                               |
| D-3  | Staff (FC企業管理者職位) own-company view | FR-037, US7                                                                                                                       | Not modelled                                                                                  | Spec-only. Write the cases from US7; execution is `Block (P1)` (no such Cognito account).                                                                                               |
| D-4  | History retained after logical delete     | FR-031, FR-035                                                                                                                    | No surface                                                                                    | Spec-only. Write the case; no UI route reaches a deleted company's history → `Block (P5)`.                                                                                              |
| D-5  | 無効化理由 textarea                       | Not a PO requirement (Clarifications: prototype-only, adopted)                                                                    | Optional textarea; history line 「ステータス変更: 有効 → 無効（理由: …）」                    | Textarea present, optional, deactivation succeeds with a reason entered → `OK`. Reason shown in history → `Block (B3)`.                                                                 |
| D-6  | 店舗を紐づけ disabled while 無効          | Not in Y-03 (Clarifications: prototype-only, adopted)                                                                             | Disabled + tooltip 「無効のFC企業には店舗を紐づけできません。有効化してから追加してください」 | Test as the prototype defines; permission tooltip takes precedence over the state tooltip for non-HQ.                                                                                   |
| D-7  | 付け替え (reassign) + 「現在: 〇〇」      | Not in Y-03 (Clarifications: adopted); spec says a store belongs to **at most one** company                                       | Candidate shows current operator; 「運営企業を付け替えますか？」 confirm                      | Test as the prototype defines, **only between two `ZZQA_FC_` companies**. Assert the store leaves the old company (at-most-one rule) and both histories record it.                      |
| D-8  | Operator title suffix in history          | FR-033: "acting operator" (no title required)                                                                                     | 「田中 太郎（本部管理者）」                                                                   | Operator name present → `OK`. Title suffix missing → `Block (B6)` (prototype-only).                                                                                                     |
| D-9  | Link-dialog search box                    | FR-025 silent on search                                                                                                           | No search box — plain candidate list                                                          | Deliberate FE deviation (integration-plan Deviations #1, real store master > 100). Search present → `OK`; test that search results still exclude this company's stores and 閉店 stores. |
| D-10 | Closed stores in 管轄店舗 tab             | FR-023 "every store it operates"; silent on closed                                                                                | 閉店 / 休業中 badge muted                                                                     | Closed stores listed, muted. Tab 「全 N 件」 includes them; StatusCard 管轄店舗数 and the delete guard exclude them (D6). Needs a closed store → otherwise `Block (P4)`.                |
| D-11 | 店舗を紐づけ placement                    | —                                                                                                                                 | 9/26: moved into the 管轄店舗 CardHeader                                                      | Layout-only change not adopted in Round 2. Judge function, not placement; a different placement is a **note for parity.md**, not `NG`.                                                  |
| D-12 | 直営店フラグ                              | FR-012 / Y-03 「保持」 — clarified 2026-10-01: derived from 区分, never stored                                                    | Editable checkbox 「旧システムとの互換性のために保持」                                        | Read-only, checked iff 区分 = 直営 → `OK`; editable or out of sync with 区分 → `NG` (Y-03-C TC-034–TC-036)                                                                              |

---

## Coverage Focus per Unit

Added **on top of** `gen-testcases`' full walk of both common checklists. Every unit carries a **Real-API** block and a **Stress (1024px)** block.

### Unit 1 — FC Company List

- **Columns**: FC企業ID (shows `code`, e.g. `FC-001`, never the UUID) → 法人名（表示名） → 直営/FC区分 badge (3 labels) → 管轄店舗数 (right-aligned, tabular) → ステータス → ⋯. The list shows the **display** name.
- **Search = corporate name only** (D-2): partial match on legal and on display name; ID-only text → no match; half/full-width and case variants (record what the server does — the spec does not define normalisation, so a mismatch is an observation, not `NG`); leading/trailing spaces; `%`, `_`, `'` passed through without a server error.
- **Filter decision table**: 区分 (全区分 / 直営 / FC / 業務委託) × ステータス (全 / 有効 / 無効) × keyword, including a combination with zero rows while the list is non-empty → filtered empty state with 条件をクリア. Banner copy joined with `・`; active-filter marking appears/disappears.
- **Delete from the row menu**: `管轄店舗数 > 0` → disabled two-line 「削除できません / 管轄店舗が存在するため」 that does not close the menu (observe on a pre-existing company, **never click through**); `0` → enabled 削除 → dialog → deleted, gone from the list, total decremented — on a throw-away `ZZQA_FC_` record only.
- **Row click** opens the correct company; clicks inside the ⋯ cell do not navigate.
- **Real-API**:
  - Header total and banner "N of M" come from **real totals**: M is the unfiltered baseline and must stay unchanged while a filter is active; N equals the rows reachable by paging.
  - **Server-side sort** by FC企業ID (`code`) and 法人名（表示名） (`displayName` — B7 closed, regression check): ordering holds **across page boundaries**, not only within one page; sort survives a filter.
  - **Pagination against real totals**: default 50; 25/50/100; `全 n 件 / p ページ / x–y を表示` arithmetic; reset to page 1 on keyword, filter and page-size change; clamp when the page falls beyond the last. A stale `?limit=200` URL is clamped to 100 (no error). Multi-page cases need `total > 25` at run time → else `Block (P3)`.
  - **URL state**: keyword/filters/sort/page survive reload and are shareable (paste in a new tab); a garbage param (`?isActive=abc`, `?page=-1`) degrades to defaults without an error screen.
  - **Persistence**: a record created in Unit 4 appears after reload and after sign-out/sign-in; a record deleted disappears after reload.
  - **Other users change data**: counts may move between cases — re-verify before `NG`.
  - **401**: expire the session (clear the token) and change a filter → redirect to login, not an empty table or a raw error.
  - **Server-enforced role** (FR-038): Manager / Trainer / Observer → no menu entry, direct URL refused. Staff 店舗責任者 → see `G6`. HQ and System → full list.
  - **Race**: open the delete dialog on a zero-store `ZZQA_FC_` company; in a second tab link a designated store to it (Unit 3 flow); confirm the delete in tab 1 → server `409 E-FC-001` → dialog switches to its blocked variant and the row stays. (Only safe path to the server-side guard.)
  - True-empty state ("no company exists") → `Block (P2)`.
- **Stress (1024×768 and ≥1440)**: 255-char full-width 法人名（表示名）, 255-char unbroken ASCII token, 業務委託 badge next to a long name, 4-digit 管轄店舗数 (observe the largest real value) — in the table cell, the filter banner (quoted keyword of 100+ chars) and the delete dialog's 「{name}」. No horizontal page scroll, ⋯ stays reachable.

### Unit 2 — FC Company Detail: Info & Lifecycle

- **Header**: title = display name; status badge (dot, 有効 success / 無効 muted) **then** 区分 badge; actions 削除 (outline) + 編集; 「FC企業管理に戻る」 returns to the list **with its previous URL state**.
- **基本情報 walk** in prototype order: 法人基本情報 (FC企業ID=`code`, 法人番号, 法人名（正式名称）, 法人名（表示名）, 認証方式, 代表者名, 電話番号, 本社所在地), 担当者情報 (担当者名, 担当者メールアドレス, 担当者電話番号), 契約情報 (FC契約開始日, FC契約更新日, ロイヤリティ率), 備考. Every optional attribute unset → 「—」 (use the minimal `ZZQA_FC_` record).
- **Computed/formatted values**: royalty `null` → 「—」 (not `0%`), `0` → `0%`, `5.5` → `5.5%`, `100` → `100%`; dates `YYYY/MM/DD`; 認証方式 `Google SSO` / `IDaaS` (B1 closed — regression); 作成日 / 更新日 in JST, and 更新日 **advances** after an edit (Unit 4) while 作成日 does not.
- **Classification wins over 直営店フラグ** (FR-021): badge follows 区分; the flag itself is derived from 区分 (clarified 2026-10-01).
- **StatusCard**: tone follows status; `管轄店舗数: {n}店舗` → 作成日 → 更新日; action 無効化 ↔ 有効化.
- **無効化 / 有効化 round trip** on a `ZZQA_FC_` record: dialog copy verbatim, 無効化理由 optional (≤1000, D-5), cancel = no request, confirm → badge + StatusCard + button flip **without reload**, list row reflects it, 店舗を紐づけ becomes disabled (hand-off to Unit 3), history line added (hand-off to Unit 3).
- **Delete**: with ≥1 non-closed store → 削除 **visibly disabled** + tooltip 「管轄店舗が存在するため削除できません」; with 0 → dialog 「論理削除します。変更履歴は保持されます。」 → redirect to list, record gone. Transition case: release the last store in Unit 3 → 削除 enables **without reload**.
- **集計 tab**: absent from the DOM in the Phase 1 view (FR-041) → `OK` expected. FR-040 (Phase 2 content) → `Block (R301)`.
- **Real-API**:
  - **Not found**: random well-formed UUID, malformed id, and an id deleted earlier in the run → not-found state (`E-FC-002` / 404), not a crash or an endless spinner.
  - **Legacy record** with `authProvider = null` (e.g. `FC-007`, read-only) → 認証方式 「—」.
  - **Server-enforced role**: Manager / Trainer / Observer direct URL → refused; System → same actions as HQ (spot-check on own record); Staff 店舗責任者 → `G6`; FC企業管理者 → `Block (P1)`.
  - **401** before clicking 無効化 / 削除 confirm → login redirect; after re-login the state is unchanged (no half-applied action).
  - **Two tabs**: deactivate in tab A; in stale tab B click 無効化 again → server result shown, no duplicate history entry beyond what the server records; delete in tab A, act in tab B → not-found handling.
  - **Persistence**: status and every displayed attribute survive reload and re-login.
  - **B3**: a reason entered is not persisted → history shows no reason → `Block (B3)`; deactivation itself must succeed (a failure here is `NG`).
- **Stress**: 255-char full-width name and unbroken token in the header title (wrap, badges and buttons stay visible), 500-char 本社所在地, 254-char email, 1000-char 備考 with line breaks (preserved) and `<script>` literal, 255-char name inside both dialogs — at 1024 and ≥1440.

### Unit 3 — FC Company Detail: Stores & History

- **管轄店舗 table**: 店舗ID (`code`) → 店舗名 → ブランド badge → 都道府県 (label from JIS code, e.g. `13` → 東京都) → ステータス (準備中 / 営業中 / 休業中 / 閉店; 閉店・休業中 muted) → link-out → 解除; footer 「全 N 件」. Brand variety and prefecture labels are verified **read-only** on pre-existing companies with several stores.
- **Empty state** 「「店舗を紐づけ」からこのFC企業の管轄店舗を追加できます」 on a fresh `ZZQA_FC_` company.
- **Link dialog** (D-9): candidates exclude stores already on this company and 閉店 stores; each shows name, `{code}・{prefecture}`, brand, 「現在: 直営」 or 「現在: {company}」. Server keyword search (debounced) narrows candidates; no-hit keyword → an explicit empty message. 「紐づけ可能な店舗がありません」 (all stores linked) → `Block (P6)`.
- **Link fan-out in one case**: table row, 「全 N 件」, StatusCard 管轄店舗数, header 削除 disabled, toast 「「{店舗名}」を管轄店舗に紐づけました」, new history line — all **without reload**.
- **付け替え** (D-7) between `ZZQA_FC_A` and `ZZQA_FC_B` only: candidate on B shows 「現在: ZZQA_FC_A…」 → confirm 「運営企業を付け替えますか？」 → store moves; A loses it (at-most-one), A's history gets 「店舗紐づけ解除: {店舗名}」, B's gets 「店舗紐づけ追加: {店舗名}（{A} から付け替え）」 (B5 closed — regression). Cancel on the confirm → no change.
- **Unlink**: dialog says the store itself is not deleted and the change is recorded; cancel = no request; confirm → row gone, counts down, toast 「「{店舗名}」の紐づけを解除しました」, store returns as a candidate showing 「現在: 直営」.
- **Inactive company** (D-6): 店舗を紐づけ disabled with the state tooltip; already-linked stores remain listed; 解除 still available (record what the UI does — spec is silent).
- **Store row** → `/stores/{real UUID}`; the landing screen is out of scope (P7).
- **変更履歴 content**: columns 日時 / 操作者 / 変更内容; newest-first; 「全 N 件」. Lines produced by this run, each asserted verbatim:
  - create 「FC企業登録: {法人名（正式名称）}」;
  - update — one line per changed field 「{label}: {before} → {after}」 with enum labels (区分, 認証方式 `IDaaS → Google SSO`), dates `YYYY/MM/DD`, empty → value and value → empty rendered sensibly; a partial edit produces **only** the changed fields' lines (FR-034);
  - status 「ステータス変更: 有効 → 無効」 / 「無効 → 有効」;
  - link / unlink / reassign as above.
- **Real-API**:
  - Counts come from the server: 「全 N 件」 = `includeClosed` total, StatusCard = non-closed count (D-10).
  - **Two tabs — unlink twice**: unlink in tab A, confirm the same unlink in stale tab B → `409 E-FC-006` handled (message + refetch, row disappears), no crash.
  - **Two tabs — link a store someone else just took**: tab B links the store to `ZZQA_FC_B` while tab A's dialog still shows it as 「現在: 直営」 for `ZZQA_FC_A` → confirm in A: record what the server does (it reassigns); the resulting state and both histories must be consistent.
  - **Closed store** in candidates / `409 E-FC-004` → needs an existing 閉店 store (observe only) → else `Block (P4)`.
  - **Server-enforced role**: non-HQ sees 店舗を紐づけ / 解除 visibly disabled with 「店舗紐づけの設定には本部権限が必要です」 (FR-039), and the 変更履歴 tab shows a permission state (history is HQ-only on the BE) — for the Staff 店舗責任者 path see `G6`.
  - **401** mid-dialog → login redirect, no partial link.
  - **Persistence**: links, unlinks and history survive reload and re-login.
  - Rows beyond 100 (D14) → not reachable; out of this run.
  - B6: operator column shows the name only → title suffix `Block (B6)`.
- **Stress**: longest real store name (read-only; stores cannot be created) in the table, candidate row, both dialogs' 「{name}」 and the toast; a history line built from a 255-char full-width legal name (create line) and a 255→255 name edit (update line); 1000-char 備考 edit line; a `ZZQA_FC_` company with ~10+ history lines — at 1024 and ≥1440.

### Unit 4 — FC Company Form (Create & Edit)

- **Required = exactly three**: 法人名（正式名称） (incl. whitespace-only), 直営/FC区分 (3 options, D-1), 認証方式 (Google SSO / IDaaS). Each omitted alone, all three omitted; messages 「法人名（正式名称）を入力してください」「直営/FC区分を選択してください」「認証方式を選択してください」 + footer 「未入力の項目があります」 + scroll to the first invalid field; each error clears on valid input (FR-015) without clearing others.
- **Everything optional is truly optional** (FR-012): submit with only the three required → created; detail shows 「—」 everywhere else. 「任意」 markers on every optional field.
- **FR-043**: renewal < start blocked with 「FC契約更新日はFC契約開始日以降の日付を指定してください」 on create **and** edit; renewal = start accepted; clearing start while renewal is set; the rule applies when only one date is edited.
- **No status control** on the form; new company is 有効 (FR-013). **No FC企業ID input**; the assigned `code` appears on list/detail (FR-008).
- **Discard dialog** decision table: dirty × (キャンセル / 「FC企業管理に戻る」 / browser back) → 「変更を破棄しますか？」 with 編集を続ける / 破棄する; clean → no dialog; successful submit → no dialog. Discard on create leaves no record (search the list).
- **Mode block**: title FC企業新規登録 vs FC企業編集; empty vs pre-filled (every field, including 認証方式 and both contact fields); 登録する vs 保存する; toast 「FC企業を登録しました」 vs 「FC企業の変更を保存しました」; both return to the list.
- **Real-API**:
  - **Server-side validation beyond the client's.** The spec leaves most bounds open; the checklist defaults apply on the client. Probe each field at the server's bound (integration-plan D9) and one past it: 代表者名 / 担当者名 101 chars, 本社所在地 501, 担当者メールアドレス 255, 法人番号 12 and 14 digits, 電話番号 21 chars, ロイヤリティ率 -0.1 / 100.1 / 3 decimals. **Expected (spec FR-014)**: the user is told which field is wrong and the input is kept. A client block → `OK`. A server `400 E-VAL-001` that surfaces only as a generic toast with the field not identified → `NG` (FE/BE bound mismatch; name the field and both limits in the note). A silent save of an out-of-bound value → `NG`.
  - **Partial PATCH** (network check): editing one field sends only that field; clearing an optional field sends `null` and the detail shows 「—」 after reload; untouched fields keep their values.
  - **法人名（表示名） left empty**: record what the list/detail show after save (server copies the legal name). Spec only says the field is optional — a non-blank list cell is `OK`; a blank display-name cell is `NG`.
  - **Duplicate 法人名（正式名称）** accepted with distinct `code`s.
  - **Double submit** (double-click, Enter + click) → exactly one record / one history line.
  - **401 during submit** (expire the token with the form filled) → login redirect; note whether input is lost (spec silent — observation).
  - **Edit a company deleted in another tab** → not-found handling on save, no crash.
  - **Legacy `authProvider = null` record** (`FC-007`, read-only): edit opens with 認証方式 empty and save is blocked with 「認証方式を選択してください」 — press 保存する **only with nothing else changed** and confirm in the network panel that no `PATCH` was sent.
  - **Persistence** of every field after reload and re-login; 認証方式 round-trip `IDaaS → Google SSO` (B1 closed — regression).
  - **Role**: `/create` and `/[id]/edit` refused on direct URL for Manager / Trainer / Observer (and 店舗責任者 → `G6`); System can create (spot-check, one `ZZQA_FC_SYS_` record).
  - 直営店フラグ: read-only, follows 区分 (B4 resolved 2026-10-01).
- **Stress**: 255-char full-width 法人名（正式名称）/（表示名）, 255-char unbroken token, 254-char email, 1000-char 備考 with line breaks, full-width digits in 法人番号/phones (rejected or normalised — record), `<script>alert(1)</script>` in both names and 備考 → literal text on list, detail, dialogs and history. Form layout at 1024 (two-column cards, date pickers, footer message) and ≥1440.

---

## Known Gaps (Round 1/2 blockers + this plan's own limits)

`gen-testcases` **writes every case** to the spec; `execute-testcases` records the listed treatment instead of `NG`.

| ID          | Blocker / gap                                                                                                                           | UI behaviour now                                                       | Test treatment                                                                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| B3 (closed) | Closed 2026-10-01: `PATCH /{id}/active` accepts `reason` (≤1000, `isActive: false` only) and stores it as `snapshot.reason`             | Reason sent on 無効化 when non-blank; history appends 「（理由: …）」  | **Regression** — see §Re-test plan (2026-10-01). A failure is `NG`.                                                                                |
| B4 (closed) | Resolved 2026-10-01 by decision: 直営店フラグ derived from 区分 (spec.md Session 2026-10-01)                                            | Checkbox read-only, checked iff 区分 = 直営                            | Regression — Y-03-C TC-034–TC-036. A failure is `NG`.                                                                                              |
| **B6**      | History carries only `changedByName` (no role/title); proposed Round 3                                                                  | Operator column shows the name                                         | Title suffix missing → `Block (B6)`; name missing or wrong → `NG`.                                                                                 |
| **G6**      | 店舗責任者 職位 grants `fc-companies.view` on the FE, BE list is HQ-only                                                                | Menu + route open; list shows 「FC企業一覧を参照する権限がありません」 | Spec FR-038 = no access. Menu/route reachable → `Block (G6)`. **Any FC data shown to this account → `NG`** (data leak is never a known gap).       |
| B1/B2/B5/B7 | Closed in Round 2 (認証方式, nullable body types, store name in history, displayName sort)                                              | Working as spec                                                        | **Run normally as regression checks** — a failure is `NG`, not `Block`.                                                                            |
| **R301**    | 集計 tab commented out until Phase 2                                                                                                    | Not rendered                                                           | FR-041 → `OK`. FR-040 cases → `Block (R301)`.                                                                                                      |
| **P1**      | No Cognito account holds the FC企業管理者 職位 (commented out in `demo-users.ts`)                                                       | —                                                                      | FR-037, US7 AS1–AS2, SC-007 and the `E-FC-003` other-company refusal → `Block (P1)`.                                                               |
| **P2**      | True-empty list (no company at all) unreachable on shared data                                                                          | —                                                                      | `Block (P2)`. Filtered-empty must be `OK`.                                                                                                         |
| **P3**      | Multi-page cases need `total > 25`; bulk-creating fixtures is not allowed                                                               | —                                                                      | Check the total at run start. If ≤ 25 → multi-page cases `Block (P3)` with the count. Single-page summary still asserted.                          |
| **P4**      | Closed-store behaviour needs an existing 閉店 store; stores cannot be created or closed from this feature                               | —                                                                      | Observe read-only on any pre-existing company that has one. None found → `Block (P4)` (D-10 muted badge, candidate exclusion, `E-FC-004`).         |
| **P5**      | No UI route to a logically deleted company's history                                                                                    | Detail of a deleted id → not-found                                     | FR-035 retention half → `Block (P5)`; not-found handling itself → normal case.                                                                     |
| **P6**      | 「紐づけ可能な店舗がありません」 needs every store linked to one company                                                                | —                                                                      | `Block (P6)`. Keyword-no-hit empty message is testable.                                                                                            |
| **P7**      | Stores screen still on mock (D17)                                                                                                       | Link goes to `/stores/{uuid}`                                          | URL correct → `OK`; landing content not judged.                                                                                                    |
| **P8**      | The delete guard is only reachable through the two-tab race (Unit 1 Real-API); deleting a pre-existing company with stores is forbidden | 削除 disabled                                                          | Disabled affordance on master data: observe, never click. Server `E-FC-001` via the race on own data. If the race cannot be staged → `Block (P8)`. |

---

## Traceability Map

| FR     | Requirement (short)                                  | Unit(s)                              |
| ------ | ---------------------------------------------------- | ------------------------------------ |
| FR-001 | List columns                                         | 1                                    |
| FR-002 | Name search + 区分 + ステータス, conjunctive         | 1                                    |
| FR-003 | Matched-vs-total banner + clear-all                  | 1                                    |
| FR-004 | Sort by ID and display name                          | 1                                    |
| FR-005 | Page size, summary, reset to page 1                  | 1 (multi-page → P3)                  |
| FR-006 | Filtered-empty vs true-empty                         | 1 (true-empty → P2)                  |
| FR-007 | Row → detail; row menu → edit / delete               | 1 (+2, +4 landing)                   |
| FR-008 | Auto-assigned ID, no input                           | 4 (+1 新規登録 entry)                |
| FR-009 | Three required fields on create and edit             | 4                                    |
| FR-010 | Three 区分 values                                    | 4 (form) + 1 (filter/badge)          |
| FR-011 | 認証方式 two values, stored                          | 4 (input) + 2 (display)              |
| FR-012 | Optional attributes (contact split)                  | 4 (+2 display)                       |
| FR-013 | Created active; status only on detail                | 4 (no control) + 2 (StatusCard)      |
| FR-014 | Field + form-level errors, scroll to first           | 4                                    |
| FR-015 | Error clears on valid input                          | 4                                    |
| FR-016 | Discard warning only when dirty                      | 4                                    |
| FR-017 | Success message + back to list                       | 4                                    |
| FR-018 | Edit prefill + edit title                            | 4                                    |
| FR-019 | Detail groups + 「—」 placeholder                    | 2                                    |
| FR-020 | StatusCard summary                                   | 2 (+3 live count)                    |
| FR-021 | Header badges; 区分 wins over flag                   | 2                                    |
| FR-022 | Tabs + back to list                                  | 2 + 3                                |
| FR-023 | Managed-store list + row → store                     | 3 (landing → P7)                     |
| FR-024 | Managed-store empty state                            | 3                                    |
| FR-025 | Link; only linkable candidates; no-candidate copy    | 3 (no-candidate → P6)                |
| FR-026 | Release with "store not deleted" confirmation        | 3                                    |
| FR-027 | Immediate list/count/summary update + toasts         | 3 (+2 delete re-enable)              |
| FR-028 | Copy: recorded in history, HQ only                   | 3                                    |
| FR-029 | Deactivate / reactivate with confirmation            | 2                                    |
| FR-030 | Delete blocked while stores exist; visible + reason  | 2 (button) + 1 (row menu, race → P8) |
| FR-031 | Logical delete, confirmation                         | 2 + 1 (list exclusion)               |
| FR-032 | Two status values                                    | 2 + 1 (filter)                       |
| FR-033 | History for create / edit / status / link / unlink   | 3 (asserts) — produced by 2, 4       |
| FR-034 | Before/after diff                                    | 3 (asserts) — produced by 4          |
| FR-035 | Newest-first + total; retained after delete          | 3 (retention → P5)                   |
| FR-036 | Writes only for System + HQ                          | 1, 2, 3, 4                           |
| FR-037 | Staff FC企業管理者: own company, read-only           | 1, 2 → **P1**                        |
| FR-038 | Manager / Trainer / Observer / untitled Staff denied | 1, 2, 3, 4 (店舗責任者 → G6)         |
| FR-039 | Restricted controls visibly unavailable + reason     | 1, 2, 3, 4                           |
| FR-040 | Phase 2 aggregation placeholders                     | 2 → **R301**                         |
| FR-041 | No aggregation area in Phase 1                       | 2                                    |
| FR-042 | Royalty stored as reference value                    | 4 (input) + 2 (display)              |
| FR-043 | Renewal ≥ start on create and edit                   | 4                                    |

**Every FR-001…FR-043 lands in ≥1 unit.** Three have **no executable path** in this environment and will
end as `Block`: **FR-037** (P1), **FR-040** (R301), and the retention half of **FR-035** (P5).
Split requirements needing a cross-unit Note: FR-030 (1 + 2), FR-033/FR-034 (produced in 2/4, asserted in 3), FR-027 delete re-enable (3 → 2).

---

## Execution Notes (for `execute-testcases`)

### Credentials (`src/lib/auth/demo-users.ts` — real Cognito accounts, password `Password@123`)

| Role            | Account                         | 職位           | Used for                                                                |
| --------------- | ------------------------------- | -------------- | ----------------------------------------------------------------------- |
| **Headquarter** | `lodu4289+headquater@gmail.com` | 本部管理者     | **Default for every functional case** in Units 1–4                      |
| System          | `lodu4289+1@gmail.com`          | システム管理者 | FR-036 spot-check: list, detail, one create + delete of `ZZQA_FC_SYS_…` |
| Manager         | `lodu4289+manager@gmail.com`    | ブロック長     | FR-038 negative (menu, direct URL to all four routes)                   |
| Staff           | `lodu4289+staff@gmail.com`      | 店舗責任者     | FR-038 negative — Staff **without** FC企業管理者 → **G6**               |
| Trainer         | `lodu4289+trainer@gmail.com`    | 社員トレーナー | FR-038 negative                                                         |
| Observer        | `lodu4289+observer@gmail.com`   | 閲覧専任       | FR-038 negative                                                         |
| _(none)_        | FC企業管理者 Staff              | —              | FR-037 → **Block (P1)**                                                 |

- Pre-condition "HQ user" → Headquarter. "A denied role" → run on **each** of Manager / Staff / Trainer / Observer; never infer one from another.
- Switch with the header's **「デモ: ユーザー切替」** menu (a real Cognito sign-in). It renders **only when `NEXT_PUBLIC_APP_ENV=development`** — check that first if it is missing.

### Environment

- App: local dev server built from **`feat/fc-company-integration-api`** (Round 2). API: `NEXT_PUBLIC_REAL_API_URL` = **`https://api.dev.fitness-v2.okamoto-hd.com`**. Record the branch/commit and API URL in each TC doc header.
- **The backend is shared.** Other people create, edit and link records during the run; counts moving between cases are not automatically defects.
- If data ever looks like the old mock seed (exactly five companies 株式会社フィットネスパートナーズ / ノースフィットネス / …), suspect a mis-set base URL, not a data bug.
- Keep the browser's network panel open: several expected results are about the request (partial PATCH, no request on cancel, error code on 409/400).

### Data policy (binding)

- **Pre-existing FC companies are read-only.** Search, filter, sort, page, open detail and all tabs, open the ⋯ menu and the edit form **to look** — never save, deactivate, delete, link or unlink. The only exception is the `FC-007` legacy-null check in Unit 4 (save pressed with nothing changed, blocked client-side; confirm no `PATCH`).
- **Own records**: 法人名（正式名称） prefix **`ZZQA_FC_`** + purpose + run date, e.g. `ZZQA_FC_A_20260929`, `ZZQA_FC_B_20260929`, `ZZQA_FC_最小_20260929`, `ZZQA_FC_MAX_20260929` (padded to exactly 255 chars, prefix included), `ZZQA_FC_TOK_20260929` (every text field an **unbroken ASCII token** at its maximum — created in Y-03-C TC-119, reused by every unit's stress cases), `ZZQA_FC_DUP_20260929` ×2, `ZZQA_FC_削除_20260929`. One `ZZQA` search finds all leftovers.
- **Stores**: at run start pick **at most two stores whose current operator is 直営** (no FC company) — the Round 1/2 smoke used **S-002 FIT365 新宿 (dev)**; confirm it is still 直営 before using it. Record their code and initial state in the TC doc. They may only be linked to / reassigned between / unlinked from `ZZQA_FC_` companies, and **must end on 直営**. Never link a store that currently belongs to a pre-existing FC company (that would move real data), and never unlink a store from a pre-existing company.
- **Destructive cases** get a throw-away record created just before the case (a new company has zero stores, so delete-success is always reachable).
- **No seed reset exists.** Cleanup is part of the run: (1) unlink every designated store → confirm 「現在: 直営」 in a link dialog; (2) list search `ZZQA` with ステータス 全ステータス (deactivated fixtures too) → delete every match; (3) confirm zero rows. Anything that cannot be removed is named in the run notes with the reason. Change-history rows written on the designated stores' events cannot be removed — this is expected.

### Known-gap policy

- Failure matching a `B3/B4/B6/G6/R301/P1–P8` row → **`Block (<id>)`** with that row's reason.
- Failure on a **closed** blocker (B1/B2/B5/B7) → **`NG`** (regression).
- Any other failure → **`NG`** with observed vs expected and the FR.
- Behaviour matching a delta row's **spec** column → `OK` even against the prototype; matching the prototype instead → `NG`.
- A 4xx from the server on valid input → `NG`, note the request body and the error `code`; an out-of-bound value the client let through → `NG` naming both limits (see Unit 4).

### Viewport

- **1024×768** for every layout / stress case (the supported floor). **≥1440px** for the wide check on each unit's two worst stress cases. Below 1024 is out of scope.

### Account safety

- The six accounts are real; repeated wrong passwords lock one for ~15 minutes. **This plan has no wrong-password case.** For 401 cases, expire the session by clearing the auth token/cookies — never by failed sign-ins.
- If a lockout happens anyway, stop using that account and note which cases moved.

---

## Re-test plan (2026-10-01, Round 2 re-check)

**Trigger**: `openapi.real.json` refreshed on 2026-10-01. Integration re-check (see
[integration-plan.md §Round 2 re-check](../integration-plan.md)) closed **B3** and switched the list's
unfiltered count to `includeTotalAll`. B4, B6, G6 unchanged. Run on a build of
`feat/fc-company-integration-api` that contains the 2026-10-01 change; record the commit in each
doc's Metadata.

### 1. Blocked cases: which ones to re-run (21 Block across the four docs)

| Doc     | Case                    | Block id | Re-run now?                                                                                          |
| ------- | ----------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| Y-03-B1 | **TC-029** 無効化理由   | B3       | **Yes.** Expected unchanged: 「ステータス変更: 有効 → 無効（理由: 契約終了のため）」. Fail → `NG`    |
| Y-03-C  | TC-035 直営店フラグ     | B4       | **Resolved 2026-10-01 by decision** — TC-034/TC-035 rewritten (read-only, follows 区分) and run → OK |
| Y-03-B2 | TC-047 操作者 title     | B6       | No. History still has only `changedByName`                                                           |
| Y-03-A  | TC-075                  | G6       | No. List is still "system / headquarter only"                                                        |
| Y-03-B1 | TC-059                  | G6       | No (same)                                                                                            |
| Y-03-C  | TC-008, TC-009          | G6       | No (same; TC-009 depends on TC-008)                                                                  |
| Y-03-A  | TC-076                  | P1       | Only if an FC企業管理者 Cognito account is provided (not an API change)                              |
| Y-03-B1 | TC-060, TC-061          | P1       | Same                                                                                                 |
| Y-03-B2 | TC-035, TC-036          | P1       | Same                                                                                                 |
| Y-03-C  | TC-010                  | P1       | Same                                                                                                 |
| Y-03-A  | TC-069                  | P2       | No (shared data)                                                                                     |
| Y-03-A  | TC-042                  | P3       | No (needs ≥ 176 companies)                                                                           |
| Y-03-B1 | TC-022 (closed half)    | P4       | No (no company owns a 閉店 store; stores screen still on mock)                                       |
| Y-03-B2 | TC-006                  | P4       | Same                                                                                                 |
| Y-03-B1 | TC-044 (retention half) | P5       | No                                                                                                   |
| Y-03-B2 | TC-051                  | P5       | No                                                                                                   |
| Y-03-B2 | TC-018                  | P6       | No                                                                                                   |
| Y-03-B1 | TC-004                  | R301     | No (Phase 2)                                                                                         |

### 2. Regression around the changed code (currently OK, re-run)

| Change                                     | Doc     | Cases                                            | Focus                                                                                                         |
| ------------------------------------------ | ------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| B3: `reason` sent on 無効化                | Y-03-B1 | TC-024, TC-026, TC-027, TC-031, TC-032, TC-033   | No-reason 無効化 body is `{ isActive: false }` only; 有効化 body never has `reason`; reason cleared on reopen |
| B3: history line                           | Y-03-B2 | TC-042                                           | Lines without a reason stay 「ステータス変更: 有効 → 無効」 (no empty 「（理由: ）」)                         |
| List count from `pagination.totalAllItems` | Y-03-A  | TC-001, TC-028, TC-029, TC-030, TC-031, TC-033   | Badge and 「全 M 件」 = unfiltered total; request carries `includeTotalAll=true` only while a filter is on    |
| Same                                       | Y-03-A  | TC-026 (filters), TC-081, TC-088 (banner stress) | M stays fixed while paging / changing filters                                                                 |

### 3. New cases (authored 2026-10-01)

The reason is now a **new render place** for a variable-length value (the history line), so it gets the
long-value kit (full-width + unbroken token) there as well.

| Target doc | New case                                   | Steps / expectation                                                                                                                                                                                              |
| ---------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Y-03-B1    | Whitespace-only reason                     | 無効化 with 無効化理由 = `　 　` → body `{ isActive: false }` (no `reason`); history line has no 「（理由: …）」                                                                                                 |
| Y-03-B1    | Reason trimmed                             | `  契約終了  ` → body `reason: "契約終了"`; history 「（理由: 契約終了）」                                                                                                                                       |
| Y-03-B1    | 1000-char reason saved                     | 1000 full-width chars → `PATCH /active` 200 (BE max 1000), status 無効                                                                                                                                           |
| Y-03-B2    | 1000-char full-width reason in history     | The line 「ステータス変更: 有効 → 無効（理由: …1000…）」 wraps inside 変更内容; 日時 / 操作者 keep their width (related: BUG-Y03B2-01)                                                                           |
| Y-03-B2    | 1000-char unbroken-token reason in history | Same with 1000 × `N` — the token breaks inside 変更内容, no page-level horizontal scroll                                                                                                                         |
| Y-03-B2    | Reason with HTML                           | 無効化理由 `<script>alert(1)</script>` → rendered as text in the history line, no execution                                                                                                                      |
| Y-03-B2    | Reason shown only on the deactivation line | After 無効化 (with reason) → 有効化: only the 有効 → 無効 line carries 「（理由: …）」                                                                                                                           |
| Y-03-A     | Count request shape                        | No filter → list request has no `includeTotalAll`, single request; with a filter → `includeTotalAll=true` and **no** extra `limit=1` request (fallback only fires when the server returns `totalAllItems: null`) |

Data: use own `ZZQA_FC_` fixtures only (F-A / F-ST / F-TOK); leave each one active at the end.

### 4. Order

1. ~~Author the §3 cases~~ — done: Y-03-B1 TC-076–TC-078 (TC-029 reset to untested), Y-03-B2 TC-065–TC-069 (fixture F-RSN), Y-03-A TC-091–TC-092.
2. Y-03-B1: TC-029 + §2 B3 rows + new B1 cases (on F-A / F-ST).
3. Y-03-B2: TC-042 + new history cases (reuse the deactivations from step 2; F-TOK for the token reason).
4. Y-03-A: §2 count rows + new request-shape case.
5. ~~Update each doc's Execution summary~~ — done 2026-10-01: 26 run → 23 OK, 3 NG (BUG-Y03B2-01). Remaining 16 Blocks unchanged (A 4, B1 6, B2 6) + Y-03-C 4.

6. **Unit 4 — Form.** Creates every `ZZQA_FC_` fixture the other units need (A full, B, 最小, MAX, DUP pair) and settles the server-validation picture early; it also produces the create/update history lines Unit 3 asserts.
7. **Unit 1 — List, non-destructive cases.** Read-heavy; the fixtures give search a guaranteed hit, the MAX record a real long-name row, and 業務委託/無効 fixtures give the filter table its rows. Check the total for P3 here.
8. **Unit 2 — Detail, non-destructive + 無効化/有効化** on `ZZQA_FC_A`. Produces the status history lines; leaves A active.
9. **Unit 3 — Stores & History.** Link the designated store to A → (hand back to Unit 2: 削除 disabled) → reassign to B → unlink (→ Unit 2: 削除 enabled without reload) → two-tab 409 cases → history assertions for everything produced so far.
10. **Destructive cases last**: Unit 1 row-menu delete and the `E-FC-001` race; Unit 2 detail delete; not-found on the deleted ids; the System create + delete spot-check.
11. **Role pass** (Manager / Staff / Trainer / Observer) across all four units — read-only by nature, grouped to minimise switches.
12. **Cleanup** (Data policy) and a final `ZZQA` search showing zero rows, designated stores on 直営.

---

## Definition of Done

- [ ] Four TC docs created fresh under `specs/023-fc-company-management/tests/cases/` with the Unit Table filenames (the Phase 1 docs stay archived, untouched).
- [ ] Every FR-001…FR-043 traced (above); the three non-executable ones (FR-037, FR-040, FR-035 retention) have written cases carrying their `Block` id.
- [ ] Every delta D-1…D-12 noted in the affected cases; D-2 raised for spec cleanup (US1 AS2 wording).
- [ ] Every Known-Gap row has a written case with its treatment; closed B1/B2/B5/B7 have explicit regression cases.
- [ ] Checklist gaps found while authoring fixed in the common checklists first.
- [ ] Each doc executed once at 1024×768 (+ ≥1440 wide check) with OK / NG / Block per case, branch/commit and API URL in the header.
- [ ] All `ZZQA_FC_` data deleted (zero-row search) and the designated stores back on 直営 — or each leftover named with the reason. **No pre-existing company or store was modified.**
- [ ] Findings on server-vs-client bound mismatches, B3/B4/B6/G6 status and P1 (FC企業管理者 account) reported back to the integration owner.
