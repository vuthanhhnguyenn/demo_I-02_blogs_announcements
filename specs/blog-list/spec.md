# Feature Specification: Blog List (ブログ一覧)

**Feature Branch**: `blog-list`
**Created**: 2026-11-11
**Status**: Approved
**PO Spec**: `I-02` — 告知・ブログ管理 FR-001 (list scope; FR-003 / FR-004 / FR-007 / FR-008 as surfaced on the list)
**Source**: I-02 requirement text pasted by the user on 2026-11-11 (the `dx-fitness/fitness-spec` repo was not reachable from this machine, so no commit hash) + `fitness-crm-ui@47d60ac` (2026-09-26) `src/pages/blog-list.tsx`
**Input**: User description: "I-02 blog list screen (ブログ一覧) — build to spec + prototype first. Where the real admin notices API is right, the mock must mirror it as closely as possible; where the API is wrong or missing, the mock follows the spec and is left as-is for the backend to catch up."

## Scope

This spec covers only the **ブログ一覧** screen (Phase 1, mock data):

- list rendering (columns, badges, thumbnail, WordPress sync indicator)
- title search, detailed filters, sorting, pagination
- row actions available from the list: preview, edit (navigation), publish / unpublish, delete, restore
- confirmation dialogs opened from the list
- role / store scoping of what is visible and what is actionable

Out of scope (separate specs):

- 告知一覧 (announcement list) — same requirement, separate screen; not built here
- blog create / edit form (`blog-form`) and blog detail (`blog-detail`) — separate tasks; the list only navigates to them. Until those screens exist, each destination is a minimal "coming soon" placeholder page so list navigation is complete and testable (Clarification Q5)
- バナー (FR-005), category master screen (FR-009 — already exists as `article-categories`; the list only links to it)
- the WordPress sync mechanism itself (FR-007) — the list only displays its state
- 法人ポータル channel (FR-006 H-04) — not present on the blog prototype

## User Scenarios _(mandatory)_

### User Story 1 - Browse and find blog articles (Priority: P1)

A Headquarter, Manager, Staff or Observer user opens ブログ管理 and sees the blog articles they are allowed to see, newest first, with ID, thumbnail, title, category, distribution scope and target, channels, publish date, status and WordPress sync state. They narrow the list by title and by detailed filters, sort by a column, and page through results.

**Why this priority**: Every other list action starts from finding the article. Viewing is the only capability shared by all four roles that can open the screen.

**Verification**: Log in as each role, open ブログ管理, confirm the visible rows match the role's data scope, type a title fragment, open 詳細フィルター and combine filters, sort a column, change page size.

**Acceptance Scenarios**:

1. **Given** a Headquarter / System user with the header store selector on 全店舗, **When** the page loads, **Then** the header shows "ブログ管理" with the total article count, and the table shows only blog-type articles (never announcements) from all stores and brands, newest article ID first. A Manager sees the same for the managed store currently chosen in the header (the switcher never offers 全店舗 to a Manager), and switching stores shows the articles reaching each of them.
2. **Given** a Staff or Observer user whose header store selector is set to their store, **When** the page loads, **Then** rows include every article that actually reaches that store — 全社 articles, ブランド指定 articles targeting that store's brand (or, for a JOYFIT sub-brand store, JOYFIT as a whole), and 店舗指定 articles targeting that store; ブランド指定 articles of other brands and 店舗指定 articles of other stores are not shown.
3. **Given** the list is shown, **When** the user types in "タイトルで検索...", **Then** only articles whose title partially matches the text are shown (characters `%` and `_` match literally), the page resets to 1, and a filter result banner shows the filtered count against the total with a summary of active conditions.
4. **Given** the user opens 詳細フィルター, **When** they set カテゴリ, ブランド, 配信範囲, 店舗, 掲載先, ステータス and/or a 公開日 range, **Then** only rows matching all set conditions are shown, the filter button shows the number of active conditions, and each changed control is highlighted.
5. **Given** the header store selector is on a single store, **When** the user opens 詳細フィルター, **Then** the 店舗 filter is not shown (the header selector already scopes the list) and it does not count as an active condition.
6. **Given** filters are active, **When** the user clicks 条件をクリア, **Then** search text and all filters reset to defaults and the full scoped list returns.
7. **Given** the user clicks a sortable header (ID, タイトル, 配信スコープ, 対象, 公開日, ステータス), **When** clicked once / again, **Then** rows sort ascending / descending on that column, the header shows the direction icon and a tooltip describing the next click, and the page resets to 1.
8. **Given** more rows than the page size, **When** the user changes 表示件数 (25 / 50 / 100, default 50) or moves between pages, **Then** the footer shows "全 N 件 / P ページ / a-b を表示" and page links collapse with ellipses beyond 7 pages.
9. **Given** the user clicks a row (outside the action menu), **When** the click lands, **Then** they are taken to that article's blog detail.

