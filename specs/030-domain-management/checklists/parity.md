# UI Parity Checklist: Domain Master Management

**Purpose**: Verify the implemented screen reproduces every element and state of the V0 mockup.
**V0 Source**: `src/pages/domain-list.tsx` @6bc1f1c (dx-fitness/fitness-crm-ui, 2026-09-08)
**Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 field set, order, and copy.

> Note: this replaces the parity checklist generated against the earlier "AUTH-02" draft (@7e9618b, 2026-08-13). That draft was missing the authentication-method column/filter, staff-count column, linked-staff detail view, delete-blocking, and the auth-change confirmation dialog — the current V0 now includes all of them (see spec.md Assumptions), so those are back in scope as ordinary (non-deferred) parity items below. The Phase 2 status column/toggle (PAR900-PAR902) remains deferred per spec.md FR-015 — do not build it into the Phase 1 screen even though V0 renders it behind its own Phase 1/Phase 2 preview toggle.
>
> **2026-09-09 tick-off (code review, not live-browser verified)**: per explicit user instruction, this pass was done by reading the built code in `src/app/(private)/domains/**` against the V0 source cited below — not by driving a real browser session, since the app's login now requires real Cognito/Google auth that this pass did not attempt. Items below are ticked on that basis. A live-browser confirmation of the same items is still the user's to do.

## Page Header

- [x] PAR001 Page title "ドメイン管理" with a live row-count badge — src: domain-list.tsx:L303-306 — built: `page.tsx` `PageHeader` `title`/`badge` (unchanged this round)
- [x] PAR002 Header is permission-gated to "hq" (System/Headquarter) — src: domain-list.tsx:L308 — built: no `permission` prop exists on this app's `PageHeader`; gating instead happens at the route layer via `PAGE_PERMISSIONS['/domains']` + `page-permission-guard.tsx` (equivalent mechanism, unchanged this round)
- [x] PAR003 "ドメインを追加" primary action button (Plus icon), role-gated to Headquarter/System — src: domain-list.tsx:L310-318 — built: `page.tsx` `RoleGatedButton requiredPermission={Permission.DomainsCreate}` (unchanged this round)

## Toolbar

- [x] PAR004 Search input with placeholder "ID / 管理名 / ドメインで検索..." and leading search icon, filtering by ID/management-name/domain substring — src: domain-list.tsx:L329-336 — built: `page.tsx` (placeholder fixed this round, T029)
- [x] PAR005 認証方式 (auth-method) select filter next to the search input, options "全認証方式" (default) / "Google SSO" / "IDaaS"; trigger shows an active-filter highlight style when a non-default value is selected — src: domain-list.tsx:L338-348 — built: `page.tsx` (re-enabled this round, T029); active-highlight styling not re-added (this app's `<Select>` primitive has no built-in active-filter class hook the way the mockup's did) — cosmetic-only gap, filtering itself works
- [x] PAR006 Filter-result banner shown when the search query is non-empty OR the auth-method filter is non-default, summarizing the quoted query and/or selected auth method (joined with "・"), filtered count vs total, and a clear/reset action that resets both the search and the filter — src: domain-list.tsx:L352-358, L194-205 — built: `page.tsx` `filterSummary` array + `FilterResultBanner` (re-enabled this round, T029), confirmed `FilterResultBanner` joins with "・" internally

## Table

