# Feature Specification: Blog Detail (ブログ詳細)

**Feature Branch**: `blog-list` (shared branch — list, detail and form ship in one commit; no separate branch by request)
**Created**: 2026-11-13
**Status**: Approved
**PO Spec**: `I-02` — 告知・ブログ管理 FR-003 / FR-004 / FR-006 / FR-007 / FR-008 as surfaced on the blog detail screen
**Source**: I-02 requirement text pasted by the user on 2026-11-11 (the `dx-fitness/fitness-spec` repo is not reachable from this machine, so no commit hash) + `fitness-crm-ui@47d60ac` `src/pages/blog-detail.tsx` (variants `published`, `scheduled`, `draft`, `unpublished`, `deleted`, plus the in-code `sync-excluded` variant)
**Follow-up of**: [`specs/blog-list`](../blog-list/spec.md) — same article data, same decisions Q1–Q6 (see "Inherited decisions")
**Input**: User description: "I-02 blog detail screen — build to spec + prototype. Where the real admin notice detail / update / delete / publish-status / wordpress-sync API is right, the mock mirrors it; where it is missing, the mock follows the spec and the gap is recorded. Follow project patterns."

## Scope

This spec covers only the **ブログ詳細** screen (Phase 1, mock data), reached from a row of ブログ一覧:

