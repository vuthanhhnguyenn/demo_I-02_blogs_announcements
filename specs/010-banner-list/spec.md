# Feature Specification: Banner List Management

**Feature Branch**: `010-banner-list`  
**Created**: 2026-07-02  
**Status**: Finalized  
**PO Spec**: `I-02` — 告知・ブログ管理 FR-005（List Scope）  
**Source**: `.cache/fitness-spec/crm/requirements/I-02.md` + `.cache/fitness-crm-ui/src/pages/banner-list.tsx`  
**Input**: User description: "I-02 告知・ブログ管理 - FR-005: バナーの削除・表示順管理（本部のみ）"

## Scope

This spec covers only the banner list screen behaviors in Phase 1:

- list rendering
- search/filter/sort
- row actions available from the list
- delete confirmation from the list
- display-order dialog from the list
- pagination and empty states

Out of scope for this spec:

- banner create/edit form field definitions
- form submission validation details
- image upload implementation details

## User Scenarios & Testing

### User Story 1 - View Banner List (Priority: P1)

Headquarter, Manager, Staff, and Observer users can view banners with filtering, sorting, and pagination.

**Independent Test**: Log in as any user role, navigate to バナー管理, verify table displays all banners with images, titles, brands, periods, channels, and status badges. Apply filters and confirm results update.

**Acceptance Scenarios**:

1. **Given** a user navigates to バナー管理, **When** the page loads, **Then** the table displays all banners sorted by order (default), showing: order number, thumbnail image (120×60px), title, brand badge, link URL, period (start/end), WEB/mobile toggles, status badge, and actions menu.
2. **Given** the user types a search query in the タイトルで検索 input, **When** they press Enter or wait for debounce, **Then** only banners whose title contains the query are shown, and a filter result banner appears showing "全 N 件中 N 件を抽出中" (the API returns only the post-filter count, so both numbers in the message reflect the same filtered total).
3. **Given** the user opens 詳細フィルター by clicking the button, **When** they select ブランド = "JOYFIT", チャネル = "WEB", ステータス = "公開中", **Then** only banners matching all three conditions are displayed, active filter count badge shows "3", and filter chips turn blue with border-primary.
4. **Given** the user has 3 active filters applied, **When** they click "条件をクリア" (either in the toolbar or in the alert banner), **Then** all filters reset to defaults, search clears, and the full banner list reappears.
5. **Given** the table has data, **When** the user clicks a sortable column header (順, タイトル, 公開状況), **Then** rows re-sort ascending (first click) or descending (second click), and the arrow icon reflects the current sort direction.

**Edge Cases**:

- What happens if all filters exclude all banners? → Empty state with "条件をクリア" button.
- What if the banner image fails to load? → Show a gray placeholder box with a "画像なし" icon (121×60px, centered).
- What happens when a banner's period end date passes while the user is viewing the list? → Status updates on next page load or manual refresh (no real-time updates in Phase 1).

### User Story 2 - Delete Banner from List (Priority: P2)

Headquarter and System users can delete banners from the row action menu.

**Independent Test**: Log in as Headquarter, click "新規登録", fill all required fields (image, title), submit, verify success toast and banner appears in the list.

**Acceptance Scenarios**:

1. **Given** a Headquarter user clicks "削除" from the MoreHorizontal menu, **When** the AlertDialog appears, **Then** the dialog title is "バナーを削除しますか？", the description shows the banner title and warns "この操作は取り消せません。WEBサイト・モバイルアプリから即時に非表示になります。", and two buttons are shown: "キャンセル" (cancel) and "削除する" (destructive red).
2. **Given** the delete dialog is open, **When** the user clicks "削除する", **Then** the banner record is deleted (API call), the dialog closes, the banner row disappears from the table, and a success toast appears (assumed from pattern).
3. **Given** the user is Manager, Staff, or Observer, **When** they view the MoreHorizontal menu on a banner row, **Then** the "削除" menu item is visible but disabled (role-gated to Headquarter/System only per I-02 L257).
4. **Given** the delete dialog is open, **When** the user clicks "キャンセル" or the X close button, **Then** the dialog closes with no changes to the banner.

**Edge Cases**:

- What happens if the delete API call fails (network error, server error)? → Generic error toast (follows existing error handling pattern; see Assumptions section).
- How are deleted banners handled if referenced by external systems (WEB/mobile)? → Hard delete; immediate removal from all channels per batch sync interval (see Assumptions section).

### User Story 3 - Manage Banner Display Order from List (Priority: P1)

Headquarter and System users can adjust banner order from the list screen via the order dialog.

**Independent Test**: Log in as Headquarter, click "並び順を編集", verify dialog shows all banners sorted by current order, drag items with ↑/↓ buttons or type new numbers, save, verify order updates in the main table.

