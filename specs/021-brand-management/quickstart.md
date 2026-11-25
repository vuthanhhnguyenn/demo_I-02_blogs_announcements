# Quickstart: Manual Verification — Brand Master Management (Y-07)

No automated tests exist in this project (Constitution "No Testing Policy"). Verify each gap fix manually against `dev`, logged in as the roles noted.

## G1 — Disable / delete fee entry no longer 500s

1. As Headquarter, open a brand detail page → 費用 tab.
2. Click "無効化" on an active fee card → confirm in the dialog.
   - **Expect**: success toast "費用マスタを無効化しました", card badge flips to 無効, its own 無効化 action becomes disabled. No error toast, no 500 in the network tab.
3. Click "削除" on a fee card → confirm in the dialog.
   - **Expect**: success toast "費用マスタを削除しました", card disappears from the list; if it was the last one, the empty state ("費用マスタが登録されていません") appears.

## G2 — Change history reflects real edits

1. Rename a brand from the list "編集" action, save.
2. Edit a fee item's price and/or effective date, save.
3. Disable a fee entry (per G1 above).
4. Open 変更履歴 tab.
   - **Expect**: one new row per changed field, in each case with `changed_by` matching the acting mock user, `changed_field`/`before_value`/`after_value` matching what was actually edited. The tab's count badge increases to match.

## G3 — Scheduled fee revisions are fully editable

1. Open a fee card's "変更" action.
2. Add a scheduled revision for a fee item with a future date and an amount → save.
   - **Expect**: sheet closes, the fee card now lists the revision under "予約中の改定" with the date, amount, and "登録: {today} / {actor}".
3. Re-open edit, add a second revision on the **same** fee item with an effective date that duplicates an existing revision (or the item's current effective date) → attempt save.
   - **Expect**: validation message on that row, save blocked.
4. Add a revision with a past effective date.
   - **Expect**: non-blocking warning shown ("過去の日付が指定されています..."), save still succeeds.
5. Delete a scheduled revision row, save.
   - **Expect**: it no longer appears on the fee card.

## G4 — Brand-list create-brand flow removed

1. As Headquarter, open the brand list page header.
   - **Expect**: no "新規登録" button present (only the search toolbar and the existing rows' 編集 action).

## G5 — Detail-page "基本情報を編集" disabled

1. Open a brand detail page → 基本情報 tab, as Headquarter.
   - **Expect**: "基本情報を編集" button is present but disabled; hovering shows tooltip "ブランド基本情報の編集は次フェーズで実装予定です".

## G6 — Fee tab "新規登録" always disabled with tooltip

1. Open 費用 tab on a brand that has at least one fee entry, as Headquarter.
   - **Expect**: "新規登録" button is disabled (not just when the tab is empty); hovering shows tooltip "費用マスタの新規登録は次フェーズで実装予定です".

## Role-based spot checks (regression — permission matrix, already verified against Y-07.md)

- As Trainer or Observer, navigate directly to `/brands/<code>` → redirected to `/403`.
- As Manager or Staff, open a brand detail page → all data visible, zero enabled edit/disable/delete controls anywhere on the page.
- As Headquarter/System, confirm all edit/disable/delete controls above remain functional after the G1-G6 changes (no regression).