- [x] PAR007 Column set and order: ID, 管理名, ドメイン, 認証方式, スタッフ数, (状態 — Phase 2 only, see PAR900), trailing blank actions column — src: domain-list.tsx:L364-375 — built: `domain-table-columns.tsx` (認証方式 column re-enabled, 管理名 header renamed this round, T028); no 状態 column exists at all (correct per FR-015)
- [x] PAR008 ID cell rendered as muted small text — src: domain-list.tsx:L399 — built: `domain-table-columns.tsx` (unchanged)
- [x] PAR009 管理名 cell rendered as medium-weight text — src: domain-list.tsx:L400 — built: `domain-table-columns.tsx` (header renamed this round, T028; cell styling unchanged)
- [x] PAR010 ドメイン cell rendered in monospace font — src: domain-list.tsx:L401 — built: `domain-table-columns.tsx` (unchanged)
- [x] PAR011 認証方式 cell rendered as an outline Badge showing "Google SSO" or "IDaaS" — src: domain-list.tsx:L402-404 — built: `domain-table-columns.tsx` (re-enabled this round, T028)
- [x] PAR012 スタッフ数 cell: right-aligned, tabular-nums, count of staff whose email domain matches this row (suffix match on `@<domain>`, case-insensitive), suffixed "名" — src: domain-list.tsx:L131-135, L395, L405 — built: `domain-table-columns.tsx` (right-align fixed this round, T028); suffix-match logic lives server-side in `domain.table.ts`'s `staffLinkage()` (unchanged, already correct)
- [x] PAR013 Empty state (no rows): distinct copy/variant for "no data at all" vs "no data matching filter" (search query OR auth filter active), entity label "ドメイン", with a "条件をクリア" action button shown only in the filtered variant, spanning the full dynamic column count — src: domain-list.tsx:L379-392 — built: `page.tsx` `Empty` via `DataTable`'s `emptyContent` (unchanged; `hasActiveConditions` already covered both conditions)
- [x] PAR014 Row hover highlight, and the entire row is clickable (cursor-pointer) to open the detail Sheet for that domain — src: domain-list.tsx:L398 — built: `page.tsx` `DataTable onRowClick` (new this round, T033); `DataTable` applies `cursor-pointer` automatically when `onRowClick` is set
- [x] PAR015 Row-actions trigger: icon-only button (MoreHorizontal) opening a dropdown menu, click does not bubble to the row (does not open the detail Sheet) — src: domain-list.tsx:L421-425 — built: `DataTableRowActions` (unchanged; its trigger/menu already call `stopPropagation()`)
- [x] PAR016 Dropdown item "編集" with Pencil icon, role-gated to Headquarter/System, opens the Add/Edit dialog pre-filled for this row — src: domain-list.tsx:L429-435 — built: `domain-table-columns.tsx` via `DataTableRowActions` (unchanged)
- [x] PAR017 Separator between the edit/enable-disable group and the delete item — src: domain-list.tsx:L449 — built: `DataTableRowActions`'s `separatorBefore` on the delete action (unchanged)
- [x] PAR018 Dropdown item "削除" with Trash2 icon, destructive text styling, role-gated to Headquarter/System — src: domain-list.tsx:L450-458 — built: `domain-table-columns.tsx` via `DataTableRowActions` (unchanged)

## Table — Phase 2 status elements (do not build for Phase 1; see spec.md Assumptions / FR-015)

- [ ] PAR900 状態 column with outline Badge: 有効 = success-green dot + text; 無効 = muted-gray dot + text — shown only when the mockup's Phase 1/Phase 2 preview toggle is set to Phase 2 — src: domain-list.tsx:L157-159, L371-374, L406-420 — ⏸ Deferred: Phase 2 per spec.md FR-015 and research.md R5 — confirmed absent from `domain-table-columns.tsx`/`page.tsx` (no `usePhase`, no 状態 anywhere in `src/app/(private)/domains/**`)
- [ ] PAR901 Dropdown item toggling status: "無効化する" (Ban icon) when currently 有効, "有効化する" (CheckCircle2 icon) when currently 無効, role-gated to Headquarter/System, shown only in the Phase 2 preview — src: domain-list.tsx:L436-448 — ⏸ Deferred: Phase 2 per spec.md FR-015 and research.md R5 — confirmed the row dropdown only contains 編集/削除
- [ ] PAR902 Detail Sheet's 状態 field (Badge, same styling as the table's status Badge), shown only in the Phase 2 preview — src: domain-list.tsx:L574-589 — ⏸ Deferred: Phase 2 per spec.md FR-015 and research.md R5 — confirmed `domain-detail-sheet.tsx`'s info grid has no 状態 field

## Pagination Footer

- [x] PAR019 Summary text "全 {total} 件 / {totalPages} ページ / {start}-{end} を表示" (shows "0" range when empty) — src: domain-list.tsx:L471-473 — built: `TablePaginationWithSize` (unchanged)
- [x] PAR020 Previous control labeled "前へ", disabled/dimmed on first page — src: domain-list.tsx:L476-482 — built: `TablePaginationWithSize` (unchanged)
- [x] PAR021 Numbered page links with ellipsis collapsing for >7 pages (windowing: first 4 + ellipsis + last when near start; first + ellipsis + last 4 when near end; first + ellipsis + 3 around current + ellipsis + last otherwise), active page highlighted — src: domain-list.tsx:L215-220, L483-497 — built: `TablePaginationWithSize` (unchanged)
- [x] PAR022 Next control labeled "次へ", disabled/dimmed on last page — src: domain-list.tsx:L498-504 — built: `TablePaginationWithSize` (unchanged)
- [x] PAR023 Page-size selector labeled "表示件数" with options 25/50/100/200 (each labeled "{n}件"), default 50, changing it resets to page 1 — src: domain-list.tsx:L117, L155, L507-517 — built: `TablePaginationWithSize` + `DOMAIN_PAGE_SIZE_OPTIONS`/`DOMAIN_DEFAULT_PAGE_SIZE` (unchanged)