**Acceptance Scenarios**:

1. **Given** a Headquarter user views the banner list, **When** they click the "並び順を編集" button (top-right, role-gated), **Then** a modal Dialog opens titled "バナー並び順の管理" with a scrollable list of all banners sorted by current order.
2. **Given** the order dialog is open, **When** the user views a banner row in the list, **Then** each row shows: order number input (width 14, numeric 1-N), thumbnail (72×36px), title (truncated), and ↑/↓ buttons.
3. **Given** the user clicks the ↑ (up) button on a banner at position N, **When** N > 1, **Then** the banner swaps with the one at position N-1, and both order inputs update to reflect new positions (N becomes N-1, N-1 becomes N).
4. **Given** the user clicks the ↓ (down) button on a banner at position N, **When** N < total count, **Then** the banner swaps with the one at position N+1, and both order inputs update (N becomes N+1, N+1 becomes N).
5. **Given** the user types a new order number (e.g., "3") in the input for a banner currently at position 7, **When** they manually change the input value, **Then** the input displays the typed number but the list does not reorder until "保存する" is clicked (visual position remains unchanged until save).
6. **Given** the user has made order changes in the dialog, **When** they click "保存する", **Then** the dialog closes, the API updates banner order records, the main table re-sorts to reflect new order, and a success toast appears (assumed).
7. **Given** the user has made order changes, **When** they click "キャンセル", **Then** the dialog closes with no changes persisted.
8. **Given** the user is Manager, Staff, or Observer, **When** they view the banner list, **Then** the "並び順を編集" button is visible but disabled (role-gated to Headquarter/System only per I-02 L257).

**Edge Cases**:

- What happens if the user types an invalid number (0, negative, > total count) in the order input? → No client-side validation; server-side save operation sanitizes or rejects invalid values (Phase 1 simplification; see Assumptions section).

### User Story 4 - Pagination & Empty States (Priority: P3)

Users can navigate large result sets and understand empty/filtered outcomes.

**Independent Test**: Create 150 mock banners, verify pagination footer shows correct page count, click page 2, verify rows 51-100 display, change page size to 25, verify 6 pages appear.

**Acceptance Scenarios**:

1. **Given** the banner list has 150 items and page size is 50 (default), **When** the user views the table footer, **Then** pagination shows "全 150 件 / 3 ページ / 1-50 を表示", page links 1, 2, 3 appear, and page 1 is active.
2. **Given** the user is on page 1, **When** they click page link "2", **Then** rows 51-100 display, the active page indicator moves to "2", and the footer updates to "51-100 を表示".
3. **Given** the user is on page 2 of 3, **When** they click "次へ" (PaginationNext), **Then** page 3 displays (rows 101-150), and "次へ" button becomes disabled.
4. **Given** the user is on page 3, **When** they click "前へ" (PaginationPrevious), **Then** page 2 displays.
5. **Given** the user changes the page size dropdown from "50件" to "100件", **When** the selection updates, **Then** the table reloads showing 100 rows per page, total pages recalculate to 2, and currentPage resets to 1.
6. **Given** the total page count exceeds 7 pages, **When** the user views pagination, **Then** ellipsis ("...") appear between non-adjacent page numbers per `getPageNumbers` logic (e.g., [1, ..., 4, 5, 6, ..., 12]).

## Requirements

### Functional Requirements

