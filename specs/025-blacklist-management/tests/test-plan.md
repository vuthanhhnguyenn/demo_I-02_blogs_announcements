# Test Plan: Blacklist Management (A-01 FR-015)

**Feature spec**: [spec.md](../spec.md)
**PO Spec**: `A-01` — 会員管理（一覧）§ FR-015 ブラックリストの管理 (spec repo `fitness-spec@5c391cf`; spec.md was authored against doc version `260731_v5`)
**UI prototype**: `.cache/fitness-crm-ui/src/pages/blacklist-list.tsx`, `blacklist-detail.tsx` @ `47423ec` (9/30 design update)
**Created**: 2026-10-08 (supersedes the 2026-08-10 mock-phase plan — see "What changed" below)
**Integration round**: **Round 2 — every endpoint of both screens is wired to the real dev backend** (list, detail, release, registration, member lookup, member detail for photo + birthdate). No mock surface remains. Open items are BE-only (§7). Register of gaps: `api-integration-output/member-blacklist/report.md` (no `integration-plan.md` exists for this feature).
**Consumed by**: `gen-testcases` (reads this to know WHAT to author, per unit) → `execute-testcases` (reads this for run order + execution notes)

**What changed vs the 2026-08-10 plan** — the existing four TC docs were authored against it and are now **stale**; `gen-testcases` must regenerate (not patch) them:

- The list has **seven** columns, not six: 登録経路 (`source` badge) and 登録理由 (`reasonCategories` text) are separate (spec Session 2026-10-05, FR-006, FR-010, FR-010a).
- 登録理由 is **no longer write-only** (Q-03 superseded): it is read back on the list, the detail's 登録情報 card and the status card (FR-043a, FR-058, FR-061). The old "迷惑行為 appears nowhere" cases are now wrong.
- The Sheet offers **five** reasons incl. 機器破損 (FR-043); the old "`equipment_damage` must never be offered" case is wrong.
- Filter is relabelled 全登録経路 / 強制退会 / 手動登録 (FR-017); search placeholder 会員ID・氏名で検索 (FR-015); detail header carries **no** member-number badge (FR-054); combobox rows carry **no** photo (FR-039); Sheet uses the shared default width, not 480 px (FR-034).
- Backend is real: server validation, error codes, 401/403, true totals and shared mutable data are now in scope; the "mock is the source of truth" and "restart the dev server to reset seed" notes are gone.

---

## 1. Scope

**In scope**

- Blacklist **list** — header + count badge, 手動登録 button, search, the two permanently visible filters, filter-result banner, seven-column table, both empty states, pagination footer + 表示件数.
- Blacklist **manual-registration Sheet** (inside the list screen) — 会員番号 lookup, member-search combobox, identity card (photo + birthdate via member detail call), 登録理由 select, メモ, deletion warning, footer, duplicate guards.
- Blacklist **detail** — header + badge, member head-up card, 登録情報 / 未納金 cards, status card, the 解除 confirmation dialog, and the released-entry render by direct URL.
- **Member-detail BL registration dialog — contract regression only** (FR-073 – FR-075): "registration still works against the real endpoint, visible behaviour unchanged". Its UI/copy/placement/role gating belong to A-01-01.

**Out of scope** (navigation targets / separate specs / decided-out — no unit may expand into these)

- **Member detail `A-01-01`** — the 氏名 link and 会員詳細を開く are verified for navigation intent only.
- **A-01 FR-016 強制退会の自動判定・実行 (BAT-019)** — a System batch; no screen triggers it. This feature only reads `source = forced_withdrawal` rows. A run **cannot create** such an entry — use the pre-existing ones (and see B2).
- **A-01 FR-024 照合結果 / 照合条件** — column and card are deliberately not built (Q-01, Q-02; prototype keeps both behind `SHOW_MATCH_RESULT = false`). Absence is correct, never `NG`.
- **A-01 FR-018 個人情報の削除** — only its invariant appears here as the Sheet warning (FR-045).
- **BL `level`**, the `reasonCategories` / `brandGroup` / `registeredFrom` / `registeredTo` / `sort` / `order` query params — no control exists on either screen.
- **Released-entry enumeration** (Q-07) — no status filter; released entries are reachable only by direct URL (FR-069a). A case that needs a _list_ of released entries → `Block`, "no UI surface".
- **History rendering** (Q-06, FR-072) — returned but rendered nowhere; its absence is correct.
- **Shell chrome** (sidebar / header store selector) — precondition only. Blacklist data is **not** store-scoped (FR-004).