---

### User Story 2 - Publish / unpublish an article from the list (Priority: P1)

An author (Staff, own articles only) or a Manager-and-above user switches an article between public and non-public directly from the row menu, with a confirmation step, and the change takes effect immediately.

**Why this priority**: FR-003 makes the publish toggle a core list action; stores rely on it to take content down or up without opening the form.

**Verification**: As Staff, open the menu of an own article and of another author's article; as Manager, toggle any article; confirm status badge and toast after each confirmation.

**Acceptance Scenarios**:

1. **Given** an article whose status is 公開中 or 公開予定, **When** an allowed user chooses 非公開にする and confirms "記事を非公開にしますか？", **Then** the status becomes 非公開 immediately, the dialog closes, and the toast "記事を非公開にしました" appears.
2. **Given** an article whose status is 下書き or 非公開, **When** an allowed user chooses 公開にする and confirms "記事を公開しますか？", **Then** the article becomes 公開中 immediately (publish date set to now if it had none) and the toast "記事を公開しました" appears.
3. **Given** a Staff user and an article created by someone else, **When** they open the row menu, **Then** 編集 / 非公開にする / 公開にする are shown disabled with the "他者作成" marker and cannot be triggered.
4. **Given** either confirmation dialog, **When** the user clicks キャンセル or closes it, **Then** nothing changes.

---

### User Story 3 - Delete and restore an article (Priority: P2)

A Manager-and-above user deletes an unneeded article after confirmation; it moves to the trash (logical delete) and stays visible as 削除済み so it can be restored within the retention period.

**Why this priority**: FR-004 is Must, but it is lower-frequency than browsing and toggling.

**Verification**: As Manager, delete an article, filter ステータス = 削除済み（ゴミ箱）, restore it; as Staff, confirm 削除 is disabled.

**Acceptance Scenarios**:

1. **Given** a Manager-and-above user and a non-deleted article, **When** they choose 削除 and confirm "記事を削除しますか？", **Then** the article becomes 削除済み, the toast "記事を削除しました" with description "ゴミ箱に移動しました。一定期間内であれば復元できます" appears.
2. **Given** a Staff user, **When** they open any row menu, **Then** 削除 is shown disabled with a role marker. If the deletion is nevertheless attempted (e.g. stale permission), the server rejects it with `E-NTC-005` and the message "削除権限がありません" is shown, mapped from the error code; nothing is deleted. Phase 1 verifies the disabled menu item only — the mock cannot identify the real caller, so the server rejection is verified in Phase 2.
3. **Given** a 削除済み row, **When** it renders (for any role), **Then** it is dimmed, carries a 削除済み badge next to the title, and its menu offers only 復元する — enabled for Manager-and-above, disabled with a role marker for Staff / Observer.
4. **Given** a Manager-and-above user, **When** they choose 復元する on a 削除済み row, **Then** the article returns as 非公開 and the toast "記事を復元しました" / "非公開の状態で復元されています" appears.

---

### User Story 4 - Preview and navigate (Priority: P3)

From the row menu the user previews how an article looks on the website (PC) and in the app (mobile), opens the edit form, creates a new article, or jumps to the category master.

**Why this priority**: Convenience surfaces; the underlying screens are specified elsewhere.

**Verification**: Open プレビュー on a row and switch PC / モバイル tabs; click 新規登録 and カテゴリマスタを編集 under different roles.

**Acceptance Scenarios**:

