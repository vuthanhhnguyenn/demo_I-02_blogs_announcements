# Feature Specification: B-01 入退館管理 (Entry-Exit Management) — Phase 1 Baseline Activity View

**Feature Branch**: `013-entry-exit-management`
**Created**: 2026-07-07
**Status**: Draft
**PO Spec**: `B-01` - 入退館管理（来館モニター） (Entry-Exit Management / Visit Monitor)
**Source**: `.cache/fitness-crm-ui/src/pages/entry-exit.tsx` + `.cache/fitness-crm-ui/public/requirements/B-01.md`
**Prototype sync**: 2026-10-20 — re-checked against `fitness-crm-ui` @ `f2fe3f9`. `entry-exit.tsx` is unchanged since the 10/7 update (the 10/14 update `eaf04d5` touched only the history screen). Fixes in this sync: the "履歴データ" tooltip date reads `yyyy年M月d日(E)`, page body padding `p-6`, no extra bottom border on the last activity row.
**Previous sync**: 2026-10-12 — aligned with `fitness-crm-ui` @ `bac8775` (10/7 design update): badge shape unified (no icons, default size, `/15` tint), date control moved into `PageHeader.dateControl`, "入退館履歴ですべて表示" link restored, Quick View badge/CTA/recent-visit details updated.
**Input**: User description: "Create spec for screen \"B-01 入退館管理\" (Entry Exit Management) — strictly grounded in the UI code and B-01.md requirement spec, Phase 1 only. B-01-01 (入退館履歴) is a separate screen not implemented in this file and is out of scope."

## Scope

`entry-exit.tsx` renders the B-01 screen in two modes controlled by `usePhase()` (`currentPhase`). This specification covers only the elements that render **regardless of, or specifically when not in, Phase 2** (i.e. `currentPhase !== "2"`) — the baseline activity view.