---

## 2. Unit table

Four units. The two screens split on the unit rule; the Sheet is split from the list because it is a self-contained form with its own lookup subsystem, its own endpoints and 19 FRs (FR-034 – FR-052). The release dialog stays with the detail (it exists only inside it). Unit D is deliberately narrow.

| #   | Unit                             | Screen(s)                                                              | Route                                                  | TC doc filename                                                  |
| --- | -------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| A   | Blacklist list                   | ブラックリスト管理 (table + toolbar + banner + footer)                 | `/members/blacklist`                                   | `TC -【Fitness CRM】- [A-01-BL-A][Blacklist List].md`            |
| B   | Manual registration Sheet        | ブラックリスト手動登録 (Sheet in the list) + member-lookup combobox    | `/members/blacklist` → 手動登録                        | `TC -【Fitness CRM】- [A-01-BL-B][Blacklist Register].md`        |
| C   | Blacklist detail                 | ブラックリスト詳細 + 解除 confirmation dialog + released-entry render  | `/members/blacklist/{blacklistId}`                     | `TC -【Fitness CRM】- [A-01-BL-C][Blacklist Detail].md`          |
| D   | Registration-contract regression | 会員詳細 BL登録ダイアログ (second caller of the registration endpoint) | `/members/{memberId}` → BL登録 dialog — confirm at run | `TC -【Fitness CRM】- [A-01-BL-D][Blacklist Register Caller].md` |

All under `specs/025-blacklist-management/tests/cases/`.

---

## 3. Sources per unit

| Unit | Spec sections                                                                                                                                                                                                                                  | UI prototype                                                                                    | FRs covered                                                   |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| A    | User Story 1; Edge Cases (no primary store, empty reason array, page beyond result set, search matching nothing, loading/error); FR-001 – FR-033, FR-070, FR-071; Clarifications Session 2026-10-05; Backend Contract Mapping (list + filters) | `blacklist-list.tsx` — page, toolbar, banner, table, footer (not the Sheet block)               | FR-001 – FR-033, FR-034\* (button), FR-070\*, FR-071\*        |
| B    | User Story 2; Edge Cases (concurrent registration); FR-034 – FR-052; Backend Contract Mapping (reason vocabulary, registration guards, member lookup); Q-04                                                                                    | `blacklist-list.tsx` — the Sheet block only                                                     | FR-034 – FR-052 (incl. 038a, 043a\*, 050a), FR-073\*          |
| C    | User Story 3; Edge Cases (no active contract, no legacy code, released entry by direct URL, null actor, concurrent release); FR-053 – FR-072; Backend Contract Mapping (detail, release guards); Q-05, Q-06, Q-11                              | `blacklist-detail.tsx` (the 照合条件 card is behind a flag and not built — skip it)             | FR-001\*, FR-053 – FR-072 (incl. 064a, 069a, 069b), FR-043a\* |
| D    | Scope → "Also in scope, by consequence"; Q-12; FR-073 – FR-075; FR-050 (guard applies to every caller)                                                                                                                                         | `member-detail.tsx` BL dialog — **current behaviour is the oracle**, the dialog must not change | FR-073, FR-074, FR-075                                        |

`*` = primary home is another unit. Do not read beyond a unit's row. Requirement doc: read only A-01 § FR-015 (L260–L269), L96, L275–L286 (context for `source = forced_withdrawal`) and the 権限マトリクス 「BL管理」 row (System ○ / Headquarter ○ / Manager × / Staff × / Trainer × / Observer ×).

---

## 4. Spec-vs-prototype deltas

`gen-testcases` must mark each row in the case Notes (「Spec-only」 / 「Conflict → spec」).