1. **Given** a non-deleted row, **When** the user chooses プレビュー, **Then** a dialog "プレビュー" opens with PC and モバイル tabs showing the article's category, title, publish date (or "未公開") and a body placeholder, plus the disclaimer that the real display may differ.
2. **Given** a Headquarter / System user, **When** they click カテゴリマスタを編集, **Then** they go to the category master screen; other roles see the button disabled with tooltip "カテゴリマスタ管理は本部のみ操作できます".
3. **Given** a Headquarter / System / Manager / Staff user, **When** they click 新規登録, **Then** they go to the blog create form (type fixed to ブログ); Trainer / Observer see it disabled with tooltip "ブログ作成の権限がありません".
4. **Given** an allowed user, **When** they choose 編集, **Then** they go to the blog edit form for that article.

### Edge Cases

- No blog articles at all → empty state for "ブログ" without a clear action.
- Filters / search match nothing → filtered empty state with a 条件をクリア button.
- Article with no category → 未分類 dashed badge; the カテゴリ filter offers 未分類 to find them.
- Article with no thumbnail → dashed placeholder with an image icon.
- Draft (no publish date) → 公開日 shows "—"; the 公開日 range filter never matches it.
- 全社 article → 対象 shows "全ブランド・全店舗" instead of a brand badge.
- 店舗指定 article → store name under the brand badge.
- WEB channel off, or article never published (下書き / 公開予定 / 削除済み) → WP連携 shows "—" (not a sync target).
- Data loading fails → error state with retry; while loading → skeleton rows.
- Current page beyond the last page after a filter / delete → clamp to the last valid page.
- Trainer opens the URL directly → page-level permission guard denies access.

## Requirements _(mandatory)_

### Functional Requirements

**Display**

- **FR-001**: The screen MUST list only articles of type ブログ; no 種別 column or 種別 filter is shown (I-02 FR-001 種別の扱い).
- **FR-002**: The table MUST show, in this order: ID, thumbnail, タイトル, カテゴリ, 配信スコープ, 対象, 掲載先, 公開日, ステータス, WP連携, row menu. 掲載終了日 MUST NOT be shown (I-02 FR-001 画面別の差分).
- **FR-003**: The ID column MUST show a human-readable sequential article number in the form `BL-YYYY-NNNN` (I-02 FR-002 記事ID（自動採番）).
- **FR-004**: 配信スコープ MUST show 全社 / ブランド指定 / 店舗指定 as badges; 対象 MUST show "全ブランド・全店舗" for 全社, the brand badge for ブランド指定, and the brand badge plus target store name(s) for 店舗指定.
- **FR-005**: 掲載先 MUST show a WEB badge and/or an アプリ badge per enabled channel.
- **FR-006**: ステータス MUST show 公開中 / 公開予定 / 下書き / 非公開 / 削除済み with distinct badge colours (success / info / muted / warning / destructive). 予約公開 articles appear as 公開予定 (I-02 FR-008).
- **FR-007**: WP連携 MUST show the last WordPress sync state for sync-target articles (WEB channel on and published at least once: 公開中 or 非公開), and "—" for non-targets (WEB off, 下書き, 公開予定, 削除済み). Three states are shown (I-02 FR-007, Clarification Q1): 同期済み (success — last sync time on hover), 同期失敗 (failed — distinct error styling), 未同期 (pending / not yet synced).
- **FR-008**: The header MUST show the title "ブログ管理" and the count of articles in the user's scope.

**Search, filter, sort, paging**

