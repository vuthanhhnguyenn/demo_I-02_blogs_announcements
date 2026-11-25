# UI Parity Checklist: CRM Maintenance Management

**Purpose**: Verify the implemented screen reproduces every element and state of the V0 mockup.
**V0 Source**: dx-fitness/fitness-crm-ui @ 3459057 (2026-07-15) — `src/pages/crm-maintenance-list.tsx`, `src/pages/crm-maintenance-detail.tsx`, `src/pages/maintenance-form.tsx`
**Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 field set, order, and copy.

## List — Access Denied (non-System/Headquarter)

- [x] PAR001 Access-denied screen — ShieldAlert icon, heading "アクセス権限がありません", body "CRMメンテナンス管理は本部・System 権限のスタッフのみ参照できます。", centered layout, no table/actions rendered — src: crm-maintenance-list.tsx:L274-293

## List — Page Header

- [x] PAR002 Page title "CRMメンテナンス管理" with total record count badge — src: crm-maintenance-list.tsx:L301-304
- [x] PAR003 "新規登録" button with Plus icon, role-gated to System, disabled/deny-tooltip "CRMメンテナンス登録は System 権限のみ可能です" for non-System — src: crm-maintenance-list.tsx:L305-316

## List — Filter Result Banner

- [x] PAR004 Banner shown only when a filter or search is active: "全 {N} 件中 {M} 件を抽出中" plus a colon-prefixed summary of active filters (quoted search text and/or status value) — src: crm-maintenance-list.tsx:L322-329
- [x] PAR005 "条件をクリア" button with X icon in the banner, clears search + status filter and resets to page 1 — src: crm-maintenance-list.tsx:L330

## List — Toolbar

- [x] PAR006 Search input with Search icon, placeholder "IDまたはタイトルで検索...", filters by ID or title substring, resets to page 1 on change — src: crm-maintenance-list.tsx:L340-348
- [x] PAR007 "詳細フィルター" toggle button with SlidersHorizontal icon, active-filter-count badge, and chevron up/down state — src: crm-maintenance-list.tsx:L350-364
- [x] PAR008 Expandable filter row (shown when toggle is open) containing a ステータス select with options: 全ステータス / 予定 / メンテナンス中 / 完了 — src: crm-maintenance-list.tsx:L369-379
- [x] PAR009 "すべてクリア" button inside the expanded filter row, shown only when a filter is active — src: crm-maintenance-list.tsx:L380-392

## List — Table

- [x] PAR010 Column set and order: ID, タイトル, 開始日時 (sortable), 終了日時 (sortable), ステータス, 許可ユーザー (right-aligned), 作成日 (sortable), row-actions (unlabeled) — src: crm-maintenance-list.tsx:L400-410
- [x] PAR011 Sortable column header shows ArrowUpDown when inactive, ArrowUp/ArrowDown per current order when active, with tooltip "クリックで昇順ソート"/"クリックで降順ソート" — src: crm-maintenance-list.tsx:L242-271
- [x] PAR012 Status badge variant/color per value: 予定 = info tint, メンテナンス中 = warning tint, 完了 = muted — src: crm-maintenance-list.tsx:L159-168
- [x] PAR013 許可ユーザー column renders as "{count}名" right-aligned tabular-nums — src: crm-maintenance-list.tsx:L441
- [x] PAR014 Empty-state row spans all columns; variant "filtered" (with "条件をクリア" action button) when a filter/search is active, variant "empty" (no action) when there are zero records at all — src: crm-maintenance-list.tsx:L413-426
- [x] PAR015 Clicking a data row (outside the actions cell) navigates to the record's detail view — src: crm-maintenance-list.tsx:L429-433
- [x] PAR016 Row actions dropdown (MoreHorizontal trigger) stops row-click propagation — src: crm-maintenance-list.tsx:L443-447
- [x] PAR017 Row actions: "編集" item with Pencil icon, role-gated to System, navigates to edit form — src: crm-maintenance-list.tsx:L449-454
- [x] PAR018 Row actions: when status = メンテナンス中, delete item is disabled, two-line label "削除できません" / "メンテナンス実施中のため" with Trash2 icon, select is prevented — src: crm-maintenance-list.tsx:L456-468
- [x] PAR019 Row actions: when status ≠ メンテナンス中, "削除" item with Trash2 icon, destructive styling, role-gated to System, opens delete confirmation — src: crm-maintenance-list.tsx:L469-477

## List — Pagination Footer