| Item                                      | In spec                                                                                                       | In prototype                       | How to test                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| Default 表示件数 (**conflict**)           | 25 / 50 / 100, **default 25** (Q-08, CRM-wide)                                                                | 25 / 50 / 100, default 50          | Plan to the spec: first load shows 25 per page. Not an NG that it differs from the prototype.       |
| Loading state (spec-only)                 | Skeleton on both screens (FR-070)                                                                             | Static constants, no loading state | Judge on project skeleton convention; throttle/delay the request to observe it.                     |
| Error surface (spec-only)                 | Failed load surfaced, never an empty/partial page (FR-071)                                                    | None                               | Force 500 / network failure on list and detail; also 401 expiry.                                    |
| Released-entry detail (spec-only)         | Renders by direct URL, status card shows released state + release time + releasing staff, no 解除 (FR-069a/b) | V0 has no released state           | Release a **throw-away** entry, reopen its captured URL. FRs are the oracle, not the prototype.     |
| Post-release navigation (spec-only)       | Returns to the list (FR-064a, Q-11)                                                                           | Prototype does not navigate        | Assert landing on the list and the entry's absence.                                                 |
| Already-blacklisted pre-check (spec-only) | Warning before submit + submit blocked (FR-050a), server guard stays authoritative (FR-050)                   | None                               | Resolve a member who already has an active entry; separately race the server guard in two tabs.     |
| Member-lookup failure message (spec-only) | 「該当する会員が見つかりません」 on number lookup and empty combobox (FR-036, FR-040)                         | Not reachable on constants         | Unknown member number; query that matches nothing.                                                  |
| Prefix matching on lookup (spec-only)     | Server-side prefix; exact on member number / legacy code (FR-038a)                                            | Client `.includes()` substring     | A mid-string fragment that the prototype would match **must not** match — correct, not NG.          |
| Banner baseline count (spec-only)         | 「全 {baseline} 件中 …」 = count after 条件をクリア, degrades gracefully (FR-025)                             | Static total                       | Baseline stays constant while the filtered number moves; behaviour when the server omits the total. |
| Server-side role enforcement (spec-only)  | Non-HQ refused at the endpoint, not only hidden (FR-003, SC-009)                                              | Menu-level only                    | Three axes per denied role: menu, direct URL, API response.                                         |
| Absences that are correct                 | No 照合結果 column, no 照合条件 card, no history card, no status filter, no level control, no 200 option      | Flag-hidden / absent               | Explicit absence checks; never `NG`.                                                                |

No spec-vs-prototype conflict other than the default page size was found while preparing this plan; the spec's own Session 2026-10-05 re-alignment already absorbed the 9/30 prototype changes.

---

## 5. Coverage focus per unit

These are **added to** gen-testcases' full coverage walk. Every unit also carries the two cross-cutting items below.

**Cross-cutting (every unit)**

- **Real-API behaviours**: server-side validation beyond the client's; the actual error code/message the screen shows (record the real `E-XXX-nnn` and the toast/inline text — per the project rule, show what the server returns, do not invent copy); **401 expiry** mid-session (expire/clear the session, then act → redirected to login, no half-rendered page); server-enforced role; real totals; **persistence after reload and after re-login**.
- **UI breakage under stress at 1024 px** (and ≥1440): max-length full-width Japanese name (family + given), an equally long unbroken ASCII token, long e-mail, the longest store name, all five reason categories at once (`迷惑行為・未納金・不正利用・機器破損・その他`), a very long メモ — checked in **every place it renders** (unit-specific places listed below). No overflow outside the intended container, no overlap, no clipped controls, ellipsis/wrap behaviour consistent.

**Unit A — Blacklist list**