- **FR-009**: Title search MUST be a partial match and reset paging to page 1.
- **FR-010**: Detailed filters MUST provide: カテゴリ (all / 未分類 / categories usable by blogs), ブランド (all / JOYFIT / JOYFIT+ / JOYFIT YOGA / JOYFIT24 / FIT365), 配信範囲 (all / 全社 / ブランド指定 / 店舗指定), 店舗 (all / accessible stores — only when the header store selector is on all stores; selecting a store applies the same "reaches this store" rule as the header selector, FR-014), 掲載先 (all / WEBサイト / モバイルアプリ), ステータス (all / 公開中 / 公開予定 / 下書き / 非公開 / 削除済み（ゴミ箱）), 公開日 from–to (date pickers). Conditions combine with AND. ブランド is a single select covering both brand and sub-brand (Clarification Q3): selecting JOYFIT matches every article targeting JOYFIT as a whole or any JOYFIT sub-brand; selecting a sub-brand matches articles targeting that sub-brand **and** articles targeting JOYFIT as a whole (they reach that sub-brand too); selecting FIT365 matches FIT365 articles. 全社 articles do not match a specific brand selection — they are found via 配信範囲 = 全社.
- **FR-011**: The filter toggle MUST show the active-condition count; a filter result banner MUST show the filtered count, total, a summary of conditions, and a clear action.
- **FR-012**: Sorting MUST be available on ID, タイトル, 配信スコープ, 対象, 公開日, ステータス (asc → desc toggle). Default order is article ID descending.
- **FR-013**: Page size MUST be selectable among 25 / 50 / 100 (default 50); filter, search, sort and page state MUST be reflected in the URL so the view survives reload and back-navigation.

**Data scope & permissions**

- **FR-014**: Headquarter and System MUST see articles of all stores and brands. A Manager's scope is the stores they manage: the header store switcher offers only those stores — never 全店舗 — and the list is always limited to the store currently chosen there (same rule as `019-member-list`). Staff and Observer MUST see only articles that reach their store (I-02 権限マトリクス). "Reaches store X" is one rule used by both the header store selector and the 店舗 filter (Clarification Q4): 全社 articles, ブランド指定 articles whose target includes X's brand (a JOYFIT whole-brand target includes every JOYFIT sub-brand store), and 店舗指定 articles targeting X. Trainer MUST NOT access the screen.
- **FR-015**: 新規登録 MUST be enabled for Headquarter / System / Manager / Staff only.
- **FR-016**: 編集, 公開にする and 非公開にする MUST be enabled for Headquarter / System / Manager on every article, and for Staff only on articles they created; otherwise shown disabled with a reason marker. Observer sees them disabled.
- **FR-017**: 削除 MUST be enabled for Headquarter / System / Manager only; Staff attempting a delete MUST get "削除権限がありません", mapped from error code `E-NTC-005` (I-02 FR-004 異常系; verified in Phase 2, see US3-AC2).
- **FR-018**: カテゴリマスタを編集 MUST be enabled for Headquarter / System only.

**Row actions**

- **FR-019**: 公開にする / 非公開にする MUST require confirmation and take effect immediately on confirm (I-02 FR-003 即時反映); 公開にする on an article without a publish date sets it to now.
- **FR-020**: 削除 MUST require confirmation and perform a logical delete; deleted articles remain listable as 削除済み and are restorable (I-02 FR-004). Deleted rows are visible to every role that can open the screen, within that role's data scope (Clarification Q2).
- **FR-021**: 復元する MUST return a deleted article as 非公開, and MUST be enabled for Headquarter / System / Manager only; other roles see it disabled with a role marker (Clarification Q2).
- **FR-022**: プレビュー MUST open a PC / モバイル preview dialog for non-deleted articles.
- **FR-023**: Clicking a row MUST navigate to blog detail; 編集 MUST navigate to the blog form in edit mode; 新規登録 to the blog form in create mode. The three destinations (detail, create form, edit form) MUST exist as routes from the start; until the detail and form screens are built they show a placeholder page stating the screen is being prepared, with a way back to the list (Clarification Q5).
- **FR-024**: Each successful action MUST show its success toast (copy per User Stories 2–3); failed actions MUST surface the server error once.

**States**

- **FR-025**: The screen MUST render loading (skeleton), empty, filtered-empty (with 条件をクリア), error (with retry) and success states.

### Key Entities

- **Blog article**: an I-02 article of type ブログ. Attributes surfaced on the list: article number, title, category (optional), thumbnail (optional), distribution scope (全社 / ブランド指定 / 店舗指定) with brand, sub-brands and target stores, channels (WEB / アプリ), publish status, publish start (and end — not shown), author, deleted flag, WordPress sync state.
- **Article category**: master record (name, display order, usable by 告知 / ブログ / both, optional brand). Only categories usable by blogs appear in the filter.
- **WordPress sync state**: last sync attempt's status and completion time for an article.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A store user finds a known article by title or filter combination in under 30 seconds.
- **SC-002**: 100% of rows a role cannot act on show the action disabled with a reason; no forbidden action can be completed from the list.
- **SC-003**: Publish / unpublish / delete / restore reflect on the row within 2 seconds of confirming.
- **SC-004**: Every element and state in `checklists/parity.md` is present in the built screen.
- **SC-005**: Staff and Observer users never see 店舗指定 articles of stores outside their scope.

