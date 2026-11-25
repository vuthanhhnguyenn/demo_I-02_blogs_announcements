# Feature Specification: Blog Form (ブログ新規登録・編集)

**Feature Branch**: `blog-list` (shared branch — list, detail and form ship in one commit; no separate branch by request)
**Created**: 2026-11-13
**Status**: Approved
**PO Spec**: `I-02` — 告知・ブログ管理 FR-002 (create), FR-003 (edit), FR-006 (delivery target), FR-008 (scheduled publish / end date), 権限マトリクス
**Source**: I-02 requirement text pasted by the user on 2026-11-11 (the `dx-fitness/fitness-spec` repo is not reachable from this machine) + `fitness-crm-ui@47d60ac` `src/pages/blog-form.tsx` (modes `create` / `edit`)
**Follow-up of**: [`specs/blog-list`](../blog-list/spec.md) and [`specs/blog-detail`](../blog-detail/spec.md) — same article data and decisions
**Input**: User description: "I-02 blog create / edit form. Build to spec + prototype; where the real create / update notice API is right, the mock mirrors it; where missing, follow the spec and record the gap. Follow project form patterns."

## Scope

This spec covers the **ブログ新規登録** and **ブログ編集** screens (one form, two modes; Phase 1, mock data). They replace the "being prepared" placeholders that blog-list declared (Q5) for the create and edit routes.

- entering / editing an article: title, body (rich text), thumbnail, category, delivery target (scope, brands, stores), channels, publish method (immediate / scheduled / draft), scheduled date-time, end date
- validation, unsaved-changes protection, preview, save
- who may open the form and which choices they get

Out of scope:

- 告知 (announcement) form, banner form
- category master editing (the form only links to it)
- the WordPress sync mechanism (saving only triggers what the backend does)
- 法人ポータル channel (FR-006 H-04)
- template / duplicate (FR-011, Could)

## Inherited decisions

- Article data, statuses, store scope and "own article" rule as in `specs/blog-list` (Q4, Q6) and `specs/blog-detail`.
- Body is rich text rendered read-only on detail / preview with the same format whitelist (blog-detail research D2).
- Type is fixed by the screen: a blog form always saves type ブログ; no 種別 control (I-02 FR-002).

## User Scenarios _(mandatory)_

### User Story 1 - Create and publish a blog article (Priority: P1)

A Headquarter, Manager or Staff user presses 新規登録 on the list, fills in the article, chooses where and when it appears, and publishes it immediately, schedules it, or saves it as a draft.

**Why this priority**: FR-002 Must; creating content is the main purpose of the I-02 blog screens.

**Verification**: As Manager create one article per publish method and per delivery scope; confirm each appears in the list with the right status and target.

**Acceptance Scenarios**:

1. **Given** the user opens ブログ新規登録, **When** the page loads, **Then** the header shows "ブログ管理に戻る" and the title "ブログ新規登録", and the form shows the sections 記事コンテンツ (タイトル, 本文, サムネイル画像), カテゴリ, 配信対象 (配信範囲, 掲載先) and 公開設定 (公開方法, 掲載終了日), with defaults: 掲載先 WEBサイト and モバイルアプリ both on, 公開方法 即時公開, 配信範囲 全社配信 (Staff: 店舗指定).
2. **Given** valid input with 即時公開, **When** the user presses 公開する, **Then** the article is created as 公開中 with publish time = now, the toast "ブログを公開しました" appears, and the user returns to the list where the new article is shown.
3. **Given** 予約公開 with a future date-time, **When** the user presses 予約公開する, **Then** the article is created as 公開予定 and the toast "ブログを予約公開として保存しました" appears.
4. **Given** 下書き保存, **When** the user presses 下書き保存する, **Then** the article is created as 下書き (no publish time) and the toast "ブログを下書きとして保存しました" appears.
5. **Given** missing or invalid input, **When** the user presses the save button, **Then** nothing is saved, each invalid field shows its message, the footer shows "未入力の項目があります", and the page scrolls to the first invalid field.

---

### User Story 2 - Choose the delivery target (Priority: P1)

The author chooses who sees the article: the whole company, one or more brands / sub-brands, or specific stores, and on which channels.

**Why this priority**: FR-006 Must; a wrong target publishes content to the wrong members.

