# Quickstart: Blacklist Management (A-01 FR-015)

**Feature**: `025-blacklist-management` | **Date**: 2026-08-07 | **Plan**: [plan.md](./plan.md)

Manual verification. The project has **no automated tests** (Constitution § No Testing Policy) — this checklist plus `tsc --noEmit`, ESLint and code review is the whole QA path.

Run `npm run dev`, sign in as a **Headquarter** user, and go to `/members/blacklist`.

> Tick items here as you go. The exhaustive V0-fidelity check lives in [checklists/parity.md](./checklists/parity.md) — 111 items — and is the gate `/speckit.implement` will not pass while unchecked. This file is the fast path: it walks the behaviour, not every pixel.

---

## 0 — Build gates

- [ ] `npx tsc --noEmit` clean
- [ ] `npm run lint` clean
- [ ] `git grep -nE "registrationSource|manualReason|matchConditions|GetCrmBlacklistByIdResponse\b" -- src/` returns **nothing** — no survivor of the old shape (plan step 7)
- [ ] `git grep -n "postCrmBlacklist" -- src/` returns nothing — the list-scoped registration route is gone (FR-073)

---

## 1 — Access control (FR-001 – FR-004)

- [ ] As Headquarter: ブラックリスト管理 appears in the sidebar and the screen loads
- [ ] As **Manager**, **Staff**, **Trainer**, **Observer**: the sidebar entry is absent, and navigating to `/members/blacklist` directly does **not** render the list
- [ ] Hitting `GET /crm/blacklist` directly as a non-HQ role is refused by the server, not merely hidden by the UI
- [ ] As Headquarter with a single store selected in the header: the list still shows entries from **other** stores — the blacklist is not store-scoped

## 2 — List display (FR-005 – FR-014)

- [ ] Title ブラックリスト管理 with a count badge equal to the **filtered** row count
- [ ] Exactly **six** columns, in order: 会員ID · 氏名 · 店舗名 · 登録理由 · 未納金額 · 登録日 — there is **no** 照合結果 column (Q-01)
- [ ] A `forced_withdrawal` row shows a 強制退会 badge in the destructive tone; a `manual` row shows 手動登録 in the warning tone
- [ ] A row with arrears shows `¥15,400` right-aligned, destructive, medium weight; a row without shows `¥0` muted
- [ ] The seeded member with **no primary store** renders an em dash in 店舗名, not "undefined"
- [ ] Clicking a row anywhere except the name opens that entry's detail
- [ ] Clicking the **name** opens the member detail instead, and the row navigation does **not** also fire
- [ ] Scrolling the table body keeps the header row pinned

## 3 — Search and filters (FR-015 – FR-027)

- [ ] Typing in the search box narrows the list and resets to page 1
- [ ] **Go to page 2, then type a search term that only matches a row on page 1** — the row is found. (This is the server-side check: a client-side search would report "no results".)
- [ ] 登録理由 = 強制退会 leaves only forced-withdrawal rows; the trigger takes the active highlight
- [ ] 未納金 = あり leaves only rows with a non-zero amount
- [ ] There is **no** 詳細フィルター collapse button — both filters are always visible
- [ ] With either filter active, the banner reads 「全 N 件中 M 件を抽出中: …」 with a `・`-joined summary, and the summary omits whichever filter is at its default
- [ ] 条件をクリア resets the search and both filters and returns to page 1
- [ ] Filter down to zero rows → 「条件に一致するブラックリストがありません」 with a 条件をクリア button
- [ ] The banner's denominator and the count badge do not disagree

## 4 — Pagination (FR-028 – FR-032)

- [ ] Footer reads 「全 N 件 / P ページ / 1-25 を表示」
- [ ] 表示件数 offers **25 / 50 / 100**, defaulting to **25** — no 200 option (Q-08)
- [ ] Selecting 100 does not produce a 400
- [ ] 前へ is inert on page 1; 次へ is inert on the last page
- [ ] Changing page scrolls the table back to the top
- [ ] Go to the last page, then apply a filter that shrinks the result — the view clamps to a valid page instead of showing an empty table

## 5 — Manual registration (FR-034 – FR-052)

Open 手動登録.