- **FR-001**: System MUST display a paginated table of all banners with columns: order, thumbnail (120×60px), title, brand badges (one or more per banner), link URL (truncated max-width 180px), period (start/end on two lines), WEB enabled badge, mobile enabled badge, status badge (公開中/期間外/非公開), and row actions menu.
- **FR-002**: System MUST allow Headquarter and System roles to execute "新規登録" (new banner) and "並び順を編集" (order management) buttons in the PageHeader; Manager, Staff, Trainer, Observer roles MUST still see these buttons but in disabled state (role-gated per I-02 L257).
- **FR-003**: System MUST allow Headquarter and System roles to execute "編集" and "削除" menu items in each banner row's MoreHorizontal dropdown; other roles MUST still see these actions but in disabled state (role-gated per I-02 L257).
- **FR-004**: System MUST provide a search input that filters banners by title (substring match, case-insensitive) and updates the table in real-time.
- **FR-005**: System MUST provide expandable detailed filters (ブランド, チャネル, ステータス) accessible via a "詳細フィルター" toggle button; active filters MUST be visually indicated with primary border and background, and a count badge MUST appear on the toggle button.
- **FR-006**: System MUST display a filter result banner (Alert) when any filter or search is active, showing "全 N 件中 M 件を抽出中" with a "条件をクリア" button to reset all filters and search. (Current implementation note: both N and M are populated from the same server-returned post-filter `pagination.totalItems` value, since the list endpoint does not separately return an unfiltered total.)
- **FR-007**: System MUST support column sorting for 順 (order), タイトル (title), and 公開状況 (status) with ascending/descending toggle; sort state MUST be visually indicated with ArrowUp/ArrowDown icons, and default state shows ArrowUpDown ghost icon.
- **FR-008**: System MUST render each entry of a banner's `brandEnum` array as a BrandBadge component (JOYFIT, JOYFIT24, JOYFIT YOGA, JOYFIT+, FIT365 — the real `BrandEnum` values `joyfit`, `joyfit24`, `joyfit_yoga`, `joyfit_plus`, `fit365`); a banner may have more than one brand, including all five (rendered as separate badges — there is no combined "JOYFIT全体" enum value).
- **FR-009**: System MUST display channel toggles as ON badges (green with Globe/Smartphone icons) or OFF badges (muted) for webEnabled and mobileEnabled flags.
- **FR-010**: System MUST display status as a colored badge: 公開中 (green bg-success/15), 期間外 (yellow bg-warning/15), 非公開 (muted).
- **FR-011**: System MUST open an AlertDialog when Headquarter clicks "削除" on a banner, showing title, destructive warning text, and "キャンセル" / "削除する" buttons; "削除する" MUST be styled as destructive (red).
- **FR-012**: System MUST open a scrollable modal Dialog when Headquarter clicks "並び順を編集", displaying all banners sorted by order with: numeric input (1-N), thumbnail (72×36px), title, ↑ and ↓ buttons.
- **FR-013**: System MUST allow Headquarter to reorder banners in the order dialog by clicking ↑/↓ buttons (swaps adjacent items and renumbers) or by typing a new order number in the input field.
- **FR-014**: System MUST disable the ↑ button on the first item and the ↓ button on the last item in the order dialog.
- **FR-015**: System MUST save order changes when Headquarter clicks "保存する" in the order dialog, close the dialog, and update the main table to reflect new order; clicking "キャンセル" MUST discard changes.
- **FR-016**: System MUST support pagination with configurable page size (25, 50, 100, 200 items per page) and display prev/next/numbered page links; default page size is 50.
- **FR-017**: System MUST display pagination metadata in the footer: "全 N 件 / M ページ / X-Y を表示".
- **FR-018**: System MUST reset currentPage to 1 whenever search query, filters, sort, or page size changes.
- **FR-019**: System MUST display an Empty component when no banners match filters (variant="filtered" with "条件をクリア" action) or when the table is truly empty (variant="empty").
- **FR-020**: System MUST prevent row click events from propagating when the user interacts with the MoreHorizontal dropdown menu or AlertDialog (stopPropagation on TableCell containing actions).

### Key Entities

- **Banner**: Represents a promotional banner for WEB and mobile app display.
  - **Attributes**: id (string, e.g., "BN-001"), order (number, display sequence), imageUrl (string), title (string, management label), brandEnum (array of `BrandEnum` values — `joyfit` | `joyfit24` | `joyfit_yoga` | `joyfit_plus` | `fit365`, e.g., `["joyfit"]`), linkUrl (string, optional), periodStart (string, YYYY/MM/DD), periodEnd (string, YYYY/MM/DD, `''` if no end date), webEnabled (boolean), mobileEnabled (boolean), status (enum: 公開中, 期間外, 非公開).
  - **Relationships**: Many-to-many with Brand (a banner can have one or more brands); order is unique per banner (1-N sequence).

## Success Criteria

### Measurable Outcomes

- **SC-LIST-001**: Headquarter users can view, create, edit, delete, and reorder banners within 5 clicks or less per operation.
- **SC-LIST-002**: Filter and search interactions update the table in under 300ms for datasets up to 500 banners.
- **SC-LIST-003**: Pagination supports navigation through 1000+ banners with smooth page transitions (< 200ms per page change).
- **SC-LIST-004**: Role-gated UI elements (create/edit/delete/reorder buttons) are correctly shown as disabled (not hidden) for Manager, Staff, and Observer roles 100% of the time.
- **SC-LIST-005**: Banner order changes via the order dialog propagate to WEB and mobile app within the sync interval (per FR-007 in I-02: assumed 1 hour batch or immediate API push).
- **SC-LIST-006**: Zero layout shift or broken UI when banners with missing images, empty link URLs, or edge-case data load.

## Assumptions