- **Role gating is total (FR-001 – FR-003, SC-009)**: Manager / Staff / Trainer / Observer fail on three axes — no sidebar entry, direct URL refused, endpoint refused (record the real status/code). Batch the four roles; keep the axes as separate checks.
- **Not store-scoped (FR-004, SC-001)**: switching the header store scope must not change the row set.
- **Three counters agree (FR-005, FR-022, FR-028, SC-010)**: header badge (filtered), banner 「{filtered} 件を抽出中」, footer 「全 {total} 件」 asserted together per filter state — against **real totals**, not page length.
- **Banner baseline (FR-025)**: equals the count reached by 条件をクリア; constant while filters move.
- **Seven columns in order (FR-006)**, with 登録経路 badge tones (FR-010: 強制退会 destructive / 手動登録 warning) and 登録理由 as text (FR-010a: `・`-joined, em dash for `[]`). The two axes must never be mixed (no 迷惑行為 in the badge column, no 手動登録 in the reason column).
- **Money (FR-011)**: `> 0` destructive/medium/`¥` thousands-separated (include ≥ ¥10,000), `= 0` muted `¥0`; right-aligned.
- **Search is server-side across the whole set (FR-016)**: a term whose only match is beyond page 1 (needs > 25 rows — see data policy; otherwise force it via a route-faked response and mark the real-data variant `Block`). Highest-value case in the unit.
- **Filters**: 登録経路 and 未納金 each alone and combined, with banner summary order/prefix (FR-023); 未納金 cases are `Block (B1)`, 強制退会 cases see `B2`. Search + filters + page-size changes reset to page 1 (FR-021); URL/reload persistence of filter state if the screen exposes it.
- **Row click vs 氏名 link isolation (FR-013, FR-008)**: different destinations, no double navigation.
- **Page-size contract (FR-032)**: 25 / 50 / 100, default 25, **no 200**; clamping to the last valid page when filters narrow the set; ellipsis logic (FR-029) needs many pages → route-fake if the live set is too small.
- **Empty states (FR-026/027)**: filtered empty (real: a search term that matches nothing) vs blank-slate (needs zero entries — unreachable on the shared backend → fake the response, mark real variant `Block`, "shared data, cannot empty").
- **Null-tolerant columns**: no primary store → em dash; empty `reasonCategories` → em dash (never index `[0]`).
- **Released entries never appear (FR-033)**: after Unit C's release, the list no longer contains the entry; total decreases by one.
- **Layout (FR-014)**: seven columns at 1024 px — header pinned, horizontal scroll contained in the table container, never on the page body; long values per column.

**Unit B — Manual registration Sheet**

- **Prefix semantics (FR-038a)**: prefix-only on name/kana/phone/email, exact on member number and legacy code; a substring-only fragment returns nothing (correct).
- **Two lookup paths, one resolved state (FR-036, FR-041, FR-042)**: typed number and combobox pick converge on the same identity card; success / destructive borders; empty-input hint clears a resolved member (FR-037). Identity card photo + 生年月日 come from a **second call** (member detail): cover its failure (member without photo/birthdate, request failing) so the card degrades without breaking.
- **Duplicate defence is two-layered (FR-050, FR-050a, SC-005)**: pre-submit warning blocks submit; and a server refusal when two tabs race — assert the real message and that no duplicate row appears.
- **登録 disabled until resolved (FR-047)**, still disabled with reason chosen but no member; required-reason validation on submit.
- **Reason vocabulary (FR-043)**: exactly 迷惑行為 / 未納金 / 不正利用 / 機器破損 / その他, in order. Registering with each category (throw-away members) → the list/detail show that category as 登録理由 (FR-043a) while 登録経路 reads 手動登録.
- **Path never selectable (FR-049)**; メモ optional, max length per server (probe the real limit and the real validation message), full-width / emoji / leading-trailing space / newline input persists and re-renders escaped on the detail.
- **Full reset on both exits (FR-052)**; reopen is blank.
- **Post-submit chain (FR-048, SC-004)**: toast → Sheet closes + resets → list refreshes with the new row and counters move; persists after reload and after re-login.
- **Role**: only HQ/System can open it; a denied role cannot reach it (covered in A).
- **Stress**: long member name / long store name in combobox rows (name line and `ID・カナ・店舗` line) and in the identity card, at 1024 px, inside the Sheet width.

**Unit C — Blacklist detail + release**