- read-only display of one blog article: basic info, body, distribution target, publish settings, status card, WordPress sync state, audit info
- actions available from the detail screen: preview, edit (navigation), unpublish, cancel a scheduled publish, delete, restore (the prototype's permanent delete is not built — Clarification Q1)
- confirmation dialogs opened from the detail screen
- role / store scoping of who can open the article and which actions are enabled

It replaces the "being prepared" placeholder page that `blog-list` declared for the detail route (blog-list Clarification Q5). The create / edit placeholders stay until the form spec.

Out of scope (separate specs):

- blog create / edit form (`blog-form`) — the detail screen only navigates to it
- the WordPress sync mechanism itself — the screen only displays its state
- 告知詳細 (announcement detail) and its 通知到達サマリー card — announcement only
- 法人ポータル channel (FR-006 H-04) — not on the blog prototype

## Inherited decisions (from `specs/blog-list`)

- **Q1 WordPress sync states**: success / failed / pending are distinct states; non-targets are not shown as synced.
- **Q2 Deleted articles**: deleted articles stay visible to every role that can open them, within its data scope; restore is Headquarter / System / Manager only (pending customer confirmation, FIT QA #329).
- **Q4 Store scope**: "reaches store X" = 全社 articles + ブランド指定 articles whose target includes X's brand (JOYFIT whole-brand includes every JOYFIT sub-brand store) + 店舗指定 articles targeting X. The header store selector drives it.
- **Q6 Own article**: Staff may edit / switch publishing only on articles they created, matched by the creator's staff ID (not by display name).
- **FR-014 (list)**: Headquarter / System see every article; a Manager sees the managed store currently chosen in the header; Staff / Observer see articles reaching their store; Trainer has no access.

## User Scenarios _(mandatory)_

### User Story 1 - Read an article's full detail (Priority: P1)

A Headquarter, Manager, Staff or Observer user opens an article from ブログ一覧 and sees everything about it on one screen: title, article number, status, category, thumbnail, body, distribution target, channels, publish / end dates, WordPress sync state, and who created / last updated it and when.

**Why this priority**: Every action on the detail screen starts from reading it; viewing is the only capability shared by all four roles that can open the screen.

**Verification**: Open articles in each status (公開中, 公開予定, 下書き, 非公開, 削除済み, and a 公開中 article with WEB off) and compare each card's content with the prototype variant.

**Acceptance Scenarios**:

1. **Given** a user opens an article, **When** the page loads, **Then** the header shows a "ブログ管理に戻る" back link that returns to the list with its previous search / filters / page, the article title, the article number (`BL-YYYY-NNNN`) as subtitle, and the status badge (公開中 / 公開予定 / 下書き / 非公開 / 削除済み, each with its colour and a leading dot).
2. **Given** the left column, **When** it renders, **Then** it shows, in order: 基本情報 (タイトル, カテゴリ badge or 未分類, サムネイル画像 or a placeholder when none), 本文 (the article body as authored), 配信対象 (配信スコープ badge, 対象ブランド, 対象店舗), and 公開設定 (公開ステータス badge, 掲載先 badges, 公開日時 — labelled 公開予定日時 for 公開予定 — and 掲載終了日, "—" when unset).
3. **Given** the right column, **When** it renders, **Then** it shows a status card for the current status, a WordPress連携 card, and an その他情報 card (作成日時, 作成者, 更新日時, 最終更新者 with an initial avatar), and the column stays visible while the left column scrolls.
4. **Given** a 下書き article, **When** it renders, **Then** 公開日時 shows "—", there is no プレビュー action, and the status card reads 下書き with the last-saved time.
5. **Given** a 公開中 article whose WEB channel is off, **When** it renders, **Then** 掲載先 shows only モバイルアプリ and WordPress連携 shows 連携対象外 with the note "WEBサイト掲載がOFFのため".
6. **Given** a 店舗指定 article, **When** it renders, **Then** 対象店舗 lists the target store names; for 全社 / ブランド指定 it shows 全店舗.
7. **Given** a user whose data scope does not include the article (e.g. Staff of another store), or an article ID that does not exist, **When** they open its URL, **Then** a not-found state is shown with a way back to the list; no article data is shown.

---

### User Story 2 - Take an article down or cancel a scheduled publish (Priority: P1)

An author (Staff, own articles only) or a Manager-and-above user unpublishes a 公開中 article, or cancels the automatic publish of a 公開予定 article, from the status card, with a confirmation step; the change is immediate.

**Why this priority**: FR-003 makes the publish switch a core action; the status card is where the prototype places it on the detail screen.

**Verification**: As Manager unpublish a 公開中 article and cancel a 公開予定 one; as Staff try on an own and on another author's article.

**Acceptance Scenarios**:

1. **Given** a 公開中 article and an allowed user, **When** they press 非公開にする in the status card and confirm "記事を非公開にしますか？", **Then** the article becomes 非公開 immediately, the header badge, 公開設定 and status card update, and a success toast appears.
2. **Given** a 公開予定 article and an allowed user, **When** they press 予約を取り消す and confirm "予約公開を取り消しますか？", **Then** the article becomes 非公開 (no automatic publish happens) and a success toast appears.
3. **Given** a Staff user on an article created by someone else, **When** the page renders, **Then** 編集, 非公開にする and 予約を取り消す are disabled with the tooltip "自分が作成した記事のみ編集・公開切替できます"; Observer sees them disabled with "編集・公開切替の権限がありません".
4. **Given** a 非公開 or 下書き article, **When** it renders, **Then** the status card offers no publish action (publishing is done from the edit form or the list row menu, as in the prototype).
5. **Given** either confirmation dialog, **When** the user cancels or closes it, **Then** nothing changes.

---

### User Story 3 - Delete and restore (Priority: P2)

A Manager-and-above user deletes an article after confirmation; it stays on screen in the 削除済み state and can be restored.

**Why this priority**: FR-004 is Must but lower-frequency than reading and publishing.

**Verification**: As Manager delete an article, confirm the 削除済み view, restore it; as Staff confirm 削除 is disabled.

**Acceptance Scenarios**:

1. **Given** a non-deleted article and a Manager-and-above user, **When** they press 削除 and confirm "このブログ記事を削除しますか？", **Then** the article is logically deleted, the screen switches to the 削除済み view (status badge, status card "削除済み" with the deletion time, actions replaced by the deleted-state actions) and a success toast appears.
2. **Given** a Staff user, **When** the page renders, **Then** 削除 is disabled with the tooltip "削除権限がありません"; if a deletion is nevertheless attempted (stale permission), the server rejection is shown as "削除権限がありません" (mapped from the error code; verified in Phase 2, as in blog-list US3-AC2).
3. **Given** a 削除済み article and a Manager-and-above user, **When** they press 復元する and confirm "記事を復元しますか？", **Then** the article returns as 非公開 and the screen switches to the 非公開 view with a success toast.
4. **Given** a 削除済み article and a Staff / Observer user, **When** the page renders, **Then** 復元する is disabled with a reason (inherited Q2).
5. **Given** a 削除済み article, **When** the page renders, **Then** プレビュー, 編集 and status-card actions are not offered; WordPress連携 notes "削除に伴いWordPress側は非公開化されています".
6. **Given** a 削除済み article, **When** the page renders, **Then** there is no permanent-delete (完全削除) action — only 復元する (Clarification Q1).

---

### User Story 4 - Preview and edit (Priority: P3)

From the header the user previews how the article looks on the website (PC) and in the app (mobile), or opens the edit form.

**Why this priority**: Convenience surfaces; the form is specified elsewhere.

**Verification**: Open プレビュー on a 公開中 article and switch tabs; press 編集 under different roles.

**Acceptance Scenarios**:

1. **Given** a non-draft, non-deleted article, **When** the user presses プレビュー, **Then** a "プレビュー" dialog opens with PC and モバイル tabs showing the category, title, publish date (or "未公開"), the thumbnail area and the article body, plus "※ 実際のWEBサイト表示と異なる場合があります" / "※ 実際のアプリ表示と異なる場合があります".
2. **Given** an allowed user (Headquarter / System / Manager, or Staff on an own article), **When** they press 編集, **Then** they go to the blog edit form for this article, and returning brings them back to this detail.

---

### Edge Cases

- Article without category → 未分類 badge; without thumbnail → image placeholder (no broken image).
- Article without 掲載終了日 → "—".
- 公開予定 article whose publish time has passed by the time it is opened → shows the status the server returns (the server owns the automatic transition).
- WordPress sync failed → WordPress連携 shows a failed state and the last attempt time (inherited Q1); no retry action on this screen (Clarification Q2).
- Two users editing / switching the same article: the action applies to the latest server state; a conflict or stale-state error from the server is surfaced once and the screen reloads the article.
- Data loading fails → error state with retry; while loading → skeleton matching the two-column layout.
- Trainer opens the URL → page-level permission guard denies access.
- The header store selector is switched while the detail is open and the article no longer reaches the new store → the not-found state is shown (same rule as opening it directly).

## Requirements _(mandatory)_

### Functional Requirements

**Header & navigation**

- **FR-001**: The header MUST show a back link "ブログ管理に戻る" that returns to ブログ一覧 keeping the list's search, filters, sort and page; the article title; the article number (`BL-YYYY-NNNN`) as subtitle; and the status badge with a leading dot (公開中 success, 公開予定 info, 下書き muted, 非公開 muted, 削除済み destructive).
- **FR-002**: Header actions for a non-deleted article MUST be, in order: 削除 (destructive outline), プレビュー (hidden for 下書き), 編集. For a deleted article the only action MUST be 復元する; the prototype's 完全削除 is not shown (Clarification Q1).

**Content**

- **FR-003**: 基本情報 MUST show タイトル, カテゴリ (badge, or 未分類 when none) and サムネイル画像 (16:9 frame up to 320px wide, or a placeholder). No 種別 field is shown (type is fixed per screen, I-02 FR-001/FR-002).
- **FR-004**: 本文 MUST show the article body as authored in the form (paragraphs, headings and line breaks preserved), safely rendered.
- **FR-005**: 配信対象 MUST show 配信スコープ (全社 / ブランド指定 / 店舗指定 badge), 対象ブランド (全ブランド for 全社; the family or sub-brand badges otherwise) and 対象店舗 (全店舗, or the target store names for 店舗指定).
- **FR-006**: 公開設定 MUST show 公開ステータス (same badge as the header), 掲載先 (WEBサイト and/or モバイルアプリ badges), 公開日時 (label 公開予定日時 for 公開予定; "—" when publishStatus is 下書き, also after deletion) and 掲載終了日 ("—" when unset). 掲載終了日 is shown here even though the list hides it (I-02 FR-008).
- **FR-007**: The status card MUST match the status: 公開中 (success, "{日時} 公開", action 非公開にする), 公開予定 (info, "{日時} に自動公開されます", action 予約を取り消す), 非公開 (muted, "{日時} 非公開に変更", no action), 下書き (muted, "{日時} 最終保存", no action), 削除済み (destructive, "{日時} 削除", no action).
- **FR-008**: WordPress連携 MUST show 同期ステータス and its note, decided in this order: WEB channel off → 連携対象外 (whatever the status); else 下書き / 公開予定 → 未連携; else by the last sync state. The time shown is the sync state's own time (最終同期 row). States and notes: 同期済み + 最終同期 time (公開中 / 非公開 with WEB on; 非公開 adds "非公開状態を同期済み"); 同期失敗 + last attempt time (inherited Q1); 未同期 for a sync target whose first sync is still pending (inherited Q1); 未連携 + "公開時にWordPressへ連携されます" (下書き / 公開予定); 連携対象外 + "WEBサイト掲載がOFFのため" (WEB off); for 削除済み the last sync state + "削除に伴いWordPress側は非公開化されています"; a deleted article that was never linked (下書き / 公開予定) shows 未連携 without a note. The card is display-only: no 再同期 (retry sync) action, including when the state is 同期失敗 (Clarification Q2).
- **FR-009**: その他情報 MUST show 作成日時, 作成者 (name with initial avatar), 更新日時 and 最終更新者 (name with initial avatar) — editor and edit time are recorded automatically (I-02 FR-003).

**Actions & permissions**

- **FR-010**: 編集, 非公開にする and 予約を取り消す MUST be enabled for Headquarter / System / Manager on every article and for Staff only on articles they created; otherwise disabled with the tooltip "自分が作成した記事のみ編集・公開切替できます" (Staff, not author) or "編集・公開切替の権限がありません" (other roles).
- **FR-011**: 非公開にする MUST require confirmation ("記事を非公開にしますか？" / "この記事は公開中の状態から非公開に変更されます。WEBサイトやアプリから表示されなくなります。", buttons キャンセル / 非公開にする) and apply immediately.
- **FR-012**: 予約を取り消す MUST require confirmation ("予約公開を取り消しますか？" / "設定した公開日時での自動公開を取り消し、非公開の状態に戻します。", buttons キャンセル / 予約を取り消す) and set the article to 非公開.
- **FR-013**: 削除 MUST be enabled for Headquarter / System / Manager only (tooltip "削除権限がありません" otherwise), require confirmation ("このブログ記事を削除しますか？" / "削除した記事は一定期間内であれば復元できます。WEBサイトとアプリから即時に表示されなくなります。", buttons キャンセル / 削除する) and perform a logical delete; the screen then shows the 削除済み view.
- **FR-014**: 復元する MUST be enabled for Headquarter / System / Manager only (inherited Q2; the prototype leaves it ungated), require confirmation ("記事を復元しますか？" / "この記事を非公開状態として復元します。復元後は編集・公開が可能になります。", buttons キャンセル / 復元する) and return the article as 非公開.
- **FR-015**: The screen MUST NOT offer permanent deletion (完全削除). Deletion is logical only and reversible via 復元する, as I-02 FR-004 defines and the backend supports (Clarification Q1; deviation from the prototype).
- **FR-016**: プレビュー MUST open a PC / モバイル dialog for 公開中, 公開予定, 非公開 articles (not 下書き, not 削除済み), rendering category, title, publish date or "未公開", thumbnail area and body, with the two disclaimers.
- **FR-017**: 編集 MUST navigate to the blog edit form for this article; while the form is not built, its placeholder page (blog-list Q5) is shown.
- **FR-018**: Each successful action MUST show a success toast and refresh the screen and the list data; failed actions MUST surface the server error once.

**Data scope & states**

- **FR-019**: The screen MUST open only for articles of type ブログ within the user's data scope (inherited FR-014 / Q4); otherwise, or when the article does not exist, it MUST show a not-found state with a link back to the list. Trainer MUST NOT access the screen.
- **FR-020**: Deleted articles MUST remain viewable by every role that can open the screen, within its scope (inherited Q2).
- **FR-021**: The screen MUST render loading (skeleton), not-found, error (with retry) and success states.

### Key Entities

- **Blog article** (shared with blog-list): adds, for the detail view, body, target store list, end date, creator / last editor names, last-changed and deleted times, and the full WordPress sync state.
- **WordPress sync state**: status (success / failed / pending), last sync or attempt time, error message, attempt count; recent sync attempts are kept by the backend.
- **Staff member** (reference): resolves creator / last editor IDs to display names.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user identifies an article's status, target and WordPress sync state within 10 seconds of opening it.
- **SC-002**: 100% of actions a role cannot perform are shown disabled with a reason; none can be completed from the screen.
- **SC-003**: Unpublish / cancel-schedule / delete / restore reflect on screen within 2 seconds of confirming.
- **SC-004**: Every element and state in `checklists/parity.md` is present in the built screen for each of the six prototype variants.

## Clarifications

### Session 2026-11-13

- Q1: Does a deleted article offer the prototype's permanent delete (完全削除)? → B: no. Only 復元する is offered. I-02 FR-004 defines logical delete with restore only, and the backend has no hard-delete operation; the prototype's 完全削除 button and its dialog are not built.
- Q2: Does the WordPress連携 card offer a 再同期 (retry sync) action, e.g. on 同期失敗? → A: no, the card is display-only, as in the prototype. The backend's manual sync trigger (Manager and above) is not wired on this screen; it can be added later if requested.

## Assumptions

- Phase 1 runs on the blog-list mock data. Where the backend's current notice detail contract supports a need (body, target store IDs, WordPress sync state, publish-status change, logical delete), the mock mirrors it; needs it does not yet support (opening a deleted article, restore, creator / editor names, store names, article number, unpublished / deleted timestamps) are mocked per this spec and handed to the backend later.
- The status card's time for 非公開 / 下書き uses the last update time; for 削除済み the deletion time.
- The edit link returns to this detail screen (return-to), consistent with other detail → form flows.
- Publishing a 下書き / 非公開 article is done from the edit form or the list row menu, not from the detail screen (prototype).
- The body is rich text (HTML) produced by the form's editor — the prototype form has a rich-text toolbar (見出し, bold, italic, list, link, image) and the project's existing rich-text pattern (lesson description: editor HTML rendered read-only, `lesson-description-card`) is reused; the detail screen renders it read-only and safely.
- "Not found" is used for both missing and out-of-scope articles, so the screen does not reveal the existence of articles outside the user's scope.
