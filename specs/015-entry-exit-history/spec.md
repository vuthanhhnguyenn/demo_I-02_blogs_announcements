# Feature Specification: Entry/Exit History (B-01-01)

**Feature Branch**: `015-entry-exit-history`
**Created**: 2026-07-08
**Status**: Draft
**PO Spec**: `B-01` — 入退館管理（Entry/Exit Management）, supplement section **B-01-01 入退館履歴** (FR-M007) _(Phase 1 scope only; the B-01 main definition — the real-time visit monitor — is Phase 2 and out of scope here)_
**Source**: `src/pages/entry-exit-history.tsx` (dx-fitness/fitness-crm-ui) + `crm/requirements/B-01.md` (dx-fitness/fitness-spec)
**Prototype sync**: 2026-10-20 — aligned with `fitness-crm-ui` @ `f2fe3f9` (includes the 10/14 update `eaf04d5`: row-click Quick View is Phase 2 only). Changes in this sync: date column `MM/DD`, stay duration `H:MM`, denial reason next to the 拒否 badge, 同伴入館 badge under 種別, all seven sortable columns (incl. 所属店舗 / 入館店舗) with a two-state sort cycle, 期間 button active highlight, auth-method options `QR` / `NFC`, flat filter-result banner without the keyword in its summary, clear action keeps sort and page size, CSV toast copy.
**Previous sync**: 2026-10-12 — `bac8775` (10/7 design update). Removed items the prototype does not have: header record-count badge, active-filter count badge on the filter toggle, the in-panel "すべてクリア" button (clearing lives in the filter-result banner only), the "在館中" exit-time indicator, and the badge styling of the authentication method.
**Input**: User description: "Create spec for screen B-01 入退館管理 (entry-exit-history Management) — FR-M007: 入退館履歴の参照・条件検索・抽出（B-01-01）"

## Clarifications

### Session 2026-07-08

- Q: Should this feature's scope include wiring Staff CSV export to a permission flag (pending Y-01), or should Staff exclusion remain the accepted Phase 1 behavior with a follow-up tracked separately? → A: Keep Staff excluded from CSV export for Phase 1, exactly as the current UI does; track the Y-01-linked permission-flag update as a separate follow-up item outside this feature's scope.
- Q: Is page-level access control (blocking/hiding the whole screen for roles without view permission, e.g. Trainer) intended to be enforced elsewhere (out of scope of this feature), or should this feature's requirements include an explicit view-access gate? → A: Include it in scope. This system already blocks unauthorized roles at the routing level for every other private screen (not just hiding navigation entries); this screen must follow the same established convention rather than being an inconsistent exception.
- Q: Should a visit that has an entry time but no exit time yet (the member is still on-site) appear in the history list, or is this screen limited to fully completed visits only? → A: Include in-progress visits. They appear in the list with entry time populated and exit time / stay duration shown as blank (shown as "—") until the exit is recorded.
- Q: For a denied ("拒否") record, should entry time and exit time be left blank (since no admission occurred), or do they represent the attempted access timestamp and should always be shown? → A: For a denied record, show only the attempt timestamp as the "entry time"; leave exit time and stay duration blank, since no actual visit occurred.
- Q: What should be shown when a search/filter combination returns no matching records? → A: Follow this system's established empty-state convention used across other list screens: distinguish a filtered zero-result set ("no records match your filters," with a clear-filters action) from a genuinely empty dataset ("no records yet," with no clear-filters action since none apply).

### Session 2026-11-09 — entry/exit gate split (no screen change)