- **Data volume**: Phase 1 banner dataset is expected to be < 200 items. Search/filter/sort/pagination are implemented server-side (`GET /api/crm/banners` query params), not client-side.
- **Image hosting**: Banner images are pre-uploaded and stored externally (e.g., CDN); the `imageUrl` field contains a valid URL. Image upload/management is handled in the banner-form screen, not the list screen.
- **Brand badge component**: A shared `BrandBadge` component exists and correctly renders all real brand values (JOYFIT, JOYFIT24, JOYFIT YOGA, JOYFIT+, FIT365 — `BrandEnum` from `src/lib/api/types.gen.ts`), rendered once per entry in a banner's `brandEnum` array. There is no "JOYFIT全体" enum value; a banner targeting every brand simply has all five values in its `brandEnum` array.
- **Role-gated components**: `RoleGatedButton` and `RoleGatedMenuItem` are existing shared components that keep elements visible but disable interaction based on `allowedRoles` prop; they integrate with the app's authentication context.
- **Navigation**: The `navigate` function is a project-standard router helper that transitions to `"banner-form"` for create/edit flows.
- **Empty component**: A shared `Empty` component exists with `variant` prop ("empty", "filtered") and optional `action` slot for reset buttons.
- **PageHeader component**: A shared `PageHeader` component exists that accepts `title`, `count`, `actions`, and `outside` props.
- **Batch sync delay**: Banner changes (delete/reorder) propagate to WEB (WordPress) and mobile app via a batch sync process within 1 hour, or via immediate API push (to be confirmed in FR-007 implementation).
- **Status calculation**: Banner status (公開中/期間外/非公開) is computed by the backend based on periodStart, periodEnd, and current date/time; the frontend displays the status value as-is.
- **Deletion scope**: Delete operation performs a hard delete (no soft delete/archive mechanism for Phase 1); deleted banners are immediately removed from WEB and mobile app.
- **Order input validation**: Typing an invalid order number in the order dialog (0, negative, > total count) has no validation in Phase 1; save operation will sanitize or reject invalid values server-side.
- **Responsive design**: The UI is optimized for desktop (1440px+) viewing; mobile/tablet layouts are out of scope for Phase 1 (CRM admin tool).
- **Error handling**: Network errors (failed fetch, timeout) display a generic error toast (assumed from project patterns); no inline retry buttons or detailed error messages for Phase 1.

## Q&A / Clarification Decisions (Resolved)

All [NEEDS CLARIFICATION] markers have been resolved. The following decisions were made:

### Q1: Banner Image Load Failure

**Context**: FR-001 specifies displaying banner thumbnails (120×60px) in the table. What should the UI display if a banner's imageUrl fails to load (404, network error, CORS issue)?

**Decision**: **Option A** — Show a gray placeholder box with a "画像なし" icon (120×60px, centered).

**Rationale**: Professional appearance; consistent with existing empty state patterns in the app; ~1 hour implementation is acceptable for Phase 1.

**Implementation note**: Create a shared `<BannerImagePlaceholder />` component with fallback via `<img onError={}>` handler.

### Q2: Non-Headquarter Access to `/banner-form`

**Context**: User Story 2 (FR-002) specifies the "新規登録" button is role-gated to Headquarter/System only. What should happen if a non-Headquarter user tries to access `/banner-form` directly (e.g., by typing the URL or via browser history)?

**Decision**: **Follow existing permission system** — Redirect to `/403` page via existing proxy middleware.

**Rationale**: The project already has a `proxy.ts` middleware (see `src/proxy.ts` L73) that checks `PAGE_PERMISSIONS` and redirects unauthorized users to `/403`. Banner form routes should follow this pattern. Zero additional implementation required if the route is registered in `PAGE_PERMISSIONS` with the appropriate permission (e.g., `Permission.BannersCreate` or `Permission.BannersEdit`).

**Implementation note**: Register `/banners/create` and `/banners/:id/edit` in `PAGE_PERMISSIONS` with a Headquarter-only permission; proxy middleware will handle the redirect automatically.

### Q3: Order Input Manual Edit Behavior

**Context**: User Story 5 (FR-013) describes two ways to reorder banners in the order dialog: (1) click ↑/↓ buttons (immediate swap), (2) type a new number in the input field. When the user types a new order number in the input field (e.g., changes "7" to "3"), should the banner immediately move to position 3 in the list, or should the input just store the value and wait until "保存する" is clicked to apply the change?

**Decision**: **Option B** — Input only updates the displayed value; list reorders only on "保存する" click.

**Rationale**: Simpler implementation; safer for Phase 1 (no complex reorder logic, no risk of conflicting state); user experience is clear (type number → save to apply). Browser-style behavior (input stores value, save commits changes).

**Implementation note**: The existing `handleOrderInputChange` code already implements this pattern correctly. No code change required. Invalid order numbers (0, negative, > total count) are sanitized or rejected by the server-side save operation (no client-side validation in Phase 1).

**Status Update**: Specification is now finalized and ready for `/speckit.plan` phase.