- **Released-entry route (FR-069a/b, SC-007)**: reopen the captured URL after release: renders (no 404), status card shows the released state, release time + releasing staff shown, no 解除 offered. Also: refresh and re-login keep it.
- **Post-release (FR-064a)**: toast → dialog closes → lands on list → absent; being left on the detail is NG.
- **Release leaves the member untouched (FR-066, SC-008)**: member-detail status unchanged after release (assertion only).
- **Re-listing (FR-067)**: registering the released member again creates a **new** entry (new id, new registration time).
- **Concurrent release (FR-068)**: two tabs, second gets the backend's refusal, not a silent success.
- **Not-found (FR-069)**: unknown / malformed `blacklistId` → backend's not-found surface, never an empty shell; record the real code. Also 401 on load and on release.
- **Role gate**: HQ and System can release (FR-062). Only these two roles can reach the screen, so the disabled+tooltip state has no reachable role → decided out: no test case (the state cannot occur), do not grant access to "fix" it. Server-side refusal of PATCH for a denied role is checked at API level if observable.
- **Null-tolerant fields**: no `currentMainContract` → 主契約 badge omitted; no legacy code → 旧No fragment omitted; no primary store → em dash; null registering actor → no "undefined"/crash.
- **Registered facts (FR-058, FR-061)**: 登録経路 badge, 登録理由 text, 登録日, 登録者, メモ — `reason` feeds メモ (qa-129); entries that only have the legacy `reason` show it as メモ. Forced-withdrawal rows are subject to **B2**.
- **Two cards only (FR-057)**, no 照合条件, no history (absence checks). 未納金 both branches (FR-060). 60/40 layout with sticky right column verified by scrolling (FR-056).
- **Stress at 1024 px**: long name in header, head-up card, dialog body 「{name} さん…」, メモ spanning the card, status-card meta line with five categories; head-up card with long legacy code / main-contract / store names.

**Unit D — Registration-contract regression**

- **Does the other caller still work against the real endpoint?** Register through the member-detail dialog on a throw-away member; entry created, appears in the list as 手動登録 with the chosen reason as 登録理由. A silent 400/422 from the changed request shape is what this unit exists to catch (FR-073, FR-074).
- **Visible behaviour unchanged (FR-074)**: one required reason select, one optional memo, same copy, same role gating — assert against the dialog's **current** behaviour, never the Sheet's.
- **One path, no double create (FR-073, FR-075)**: both surfaces register once, neither duplicates. Confirming removal of the old route needs inspection beyond the UI → note for review, not `Block`.
- **Duplicate guard (FR-050)** through this dialog: refused with the server's message, row count unchanged.
- **Stress**: long memo and long member name in the dialog at 1024 px.

---

## 6. Traceability map

`*` = also touched elsewhere. FR-059 is retired (Q-02) and has no unit by design.