- [x] PAR020 Summary text "全 {total} 件 / {totalPages} ページ / {start}-{end} を表示" — src: crm-maintenance-list.tsx:L490-492
- [x] PAR021 Pagination control: Previous (disabled/dimmed at page 1), numbered pages with ellipsis collapsing beyond 7 pages, Next (disabled/dimmed at last page) — src: crm-maintenance-list.tsx:L235-240, L493-522
- [x] PAR022 Page-size select with options 25/50/100/200 (labelled "{n}件"), changing it resets to page 1 — src: crm-maintenance-list.tsx:L524-534

## List — Delete Confirmation Dialog

- [x] PAR023 Dialog title "このCRMメンテナンス情報を削除しますか？", description "「{title}」を削除します。紐づく許可ユーザーリストも削除されます。", キャンセル + destructive "削除する" actions — src: crm-maintenance-list.tsx:L542-554

## Detail — Page Header

- [x] PAR024 Back link "CRMメンテナンス管理に戻る" navigating to the list — src: crm-maintenance-detail.tsx:L108-113
- [x] PAR025 Title = record title; status badge next to title with same 予定/メンテナンス中/完了 tint mapping as the list — src: crm-maintenance-detail.tsx:L70-79, L114-119
- [x] PAR026 "編集" button with Pencil icon, role-gated to System, navigates to edit form — src: crm-maintenance-detail.tsx:L122-129
- [x] PAR027 Overflow ("...") menu rendered only for System role, containing delete — src: crm-maintenance-detail.tsx:L130-157
- [x] PAR028 Overflow menu: enabled destructive "削除" item when deletable; disabled "削除（メンテナンス中）" item when status = メンテナンス中 — src: crm-maintenance-detail.tsx:L136-154

## Detail — Left Column (60%)

- [x] PAR029 "基本情報" card: 2-column grid with ID, タイトル, 開始日時, 終了日時 labeled fields — src: crm-maintenance-detail.tsx:L168-192
- [x] PAR030 "メンテナンスメッセージ" card: message text, whitespace preserved — src: crm-maintenance-detail.tsx:L195-202
- [x] PAR031 "備考" card rendered only when notes is non-empty, whitespace preserved — src: crm-maintenance-detail.tsx:L204-213
- [x] PAR032 "許可ユーザー（{count}名）" card with table columns ユーザーID, 氏名, ロール, one row per allowed user — src: crm-maintenance-detail.tsx:L216-238

## Detail — Right Column (40%)

- [x] PAR033 Sticky status card showing tone/icon/label per status (予定=info/Info icon, メンテナンス中=warning/Wrench icon, 完了=muted/CheckCircle2 icon) plus meta lines "作成: {createdAt}（{createdBy}）" and "更新: {updatedAt}" — src: crm-maintenance-detail.tsx:L81-90, L244-257

## Detail — Delete Confirmation Dialog

- [x] PAR034 Same title/description/actions copy as the list's delete dialog (PAR023) — src: crm-maintenance-detail.tsx:L264-277

## Form — Page Header

- [x] PAR035 Back link "CRMメンテナンス管理に戻る"; page title "CRMメンテナンス新規登録" (create mode) or "CRMメンテナンス編集" (edit mode) — src: maintenance-form.tsx:L211-217

## Form — Card: 基本情報

- [x] PAR036 タイトル field: required marker, description "管理用の識別名（例: 2026年4月定期メンテナンス）", placeholder text, inline error below field — src: maintenance-form.tsx:L228-230
- [x] PAR037 開始日時 field: required marker, datetime-local input; in edit mode with status = メンテナンス中, field is disabled with a trailing Lock icon and tooltip "メンテナンス中のため開始日時は変更できません" — src: maintenance-form.tsx:L234-257
- [x] PAR038 終了日時 field: required marker, datetime-local input, inline error below field — src: maintenance-form.tsx:L258-260
- [x] PAR039 Period-overlap error message rendered below the start/end date row (not attached to a single field) — src: maintenance-form.tsx:L262-263
- [x] PAR040 メンテナンスメッセージ field: required marker, description "アクセス制限時にユーザーに表示するメッセージ", textarea (4 rows), inline error — src: maintenance-form.tsx:L266-268
- [x] PAR041 備考 field: optional marker, textarea (3 rows), no validation — src: maintenance-form.tsx:L270-272

## Form — Card: 許可ユーザー