## Domain Detail Sheet (opens on row click)

- [x] PAR024 Sheet title: domain's 管理名, a Globe icon, and an outline Badge showing its 認証方式 — src: domain-list.tsx:L529-535 — built: `domain-detail-sheet.tsx` `SheetTitle` (new this round, T032)
- [x] PAR025 Basic-info grid (2 columns): ID, 管理名, ドメイン (full-width, monospace), 認証方式, スタッフ数 ("{n}名"), 作成者, 作成日時 — each with a muted xs label above the value — src: domain-list.tsx:L544-573 — built: `domain-detail-sheet.tsx` (new this round, T032)
- [x] PAR026 Separator between the basic-info grid and the linked-staff section — src: domain-list.tsx:L593 — built: `domain-detail-sheet.tsx` `<Separator>` (new this round, T032)
- [x] PAR027 "紐づくスタッフ" section header with a count Badge ("{n}名") — src: domain-list.tsx:L596-600 — built: `domain-detail-sheet.tsx` (new this round, T032)
- [x] PAR028 Empty linked-staff copy: "このドメインに紐づくスタッフはいません" (centered, muted) when no staff match — src: domain-list.tsx:L601-602 — built: `domain-detail-sheet.tsx` (new this round, T032)
- [x] PAR029 Linked-staff rows: each in a bordered row showing the staff's name (or email if no name) truncated, a secondary line "{staff ID} · {position}" truncated, and a status Badge (有効/無効/招待中 with matching color tokens) — src: domain-list.tsx:L604-614, L138-147 — built: `domain-detail-sheet.tsx` using `STAFF_STATUS_LABELS`/`STAFF_STATUS_CLASSES` from `staffs/_constants/constants.ts` (new this round, T032). Required extending `DomainLinkedStaffSummarySchema` with `staffId`/`position`/`status` (previously only `id`/`name`/`email`) and regenerating the API client — a schema/mock-db/client change plan.md said wouldn't be needed, disclosed here for transparency
- [x] PAR030 Footer buttons (right-aligned, in this order): outline destructive "削除" (Trash2 icon) opening the delete-confirmation dialog for this domain, then outline "編集" (Pencil icon) opening the Add/Edit dialog pre-filled for this domain; both role-gated to Headquarter/System — src: domain-list.tsx:L621-643 — built: `domain-detail-sheet.tsx` using `RoleGatedButton` (new this round, T032/T033)

## Add / Edit Dialog

- [x] PAR031 Dialog title: "ドメインを追加" (create) / "ドメインを編集" (edit) — src: domain-list.tsx:L651 — built: `domain-form-dialog.tsx` (unchanged)
- [x] PAR032 Dialog description: create copy "CRMへのアクセスを許可するドメインと、そのドメインのスタッフに適用する認証方式を登録します。" / edit copy "ドメイン情報を編集してください。" — src: domain-list.tsx:L652-656 — built: `domain-form-dialog.tsx` (copy fixed this round, T030)
- [x] PAR033 "管理名" field: required-mark label, text input, placeholder "例: 株式会社ダフトクラフト", helper text "ドメインに対応する管理用の名称。一覧での行識別と削除前の確認に使います" below the input — src: domain-list.tsx:L659-672 — built: `domain-form-dialog.tsx` (label/placeholder/helper text added this round, T030)
- [x] PAR034 "ドメイン" field: required-mark label, text input, placeholder "例: daftcraft.co.jp", helper text "@以降のドメイン部分を入力してください（例: joyfit.co.jp）" below the input — src: domain-list.tsx:L673-686 — built: `domain-form-dialog.tsx` (placeholder updated this round, T030; helper text was already present)
- [x] PAR035 "認証方式" field: required-mark label, select with placeholder "選択してください", options "Google SSO" / "IDaaS", helper text "このドメインのスタッフのCRM認証経路。Google Workspace保有企業はGoogle SSO、非保有企業はIDaaSを選択" below the select — src: domain-list.tsx:L687-705 — built: `domain-form-dialog.tsx` (re-enabled this round, T030)
- [x] PAR036 Duplicate-domain inline error alert: "このドメインは既に登録されています", shown only after a blocked save attempt and cleared when the domain field changes — src: domain-list.tsx:L167, L681, L706-711 — built: `domain-form-dialog.tsx` (unchanged)
- [x] PAR037 Footer buttons: "キャンセル" (closes dialog) and primary save button labeled "変更を保存" (edit) / "追加する" (create), disabled while 管理名 or ドメイン is empty/whitespace-only OR 認証方式 is unselected — src: domain-list.tsx:L713-720 — built: `domain-form-dialog.tsx` `disabled={isSubmitting || !form.formState.isValid}` (unchanged logic; now correctly gates on 認証方式 too now that the field/schema requirement is live, T030)