| FR      | Requirement                                        | Primary unit                                              |
| ------- | -------------------------------------------------- | --------------------------------------------------------- |
| FR-001  | Both screens HQ/System only                        | A (+ C direct URL)                                        |
| FR-002  | Sidebar entry HQ-only, active on both routes       | A                                                         |
| FR-003  | Server-side enforcement                            | A (+ C)                                                   |
| FR-004  | Not store-scoped                                   | A                                                         |
| FR-005  | Title + filtered count badge                       | A                                                         |
| FR-006  | Seven columns in order (no 照合結果)               | A                                                         |
| FR-007  | 会員ID monospace/muted/xs                          | A                                                         |
| FR-008  | 氏名 independent link to member detail             | A                                                         |
| FR-009  | 店舗名 or em dash                                  | A                                                         |
| FR-010  | 登録経路 badge, two values/tones                   | A                                                         |
| FR-010a | 登録理由 text, `・`-joined, em dash when empty     | A (+ C)                                                   |
| FR-011  | 未納金額 alignment/tone                            | A                                                         |
| FR-012  | 登録日                                             | A                                                         |
| FR-013  | Row click → blacklist detail                       | A                                                         |
| FR-014  | Pinned header + contained horizontal scroll        | A                                                         |
| FR-015  | Search input, placeholder, 400 px, icon            | A                                                         |
| FR-016  | Search server-side across whole set                | A                                                         |
| FR-017  | 登録経路 filter                                    | A                                                         |
| FR-018  | 未納金 filter                                      | A                                                         |
| FR-019  | Both filters permanently visible                   | A                                                         |
| FR-020  | Active filter treatment                            | A                                                         |
| FR-021  | Search/filter/page-size resets to page 1           | A                                                         |
| FR-022  | Filter-result banner                               | A                                                         |
| FR-023  | Condition summary order + 「未納金：」 prefix      | A                                                         |
| FR-024  | 条件をクリア                                       | A                                                         |
| FR-025  | Banner baseline, graceful degradation              | A                                                         |
| FR-026  | Filtered empty state                               | A                                                         |
| FR-027  | Blank-slate empty state                            | A                                                         |
| FR-028  | Footer count / pages / range                       | A                                                         |
| FR-029  | Prev/next + numbered links, 7 max, ellipses        | A                                                         |
| FR-030  | Inert first/last controls                          | A                                                         |
| FR-031  | Page change scrolls to top                         | A                                                         |
| FR-032  | 表示件数 25/50/100, default 25, no 200             | A                                                         |
| FR-033  | Active entries only                                | A (+ C after release)                                     |
| FR-034  | 手動登録 opens the Sheet (default width)           | B (A verifies the button)                                 |
| FR-035  | Required 会員番号 input                            | B                                                         |
| FR-036  | Number lookup, success/failure borders             | B                                                         |
| FR-037  | Empty hint + clears resolved member                | B                                                         |
| FR-038  | Combobox lookup labels/placeholder                 | B                                                         |
| FR-038a | Prefix matching, server-side                       | B                                                         |
| FR-039  | Result row content (no photo), bounded lists       | B                                                         |
| FR-040  | Combobox no-result message                         | B                                                         |
| FR-041  | Selecting a result fills 会員番号 and resolves     | B                                                         |
| FR-042  | Identity card field set (photo, 生年月日)          | B                                                         |
| FR-043  | Required 登録理由, five options                    | B                                                         |
| FR-043a | Reason stored and displayed back                   | B (write) + A, C (read)                                   |
| FR-044  | Optional メモ, 4 rows                              | B                                                         |
| FR-045  | Deletion-warning alert                             | B                                                         |
| FR-046  | Footer キャンセル / 登録                           | B                                                         |
| FR-047  | 登録 disabled until resolved                       | B                                                         |
| FR-048  | Submit → create, toast, close+reset, refresh       | B                                                         |
| FR-049  | Path not operator-selectable                       | B                                                         |
| FR-050  | Duplicate refused with backend message             | B (+ D)                                                   |
| FR-050a | Pre-submit already-blacklisted warning             | B                                                         |
| FR-051  | Member-not-found refusal                           | B                                                         |
| FR-052  | Close/cancel resets state                          | B                                                         |
| FR-053  | Back link                                          | C                                                         |
| FR-054  | Header title + path badge (no member-number badge) | C                                                         |
| FR-055  | Head-up card field set + 会員詳細を開く            | C                                                         |
| FR-056  | 60/40 layout, sticky right column                  | C                                                         |
| FR-057  | Left column = 登録情報, 未納金                     | C                                                         |
| FR-058  | 登録情報 fields                                    | C                                                         |
| FR-059  | _Retired (Q-02)_                                   | — (absence asserted in C)                                 |
| FR-060  | 未納金 card tone + 未収 badge                      | C                                                         |
| FR-061  | Status card, meta 登録日 / 登録理由                | C                                                         |
| FR-062  | 解除 role-gated, disabled tooltip                  | C (allowed roles only; denied state unreachable, no case) |
| FR-063  | Confirmation dialog                                | C                                                         |
| FR-064  | Confirm → release, toast, close                    | C                                                         |
| FR-064a | Return to list after release                       | C                                                         |
| FR-065  | Release retains the record + audit fields          | C (via FR-069a route)                                     |
| FR-066  | Release does not alter member status               | C                                                         |
| FR-067  | Re-listing creates a new entry                     | C (+ B flow)                                              |
| FR-068  | Already-released release refused                   | C                                                         |
| FR-069  | Non-existent entry → not-found                     | C                                                         |
| FR-069a | Released entry renders by URL, no second release   | C                                                         |
| FR-069b | Released detail shows released state + facts       | C                                                         |
| FR-070  | Loading state                                      | A, C                                                      |
| FR-071  | Error surface                                      | A, C                                                      |
| FR-072  | History seed-only, rendered nowhere                | C (absence)                                               |
| FR-073  | One registration endpoint                          | D (+ B)                                                   |
| FR-074  | Member-detail dialog on the agreed request shape   | D                                                         |
| FR-075  | No compatibility shim                              | D                                                         |