**Verification**: Switch scopes and brand checkboxes; as Staff confirm 全社配信 is unavailable.

**Acceptance Scenarios**:

1. **Given** 配信範囲 options 全社配信 / ブランド指定 / 店舗指定 (cards with radio, label and helper text), **When** the user switches scope, **Then** previously chosen brands / stores are cleared.
2. **Given** ブランド指定, **When** it is selected, **Then** six checkboxes appear (JOYFIT全体, Joyfit（スタンダード）, Joyfit24, JoyfitYoga, JoyfitPlus, FIT365); JOYFIT全体 and the JOYFIT sub-brands are mutually exclusive (checking one clears the other); a summary "{n} ブランド選択中" with badges lists the selection.
3. **Given** 店舗指定, **When** it is selected, **Then** a multi-select store combobox ("対象店舗を選択...") appears, offering the stores the user may target.
4. **Given** 全社配信 is selected, **When** the section renders, **Then** a warning "全社配信 — 全ブランド・全店舗のサイト/アプリに記事が掲載されます。内容を十分に確認してから公開してください。" is shown.
5. **Given** a Staff user, **When** the section renders, **Then** 全社配信 is disabled with "※ Manager以上のみ選択できます" (I-02: 全店舗共通の作成は Manager 以上). ブランド指定 is disabled for Staff too, with the same note: Staff can only target stores (Clarification Q1).
6. **Given** both 掲載先 checkboxes are cleared, **When** saving, **Then** the error "WEBサイト・モバイルアプリのいずれか1つ以上を選択してください" is shown.

---

### User Story 3 - Edit an existing article (Priority: P2)

An allowed user (Manager and above, or the Staff author) opens 編集 from the detail or list, changes the article and saves; editor and edit time are recorded.

**Why this priority**: FR-003 Must, after creation.

**Verification**: Edit an own article as Staff and another's as Manager; confirm values are prefilled and saved.

**Acceptance Scenarios**:

1. **Given** the user opens ブログ編集 for an article, **When** the page loads, **Then** the title reads "ブログ編集" and every field is prefilled from the article (including scope, brands / stores, channels, category, thumbnail, dates).
2. **Given** valid changes, **When** the user saves, **Then** the article is updated, 更新日時 / 最終更新者 change, a toast appears, and the user lands on the article's detail (whether the form was opened from the detail or the list), keeping the list's return-to so the detail's back link restores the list with its filters; 戻る / キャンセル go back to the list with its filters.
3. **Given** a Staff user who is not the author, or a user whose scope does not include the article, **When** they open the edit URL, **Then** the form is not shown; a not-allowed / not-found state with a way back is shown (inherited Q6).
4. **Given** someone else saved the article after the form was opened, **When** the user saves, **Then** the save is rejected with a conflict message and a 「最新の内容を読み込む」 action that reloads the article into the form (after a discard confirmation when there are unsaved changes) (backend optimistic lock).
5. **Given** edit mode, **When** the form loads, **Then** 公開方法 is preselected from the current status — 公開中 → 即時公開 (keeps the original publish time), 公開予定 → 予約公開 (with its date-time), 下書き → 下書き保存 — and a 非公開 article gets an extra option 「非公開のまま保存」 (save, stay hidden) that is preselected; that option exists only for 非公開 articles in edit mode (Clarification Q3).

---

### User Story 4 - Preview and leave safely (Priority: P3)

The author previews the article as it would look on the website and app, and is warned before losing unsaved changes.

**Why this priority**: Convenience and safety; not required to save content.

**Verification**: Preview a filled form; edit a field and press キャンセル / back.

**Acceptance Scenarios**:

1. **Given** any form state, **When** the user presses プレビュー, **Then** the PC / モバイル preview dialog shows the current title (or "記事タイトル"), category, body (or "記事の本文がここに表示されます..."), thumbnail and publish date.
2. **Given** unsaved changes, **When** the user presses キャンセル, the back link or navigates away, **Then** a dialog "変更を破棄しますか？" / "未保存の変更はすべて失われます。この操作は取り消せません。" with 編集を続ける / 破棄する appears; without changes they leave directly.

---

### Edge Cases

