# Quickstart: Manual Verification — Member Form Management (020-member-form)

> Constitution: No Testing Policy — this checklist is the QA gate, together with
> `checklists/parity.md` (79 items) which `/speckit.implement` must fully tick.

## Setup

```bash
npm run dev          # http://localhost:3000
npm test && npm run lint   # tsc --noEmit + eslint must pass
```

Sign in as **Headquarter** (mock auth). Pick any active member from 会員管理.

## 1. Happy path (US1)

1. 会員管理 list → row menu ⋮ → 編集 → lands on `/members/{id}/edit`.
2. Header shows BackLink 「会員管理に戻る」 + title 「会員情報を編集」; exactly **one** card 「個人情報」 with 10 inputs in spec order, all pre-filled.
3. Change 電話番号 → 保存する → toast 「会員情報を更新しました」 → lands on **member detail**, new value visible.
4. Re-open the form → new value persisted. 性別=回答しない saves and reloads as 回答しない (not その他).

## 2. Validation (US2)

1. Clear 氏名（姓）, 生年月日, メールアドレス → 保存する.
   生年月日 under the brand minimum (JOYFIT 15 / FIT365 16, e.g. 2020/04/23) → 「{n}歳未満の方はご利用できません」 under 生年月日, nothing sent (FR-016b).
2. No navigation; three inline messages (verbatim per FR-016); footer left shows 「未入力の項目があります」; viewport scrolls to 氏名（姓）.
3. Type into 氏名（姓） → only that message clears; footer summary stays.
4. Whitespace-only in 電話番号 still counts as blank.
5. 郵便番号=`abc` → 「郵便番号の形式が正しくありません」; 郵便番号 / 都道府県 / 市町村・番地 blank → their own blank messages (FR-016). 建物名 blank → no message and the save succeeds; clearing a stored 建物名 sends `building: null` (optional again since 2026-11-23, Bug-No1 — was required from 2026-10-08).
6. Fill everything → 保存する → success.

## 3. Unsaved-changes guard (US3)

1. Edit a field → キャンセル → dialog 「変更を破棄しますか？」 with 「編集を続ける」/「破棄する」.
2. 編集を続ける → stay, edits intact. キャンセル → 破棄する → navigate to the edited member's **detail** screen (FR-003 / FR-025).
3. Same via BackLink. Reload tab while dirty → native browser prompt.
4. No edits → キャンセル / BackLink navigate immediately, no dialog.
5. After a successful save → no dialog on the post-save navigation.

## 4. Guards (US4)

1. As **Staff/Manager/Observer**: no 編集 in list row menu or detail header; direct URL `/members/{id}/edit` → permission-denied state, no form.
2. As HQ, member with status 退会済み: detail header hides 編集; direct URL → 「退会済みの会員は編集できません」 block + return-to-detail.

## 5. Load / save failures

1. Non-existent id `/members/zzz/edit` → shared error state with retry.
2. Simulate PATCH failure (devtools offline) → error toast 「会員情報の更新に失敗しました」, form stays, values intact, dirty preserved.

## 6. Non-regression

1. Member detail 変更履歴 tab still renders **seeded** rows only; saving the form adds no new history row.
2. Member detail head-up reflects edited values without manual refresh (query invalidation).
3. Attributes not on the form (緊急連絡先, 備考, 入会日, 会員写真, contracts, store) are unchanged after a save.
4. `npm test && npm run lint` pass; no new npm dependencies in `package.json`.

## Done =

All 6 sections pass **and** every unchecked item in [checklists/parity.md](./checklists/parity.md) is ticked against the running screen.