**Result**: every FR lands in ≥ 1 unit; no orphan. FR-059 is intentionally unowned.
**Success criteria**: SC-001, SC-002, SC-010 → A; SC-004, SC-005, SC-012 → B; SC-003, SC-006, SC-007, SC-008 → C; SC-009 → A + C. **SC-011** (first page < 1 s at 100 k entries) is not measurable on the shared dev backend → `Block`, "no such data volume".

---

## 7. Known Round 1 gaps (open BE items)

Source: `api-integration-output/member-blacklist/report.md` (2026-10-07). The report has no `Bn` numbering; ids below are assigned here and are the ones `gen-testcases` / `execute-testcases` use. Struck-through items in the report (params declared, `includeTotalAll`, `reason`/`memo` merge) are **resolved — not gaps**; a failure there is `NG`.

| Bn  | Blocker (BE)                                                                                                                                                               | UI behaviour now                                                                                                    | Test treatment                                                                                                                                                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | `GET /admin/blacklist` `hasUnpaid` filter returns wrong data: `=true` → 0 rows, `=false` → all rows, although ≈8 of 11 entries have `unpaidAmount > 0` (priority 1 for BE) | 未納金：あり shows the filtered empty state; 未納金：なし shows everything; banner/counters follow the wrong result | Write FR-018 / FR-023 / combined-filter cases to the spec. If the request carries the right parameter but the data is wrong → `Block (B1)`. A wrong/missing parameter in the request is `NG` (FE).                                             |
| B2  | BAT-019 auto-registered entries come back with `source: manual` + `reasonCategories: []` (spec: forced_withdrawal + `["unpaid"]`), on list **and** detail                  | Those rows show 手動登録 badge and 登録理由 `—`; the detail status card is warning-toned, not destructive           | Cases that need a real 強制退会 row (badge tone, 強制退会 filter, destructive status card, 登録理由 「未納金」) → `Block (B2)`. Do not conflate with the legitimate empty-array em dash for migrated rows — judge from the case's stated data. |

If a failure matches neither row it is `NG`. Pure-FE defects found during execution stay in the TC doc's bug list, not in the integration report.

---

## 8. Execution notes (for execute-testcases)

- **Credentials** (`src/lib/auth/demo-users.ts`, real Cognito accounts):
  - Headquarter `lodu4289+headquater@gmail.com` — primary persona for A, B, C, D.
  - System `lodu4289+1@gmail.com` — second allowed role; confirm list, release and registration also work.
  - Denied roles (must fail on both routes, three axes): Manager `lodu4289+manager@gmail.com`, Staff `lodu4289+staff@gmail.com`, Trainer `lodu4289+trainer@gmail.com`, Observer `lodu4289+observer@gmail.com`.
  - Password for all: see the sheet. The header 「デモ: ユーザー切替」 switcher only appears when `NEXT_PUBLIC_APP_ENV=development`.