- Scheduled date-time in the past → "公開日時は現在より後の日時を指定してください" (backend rule E-NTC-009).
- End date on or before the publish date → error (E-NTC-009); end date set with 下書き → kept and applied when published.
- ブランド指定 with no brand / 店舗指定 with no store → "対象ブランドを1つ以上選択してください" / "対象店舗を1つ以上選択してください".
- Category removed from the master while editing → the article keeps no category (未分類) after save; the select no longer offers it.
- Thumbnail upload fails or file too large / wrong type → inline error, the rest of the form is kept.
- Very long body → limited by the project's rich-text length rule; message shown under the editor.
- Double click on save → one save only.
- Store selector of a Staff user → only their own store(s); a Staff user with no store cannot target anything → a note is shown and saving is disabled.
- Trainer / Observer open the form URL → page-level permission guard denies access.

## Requirements _(mandatory)_

### Functional Requirements

**Layout & navigation**

- **FR-001**: The header MUST show a back link "ブログ管理に戻る" and the title "ブログ新規登録" (create) or "ブログ編集" (edit). The form is a single centred column (max ~960px) of four cards followed by a footer with キャンセル, プレビュー and the save button.
- **FR-002**: The save button label MUST follow the publish method: 公開する (即時公開), 予約公開する (予約公開), 下書き保存する (下書き保存).

**記事コンテンツ**

- **FR-003**: タイトル MUST be required ("タイトルを入力してください") with the project's text length limit.
- **FR-004**: 本文 MUST be a rich-text editor (toolbar: paragraph style 標準 / 見出し1 / 見出し2, bold, italic, list, link, image), required ("本文を入力してください"), with the project's rich-text length limit; the saved body renders identically on detail and preview.
- **FR-005**: サムネイル画像 MUST be optional: preview frame (16:9, 160px), "画像を選択" button, hint "推奨: 1200×630px / PNG, JPG (最大5MB)"; invalid type / size shows an inline error.

**カテゴリ**

- **FR-006**: カテゴリ MUST be optional: a select of categories usable by blogs ("カテゴリを選択"), a clear button (×, "カテゴリを外す") once chosen; for Headquarter / System an extra item "新規カテゴリを追加" (goes to the category create form) and a header link "カテゴリを管理" (goes to the category master, blog categories); other roles do not get these.

**配信対象**

- **FR-007**: 配信範囲 MUST be required, with 全社配信 / ブランド指定 / 店舗指定 as selectable cards (radio + label + helper text: "全ブランド・全店舗のサイト/アプリに掲載", "選択したブランドの全店舗に掲載", "特定の店舗のサイト/アプリに掲載"); changing scope clears the brand / store selection.
- **FR-008**: 全社配信 and ブランド指定 MUST be selectable only by Manager / Headquarter / System; for Staff both are disabled with "※ Manager以上のみ選択できます" and the scope is 店舗指定 (I-02 権限マトリクス: Staff creates store-specific articles only; backend E-NTC-004 — a brand target addresses all stores of the brand) (Clarification Q1).
- **FR-009**: ブランド指定 MUST offer the six brand checkboxes; JOYFIT全体 and JOYFIT sub-brands are mutually exclusive; FIT365 cannot be combined with any JOYFIT choice in one article (「JOYFITとFIT365は同時に選択できません」 — one brand family per article, same rule as Clarification Q2; the prototype allows it, the article holds a single brand); at least one required; a selection summary with count and badges is shown.
- **FR-010**: 店舗指定 MUST offer a multi-select store combobox limited to stores the user may target (all for Headquarter / System; managed stores for Manager; own store for Staff); at least one required. All selected stores MUST belong to one brand family (JOYFIT or FIT365); a mixed selection shows 「同一ブランドの店舗を選択してください」 (Clarification Q2).
- **FR-011**: When 全社配信 is selected the warning alert of US2-AC4 MUST be shown.
- **FR-012**: 掲載先 MUST offer WEBサイト and モバイルアプリ checkboxes (both on by default); at least one required.

**公開設定**

- **FR-013**: 公開方法 MUST offer 即時公開 ("保存と同時に公開されます"), 予約公開 ("指定した日時に自動公開されます") and 下書き保存 ("公開せずに保存します").
- **FR-014**: 予約公開 MUST show 公開日時 (date + time, required, "保存後、設定した日時に自動公開されます"); missing → "公開日時を指定してください"; past → error (Edge Cases).
- **FR-015**: 掲載終了日 MUST be optional ("設定した日に自動的に非公開になります（任意）") and later than the publish date when both are set.