## Clarifications

### Session 2026-11-11

- Q1: Which WordPress sync states does the WP連携 column show? → A: 同期済み / 同期失敗 / 未同期 for sync targets, "—" for non-targets. Matches I-02 FR-007 (成功 / 失敗 / 未同期) and the backend sync status values; adds two badges the blog prototype lacks.
- Q2: Who sees deleted (削除済み) rows and who can restore? → A: every role that can open the list sees deleted rows (within its data scope, and the 削除済み（ゴミ箱） status filter is available to all); only Headquarter / System / Manager can restore — restore follows the delete permission. The prototype leaves restore ungated; this tightens it. **Pending customer confirmation**: this is our proposal (option A) in FIT QA #329, still Open as of 2026-11-11 — revisit if the customer answers differently.
- Q3: How does the ブランド filter treat JOYFIT whole-brand vs sub-brand targets? → A: keep the prototype's single select (it already covers brand + sub-brand, satisfying FR-001's ブランド・サブブランド conditions). A sub-brand selection also returns JOYFIT whole-brand articles ("what does a JOYFIT24 user see"), mirroring the backend's store filter semantics; JOYFIT returns all JOYFIT articles; 全社 articles are excluded from brand selections and found via 配信範囲 = 全社.
- Q4: Does selecting a store (header selector or 店舗 filter) include 全社 and ブランド指定 articles? → A: yes — both controls return every article that actually reaches the store: 全社 + ブランド指定 of that store's brand + 店舗指定 for that store. This matches the backend store filter. It differs from the prototype in two ways: the prototype's 店舗 filter returns 店舗指定 rows only, and its header scope keeps ブランド指定 rows of every brand (e.g. JOYFIT YOGA rows while viewing a FIT365 store).
- Q5: What do the list's links to detail / form do while those screens don't exist? → A: declare the three routes now (detail, create, edit) with minimal placeholder pages; list navigation is fully wired and testable, and the later detail / form tasks only replace the page content.
- Q6: Does the list show who created an article (author column)? → A: no — keep the prototype and FR-001 column set. "Own article" is decided by the creator's staff ID (the backend `createdBy` is an ID; names can collide), not by display name as in the prototype. Non-author Staff see the disabled menu items with the "他者作成" marker, which is the only place authorship surfaces on the list.

### Prior decision — one data module, separate screens (customer, 2026-07-29)

- Customer answer (Kyota, Notion comment 2026-07-29, relayed to dev 2026-07-30): 告知 and ブログ share **one data module with a type column**, but the **screens stay separate** — the two are different business uses (告知 = time-limited notices tied to notifications; ブログ = evergreen reading content) and categories are split by type (FR-009), so a merged screen would only force a type filter first.
- The FR-001 vs L266 conflict raised at the time is resolved in the I-02 text used for this spec (FR-001 now fixes the type per screen and drops the 種別 column / filter; "v3で整合済み"). This spec follows that: blog-only list, no 種別 column or filter, categories limited to those usable by blogs.

## Assumptions

- Phase 1 runs on mock data. Where the backend's current admin notices contract already supports a need, the mock mirrors it; needs the backend does not yet support (scope / channel / sub-brand filters, store names on list rows, article number, sync state on list rows, deleted articles and restore, sorting) are mocked per this spec and handed to the backend later.
- The header store selector is the single source of truth for the store view scope, as in other list screens.
- "Own article" means the article's creator (matched by staff ID) is the logged-in staff member (Clarification Q6).
- Deleted articles are kept indefinitely in Phase 1; the retention period ("一定期間") is a backend concern not shown on the list.
- Publish-date range compares by calendar date (JST) of the publish start.
- Preview shows a body placeholder; full body rendering belongs to the detail screen.
- Restoring returns the article as 非公開 regardless of its pre-delete status (prototype behaviour).