- **Environment**: app on **port 3000** (CORS on the dev backend allows only localhost:3000); real API `https://api.dev.fitness-v2.okamoto-hd.com` (`NEXT_PUBLIC_REAL_API_URL`). The backend is **shared** with other people and **has no seed reset** — counts can change under you; re-read live totals before every count-sensitive assertion and never assume an absolute number.
- **Data policy**:
  - **Pre-existing blacklist entries (≈11 on dev) and their members are read-only.** Never release, re-register or otherwise mutate them; they are the data for B1/B2 and the null-tolerant cases.
  - A run may **create** members and entries only with the prefix **`QA-BL-`** (family/given name and メモ, e.g. `QA-BL-<yyyymmdd>-<n>`). Throw-away members are created through the application flow (`POST /admin/applications`, `sbps_credit`); such members stay in the 仮 status.
  - **Destructive cases (release, re-list, duplicate) use only the run's own `QA-BL-` entries.** Every release case registers its own throw-away member + entry first, then releases that one. Capture the entry's URL before releasing (FR-064a navigates away and FR-033 removes the row).
  - Each reason category (5) needs its own registration → plan ≥ 5 throw-away members, +1 per destructive case. Release is irreversible for that entry; re-listing needs a new registration of the same member (FR-067).
  - **Real data volume is small (≈11 entries)**, below the smallest 表示件数 (25): multi-page pagination, ellipses, page clamping and "match only on page 3+" cannot be produced with live data without creating > 25 entries. Treat as **UI-only variants**: fake the list response via a Playwright route for those cases, and record the real-data variant `Block` ("insufficient data on shared dev"). Same for blank-slate empty state and 401/500 error forcing.
  - The 退会 / 強制退会 member states cannot be produced by a run; use the seeded forced-withdrawal rows read-only (and see B2).
  - Left-over `QA-BL-` entries are released at the end of the run where possible and listed in the run summary.
- **Known-gap policy**: failure matching B1/B2 → `Block (Bn)`; any other failure → `NG`. Value errors in data the backend returns that are not in §7 → `Block` only if purely BE-data; FE rendering errors are `NG`.
- **Server semantics**: permissions, audit fields and error text come from the server — record exactly what the API returns (status, `E-XXX-nnn`, message) in the case result; do not `Block` waiting for BE and do not invent copy.
- **Viewport**: **1024×768** (supported floor) for every layout/stress case — the seven-column table is the highest-risk layout — and **≥1440 px** for the wide check. Below 1024 px is out of scope.
- **Account safety**: this feature needs no wrong-password case. If another unit's lockout case is run in the same session, run it last, on an account none of A–D uses.
- **Concurrency cases** (FR-050 duplicate race, FR-068 double release): two tabs on the same session, stage both, commit sequentially, assert the second gets the backend refusal.
- **Stale TC docs**: the four existing TC docs predate this plan — regenerate with `gen-testcases` before executing; do not run them as-is.

---

## 9. Suggested order

1. **Unit A (list) first** — P1; read-only against live data, so it runs before this run adds rows and shifts totals. It also pins the feature-wide role gate (reused by C) and surfaces the real seeded variants (forced-withdrawal rows, unpaid > 0, no primary store, empty reason array) that B and C reference.
2. **Unit B (Sheet) second** — P1; additive only (creates `QA-BL-` members/entries). Its entries are what C releases, so C never touches seeded rows. Runs the five reason-category registrations that feed A's/C's 登録理由 assertions.
3. **Unit C (detail + release) third** — P2 and destructive: release removes rows and the released-URL cases need a fresh release. Uses B's entries; includes re-listing and the member-status check.
4. **Unit D (regression) last** — smallest surface, adds one more entry via the second caller; keeping it last keeps its row out of every count-sensitive assertion above.

Lockout/destructive cases, if any exist, go at the very end.

---

## 10. Definition of done

- [ ] All 4 TC docs **regenerated** per this plan (`gen-testcases`, one invocation per unit) under `specs/025-blacklist-management/tests/cases/`.
- [ ] Every FR in §6 traced to ≥ 1 case in its unit's doc; FR-059 only as an absence check; every §4 delta marked in the case Notes.
- [ ] Checklist gaps found in the shared common checklists fixed at the shared level **first**, then reflected in the unit's cases.
- [ ] Each TC doc executed exactly once, in the §9 order, in one continuous session.
- [ ] Execution-summary tables (by status, by priority) filled and consistent in all 4 docs.
- [ ] Every `Block` carries `Bn` or an explicit reason; every decided-out absence is recorded as expected, not defect.
- [ ] Created `QA-BL-` test data cleaned up (released / noted) or explicitly left with a note in the run summary; no pre-existing entry was modified.