- Q: Gates are now split into 入館ゲート (`entry_gate`, check-in only) and 退館ゲート (`exit_gate`, check-out only) — what does this screen show? → A: **No screen change** (user request, 2026-11-09; backend API-108). A visit row pairs an entry-gate 入館 with the exit-gate 退館 that follows it, as before. Two new refusals reach the gate log:
  - An 入館ゲート scan by a member who is already inside is refused as **`denied_duplicate`** (二重入館) with no `denialReasonDetail` — until now the value had no writer. It is an `entry` event, so it is listed as a 拒否 row labelled 「重複認証」 (FR-010 table) with no tooltip.
  - A 退館ゲート scan by a member who is not inside is refused as `denied_other` / `not_inside`. It is an `exit` event, and the list reads `entry` / `companion_entry` only, so it is **not listed** here.
  - The CSV 機器種別 column (BE label) reads 入館ゲート / 退館ゲート instead of 入退館ゲート.
  - **Test cases:** B-01-01 TC-086…TC-088.

### Session 2026-11-02 (MR review — CSV export job resume)

- Q: The real API-105 export is an async job (202 → poll → presigned URL). When the status poll hits a network error, or the screen is reloaded, the job ID is lost and the next 「CSV出力」 click queues a duplicate job. How should the screen behave? → A: Keep the job ID from the moment the create request succeeds, in a form that survives a reload; on opening the screen, check the kept job (resume polling while it runs, offer the download once it is complete); after a network error, retry the status of the existing job instead of queueing a new one. A dedicated export-status/download screen is under spec confirmation and is **not** added in this phase (FR-016, FR-019).

## User Scenarios _(mandatory)_

### User Story 1 - Search and review past entry/exit records (Priority: P1)

An authorized staff member (Headquarter, Manager, or a Staff member with permission) opens the Entry/Exit History screen to look up who entered and exited a facility, when, and how, in order to answer a question (e.g., a member inquiry, an incident review, or an attendance check). They narrow the list by date range, and optionally by store, keyword (member name or ID), authentication method, or entry result, then scan the resulting table.

**Why this priority**: This is the core purpose of the screen (FR-M007) — without search and list review, the screen has no value. Every other capability (CSV export, quick view, pagination) is secondary to being able to find and read the right records.

**Verification**: Load the screen, confirm the default date range and store scope are pre-applied, type a keyword into the search box, expand the detail filters, set an auth method and result, and confirm the visible rows are the ones a reviewer would expect for that store scope.

**Acceptance Scenarios**:

1. **Given** the Entry/Exit History screen is loaded, **When** no filters are changed, **Then** the table shows history rows already scoped to the stores the current user may access (see FR-008), along with a record count and pagination controls.
2. **Given** the detail filter panel is collapsed, **When** the user clicks "詳細フィルター" (Detailed Filters), **Then** the panel expands to reveal the date-range picker, store selector (when applicable), authentication-method selector, and result selector, and the button label changes to "閉じる" (Close) with the chevron direction reversed.
3. **Given** one or more filters differ from their defaults, **When** the user views the filter toggle button, **Then** the button is visually highlighted (filled style); no count is shown on the button.
4. **Given** filters have been changed, **When** the user clicks the clear action of the filter-result banner shown above the table, **Then** the search keyword is cleared, the store, authentication-method, and result filters reset to "全店舗" / "全認証方式" / "全処理結果", the date range resets to the screen's default range, and the list returns to page 1; the current sort and page size are kept.
5. **Given** a user whose access is limited to a single store (or who has selected a specific store in the page header), **When** the detail filter panel is open, **Then** the store filter dropdown is not shown at all (only users with access to 2+ stores who are viewing "all stores" see the store filter).

---

### User Story 2 - Inspect a single visit from the history list (Priority: P2) — DEFERRED TO PHASE 2 (prototype 2026-10-14; rows are not clickable in this phase)

A staff member reviewing the history table wants more context on a specific visit — the member's contract type, contact info, and recent visit pattern — without leaving the history screen.

**Why this priority**: Adds investigative depth to the primary search flow but is not required for the base search/list function to deliver value.

**Verification**: Click any row in the history table and confirm a side panel opens showing that member's profile summary; confirm it closes without navigating away from the history table.

**Acceptance Scenarios**:

1. **Given** the history table has rows, **When** the user clicks anywhere on a row, **Then** a right-side detail panel (Quick View) opens showing the member's avatar, name, furigana, gender, a "退館済み" (Exited) status badge, entry time, exit time, stay duration, contract name, and recent visit history.
2. **Given** the Quick View panel is open, **When** the user closes it, **Then** the panel dismisses and the underlying history table remains unchanged (filters and pagination state preserved).

---

### User Story 3 - Export filtered history to CSV (Priority: P3)

An authorized user (Headquarter, System, or Manager) needs to extract the currently filtered set of entry/exit records for offline analysis or reporting.

**Why this priority**: Required by FR-M007 ("CSV出力機能（抽出条件を保持したまま出力）") but is an auxiliary action on top of the search/list capability, and is restricted to a subset of roles.

**Verification**: As an authorized role, click "CSV出力" and confirm a success confirmation is shown; reload while the export is running and confirm the same job is resumed (no second create request); as an unauthorized role, confirm the button is disabled with an explanatory tooltip.

**Acceptance Scenarios**:

1. **Given** a user with Headquarter, System, or Manager role, **When** they click the "CSV出力" (CSV Export) button, **Then** the export proceeds using the currently applied search/filter conditions and a success toast "CSVをダウンロードしました" is shown.
2. **Given** a user without an authorized role for export (e.g., Trainer), **When** they view the "CSV出力" button, **Then** the button is disabled and a tooltip reads "入退館ログCSV出力の権限がありません" (You do not have permission to export the entry/exit log CSV).
3. **Given** an export job is still running when the screen stops waiting (2 minutes), **When** the wait ends, **Then** a warning toast "CSVの出力に時間がかかっています" says the job continues, and the next "CSV出力" click checks that same job instead of queueing a new one.
4. **Given** an export job was queued and the screen is reloaded (or the user navigates away and back) before the file is downloaded, **When** the screen opens, **Then** it checks that job: while it runs the button shows "出力中..." and polling resumes; once it is complete a toast "前回依頼したCSVの出力が完了しました" offers a "ダウンロード" action (no automatic download without a click).
5. **Given** a status check fails with a network error while an export is running, **When** polling continues or the user clicks "CSV出力" again, **Then** the status of the existing job is retried and no new export job is created.
6. **Given** a kept job exists, **When** the user clicks "CSV出力" (even with different filter conditions), **Then** an info toast "前回依頼したCSV出力の処理状況を確認しています" is shown and that job is checked first; a new job with the current conditions is queued only once the kept job is over.
7. **Given** the kept job has expired or is unknown (404 / 410), **When** the screen opens, **Then** it is discarded silently; **When** the user clicks "CSV出力", **Then** it is discarded and a new job is queued with the current conditions.

### Edge Cases