**Phase boundary — resolved (2026-07-07)**: The code's own Phase gating (`currentPhase !== "2"`) is confirmed as the authoritative Phase 1 boundary for this screen — whatever is already implemented and rendered ungated in the prototype is in scope for Phase 1, regardless of B-01.md's document-level "Phase 2 主定義" label on the overall B-01 spec (see Q&A #1/#2, both resolved).

**In Scope (Phase 1):**

- Page shell: shared sidebar/header, page title "入退館", date navigation, and past-date indicator.
- Store filter dropdown (conditional on multi-store access and header-level "all stores" scope).
- Hourly entry-count line chart ("時間帯別入館者数").
- Entry ("入館") and Exit ("退館") activity tables showing the 5 most recent records each, including frequency badges (常連/久しぶり, mock data) and companion badges (招待者/同伴者).
- Row-click interaction and Member Quick View panel: **deferred to Phase 2** (2026-10-14 Notion dev decision) — rows are not clickable and no panel is rendered in this phase. Note: the prototype's `entry-exit.tsx` still renders this panel ungated; only the history screen was changed on 10/14 (see Q&A #7).
- Outbound link from each activity table to the separate entry-exit history screen (navigation entry point only).

**Out of Scope for Phase 1:**

- Everything gated by `currentPhase === "2"` in the code: the 在館人数 KPI counter block (男性/女性/在館), the "本日の入退館状況" summary count bar, the 在館者一覧 (in-building members) tab and its sortable table, the tab-switcher control itself, and the notification side panel (要対応/注意/お知らせ) with its header bell trigger/badge count. These implement FR-S001 (来館モニター), FR-S002 (来館バッジの判定・表示 — real logic), and FR-S003 (バッジ閾値設定管理), all documented as Phase 2 (Should) in B-01.md.
- B-01-01 入退館履歴 (the full search/filter/CSV-export history screen, FR-M007) — this is a separate, not-yet-implemented screen per explicit direction; only the outbound "入退館履歴ですべて表示" link is covered here.
- Gate-hardware and backend authentication/authorization logic: FR-M001 (QRコードによる入退館認証), FR-M002 (NFCカードによる入退館認証), FR-M003 (ログ記録の書き込み処理自体), FR-M004 (ゲートストップ条件の自動判定), FR-M005 (手動ゲートストップの反映), FR-M006 (主契約有効性に基づく開錠制御), and the invitation/window-validation logic behind FR-M008/FR-M009. Only the CRM-visible _outputs_ of these (log rows, companion badges) are covered.
- FR-C001 (来館モニターからのスタッフ声かけ記録) and FR-C002 (分析・レポートへの集計連携) — Could-have requirements, not present in the code at all.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Review the most recent entry and exit activity (Priority: P1)

A store staff member opens the 入退館 screen and, without any further navigation, sees the five most recent entries and the five most recent exits, each showing who came/went, when, their contract type, and any status badges.

**Why this priority**: This is the primary reason a staff member opens this screen in Phase 1 — a quick read of "who has been coming and going," grounded in the log data described by FR-M003 and displayed as the always-rendered `ActivityTable` components in the code.

**Independent Test**: Load the page and verify two tables ("入館" and "退館") each display up to 5 rows with avatar, name, furigana, contract type, time, and status badges where applicable.

**Acceptance Scenarios**:

1. **Given** the entry-exit page loads, **When** the page renders, **Then** an "入館" table and a "退館" table are shown side by side, each labeled "最新5件" and each listing its rows.
2. **Given** a row has a frequency badge (「常連」or「久しぶり」), **When** the user hovers the badge, **Then** a tooltip explains the criterion (e.g. "月10回以上来館している常連会員です。").
3. **Given** a row is part of a same-day companion invitation, **When** the row renders, **Then** a "招待者" or "同伴者" badge is shown with an explanatory tooltip.
4. **Given** a row has no badges, **When** rendered, **Then** the status cell shows "---" as a placeholder.

---

### User Story 2 - Inspect a member's detail from an activity row (Priority: P2) — DEFERRED TO PHASE 2 (not in scope; kept for the Phase 2 build)

A staff member clicks on a row in either the Entry or Exit table to quickly check who the member is, their contract, and how to reach their full profile, without leaving the entry-exit screen.

**Why this priority**: Provides the contextual "who is this and what do I need to know" lookup that supports the接客 (customer-service) judgment calls the B-01 screen is designed for, without requiring the Phase 2 real-time monitor.

**Independent Test**: Click any activity row and verify the Member Quick View panel opens on the right with the corresponding member's identity, time, and status information, and that the panel does not block interaction with the rest of the page (non-modal).

**Acceptance Scenarios**:

1. **Given** the user clicks a row in the Entry table, **When** the Quick View panel opens, **Then** it shows an "入館" context badge and the entry time.
2. **Given** the user clicks a row in the Exit table, **When** the Quick View panel opens, **Then** it shows a "退館済み" context badge and the exit time.
3. **Given** the Quick View panel is open, **When** the user clicks "会員詳細を開く", **Then** the app navigates to the member detail page.
4. **Given** the Quick View panel is open, **When** the user clicks the external-link icon button, **Then** the member detail page opens in a new browser tab.
5. **Given** the Quick View panel is open for one member, **When** the user clicks a different activity row, **Then** the panel's content is replaced with the newly selected member's information.

---

### User Story 3 - Scope the displayed activity by date and store (Priority: P2)

A staff member (or HQ user viewing "all stores") changes the displayed date or store to review a different day's or store's entry-exit activity, and is clearly told when they are viewing historical (read-only) data.

**Why this priority**: Date and store scoping are the primary controls in the page header and directly implement FR-S001's documented "過去日参照時の挙動" and the store-scope rules implied by the B-01.md permission matrix (Headquarter: 全店舗, Manager/Staff: 管轄/所属店舗のみ).

**Independent Test**: Use the previous/next-day chevrons and the calendar picker to change the date, and verify the historical-data indicator appears only for past dates; verify the store filter's visibility rule.

**Acceptance Scenarios**:

1. **Given** the page is displaying today's date, **When** the user clicks the previous-day chevron, **Then** the displayed date moves back exactly one day and no historical badge is shown if that date is still not before "today".
2. **Given** the selected date is before "today", **When** the page header renders, **Then** a "履歴データ" badge appears next to the page title and the date control is shown in a warning style, both with an explanatory tooltip.
3. **Given** the user opens the calendar popover and picks a date, **When** a date is selected, **Then** the popover closes and the displayed date updates accordingly.
4. **Given** the signed-in user has access to 2 or more stores and the header-level scope is "全店舗", **When** the page renders, **Then** a store filter dropdown is shown next to the date control, offering "全店舗" plus each accessible store.
5. **Given** the signed-in user has access to only 1 store, or the header-level scope is already a single specific store, **When** the page renders, **Then** the store filter dropdown is not shown.

---

### User Story 4 - Read hourly entry volume at a glance (Priority: P3)

A staff member glances at the hourly entry chart to understand how busy the facility has been throughout the day and which hour is "now".

**Why this priority**: Supports quick visual pattern-reading; grounded in the always-rendered "時間帯別入館者数" line chart, which is documented in B-01.md as part of FR-S001's Layer 2 (当日統計) but is implemented in the code without any Phase gating (see Q&A).

**Independent Test**: Load the page and verify the chart renders hourly counts from 06:00 to 22:00, with the current hour visually distinguished.

**Acceptance Scenarios**:

1. **Given** the page loads, **When** the chart renders, **Then** it displays one data point per hour from 6 to 22, with the y-axis labeled in "人" (people) units.
2. **Given** the current hour (fixed demo value: 14:00) falls within the chart range, **When** the chart renders, **Then** that hour's x-axis label is shown in a distinct color/weight and a vertical reference line labeled "現在" marks that hour.
3. **Given** the user hovers over a data point, **When** the tooltip appears, **Then** it shows the hour and the entry count for that hour, formatted as "N人".

### Edge Cases

- What happens when an Entry or Exit table has zero rows for the selected scope? **Resolved (Q&A #6, research.md D3)**: the table and its header stay mounted and the body shows the app's shared `DataStateBoundary` empty state (「{date}の入館記録はありません」 / 「{date}の退館記録はありません」) — see FR-B01-15.
- What happens when a member referenced in the mock data has no entry in `AVATAR_URLS`? **Resolved (Q&A #6)**: replace the raw `<img>` tags with the codebase's shared `Avatar` / `AvatarImage` / `AvatarFallback` composition so a missing image degrades to the standard muted-background fallback instead of a broken image.
- How does the system handle changing the selected date or store filter with respect to the displayed chart and activity tables? **Resolved (Q&A #1/#2)**: per the "implement what the prototype already implements" principle, the chart and tables remain static/mock and are not required to react to `selectedDate` or `storeFilter` changes for Phase 1 — this matches the current prototype behavior exactly.
- Loading state for activity data: **Resolved (Q&A #6)**: use the codebase's `Skeleton`-row pattern (as in `member-list.tsx`) — render a fixed number of skeleton rows across the table's 4 columns while data loads.
- Error state for activity data: **Investigated, no existing pattern found (Q&A #6)** — no other screen in the codebase has a distinct error-banner component; this remains an accepted project-wide gap rather than something specific to this screen, and is not required for the static-mock Phase 1 delivery.
- Clicking a row while the Quick View panel is already open for a different member: handled — `setQuickView` simply replaces the panel's target, no confirmation prompt.

## Requirements _(mandatory)_

### Component Hierarchy & Layout Structure (Grounded from UI Code)

- Page shell: `SharedSidebar` (`currentPage="entry-exit"`) + `SidebarInset` > `SharedHeader` + `PageHeader`.
  - `PageHeader` `title`: "入退館".
  - `PageHeader` `badge`: past-date "履歴データ" badge+tooltip (Phase 1 and Phase 2) or stale-data "最終更新 HH:MM:SS" badge (Phase 2 only, via `updateFailed`).
  - `PageHeader` `dateControl`: optional store `Select` (conditional) + previous/next-day `Button`s + `Popover`/`Calendar` date picker.
  - `PageHeader` `actions`: not used in Phase 1 (the notification bell trigger is Phase 2 only, not part of this spec).
- `main` content area (flex row):
  - Left column (`flex-1`, scrollable):
    - `Card` "時間帯別入館者数": `ChartContainer` wrapping a Recharts `LineChart` of `HOURLY_ENTRIES` (Phase 2 also prepends a KPI header bar + `KpiCounterBody`, out of scope here).
    - `Tabs`: `TabsList` (tab switcher, Phase 2 only) is not rendered in Phase 1; the "入退館" `TabsContent` always renders and contains a 2-column grid of:
      - `ActivityTable` title="入館" rows=`ENTRY_ROWS`
      - `ActivityTable` title="退館" rows=`EXIT_ROWS`
      - Each `ActivityTable` ends with a centered footer link "入退館履歴ですべて表示" (FR-B01-07).
    - (Phase 2 only, not in scope) "在館者" `TabsContent` containing `MembersTable`.
  - Right column: `NotificationPanel` — Phase 2 only, not in scope.
- Page-level `MemberQuickViewSheet` (Phase 2 only, not in scope): non-modal `Sheet` opened by `quickView` state, populated by `openFromActivity` (from either `ActivityTable`) or `openFromInBuilding` (Phase 2 only, not in scope).

### Functional Requirements

- **FR-B01-01**: The system MUST display, on initial page load with no further navigation required, an "入館" (Entry) activity table and a "退館" (Exit) activity table side by side, each limited to the 5 most recent records. _(Grounds: FR-S001's activity-feed concept; confirmed in-scope for Phase 1 as already implemented — Q&A #1/#2, resolved)_
- **FR-B01-02**: Each activity row MUST show: a gender-tinted avatar, member name, furigana, contract type/name (line-clamped to two lines, full text available via a title tooltip), event time, and any applicable status badges. A denied scan stays in the feed but carries the red 「拒否」 badge (same badge as 入退館履歴) so it never reads as a successful entry/exit. _(Grounds: FR-S001's ふりがな/契約種別 display requirement; FR-M003 log fields; denied-row marking decided 2026-10-21)_
- **FR-B01-03**: When an activity row carries a frequency status ("常連" or "久しぶり"), the system MUST render the corresponding badge with a hover tooltip describing the criterion. These values MUST remain fixed/mock in Phase 1, per FR-S002's documented "Phase 2 UI先行配置" plan — no live threshold computation is required for Phase 1. _(Grounds: FR-S002; confirmed — Q&A #3, resolved)_
- **FR-B01-04**: When an activity row is part of a same-day companion invitation, the system MUST render a text-only "招待者" or "同伴者" badge (no icon) with a hover tooltip describing the role. This value MUST remain hardcoded mock data for Phase 1 — no live invitation-source wiring is required. _(Grounds: FR-M008 / FR-M009; confirmed — Q&A #4, resolved)_
- **FR-B01-05** _(Deferred to Phase 2 — prototype 2026-10-14; not built in this phase)_: Clicking any activity row MUST open a non-modal Member Quick View panel, replacing any previously open panel target, showing: avatar, name, furigana, gender symbol, a context badge ("入館" or "退館済み"), the relevant time, contract name and ID, applicable status/companion badges, contact information, and a recent-visit history list (each entry shows date + time, store name, and stay duration). Within the panel the frequency badge is plain (no tooltip); the companion badge keeps its tooltip. This panel is confirmed as a required Phase 1 deliverable. _(UI-derived; no direct FR text in B-01.md defines this panel — confirmed required, Q&A #5, resolved)_
- **FR-B01-06** _(Deferred to Phase 2 — prototype 2026-10-14; not built in this phase)_: The Quick View panel MUST provide a primary action ("会員詳細を開く" with a trailing chevron icon) that navigates to the member's detail page, and a secondary action that opens the member's detail page in a new browser tab.
- **FR-B01-07**: Each activity table MUST provide a footer link ("入退館履歴ですべて表示", centered, muted, with a trailing chevron) that navigates to the separate entry-exit history screen. That destination screen and its search/filter/CSV-export capabilities (FR-M007 / B-01-01) are explicitly out of scope for this spec.
- **FR-B01-08**: The system MUST display an hourly entry-count line chart covering 06:00–22:00, with the current hour's axis label visually distinguished and marked by a reference line. The chart counts successful entries only (`entry` + `companion_entry` with result `allowed`); denied scans and exits are not counted, even though the 入館 table lists denied scans (FR-B01-02). The current-hour marker is drawn only when viewing today (JST); a past day shows no marker. _(Grounds: FR-S001 Layer 2 "当日の入館者数推移"; implemented without Phase gating in code — see Q&A #1; counting rule and past-day marker decided 2026-10-21)_
- **FR-B01-09**: The system MUST provide previous-day and next-day navigation buttons and a calendar popover to change the displayed date. Future dates MUST NOT be selectable (next-day button disabled while viewing today; calendar days after today disabled), because the visit-monitor API rejects them with `422 E-VIS-005`. _(Not in the prototype or B-01.md; FE guard added at the team's decision)_
- **FR-B01-10**: When the selected date is earlier than the current date, the system MUST visually flag both the date control and the page header with a "履歴データ" indicator and an explanatory tooltip "{yyyy年M月d日(曜)}の確定データです。リアルタイム更新は停止しています。" (e.g. "2026年11月1日(日)の確定データです。…"). _(Grounds: FR-S001 "過去日参照時の挙動")_
- **FR-B01-11**: The system MUST show a store filter dropdown ("全店舗" plus each accessible store) only when the signed-in user has access to two or more stores AND the header-level store scope is "all stores"; otherwise the filter MUST remain hidden.
- **FR-B01-12**: The following elements observed in the prototype MUST be excluded from Phase 1 delivery: the 在館人数 KPI counter block, the "本日の入退館状況" summary count bar, the 在館者一覧 tab and table, the tab-switcher control, and the notification side panel with its header bell trigger. _(Grounds: FR-S001/FR-S002/FR-S003, documented as Phase 2 Should in B-01.md)_
- **FR-B01-13**: The B-01-01 入退館履歴 screen (date-range/store/member/auth-method/result search, list display, CSV export) MUST be excluded from this spec; only the outbound link to it is in scope. _(Grounds: FR-M007, allocated to the separate B-01-01 screen)_
- **FR-B01-14**: Gate-hardware and backend authentication/authorization determination logic (FR-M001–FR-M006, and the invitation/window-validation logic behind FR-M008/FR-M009) MUST be excluded from this CRM-page spec; only their CRM-visible outputs (activity log rows, companion badges) are covered.
- **FR-B01-15**: When an activity table has zero rows for the current scope, the system MUST keep the table and its header row mounted and render the app's shared empty state (`DataStateBoundary`'s `Empty`, title 「{date}の入館記録はありません」 / 「{date}の退館記録はありません」 — 「本日」 for today) in the body, following the project's table pattern (`DataTable` + `emptyContent`, see `src/components/common/data-state-boundary`). _(Grounds: Q&A #6, research.md D3)_
- **FR-B01-16**: While activity data is loading, each activity table MUST render skeleton placeholder rows across its 4 columns, matching the codebase's shared `Skeleton`-row pattern (e.g. `member-list.tsx`). _(Grounds: Q&A #6, resolved)_
- **FR-B01-17**: Member avatars throughout this screen (activity tables) MUST use the codebase's shared `Avatar` / `AvatarImage` / `AvatarFallback` composition instead of raw `<img>` tags, so a member with no mapped avatar URL degrades to the standard muted-background fallback rather than a broken image. _(Grounds: Q&A #6, resolved)_
- **FR-B01-18**: All badges on this screen (past-date "履歴データ", frequency, companion) MUST use the prototype's unified badge shape: outline `Badge` at its default size (no custom padding/font/radius, no icons) with a `/15` tone tint (`success`, `info`, `warning`, `destructive`; neutral = `bg-card text-muted-foreground border-border`). _(Grounds: prototype 10/2 札の統一)_

### UI States (Grounded from UI Code)

- Data-rendered state: default presentation of chart + two activity tables, populated from local mock data.
- Conditional state: store filter dropdown appears only under the multi-store/"all stores" condition (FR-B01-11).
- Conditional state: historical-data badge appears only when `selectedDate` is before the fixed demo "today".
- Panel state: Quick View panel is closed by default (`quickView === null`) and opens/replaces its target on row click; closing is handled by the underlying `Sheet`'s `onOpenChange`.
- Empty state (resolved, Q&A #6, research.md D3): each activity table keeps its header and shows the shared `DataStateBoundary` empty state when it has zero rows for the current scope (see FR-B01-15).
- Loading state (resolved, Q&A #6): each activity table MUST show shared `Skeleton` placeholder rows while data loads (see FR-B01-16).
- Missing-avatar state (resolved, Q&A #6): MUST fall back to the shared `Avatar`/`AvatarFallback` presentation instead of a broken image (see FR-B01-17).
- Error state: investigated across the codebase (Q&A #6) — no reusable error-banner pattern exists on any other screen either. Accepted as an out-of-scope gap for this static-mock Phase 1 delivery rather than a screen-specific omission.

### Traceability Matrix (UI Element → Source Requirement)

| UI Element / Behavior (`entry-exit.tsx`)             | Source Requirement in B-01.md                       | Traceability Result                                                                                                                                  |
| ---------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page title "入退館", shared sidebar/header           | B-01 メタ情報 (画面名: 入退館管理)                  | Matched                                                                                                                                              |
| Date navigation (prev/next, calendar picker)         | FR-S001 (implicit navigation context)               | Partial match — not explicitly specified as a control, but required to view any day                                                                  |
| "履歴データ" badge for past dates                    | FR-S001 「過去日参照時の挙動」                      | Matched                                                                                                                                              |
| Store filter dropdown (conditional)                  | B-01.md 権限マトリクス「データスコープ」            | Matched (interpreted from Headquarter/Manager/Staff store-scope rules)                                                                               |
| Hourly entry-count chart ("時間帯別入館者数")        | FR-S001 Layer 2 「当日の入館者数推移」              | Confirmed Phase 1 scope — source FR is Phase 2, but the "implement what the prototype already ships" resolution (Q&A #1/#2) brings it into this spec |
| Entry/Exit ActivityTable ("最新5件")                 | FR-S001 「入退館アクティビティテーブル（最新5件）」 | Confirmed Phase 1 scope — same resolution as above (Q&A #1/#2)                                                                                       |
| Frequency badge (常連/久しぶり) with tooltip         | FR-S002 来館バッジの判定・表示                      | Matched — FR-S002 explicitly authorizes fixed/mock UI pre-placement in Phase 1; confirmed no live logic needed (Q&A #3)                              |
| Companion badge (招待者/同伴者) with tooltip         | FR-M008 / FR-M009                                   | Matched (Phase 1 Must); confirmed hardcoded mock data acceptable for Phase 1 (Q&A #4)                                                                |
| Member Quick View Sheet                              | No direct FR in B-01.md                             | UI-only, no direct source FR; moved to Phase 2 (prototype 2026-10-14, supersedes Q&A #5)                                                             |
| "入退館履歴ですべて表示" outbound link               | FR-M007 (B-01-01 screen)                            | Matched as navigation entry point only; destination screen out of scope                                                                              |
| KPI counter (男性/女性/在館), "本日の入退館状況" bar | FR-S001 KPIカウンター                               | Present in UI (Phase 2 gated), out of scope for Phase 1                                                                                              |
| 在館者一覧 tab/table (`MembersTable`)                | FR-S001 Layer 1 (リアルタイム在館者一覧)            | Present in UI (Phase 2 gated), out of scope for Phase 1                                                                                              |
| 通知パネル (要対応/注意/お知らせ) + bell trigger     | FR-S001 通知パネル                                  | Present in UI (Phase 2 gated), out of scope for Phase 1                                                                                              |
| 見学中バッジ (`TrialBadge`)                          | FR-S001 「見学中の識別」(C-01連携)                  | Present in code but unreachable in Phase 1 path (only wired to `InBuildingMember`, which is Phase 2 gated)                                           |

### Key Entities _(include if feature involves data)_

- **Activity Row (Entry/Exit Log Record)**: A single入退館 event as displayed on this screen; attributes: member name, furigana, event time, gate, contract name/ID, gender, frequency status badges, companion role, and visit count.
- **Hourly Entry Count**: A single point on the hourly chart; attributes: hour (6–22) and entry count for that hour.
- **Member Quick View Target**: The summary shown in the side panel when an activity row is selected; attributes: identity (name/furigana/gender/avatar), context ("entry" or "exit"), time, contract name/ID, status/companion badges, and (mock) contact info and recent-visit history.
- **Store (Filter Option)**: A selectable scope option in the store filter dropdown, representing a store the signed-in user has access to.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Staff can identify the 5 most recent entries and 5 most recent exits without any additional navigation, immediately upon opening the screen.
- **SC-002**: 100% of activity rows carrying a frequency or companion badge display an explanatory tooltip on hover.
- **SC-003**: Users can change the displayed date to any prior day in 2 or fewer interactions (chevron click or calendar pick), and the historical-data indicator appears for 100% of dates earlier than today.
- **SC-004**: The store filter is shown for 100% of sessions where the user has multi-store access and the header scope is "all stores", and hidden for 100% of single-store or store-scoped sessions.
- **SC-005** (Deferred to Phase 2 with Quick View): From any activity row, staff can reach the corresponding member's full profile page in 2 clicks or fewer (row click → Quick View → "会員詳細を開く").
- **SC-006**: 100% of activity tables with zero records for the current scope display the shared empty-state message instead of a blank table body.

## Assumptions

- Phase 1 scope for this spec is defined by the UI code's non-Phase-2 rendering branch (`currentPhase !== "2"`), since that is the only concrete, implemented signal for what ships without the documented Phase 2 monitor features. This is now confirmed: the B-01.md meta table's designation of the entire document as a Phase 2 "主定義" describes the eventual full monitor, not a restriction on this already-implemented baseline (Q&A #1/#2, resolved).
- B-01-01 (入退館履歴, full search/CSV-export screen) is a separate, not-yet-implemented screen per explicit direction and is excluded entirely from this spec; only the "入退館履歴ですべて表示" navigation link is documented.
- Gate-hardware and backend logic (FR-M001–FR-M006, FR-M008/FR-M009 determination logic) are out of scope for this CRM-page spec, since B-01.md states this logic is external to the CRM screen; only their CRM-visible outputs (log rows, companion badges) are covered here.
- "Today" (used for past-date detection) and "current hour" (used for the chart reference line) are demo-fixed values in the prototype (`2026-04-08`, `14:00`); production behavior is assumed to use the real current date/time instead.
- Contact information and recent-visit history shown in the Quick View panel are static mock placeholders in the prototype; this spec documents them as displayed content only, since no requirement text in B-01.md defines their real data source.
- The "会員詳細を開く" navigation in the prototype does not pass the selected member's ID as a route parameter; production behavior is assumed to pass the selected member's identity so the correct profile opens.
- Frequency badges and companion badges remain hardcoded mock data for Phase 1 (Q&A #3/#4, resolved) — no live threshold computation or invitation-source wiring is required for this screen's initial ship.
- Activity tables and the hourly chart do not need to react to `selectedDate` or `storeFilter` changes for Phase 1 — they remain static/mock, matching the current prototype exactly (Q&A #1/#2, resolved).
- Empty, loading, and missing-avatar states follow existing shared components already used elsewhere in the codebase (`Empty`, `Skeleton`, `Avatar`/`AvatarFallback`); no dedicated error-banner pattern exists anywhere in the codebase to reference, so an error state remains out of scope for this static-mock Phase 1 delivery (Q&A #6, resolved).

## Q&A / Clarification Needed

1. **Activity tables and hourly chart render without Phase gating, but their source FR is labeled Phase 2**
   B-01.md defines the "入退館アクティビティテーブル（最新5件）" and "当日の入館者数推移（時間帯別グラフ）" as part of FR-S001 (来館モニター), which the document's 重要要件 section marks as Phase 2 (Should). However, `entry-exit.tsx` renders both unconditionally, regardless of `currentPhase`.
   **Status**: Resolved (2026-07-07) — build this now, as part of Phase 1. Both elements are confirmed in-scope for this spec exactly as implemented in the prototype.

2. **B-01 meta table labels the entire screen as Phase 2, yet a Phase 1 baseline already exists in code**
   B-01.md's "本ドキュメントが対象とする画面" table marks B-01 itself (来館モニター) as "Phase 2（モニターUI・バッジ）", while B-01-01 (入退館履歴) is the only item marked Phase 1 — and B-01-01 is explicitly a different, unimplemented screen per the requester's direction.
   **Status**: Resolved (2026-07-07) — the governing principle is: whatever feature is already implemented in the prototype is in scope now, regardless of the document's Phase 2 label on the overall B-01 spec. The code's own Phase gating (`currentPhase !== "2"`), not the meta table, is the authoritative Phase 1 boundary for this screen.

3. **Frequency badge values are mock-only in Phase 1 — confirm downstream expectations**
   FR-S002 explicitly authorizes "Phase 2 UI先行配置" (fixed/mock badge values shown ahead of real threshold logic), which matches the hardcoded `statuses`/`badges` fields in the mock data arrays.
   **Status**: Resolved (2026-07-07) — confirmed OK. No live threshold computation is required for Phase 1; badges stay fixed/mock until FR-S003 (バッジ閾値設定管理) ships in Phase 2.

4. **Companion badge data is static mock, but its source FRs are Phase 1 Must**
   FR-M008/FR-M009 (同伴者入館判定・同伴招待の当日発効) are Phase 1 必須要件, yet in the current code the `companion` field on activity/in-building rows is hardcoded mock data with no live invitation source.
   **Status**: Resolved (2026-07-07) — keep the value hardcoded in mock data for Phase 1. No live companion-invite data source needs to be wired for this screen's initial ship; the live judgment logic continues to live entirely outside the CRM screen per B-01.md's "CRM画面対象外の連携領域" note.

5. **Member Quick View Sheet has no direct source requirement**
   The non-modal side panel opened by clicking an activity row (avatar, contract info, mock recent visits, mock contact info, navigation to member detail) is fully implemented in code but is not explicitly described anywhere in B-01.md.
   **Status**: Superseded (2026-10-15) — originally confirmed as a Phase 1 deliverable (2026-07-07, "Có cần sheet"); prototype 2026-10-14 moved the whole Quick View to Phase 2, so it is not built in this phase. Its "recent visits" and "contact info" content remain static mock placeholders for Phase 1 (see Assumptions); no real data source is required yet.

6. **No empty/loading/error/missing-avatar states are defined**
   The activity tables, the hourly chart, and the Quick View panel all rely on static mock data with no handling for zero records, in-flight loading, fetch errors, or a member missing an avatar image.
   **Status**: Resolved (2026-07-07) — investigated how other screens in this codebase handle these states and adopted the existing patterns rather than inventing new ones:
   - **Empty**: the app's shared `DataStateBoundary` empty state with the table header kept mounted (superseded by research.md D3; see FR-B01-15).
   - **Loading**: shared `Skeleton`-row pattern, as used in `member-list.tsx` (see FR-B01-16).
   - **Missing avatar**: shared `Avatar` / `AvatarImage` / `AvatarFallback` composition (`@/components/ui/avatar.tsx`) in place of the current raw `<img>` tags (see FR-B01-17).
   - **Error**: no other screen in the codebase has a dedicated error-banner pattern either; this is accepted as an out-of-scope, project-wide gap for this static-mock Phase 1 delivery rather than something to newly invent here.

7. **Quick View on the monitor screen vs. the 10/14 prototype update** — _[Open, 2026-10-20]_
   The 10/14 prototype commit (`eaf04d5`, "入退館履歴のクイックビューを Phase 2 表示だけに") gated the row-click Quick View only on `entry-exit-history.tsx`. `entry-exit.tsx` still opens `MemberQuickViewSheet` on row click without a phase check. The FE defers it on both screens, per the Notion dev decision.
   **Question**: Does the 10/14 Notion decision cover the monitor screen too? If not, the panel must be rebuilt for Phase 1. The real API has no quick-view endpoint: 契約ID, 直近の来館 and 連絡先 would need member-detail / access-log calls.

8. **Status text colours (10/7 "状態色の文字の見直し")** — _[Open — shared, 2026-10-20]_
   The prototype adds `--success-text` / `--warning-text` / `--info-text` / `--destructive-text` tokens and maps `text-success` etc. to them (one shade darker than the fill). The chart's current-hour label and "現在" use `--destructive-text`. The FE has none of these tokens, so coloured badge text and the chart labels render lighter.
   **Question**: Port these tokens app-wide (affects every screen) as a separate shared task?