- [ ] The Sheet opens on the right with every field blank; 登録 is **disabled**
- [ ] Typing a valid member number resolves the member: success border, and an identity card with photo, name, kana, 生年月日, and 「ID: … / 店舗名」
- [ ] Typing a nonsense member number: destructive border and 「該当する会員が見つかりません」
- [ ] Clearing the field restores the hint 「会員番号を入力すると…」 and clears the resolved member
- [ ] Searching by **name**, then **kana**, then **phone**, then **email** in the combobox each return the expected member; rows show avatar + name + a muted ID・カナ・店舗名 line
- [ ] Search by a **mid-word fragment** (e.g. `なか` for 田中) returns nothing — matching is prefix-based (FR-038a), and this is the check that the mock is not silently doing substring
- [ ] Selecting a result fills the member-number field and shows the identity card
- [ ] 登録理由 offers exactly 迷惑行為 / 未納金 / 不正利用 / その他 — **no** 設備破損
- [ ] The warning alert 「ブラックリストに登録された会員の個人情報は削除できなくなります」 is visible before the footer
- [ ] Resolve a member, pick a reason, register → toast 「ブラックリストに登録しました」, Sheet closes and resets, the new row is in the list
- [ ] Reopen the Sheet and resolve **that same member** → the Sheet says they are already blacklisted and 登録 stays disabled (FR-050a), without needing a submit
- [ ] Cancel with fields filled → reopening shows everything blank

## 6 — Detail (FR-053 – FR-061)

Open any entry.

- [ ] Back link 「ブラックリスト管理に戻る」 returns to the list
- [ ] Title is the member's name; badges are a monospace member-ID badge and a dot-prefixed registration-path badge
- [ ] The head-up card shows ID, 旧No, 所属, kana, member-type and 主契約 badges, with a 会員詳細を開く action
- [ ] Open the entry whose member has **no legacy code** → the 旧No fragment is absent, not empty
- [ ] Open the entry whose member has **no current contract** → the 主契約 badge is absent, not blank
- [ ] The left column holds exactly **two** cards: 登録情報 then 未納金 — there is **no** 照合条件 card (Q-02)
- [ ] 登録情報 shows 登録理由 (badge), 登録日時, 登録者, and メモ across both columns
- [ ] The メモ text is the entry's `reason` field — if it shows an enum value like `nuisance`, the v0.3 meaning has leaked through (data-model §Entities)
- [ ] 未納金 with arrears: large destructive amount plus a 未収 badge; without: muted amount, no badge
- [ ] The right column's status card is sticky while the left column scrolls

## 7 — Release (FR-062 – FR-069b)

- [ ] As Headquarter: ブラックリスト解除 is enabled
- [ ] As any other role: it is disabled with the tooltip 「ブラックリスト解除は本部のみ操作できます」
- [ ] Clicking it opens 「ブラックリストから解除しますか？」 naming the member and mentioning re-enrolment
- [ ] Confirm → toast 「ブラックリストから解除しました」, and **the screen returns to the list** (FR-064a, Q-11)
- [ ] The released entry is **not** among the list's rows (FR-033)
- [ ] Paste that entry's URL back into the address bar → it still loads (FR-069a)
- [ ] That released detail does **not** present the member as still blacklisted: the status card reflects the released state, the release timestamp and releasing staff are shown, and **no** release action is offered (FR-069b)
- [ ] Check the member's own record → their `memberStatus` is unchanged by the release (FR-066)
- [ ] Blacklist that member again → a **new** entry is created; the released one is untouched (FR-067)

## 8 — Seeded edge cases (research §10)

- [ ] The seeded **released** entry loads by URL and renders per §7
- [ ] A legacy row with `reasonCategories: []` renders without crashing (no first-element assumption)
- [ ] An auto-registered row's 登録者 shows the System actor rather than blank

## 9 — The member-detail dialog (FR-074)

- [ ] Open a member's detail → the ブラックリスト登録 dialog still opens with **one** reason select and **one** memo field, same copy, same role gating
- [ ] Registering through it succeeds, and the entry appears on the blacklist list with the chosen reason stored
- [ ] Registering a member who already has an active entry is refused with the server's message

## 10 — Supersession cleanup

- [ ] `specs/blacklist-management/` is **deleted** — the pre-contract spec it holds is superseded by this feature (spec § Assumptions). `/speckit.implement` does not report done while it exists.

---

## Notes for the reviewer

Three things in this feature are deliberate and will look like bugs to anyone reading the contract without the spec:

1. **No 照合結果 column and no 照合条件 card.** Both are FR-024 (a _Could_ requirement) and the client ruled the column out of scope on 2026-07-29 (QA `member-management/qa06`); the card follows the same rationale. Q-01, Q-02.
2. **`reasonCategories` is written but never displayed.** The Sheet requires a reason, stores it, and no screen reads it back. Q-03, FR-043a.
3. **`history` is returned and seeded but rendered nowhere.** The contract declares it required so the mock must supply it; no Phase 1 surface consumes it. Q-06, FR-072.