**Save, preview, leave**

- **FR-016**: Saving MUST validate all fields first (messages above; footer "未入力の項目があります"; scroll to first error); on success show the publish-method toast (US1-AC2–AC4), record creator / editor and time, and leave the form (create → list; edit → the article's detail, keeping the list's return-to). The back link / キャンセル go to the list with its filters (the list URL carried as return-to, else the bare list).
- **FR-017**: プレビュー MUST open the shared PC / モバイル preview with the current unsaved values (placeholders when empty).
- **FR-018**: Leaving with unsaved changes (キャンセル, back link, navigation) MUST ask for confirmation with the dialog of US4-AC2.
- **FR-019**: A save MUST be submitted once per click; a server conflict (article changed meanwhile) MUST be reported and let the user reload; other server errors are surfaced once.

**Permissions & scope**

- **FR-020**: Create MUST be available to Headquarter / System / Manager / Staff; edit to Headquarter / System / Manager on any article in scope and to Staff on own articles (inherited Q6); Observer / Trainer cannot open the form.
- **FR-021**: Deleted articles MUST NOT be editable (edit URL shows the not-allowed state; restore first, from detail / list).
- **FR-022**: When a Staff author edits an own article whose current scope is 全社配信 or ブランド指定 (scopes Staff may not choose, Q1), the whole 配信対象 section MUST be read-only with the note 「配信対象はManager以上のみ変更できます」, and the unchanged target is kept on save.
- **FR-023**: In edit mode, saving with the publish method unchanged (incl. 「非公開のまま保存」) MUST show 「ブログを保存しました」 instead of the publish-method toast; an unchanged 公開中 article keeps its original publish time, and an unchanged 公開予定 article whose time has already passed can be saved without picking a new time.
- **FR-024**: 掲載終了日 MUST be a later JST calendar day than the publish date (the publish date is "now" for 即時公開 on create, the original publish time for an unchanged 公開中 article).

### Key Entities

- **Blog article** (shared): title, body, thumbnail, category, scope (company / brand / store), brand family + sub-brands, target stores, channels, publish status, publish start, end date, creator / editor.
- **Article category** (reference): categories usable by blogs.
- **Store** (reference): targetable stores per user scope.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A store user creates and publishes a simple article (title, body, own store) in under 3 minutes.
- **SC-002**: 100% of invalid submissions are blocked with a field-level message; no article is saved with an empty target, no channel, or a past schedule.
- **SC-003**: No unsaved input is lost without an explicit 破棄する confirmation.
- **SC-004**: Every element and state in `checklists/parity.md` is present in the built screen in both modes.

## Clarifications

### Session 2026-11-13

Answered with the recommended options at the user's request to finish without stopping ("làm xong rồi check 1 thể"); revisit on review.

- Q1: May Staff use ブランド指定? → A: no — Staff can only use 店舗指定 (I-02 "店舗個別" for Staff; backend E-NTC-004). Deviation: the prototype only disables 全社配信.
- Q2: May 店舗指定 mix stores of different brand families? → A: no — one family (JOYFIT or FIT365) per article, matching the single brand field shown on list / detail.
- Q3: What does 公開方法 show when editing? → A: preselected from the current status; 非公開 articles get an extra 「非公開のまま保存」 option (preselected) so saving never publishes them by accident.

## Assumptions

- Phase 1 runs on the shared notices mock. The backend's create / update rules (three delivery axes, `subBrandCodes: null` = whole brand, empty sub-brand list rejected, Staff cannot target all stores, schedule must be in the future and end after start, Staff edits only own articles, optimistic lock on update) are mirrored; missing pieces (store names, names of creator / editor, article number) follow blog-list / blog-detail gaps.
- "JOYFIT全体" maps to brand JOYFIT with all sub-brands; individual JOYFIT sub-brands map to brand JOYFIT with the chosen sub-brands; FIT365 is its own brand.
- Thumbnail upload uses the project's existing image-upload flow and limits (PNG / JPG, 5MB).
- Rich-text limits and toolbar follow the project's existing rich-text field (lesson description).
- 即時公開 on create sets the publish time to the save time.
- The time part of 公開日時 uses the project's date-time picker (no native date input).