- [x] PAR042 Helper text "メンテナンス期間中もCRM管理画面にアクセスできるユーザー（開発関係者・動作検証担当者等）を設定します" — src: maintenance-form.tsx:L284-286
- [x] PAR043 "CRMユーザーを検索して追加" button with Search icon, opens the user-search dialog — src: maintenance-form.tsx:L288-291
- [x] PAR044 Empty state (dashed border) "許可ユーザーはまだ追加されていません" when list is empty — src: maintenance-form.tsx:L292-295
- [x] PAR045 Allowed-user row: user ID, name, role badge, remove (X) button per row — src: maintenance-form.tsx:L296-314
- [x] PAR046 Warning alert (AlertTriangle icon): "メンテナンス期間中、許可ユーザー以外はCRM管理画面にアクセスできなくなります。開発関係者・検証担当者を事前に登録してください。" — src: maintenance-form.tsx:L316-321

## Form — Footer

- [x] PAR047 "キャンセル" button navigates back to the list — src: maintenance-form.tsx:L328
- [x] PAR048 Submit button label "登録する" (create mode) or "保存する" (edit mode), runs validation then opens confirmation dialog — src: maintenance-form.tsx:L329-332

## Form — Confirmation Dialog

- [x] PAR049 Title "以下の内容で登録しますか？" (create) or "変更内容を保存しますか？" (edit) — src: maintenance-form.tsx:L342-344
- [x] PAR050 Body intro "以下の内容で{登録/更新}します。内容をご確認ください。" plus a summary block listing タイトル, 期間 ("{start} 〜 {end}"), 許可ユーザー ("{count}名") — src: maintenance-form.tsx:L346-362
- [x] PAR051 キャンセル + confirm action; confirm label "登録を確定する" (create) or "更新を確定する" (edit); on confirm shows a success toast ("CRMメンテナンスを登録しました" / "CRMメンテナンスの変更を保存しました") and navigates to the list — src: maintenance-form.tsx:L365-369

## Form — CRM User Search Dialog

- [x] PAR052 Dialog title "CRMユーザー検索", description "メンテナンス期間中もアクセスを許可するCRMユーザーを検索して追加します" — src: maintenance-form.tsx:L378-381
- [x] PAR053 Search row: ユーザーID text input, 氏名 text input, ロール select (options: 全ロール, System, Headquarter, Manager, Staff, Trainer, Observer) — src: maintenance-form.tsx:L385-398
- [x] PAR054 Zero-results state (dashed border) "該当するユーザーが見つかりません" — src: maintenance-form.tsx:L399-404
- [x] PAR055 Result row: checkbox, user ID, name, role badge; checkbox pre-checked/disabled and row dimmed with "追加済み" tag when the user is already on the allowed-user list — src: maintenance-form.tsx:L405-423
- [x] PAR056 Dialog footer: キャンセル button, "選択したユーザーを追加" button disabled until at least one row is checked; confirming shows toast "許可ユーザーに{count}名を追加しました" — src: maintenance-form.tsx:L195-200, L426-429

## Advance Notification (FR-007 delta — simplified per PO direction 2026-07-20)

> The V0 mockup (2026-07-18 @ 1cc2d6d) added a rich 事前通知 affordance (auto/manual kind, sent timestamp, target count, re-send). Per the PO's 2026-07-20 simplification, this feature deliberately **diverges from V0** down to a single `notified` boolean: created → 未, one confirm-and-send → 済 (no kind, no timestamp, no target count, no re-send, no completed-lock). The confirmation popup itself is retained (UI requirement). Items below describe the shipped simplified UI, not a faithful V0 port.

- [x] PAR057 List 通知 column — header "通知" (~90px, between ステータス and 許可ユーザー); cell renders muted "—" when status = 完了, else a 済 badge (success tint with a leading dot) when notified, or a 未 badge (muted) when not
- [x] PAR058 Detail 事前通知 card — notified state: CheckCircle2 icon + "通知済み"; not-notified state: helper text "対象CRMユーザーにメンテナンス予定を通知します。" + the send button
- [x] PAR059 Detail send button — BellRing icon, label "通知を送信" while 未 / "通知を再送信" once 済 (button always shown; manual re-send allowed); role-gated to System (deny tooltip "通知の送信は System 権限のみ可能です"); opens the confirmation popup
- [x] PAR060 Notify confirmation popup (retained per UI requirement) — title "メンテナンス予定を通知しますか？", body "対象CRMユーザーに、以下の内容を通知します。", preview block (タイトル / 開始日時 / 終了日時 / メンテナンスメッセージ) + footnote "※アクセスを許可されたユーザーには「メンテナンス中もアクセス可能」である旨が追記されます。", footer キャンセル + "通知を送信する" → success toast "通知を送信しました"