## Authentication-Method Change Confirmation Dialog

- [ ] PAR038 Only triggered when saving an edit where 認証方式 differs from the domain's current value (a duplicate-domain error takes precedence and blocks first) — src: domain-list.tsx:L240, L260-276 — built: `domain-form-dialog.tsx` `handleFormSubmit` (new this round, T031). The trigger condition itself is correct (only fires when `authProvider` differs). The precedence does **not** match V0: this app's duplicate-domain check is server-side (a `PATCH` response), not a client-side pre-check, so the auth-change confirmation shows first and a duplicate-domain error (if any) only surfaces after the user confirms and the save is attempted. Duplicates are still always blocked — just one step later than V0's ordering. Left unticked because the order doesn't match; not treated as a functional defect
- [x] PAR039 Title: "認証方式を変更しますか？" — src: domain-list.tsx:L728 — built: `domain-form-dialog.tsx` (new this round, T031)
- [x] PAR040 Description states, verbatim with interpolated values: "「{管理名}（{ドメイン}）」の認証方式を {現在の認証方式} から {変更後の認証方式} に変更します。このドメインに紐づくスタッフ{n}名の認証経路は、次回ログインから変更されます。" — src: domain-list.tsx:L729-732 — built: `domain-form-dialog.tsx` using `detail.staffCount` (new this round, T031)
- [x] PAR041 Footer buttons: "キャンセル" and primary "変更して保存" (commits the save and closes the dialog) — src: domain-list.tsx:L734-739 — built: `domain-form-dialog.tsx` (new this round, T031)

## Delete Confirmation Dialog

- [x] PAR042 Title: "ドメインを削除しますか？" — src: domain-list.tsx:L747 — built: `domain-delete-dialog.tsx` (unchanged)
- [x] PAR043 Description names both fields verbatim: "「{管理名}（{ドメイン}）」を削除します。削除後、このドメインのメールアドレスではCRMにログインできなくなります。この操作は取り消せません。" — src: domain-list.tsx:L748-752 — built: `domain-delete-dialog.tsx` (copy fixed this round, T034)
- [x] PAR044 When the domain has 1+ linked staff, a warning Alert (AlertTriangle icon, warning color) appears between the header and footer: "このドメインには {n} 名のスタッフが紐づいています。削除すると全員がログインできなくなるため、先にスタッフ管理で該当スタッフの所属変更または無効化を行ってください。" — src: domain-list.tsx:L754-761 — built: `domain-delete-dialog.tsx` `Alert` with `border-warning/50 bg-warning/15` (new this round, T034; matches this codebase's own existing warning-Alert convention, e.g. `transfer-exclusion-alert.tsx`)
- [x] PAR045 Footer buttons: "キャンセル", and either a disabled destructive-styled "削除する" button carrying the disabled reason "紐づくスタッフが{n}名いるため削除できません。先にスタッフの所属変更または無効化を行ってください" (when linked-staff count > 0) or an enabled destructive-styled "削除する" action that performs the deletion and also closes the detail Sheet if it was open for this domain (when linked-staff count = 0) — src: domain-list.tsx:L278-283, L762-779 — built: `domain-delete-dialog.tsx` using `RoleGatedButton`'s `disabled`+`tooltip` (proactive block from `domain.staffCount`, T034) and `page.tsx`'s `deleteMutation.onSuccess` clearing `detailEntry` (T035)