- When a search/filter combination matches zero records, the system distinguishes a filtered zero-result state (with a clear-filters action) from a genuinely empty dataset (no clear-filters action), per the system's standard empty-state pattern.
- A denied ("拒否") record shows the attempted-access timestamp as its entry time; exit time and stay duration are left blank since no actual visit occurred.
- A visit still in progress (entry recorded, member currently on-site) appears in the list with exit time and stay duration shown as "—".
- What happens when the store-scoped result set for a Staff user is empty because their store has no matching activity in the selected date range?
- What happens when a very large date range/filter combination produces more results than can be shown on one page? (Per FR-M007, large extractions are handled asynchronously — CSV export always runs as a server job, see FR-016; on-screen listing is paginated.)
- A failed export job (`status=failed`) or any non-network error is shown once as an error toast and the kept job is discarded, so the next click queues a new job.
- Browser storage unavailable (private window, blocked site data): export still works; only the resume after a reload is lost.
- The filter-result banner's clear action resets the free-text search keyword together with the other filters and the date range (FR-009).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST display a searchable, filterable table of entry/exit records, where each row represents a single visit — completed (both entry and exit recorded), still in progress (entry recorded, member currently on-site), or a denied entry attempt.
- **FR-002**: The system MUST provide a free-text search that matches on member name or member ID.
- **FR-003**: The system MUST provide a date-range filter (defaulting to a pre-set range) that restricts the visible records to entries occurring within the selected range.
- **FR-004**: The system MUST provide a store filter, but only present it when the current user can access two or more stores and is currently viewing an "all stores" scope; users limited to a single store MUST NOT see this control.
- **FR-005**: The system MUST provide an authentication-method filter with options "全認証方式" / "QR" / "NFC" (the table cells and the filter-result banner keep the long labels "QRコード" / "NFCカード").
- **FR-006**: The system MUST provide a processing-result filter with options: all results, success, denied.
- **FR-007**: The system MUST let the user expand/collapse a "detailed filters" panel independently of the always-visible search box, and MUST visually indicate when one or more filters are active (via button styling only — no count badge). Each detail filter control that differs from its default — including the 期間 date-range button — is itself highlighted (`border-primary bg-primary/10`). Control widths: 店舗 140px, 認証方式 130px, 処理結果 130px.
- **FR-008**: The system MUST scope the visible records to the stores the current user is authorized to access: Headquarter/System see all stores, Manager sees their managed stores, Staff and Observer each see only their own assigned store (or every store under their linked franchise company, when applicable); scoping is based on the store where the visit occurred (the "入館店舗" / visiting store), not the member's home store.
- **FR-009**: The system MUST let the user reset the search keyword and the store, authentication-method, and result filters and the date range to their defaults in a single action, provided by the filter-result banner shown above the table while any filter or keyword is active (the filter panel itself has no clear button). The clear action does not reset the sort order or the page size. The banner is the flat strip "全 N 件中 M 件を抽出中 : …" (`FilterResultBanner`); its summary lists only the store, authentication method, result, and a changed date range — the keyword is not repeated there. When the unfiltered total is unavailable the "全 N 件中" prefix is omitted.
- **FR-010**: For each history record, the system MUST display: member avatar/name with furigana, member ID, visit date, entry time, exit time, stay duration, contract type, gender, home store, visiting store, authentication method, and processing result (success/denied). The visit date is shown as `MM/DD` (e.g. `11/30`), entry/exit times as `HH:mm`, and the stay duration as `H:MM` (e.g. `1:27`). For a visit still in progress (no exit recorded yet), the exit time and stay duration MUST be shown as "—" (no "in facility" indicator). A companion entry (FR-M008) shows an info-tone "同伴入館" badge under the contract name. Every denied record shows its reason label as plain text next to the 拒否 badge (table below; see Q&A #5). "休会中" (gate terminal: 「休会中のためご利用いただけません」) and "主契約無効" (gate terminal: 「ご利用できません」) keep the gate-terminal message in a hover tooltip "ゲート端末表示: 「…」"; every other reason shows the row's `denialReasonDetail` in the same tooltip ("ゲート端末表示: 「{denialReasonDetail}」") when the API returns one, and no tooltip otherwise. The label does not wrap. The CSV export's 拒否理由詳細 column uses the same labels (`{label}（{denialReasonDetail}）`, label only when there is no detail). The contract column header is "種別". The authentication method is plain text (not a badge); the processing result is a tone badge (成功 = success, 拒否 = destructive) at the default badge size. The page header shows no record-count badge. For a denied ("拒否") record, the "entry time" column MUST show the attempted-access timestamp, and exit time and stay duration MUST be left blank, since no actual visit occurred.

  Denial reason labels (decided 2026-10-21; wording drafted from B-01 FR-M004–M009, PO to confirm):

  | `result` (API-105 §4.1; legacy stored spellings read back as these)         | Label              |
  | --------------------------------------------------------------------------- | ------------------ |
  | `denied_blacklist`                                                          | ブラックリスト     |
  | `denied_delinquent` (legacy `denied_delinquency`)                           | 未納金あり         |
  | `denied_family_in` (legacy `denied_family_in_use`)                          | 家族会員利用中     |
  | `denied_manual_stop`                                                        | 手動ゲートストップ |
  | `denied_contract` (legacy `denied_no_active_contract`)                      | 主契約無効         |
  | `denied_contract` with `denialReasonDetail = suspended`                     | 休会中             |
  | `denied_option`                                                             | オプション契約無効 |
  | `denied_duplicate` (entry gate, member already inside — Session 2026-11-09) | 重複認証           |
  | `denied_auth_failed`                                                        | 認証失敗           |
  | `denied_companion_no_invite`                                                | 同伴招待なし       |
  | `denied_companion_window_expired`                                           | 同伴受付時間外     |
  | `denied_other` (legacy bare `denied`)                                       | その他             |
  | any other / unknown `denied_*`                                              | その他             |

- **FR-011**: The system MUST let the user sort the list by member name (利用者), date (日時), entry time, exit time, contract type (種別), home store (所属店舗), and visiting store (入館店舗). Sorting is two-state (asc ⇄ desc, no "unsorted" state; the tooltip after desc reads "クリックで昇順ソート"). A newly selected column starts descending for 日時 and ascending for every other column. Any sort change returns the list to page 1. Default: 日時, newest first.
- **FR-012** _(Deferred to Phase 2 — prototype 2026-10-14; not built in this phase)_: The system MUST let the user click a record row to open a detail (Quick View) panel showing that member's avatar, name, furigana, gender, status, entry/exit time, stay duration, contract name, and recent visit history, without navigating away from the history table.
- **FR-013**: The system MUST provide a CSV export action that uses the currently applied search/filter conditions.
- **FR-014**: The system MUST gate the CSV export action behind a dedicated, assignable export permission for this screen — consistent with the per-screen view/export permission model already used throughout the system — rather than a fixed, hardcoded role list. For Phase 1, this permission MUST be granted by default to Headquarter, System, and Manager; Staff and other roles MUST NOT be granted it by default (matching the PO matrix's "△ 権限要" conditional-access marking for Staff), and MUST see the export action disabled with an explanatory tooltip. Granting this permission to Staff in the future MUST be possible as a configuration change, without requiring new engineering work.
- **FR-015**: The system MUST paginate the record list and display the total record count and current page range to the user.
- **FR-016**: The system MUST export the currently filtered record set through the backend's asynchronous export job (API-105 §5): queue the export (202), poll the job every 2 seconds until it is `completed`, then download the file from the presigned URL. While waiting, the button shows a spinner + "出力中..." and is disabled; one click (or double click) queues at most one job. The screen waits at most 2 minutes; a job still running after that is not a failure (warning toast, FR-019). _(Updated 2026-11-02: replaces the earlier one-step file download — the real API has no synchronous export.)_
- **FR-019**: The system MUST keep the export job ID, per signed-in staff, from the moment the create request succeeds until the job is over (file downloaded, `failed`, or 404 / 410), in browser storage that survives a reload. While a job is kept, every "CSV出力" click and every opening of the screen checks that job instead of queueing a new one (avoiding duplicates that count against the 2-running-exports cap, E-VIS-006); a network error during the status check is retried against the same job. On opening the screen, a completed kept job is offered through a toast "ダウンロード" action; a running one resumes polling. A separate export-status/download screen is out of scope for this phase (spec confirmation pending).
- **FR-017**: The system MUST gate access to this screen itself behind a dedicated view permission — enforced at the routing level, consistent with how every other private screen in this system is protected — so that roles without view access (e.g., Trainer, who has no access per the PO permission matrix) are blocked from reaching the screen directly, not merely hidden from navigation menus. This view permission MUST be granted by default to Headquarter, Manager, System, and Observer (each scoped per FR-008); Staff MUST require the permission to be explicitly granted (per the PO matrix's "△ 権限要" marking) before being able to reach the screen.
- **FR-018**: The system MUST display a distinct empty-state message when a search/filter combination returns zero records, consistent with the empty-state pattern used across other list screens in this system: a "no records match the applied filters" message with an action to clear filters when one or more filters are active, versus a "no records exist yet" message (with no clear-filters action) when no filters are active.

### Key Entities

- **Entry/Exit Record**: Represents one visit (completed, in progress, or a denied attempt) to a facility. Attributes: member (name, furigana, member ID, gender), visit date, entry time (for a denied record, the attempted-access timestamp), exit time (absent while in progress or denied), stay duration (absent while in progress or denied), contract type/name, home store, visiting store, authentication method (QR code / NFC card), processing result (success / denied).
- **Store Scope**: The set of stores a given user role may view or filter by (all stores, managed stores, or a single assigned store), used to both pre-scope the displayed list and to determine which filter controls are shown.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An authorized staff member can locate a specific member's entry/exit record for a given day using the search and filter controls in under 30 seconds.
- **SC-002**: 100% of history records displayed to any user belong only to stores that user's role is authorized to view (e.g., a Staff user sees only their own store's records; an Observer likewise sees only their own assigned store's records, per FR-008).
- **SC-003**: Authorized users can export a filtered record set to CSV in one action, with the exported data matching the on-screen filter conditions.
- **SC-004**: Unauthorized users are prevented from exporting data 100% of the time, with a clear explanation shown instead of a silent failure.
- **SC-005** (Deferred to Phase 2): Users can review a member's visit details (Quick View) without losing their current search/filter state.

## Assumptions

- "Phase 1" for this screen is limited to the B-01-01 supplement section of the B-01 spec (reference/search/export of historical entry/exit logs). The B-01 main definition — the real-time visit monitor, occupancy KPIs, activity feed, badges, and badge-threshold configuration (FR-S001/FR-S002/FR-S003) — is explicitly Phase 2 in the source spec and is **out of scope for Phase 1**.
- FR-C001 (staff outreach logging from the monitor) and FR-C002 (analytics/reporting integration) are "Could" (優先度: 希望) requirements in the source spec and are **out of scope for Phase 1**.
- The gate-authentication, gate-stop, and companion-entry mechanics (FR-M001–FR-M006, FR-M008, FR-M009) are backend/device-level processes that produce the log data this screen displays; they are **out of scope** for this screen-level specification, which covers only the reference/search/export UI (FR-M007).
- The Quick View detail panel (a component shared with the Phase 2 monitor screen) was treated as in-scope here, but prototype 2026-10-14 moved it to Phase 2 (FR-M007 has no row-click behavior), so it is not built in this phase; once built, only its Phase-2-specific badges (companion labels, trial-visitor flag, frequency-based status badges) are not populated from this screen's data and are therefore not part of this feature's data requirements.
- Pagination is described functionally (page navigation, record count); the exact page size is a reasonable default and not treated as a hard requirement.
- ~~The PO spec's "large extractions handled asynchronously" requirement is superseded by this system's current CSV export convention (one-step file download).~~ _Superseded 2026-11-02_: the real API-105 export is an asynchronous job, so the PO requirement applies — every export runs as a job (FR-016) and the job is resumable across reloads (FR-019).

## Q&A / Clarification Needed

The following discrepancies and ambiguities were identified while cross-referencing `crm/requirements/B-01.md` (specifically the B-01-01/FR-M007 supplement) against `src/pages/entry-exit-history.tsx`. They are consolidated here for `/speckit.clarify`.

1. **Filter wiring vs. static prototype data** — _[Technical / informational]_
   In the current UI code, the store, authentication-method, and result filter controls (and the free-text search box and date range) update their own state and visual "active" styling, but none of them are actually applied to filter `HISTORY_DATA` — only the store-scoping logic (FR-008, based on user role) filters the displayed rows. This is consistent with the file being a static UI prototype rather than a data-connected implementation.
   **Question**: Confirming this is expected prototype behavior (filtering logic to be implemented against a live data source in a later phase), and not evidence that FR-M007's filter requirements (date range, store, member ID, name, auth method, result) should be reduced in scope.

2. **Search field consolidation** — _[Informational]_
   FR-M007 lists 会員ID (member ID) and 氏名 (name) as separate search conditions. The UI implements a single combined free-text search box ("利用者名・会員IDで検索...") rather than two distinct fields.
   **Question**: Is a single combined keyword search acceptable, or is a distinct member-ID field also required (e.g., for exact-match lookups)?

3. **Clear-all scope** — _[Resolved 2026-10-12]_
   The prototype provides no clear button inside the filter panel; the filter-result banner's clear action resets the keyword, the three filters and the date range.
   **Status**: Resolved — the keyword is cleared too (see FR-009).

4. **Pagination interactivity in the current prototype** — _[Technical / informational]_
   The UI code renders a pagination control with a record count ("1-15 / 247件") and page-number buttons, but the "前へ" (Previous) button is permanently disabled and the page-number buttons and "次へ" (Next) button have no wired behavior — this is static prototype markup.
   **Question**: Confirming actual page-size and navigation behavior are implementation details to be defined during planning, not additional business requirements from this spec.

5. **Denial-reason labels for the other denial results** — _[Decided 2026-10-21; PO to confirm wording]_
   The prototype labels only two reasons (休会中, 主契約無効). The API returns 11 `denied_*` results plus an open-set `denialReasonDetail` token. The FE shows "休会中" for `denialReasonDetail = suspended`, "主契約無効" for `denied_contract`, and the bare 拒否 badge for everything else.
   **Question**: Which Japanese label and gate-terminal message should the remaining denial results show (blacklist, delinquent, manual gate stop, duplicate, auth failed, companion no-invite / window expired, option, family-in, other)?
   **Status**: Decided 2026-10-21 — every denial shows a label (table under FR-010; wording drafted from B-01 FR-M004–M009, PO to confirm). The two reasons with a known gate-terminal message keep it in the tooltip; the others show the row's `denialReasonDetail` as "ゲート端末表示: 「…」" when present. The BAT-036 CSV's 拒否理由詳細 uses the same labels. Still open for the PO: the exact wording, and whether the gate-terminal messages for the other reasons should be fixed text instead of `denialReasonDetail`.

6. **同伴入館 badge tooltip needs inviter data** — _[Resolved (inviter) 2026-10-21; 種別 wording still open]_
   The prototype's 同伴入館 badge has the tooltip "招待者: {name}（会員ID {id}）". `AccessLogEntryDto` has no inviter name or member ID, so the FE shows the badge without a tooltip. The prototype also shows the contract cell of a companion as "同伴利用（C区分）", while the API returns `planName = null` (shown as "—").
   **Question**: Can the access-log API add the inviter's name and member ID? Should a companion's 種別 read "同伴利用（C区分）"?
   **Status**: Inviter resolved — API-105 now returns `inviter { memberId, publicId, name }` on `companion_entry` rows (null otherwise); the badge shows the tooltip "招待者: {name}（会員ID {publicId}）" and none when `inviter` is null. The 種別 "同伴利用（C区分）" question is still open.

7. **Member photo in the history table** — _[Resolved 2026-10-21]_
   The prototype shows the member's photo in the 利用者 cell. `AccessLogMemberRefDto` has no photo URL (the visit-monitor activity API has `facePhotoUrl`), so the FE shows the initial-letter fallback.
   **Question**: Can the access-log API add the member's photo URL?
   **Status**: Resolved — API-105 `member.facePhotoUrl` (same source and URL form as API-106); the 利用者 cell shows the photo, with the initial-letter fallback when it is null or fails to load.

8. **Default date range** — _[Open, 2026-10-20]_
   The prototype's demo default is one calendar month (2026/11/1–11/30); the FE defaults to the last 30 days (today − 29 → today).
   **Question**: Should the default be the current calendar month or the last 30 days?
