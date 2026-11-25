# Test Plan: Member Detail (会員詳細)

**Feature spec**: [spec.md](../spec.md) (umbrella, FR-001 – FR-030; FR-026 – FR-030 アプリ連携 added 2026-11-13) — detailed rules in the two sub-specs
[header-actions/spec.md](../header-actions/spec.md) (header surfaces, FR-001 – FR-026) and
[tabs/spec.md](../tabs/spec.md) (the 10 tabs, FR-001 – FR-047 + FR-009-a…d, UH-1…UH-6).
**PO Spec**: `A-01` v260901_v6 — 会員管理, detail sections `A-01-01`, `A-01-01-a` … `A-01-01-i`
(`fitness-spec@a5abfdb`). Cross-document: `A-03 FR-002` (退会取り消し), `D-01 FR-010` (予約ペナルティ),
`G-04 FR-004` (アンケート回答), `C-01 FR-M008` (入会取り消し endpoint).
**Prototype**: `fitness-crm-ui@0a73739` (2026-09-17) — `src/pages/member-detail.tsx` (5,820 L).
**Route**: `/members/{memberId}` (active tab in `?tab=`)
**Created**: 2026-07-28 · **Rewritten**: 2026-09-23 (phase 2 — real API; umbrella FRs renumbered on the
same day, so every FR id in the 2026-07-28 plan is obsolete).
**Integration round**: **Round 2, mixed.** Every read (GET detail + all 10 tabs) and every header mutation
runs against the real dev backend (`NEXT_PUBLIC_REAL_API_URL = https://api.dev.fitness-v2.okamoto-hd.com`).
**Two mutations are still on mock**: オプション追加 (N40) and オプション変更 (N16) — see §6 B5/B6.
There is no `integration-plan.md` for this feature; the register of open gaps is
[api-integration-output/member-detail/report.md](../../../api-integration-output/member-detail/report.md)
(last updated 2026-09-23). **入会取り消し (header FR-026) has never been verified against the live API** —
it is not in the report yet; this run is its first verification.
**Unit 11 (アプリ連携, added 2026-11-13)** runs on a **local** backend instead — see §8 "Unit 11 environment".
**Ladyroom slice** (added 2026-11-19): E-02 FR-016 / G-01 FR-M002 / G-02 FR-002 — a 主契約 or オプション whose areas carry a 性別の条件 is sold / granted only to matching members. On this screen that gates the candidates of 主契約変更, オプション追加 and オプション変更 (prototype `fitness-crm-ui@9428dc2` `member-detail.tsx`). Its cases go into the Unit 4 doc, tagged `[Ladyroom]`. The cross-feature run — order, `QA-E02-AREA-*` fixtures, pre-flight gaps AREA-BE / AREA-MOCK — is owned by the [029 test plan](../../029-equipment-management/tests/test-plan.md) §7e–§9.
**Consumed by**: `gen-testcases` → `execute-testcases`

---

## 1. Scope

**In scope** — the member **detail** screen `A-01-01` and every surface that exists only inside it:

- Page shell: back link / 3-level breadcrumb, page title, loading and error states, tab bar with `?tab=` sync.
- Head-up card (A-01-01-a): identity lines, status badge (incl. the pending-application label), the
  4-item summary strip (アプリ連携 added — FR-026), and the four banners (gate-stop, blacklist [HQ/System only], reservation penalty,
  pending application).
- Header clusters: 編集 button (gate only), ステータス変更 menu, 会員操作 (…) menu, withdrawn-member header.
- Header surfaces (11 active): 休会申請, 退会申請, 移籍申請, 休会解除, 退会取り消し, 入会取り消し,
  ゲートストップ設定, ゲートストップ解除, 予約ペナルティ解除, ブラックリスト登録, 個人情報削除 — each with
  its confirm dialog, and the shared always-on 代理申請 block.
- All 10 tabs, including the tab-owned writes: 動作確認用アカウント toggle (基本情報), 主契約変更 /
  個別会費調整 / オプション追加・変更・解約 (契約操作), ポイント手動返還 (紹介関係).
- **Absence checks** for surfaces removed by decision: 強制退会 (qa-223), 再入会 (2026-09-18),
  入退館設定 card (qa-121), 移籍申請中 banner 取り消す (prototype-gap-list #8).

**Out of scope** (navigation targets / separate specs — a case may confirm the link or menu item fires, never
the destination):

- Member **list** `A-01` — [019-member-list](../../019-member-list). Only the back-link / breadcrumb intent.
- Member **edit form** — [020-member-form](../../020-member-form). Only the 編集 button's role / withdrawn
  gate and that it opens the right member's form. The 変更履歴 record an edit produces is verified there.
- ブラックリスト一覧 / 詳細 ([025-blacklist-management](../../025-blacklist-management)) — only
  registration from this screen; the banner's 「ブラックリスト詳細」 link intent.
- A-02 移籍 / A-03 休会・退会 approval lists ([024-leave-withdrawal-management](../../024-leave-withdrawal-management),
  transfer-management) — this screen only files the application; the 休会・退会履歴 strip link intent only.
- C-01 enrollment (re-enrollment lives there), アンケート回答 detail screen (FR-034 link intent only),
  臨時休会 (`A-01 FR-022`), 主契約一括変更 (`A-01 FR-020`), master screens G-01/G-02/G-03 (pickers are
  preconditions), the shared header store-scope selector.
- 強制退会 **batch** (`A-01 FR-016`) — server job; only the absence of a manual control is testable here.
- 称号 area (real endpoint exists, no prototype place — report "Chưa gắn vào tab nào"). ~~連携解除~~ — now in
  scope as part of アプリ連携 (Unit 11, A-01 FR-027).
- `?sheet=` deep-link parameters (prototype test hook, header-actions Out of Scope), 測定履歴 full-list paging
  (on hold, PO 2026-09-16), 1DayPass purchase creation, entry/exit export.

---

## 2. Unit table

**Split rationale.** One route, but the PO spec decomposes it into L3 sub-screens (A-01-01-a … i), each tab
has its own data sources, filters and empty states, and the header carries 11 surfaces. One TC doc for all of
it would be unrunnable. Each tab is its own unit, with these deliberate clusters:

- **Shell + head-up + banners + 基本情報** — A-01 FR-004 defines the head-up and the basic-info fields as one
  display contract, and the shell has no meaning without a rendered tab. The 動作確認用アカウント dialog
  exists only inside 基本情報.
- **The header is split in two** (it was one unit in the 2026-07-28 plan). _ステータス変更_ (applications and
  their reversals — reversible or cleanable on shared data) and _会員操作・制限解除_ (gate stop, penalty,
  blacklist, PII deletion — two of which are **irreversible on the real backend**). Splitting keeps the
  irreversible cases in one doc that runs last under an explicit go-ahead (§8).
- **トレーニング記録 + アンケート回答** — two small read-only lists, no write path.
- **アプリ連携 is its own unit (11)** — one head-up item plus one sheet with four writes and their confirm
  dialogs, added after Units 1–10 were executed; it runs on a local backend (§8) so it cannot share their runs.
- **紹介関係 + 変更履歴** — 変更履歴 is the audit sink for every write in Units 1–4 and the manual refund on
  紹介関係 is one of those writes; running them together lets the refund's own record be checked in place.

| #   | Unit                              | Screen(s)                                                                                                                                                                   | Route                                            | TC doc filename                                                         |
| --- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| 1   | Shell + head-up + 基本情報        | A-01-01 shell, A-01-01-a head-up + summary strip + 4 banners, 編集 gate, 基本情報タブ + 動作確認用アカウント confirm dialog                                                 | `/members/{id}` (no `tab`)                       | `TC -【Fitness CRM】- [A-01-01][会員詳細（ヘッドアップ・基本情報）].md` |
| 2   | ステータス変更                    | A-01-01-b ステータス変更 menu + 休会申請 / 退会申請 / 移籍申請 / 休会解除 / 退会取り消し / 入会取り消し + 代理申請 + pending banner 取り消す                                | `/members/{id}` (header)                         | `TC -【Fitness CRM】- [A-01-01-b][ステータス変更].md`                   |
| 3   | 会員操作・制限解除                | A-01-01-b 会員操作 (…) menu + ゲートストップ設定 / 解除 + 予約ペナルティ解除 + ブラックリスト登録 + 個人情報削除 + withdrawn header                                         | `/members/{id}` (header, banners, 基本情報 card) | `TC -【Fitness CRM】- [A-01-01-b][会員操作・制限解除].md`               |
| 4   | 契約操作                          | A-01-01-c 主契約, 個別会費調整, オプション契約, キャンペーン適用, 1DayPass購入履歴, 契約サマリー, 休会・退会履歴 + 5 sheets                                                 | `/members/{id}?tab=contracts`                    | `TC -【Fitness CRM】- [A-01-01-c][契約操作].md`                         |
| 5   | 支払い履歴                        | A-01-01-d 入出金明細, 請求一覧, 支払いサマリー                                                                                                                              | `/members/{id}?tab=payment`                      | `TC -【Fitness CRM】- [A-01-01-d][支払い履歴].md`                       |
| 6   | 利用履歴                          | A-01-01-e 入退館履歴, レッスン予約履歴, オプション利用履歴, 利用状況                                                                                                        | `/members/{id}?tab=usage`                        | `TC -【Fitness CRM】- [A-01-01-e][利用履歴].md`                         |
| 7   | ポイント履歴                      | A-01-01-f {ポイント名}履歴 + ポイントサマリー                                                                                                                               | `/members/{id}?tab=points`                       | `TC -【Fitness CRM】- [A-01-01-f][ポイント履歴].md`                     |
| 8   | トレーニング記録 + アンケート回答 | A-01-01-g トレーニング記録 + 記録サマリー; アンケート回答履歴                                                                                                               | `?tab=training` / `?tab=survey`                  | `TC -【Fitness CRM】- [A-01-01-g][トレーニング記録・アンケート回答].md` |
| 9   | ボディーデータ                    | A-01-01-h consent gate, 最新記録サマリー, 体組成データ, 身体データ, 推移グラフ, 測定履歴 + full-history sheet                                                               | `/members/{id}?tab=body-data`                    | `TC -【Fitness CRM】- [A-01-01-h][ボディーデータ].md`                   |
| 10  | 紹介関係 + 変更履歴               | A-01-01-i 紹介経由 banner, 紹介者情報, 招待実績, 紹介サマリー, ポイント手動返還 dialog; 変更履歴 table                                                                      | `?tab=referral` / `?tab=history`                 | `TC -【Fitness CRM】- [A-01-01-i][紹介関係・変更履歴].md`               |
| 11  | アプリ連携                        | A-01-01-a summary-strip item アプリ連携 + アプリ連携 sheet (今の状態, 行う操作, アカウント探し, 本人確認) + 3 confirm dialogs (紐付け / 紐付け直し / 連携解除) + ロック解除 | `/members/{id}` (head-up)                        | `TC -【Fitness CRM】- [A-01-01-a][アプリ連携].md`                       |

All TC docs live under `specs/032-member-detail/tests/cases/`.

**State of the existing docs.** Units 1 and 5 already have docs, but both were **executed 2026-07-28/29 on the
mock** (members `M-000xx`, the old FR-001 – FR-015 numbering, prototype `426a9b3` line numbers, the removed
入退館設定 card, 再入会, 4-channel 通知受信設定). They must be **re-authored** from this plan, not re-run: keep
TC ids and bug ids (e.g. `BUG-P02`, page size) where the case survives, drop obsolete cases with a note. Units
2–4 and 6–10 have no doc yet. Unit 11 was added 2026-11-13; its doc was authored and **executed 2026-11-13** on the local backend
(Yamauchi off): 92 cases — first run 81 OK / 3 NG / 8 Block; after the fixes of BUG-U11-02 / BUG-U11-03 and
the local `can_view_member` grant, **re-test 2026-11-13: 90 OK / 0 NG / 2 Block** (B11, B12 — Yamauchi-off
mode); see the doc's Execution summary.

---

## 3. Sources per unit

Read **only** the listed slice. `A-01.md` = `.cache/fitness-spec/crm/requirements/A-01.md` @ `a5abfdb`;
`proto` = `.cache/fitness-crm-ui/src/pages/member-detail.tsx` @ `0a73739`; `PAR` = [checklists/parity.md](../checklists/parity.md).

| Unit | Spec sections                                                                                                                                                                                                                                                                                                                                                | UI prototype (proto lines)                                                                                                                                                                                                                | Parity                                           | FRs covered                                                                                   |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| 1    | spec.md US1, US2 AC-1/AC-4, US4 AC-3/AC-4, Edge Cases (breadcrumb, scope, BL viewer), FR-001 – FR-009, FR-021, FR-024, FR-025; tabs FR-001 – FR-011a, US1, Edge Cases; header-actions FR-004 (編集 row). A-01.md FR-002 (L220-232), FR-003 (L349-361), FR-004 (L364-376), FR-025 (L233-245), 前提条件 (L182-191), 権限マトリクス + データスコープ (L563-590) | `MemberDetail` shell L3346-4085: PageHeader + breadcrumb L3580-3609, banners L3820-3900, head-up card L3901-4000, tab bar L4001-4015; `BasicInfoTab` L1015-1364 (動作確認用アカウント dialog L1232); `NOTIFICATION_RECEIVE_SETTINGS` L843 | PAR001-021, PAR044-111                           | umbrella FR-001–009, 021, 024, 025 · tabs FR-001–011a · header FR-004 (編集)                  |
| 2    | spec.md US3, Edge Cases (before start date, gate-stopped), FR-007 (取り消す), FR-017 – FR-020; header-actions US1, US3 AC-5/AC-8, Edge Cases, FR-001/002/004/005/006/008–016/020/026. A-01.md FR-005 (L379-390), FR-026 (L391-405), FR-017 (L290-300), 制限事項 (L193-200), 退会フロー (L549-560); A-03 FR-002                                               | ステータス変更 menu L3610-3766; `ProxyApplicationSection` L973-1014; 休会 L4087-4278; 退会 L4279-4416; 移籍 L4417-4555; 休会解除 L5086-5160; 入会取り消し L5744-5800; 退会取り消し L5801-5820                                             | PAR022-035, PAR307-358, PAR403-408, PAR454-461   | umbrella FR-007, 017–020 · header FR-001, 002, 004–016, 020, 026                              |
| 3    | spec.md US4 AC-1/AC-2, Edge Cases (withdrawn), FR-005 (解除 action), FR-006, FR-022, FR-023; header-actions US2, US3 AC-1/2/4/6/7, FR-001, 003, 004, 006–012, 017–019, 021–024; tabs FR-011 (card 「解除...」). A-01.md FR-014 (L246-261), FR-015 (L262-275), FR-016 (L276-289), FR-018 (L301-311); D-01 FR-010                                              | 会員操作 menu L3767-3819; GS解除 L4556-4696; ペナルティ解除 L4697-4845; GS設定 L5161-5328; 強制退会 L5518-5582 (**absence only**); 個人情報削除 L5583-5670; ブラックリスト登録 L5671-5743                                                 | PAR036-043, PAR359-381, PAR409-419, PAR435-453   | umbrella FR-005 (release), 006, 022, 023 · header FR-001, 003, 004, 006–012, 017–019, 021–024 |
| 4    | spec.md FR-010; tabs US2, Edge Cases (fee adjustment past, withdrawn), FR-003–006, FR-012 – FR-020 (+013a, 015a); header-actions FR-005 (代理申請 rule). A-01.md FR-006 (L408-422), FR-007 (L423-433), FR-008 (L434-442), FR-019 (L312-319), 制限事項, 権限マトリクス 主契約変更 / オプション操作                                                            | `ContractTab` L1365-1898 (個別会費調整 sheet L1546); 主契約変更 L4846-4948; オプション追加 L4949-5085; オプション変更 L5329-5406; オプション解約 L5407-5517                                                                               | PAR112-158, PAR382-402, PAR420-434 (+PAR307-310) | umbrella FR-010 · tabs FR-003–006, 012–020, 013a, 015a                                        |
| 5    | spec.md FR-011, US2 AC-3; tabs FR-003–006, FR-021 – FR-024, §Tab 3 detail rules (FR-009-a…d, empty/error, page size, constraints, conflicts table). A-01.md FR-009 (L445-454), 前提条件 (option-only store sees billing only)                                                                                                                                | `PaymentTab` L2087-2273                                                                                                                                                                                                                   | PAR180-205                                       | umbrella FR-011 · tabs FR-021–024, FR-009-a…d                                                 |
| 6    | spec.md FR-012; tabs FR-003–006, FR-025 – FR-029, §Tab 4 detail rules (UH-1…UH-6, 認証方法 vocabulary, permissions). A-01.md FR-010 (L457-466). report §"Định nghĩa 来館回数" (FE-decided counting rules)                                                                                                                                                    | `UsageTab` L1899-2086 (the unused `onGateStopRelease` hook is dead code — tabs P-10)                                                                                                                                                      | PAR159-179                                       | umbrella FR-012 · tabs FR-025–029, UH-1…6                                                     |
| 7    | spec.md FR-013; tabs FR-003–006, FR-030 – FR-032 (incl. FR-030-a), Edge Case (balance with empty month). A-01.md FR-011 (L469-483)                                                                                                                                                                                                                           | `PointHistoryTab` L2274-2473                                                                                                                                                                                                              | PAR206-225                                       | umbrella FR-013 · tabs FR-030–032                                                             |
| 8    | spec.md FR-014 (survey + training halves); tabs FR-003–006, FR-033 – FR-037. A-01.md FR-012 (L486-498); G-04 FR-004                                                                                                                                                                                                                                          | `SurveyResponseHistoryTab` L2474-2511; `TrainingRecordTab` L2512-2630                                                                                                                                                                     | PAR226-244                                       | umbrella FR-014 (part) · tabs FR-033–037                                                      |
| 9    | spec.md FR-015, US2 AC-2, Edge Case (consent-gated), SC-004; tabs US3, Edge Case (consent revoked), FR-038 – FR-041. A-01.md FR-013 (L501-517)                                                                                                                                                                                                               | `BodyDataTab` L2631-3058 (full-history sheet L2971)                                                                                                                                                                                       | PAR245-273                                       | umbrella FR-015 · tabs FR-038–041                                                             |
| 10   | spec.md US5, FR-014 (referral half), FR-016, SC-005; tabs US4, FR-042 – FR-047; header-actions FR-025. A-01.md FR-S001 (L520-532), FR-003 変更履歴タブ (L349-361), FR-025 (audit line L241)                                                                                                                                                                  | `ReferralTab` L3059-3284 (refund dialog L3223); `HistoryTab` L3285-3345                                                                                                                                                                   | PAR274-306                                       | umbrella FR-014 (part), 016 · tabs FR-042–047, 044a · header FR-025                           |
| 11   | spec.md US6, Edge Cases (app link ×3), Amendment 2026-11-13 (L1 – L5), FR-004, FR-016, FR-025, FR-026 – FR-030, SC-005. `A-01.md` @ `origin/main` `f05f639` (v17): FR-027 (`## FR-027`), 権限 「アプリ連携（FR-027）の権限」; `APP-F-02.md` FR-M006, FR-M009, flow ④                                                                                         | prototype `fitness-crm-ui@9428dc2`: `src/components/member-app-link.tsx` (whole file), `src/data/app-link.ts`, `src/pages/member-detail.tsx` (summary item ~L4209, sheet ~L4820)                                                          | — (parity rows not yet written for FR-027)       | umbrella FR-026 – FR-030, FR-004 (4th item), FR-016 / SC-005 (app-link rows)                  |

Every unit also reads: [prototype-gap-list.md](../../../api-integration-output/prototype-gap-list.md) (deliberate
deviations — never report them) and the unit's rows in §6 of this plan. `report.md` is **not an oracle** —
consult it only through §6.

**Parity checklist.** `checklists/parity.md` (PAR001–PAR461, 0 ticked) is the element inventory `gen-testcases`
walks. Before authoring, reconcile these rows, which cannot be ticked against real data as written:

- PAR003 (unknown `memberId` falls back to M-00001), PAR007, PAR008 (sample-member coverage) — prototype sample
  behaviour; the spec requires an error state for an unknown member (tabs FR-004, Edge Cases).
- PAR006 (`?sheet=` deep links) — out of scope (header-actions Out of Scope).
- PAR039, PAR435–440 (強制退会), PAR307 (proxy switch), PAR131, PAR429, PAR257, PAR054, PAR024, PAR456 — the
  file's own "known deviations" list; each becomes an **absence/deviation assertion**, not a parity tick.

**Ladyroom slice sources** (Unit 4, tag `[Ladyroom]`): **E-02.md** (`261109_v6`) FR-016 (4th bullet: sale / grant limited to matching members, A-01・C-01), FR-008 エリア判定 2nd bullet (who matches 女性のみ / 男性のみ), 関連機能 A-01; **G-01.md** FR-M002 「利用できるエリア」, **G-02.md** FR-002 「利用できるエリア」; **A-01.md** (`261112_v19`) FR-006 / FR-007 for the surrounding flow only. **API**: `StorePlanDto.genderCondition`, `StoreOptionDto.genderCondition` (candidates leave out what the member's gender does not meet), 422 `E-ARE-003` on a mismatched change / add. **Prototype** `@9428dc2`: `member-detail.tsx` (主契約変更 / オプション追加 / オプション変更 sheets), `data/facility-areas.ts` (`canSellToGender`).

---

## 4. Spec-vs-prototype deltas

`gen-testcases` MUST mark each row in the affected case's Notes. "Spec wins" rows are asserted to the spec;
the prototype behaviour is never reported as a bug.

| #   | Item                                    | In spec                                                                                                                                                    | In prototype (`0a73739`)                                                                      | How to test                                                                                                                                                                                                                                                               |
| --- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | 強制退会                                | Not offered (umbrella FR-022, header A1; qa-223)                                                                                                           | Menu item + dialog (L5518)                                                                    | **Conflict, settled** (gap-list #2). U3: assert absent from 会員操作 for every role/status.                                                                                                                                                                               |
| D2  | 代理申請 switch                         | Always on — 合意日時 + 合意方法 required, no switch (header FR-005, tabs T5)                                                                               | Switch 「スタッフが代理申請する」, default OFF (L973-1012)                                    | **Conflict, settled** (gap-list #10). U2 + U4: assert no switch, both fields required on all 7 application sheets.                                                                                                                                                        |
| D3  | 個別会費調整 代理申請                   | None (tabs FR-014, T5)                                                                                                                                     | ProxyApplicationSection present, gates 追加する (L1608)                                       | **Conflict, still open** — gap-list #9, **qa-242 waiting on the client**. U4: assert the spec; if the client rules "yes" mid-run, record `Block (qa-242)`, not NG.                                                                                                        |
| D4  | オプション解約 timing label             | 即時解約 / 当月末で解約 (「翌月から利用不可」), sent `next_month` (tabs FR-017)                                                                            | 「翌月から解約」 + 「当月末まで利用・翌月分から契約なし」 (L5430-5455)                        | **Conflict, settled** (gap-list #5). U4.                                                                                                                                                                                                                                  |
| D5  | 推移グラフ metrics                      | Switchable over all 12 体組成 metrics (tabs FR-041, qa-240)                                                                                                | ToggleGroup, 3 metrics                                                                        | **Conflict, settled** (gap-list #7). U9: all 12 options.                                                                                                                                                                                                                  |
| D6  | Pending-banner 取り消す                 | umbrella FR-007: the banner offers 「取り消す」 — but header-actions Out of Scope: 移籍 has no cancel; 休会 pending cancel has no entry point (N21)        | One shared banner with 取り消す for all 5 application types, local state only                 | **Conflict inside the spec.** Plan per type: 退会申請中 → 取り消す opens 退会取り消し (FR-020); 移籍申請中 → **no** 取り消す (gap-list #8 — **not yet PO-approved**, see its row); 休会申請中 → case written to FR-007, result `Block (B4)`. Name for PO: FR-007 wording. |
| D7  | 入会取り消し placement                  | 有効 **and** 仮会員 before the usage start date (umbrella FR-017/019, header FR-002/026)                                                                   | Only under 有効 (L3610-3766)                                                                  | **Spec wins** (real data keeps approved members `provisional` until BAT-016). U2: both statuses. PAR024.                                                                                                                                                                  |
| D8  | 取消理由 cap (入会取り消し)             | Original A-01 FR-026: **no limit stated** (required only). Internal header FR-026 said 1000 — corrected to 500 on 2026-09-30                               | `maxLength={1000}` (L5771) — the prototype uses 1000 on many textareas; the API rejects > 500 | **Closed 2026-09-30 (PO answer).** API `cancelReason` maxLength = 500 wins; UI caps at 500 → `OK`. Test 500 / 501 and record.                                                                                                                                             |
| D9  | 退会取り消し disabled copy              | umbrella US3 AC-3 / FR-017: 「利用開始日（YYYY/MM/DD）以降のため取り消しできません」 · header FR-020: 「利用開始日以降のため取り消し不可」                 | `開始後` deny badge                                                                           | **Conflict inside the spec** (two strings). Assert the header FR-020 string (the detailed sub-spec, and what the server-code map uses — report §cancellationBlockedReason); note the umbrella wording for PO.                                                             |
| D10 | ポイントサマリー totals                 | Over the **selected month**, server `summary` (umbrella FR-013, tabs FR-032)                                                                               | Sums all months regardless of the filter                                                      | **Spec wins** (prototype bug). U7.                                                                                                                                                                                                                                        |
| D11 | ボディーデータ consent                  | Three states — granted / 未同意 / 拒否 (umbrella FR-015, tabs FR-038)                                                                                      | Three states                                                                                  | No UI conflict; the API cannot tell 拒否 from 未同意 → **B7**.                                                                                                                                                                                                            |
| D12 | ゲートストップ設定 patterns / reasons   | 3 settable patterns (常時入退館 = absence of a stop), 設定理由 迷惑行為 / 未納金 / 不正利用 / その他 (header FR-017)                                       | 3 radio cards (L5180-5215)                                                                    | No conflict; A-01 FR-014 lists 4 — the 4th is the release state. U3 asserts 3.                                                                                                                                                                                            |
| D13 | Loading / error / empty states          | Required per card, per tab (tabs FR-004–006, UH-6, §Tab 3 empty strings)                                                                                   | Static arrays; none                                                                           | **Spec-only.** Every tab unit judges against the spec strings; the prototype offers no reference rendering.                                                                                                                                                               |
| D14 | 支払い履歴 page size                    | 25 per page on both tables (project-wide `PAGE_SIZE`, tabs §Tab 3, decision 2026-09-29)                                                                    | No pagination                                                                                 | **Spec-only.** U5 (`BUG-P02` closed 2026-09-29 — the spec now says 25).                                                                                                                                                                                                   |
| D15 | 支払い履歴 option-only scope            | tabs FR-009-d: tab always usable for option-only members — vs `A-01` 前提条件: an option-only store sees **only billing data**                             | —                                                                                             | **Open conflict** (tabs conflicts table, "Confirm with PO"). U5: assert what renders for an option-only member under Staff; record `Block (D15)` if the two readings diverge on screen.                                                                                   |
| D16 | Open prototype gaps P-01 – P-03         | 次回請求日 promise (P-01), 1DayPass 状態 labels (P-02), キャンペーン period granularity (P-03) — **undecided** in tabs Gap Analysis                        | concrete date / 利用済み・期限切れ / month range                                              | **Open.** U4: record what renders with both readings in Notes; not NG either way until decided.                                                                                                                                                                           |
| D17 | 測定履歴 zero-record                    | Tab-level 「まだボディーデータの記録がありません」 (tabs P-07, deliberate)                                                                                 | Table stays mounted with an in-table empty row                                                | **Spec wins** (deliberate deviation, P-07 awaits PO confirmation). U9.                                                                                                                                                                                                    |
| D18 | Spec-only rules with no prototype check | 退会予定日 ≥ 7 days out (header FR-014, BR-WDR-001); 合意日時 not future (FR-005); 復帰月 ≥ current month (FR-016); 個人情報削除 typed-ID folding (FR-024) | Not enforced                                                                                  | **Spec-only.** Each rule gets boundary cases (U2/U3).                                                                                                                                                                                                                     |
| D19 | 通知受信設定 topic list                 | 10 fixed topics in definition order (tabs FR-011) — the spec lists 9 names and "…"                                                                         | `NOTIFICATION_RECEIVE_SETTINGS` (L843)                                                        | **Spec incomplete** — take the 10th topic name and the order from the prototype constant; note that the spec elides it.                                                                                                                                                   |

**Ladyroom slice deltas** (Unit 4, prototype `@9428dc2`):

| #   | Item                                                    | In spec                                                                                                                                                           | In prototype                                                                                                                                                                                                                                                                                     | How to test                                                                |
| --- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| LR1 | Gated candidates in 主契約変更 / オプション追加 / 変更  | E-02 FR-016, G-01 FR-M002, G-02 FR-002: 「条件に合う会員にだけ販売・付与」; A-01 itself silent                                                                    | Non-matching items **removed** from the candidates (not disabled). None left → select disabled, `変更できる主契約はありません` / `追加できるオプションはありません` / `変更できるオプションはありません`; 主契約変更 adds `会員の性別に合う変更先の主契約がありません。` and disables its submit | Spec intent from E-02; UI from the prototype. API backstop 422 `E-ARE-003` |
| LR2 | Who matches                                             | E-02 FR-008: only 女性 matches 女性のみ, only 男性 matches 男性のみ; その他 / 回答しない / 未設定 match neither; contradicting conditions (`nobody`) match no one | Same rule (`canSellToGender`)                                                                                                                                                                                                                                                                    | Full 性別 × condition matrix                                               |
| LR3 | Member already holding an item that later becomes gated | Silent                                                                                                                                                            | Silent                                                                                                                                                                                                                                                                                           | Observe and note only — never `NG`                                         |

---

## 5. Coverage focus per unit

Added to — never a replacement for — `gen-testcases`' full coverage walk (every field, state, control, empty /
loading / error state). Two blocks apply to **every** unit and are not repeated below:

_Real-API baseline (all units):_ each tab / surface under an **expired token** (`401 E-AUTH-002`) — must end in
re-authentication or an error state, never a blank card or a silent no-op; the unit's cards for a member
**outside the viewer's scope** (Manager / Staff / Observer) — a server `403`, surfaced as the error state, not a
half-rendered tab (umbrella FR-025); a malformed id (`/members/M-00001`) — error state (member-form saw `500
E-SYS-001` here, report it as observed); **persistence** — every observed value re-read after a full reload and
after a sign-out/sign-in; **real pagination totals** — page count equals `ceil(total / page size)` from the
server, last page partial, paging keeps previous rows (tabs FR-006).

_UI breakage under stress (all units, at **1024×768**, plus one ≥1440px pass):_ no page-level horizontal
overflow, no clipped or overlapping text, the two-column layout (tabs FR-003) collapsing as specified, sticky
right column still reachable. Unit-specific long values are listed per unit.

**Unit 1 — Shell + head-up + 基本情報**

- _Real API:_ head-up fields bound to the real bundle — 主契約店舗 = `currentMainContract.store.name` and 登録日
  = `registrationDate` (FE decision 2026-09-23, report); a member with `primaryStore` null but a contract store
  still shows 主契約店舗. Scope: Manager / Staff / Observer reach only in-scope members, Trainer has no access
  (umbrella FR-025). The blacklist banner is **not** in the DOM for Manager / Staff / Observer even on a
  blacklisted member (FR-006, Edge Case) — assert on the DOM, not only visually.
- _Computed values:_ age from 生年月日 (boundary: birthday today / tomorrow); 在籍期間; 今月来館回数 /
  累計来館回数 per the FE-decided rules (entry only, allowed only, calendar month, whole log — report
  §来館回数; not client-confirmed, note it); 未納額 amount vs 「なし」; 申請・調整 one badge per pending
  application **plus** 「個別会費調整中」, 「なし」 when neither; 直近のイベント 「最終来館 <date>」.
- _Status-dependent head-up:_ 「<month> まで休会」 for 休会中, 「退会予定日 <date>」 for 退会予定 (FR-003); the
  pending-application label replacing the status badge (FR-002) and reverting after the pending state ends.
- _Banner matrix (FR-005–007):_ each banner appears **only** in its state; stacking of all four at once; the
  gate-stop banner suppressed for 常時入退館 (header US2 AC-3); 「詳細を見る」 opens 変更履歴; penalty 「解除...」
  visible for Staff and above, not for Observer (tooltip 「ペナルティ解除の権限がありません」).
- _Tabs (tabs FR-001/002):_ exact order; `?tab=` added for non-default tabs, removed for 基本情報; reload restores;
  an unknown slug falls back to 基本情報.
- _基本情報 contract:_ 住所 composed as one line from postal code + prefecture **name** + street + building —
  member-form recorded this card rendering the JIS **code** (`27大阪市北区…`); re-check it here, it is this
  unit's defect if it still shows. 家族会員 exactly as returned (parent first, 本人 plain text, remaining-slot
  line hidden when null, no add control, 「家族会員の登録はありません」). 通知受信設定: 10 topics, `—` for
  never-changed, no operable control. ゲートストップ card: 「設定なし」 vs pattern / message / 設定者 / 設定日時 +
  「解除...」 role gate; the old 入退館設定 card **absent**.
- _動作確認用アカウント (FR-024, tabs FR-011a):_ HQ/System toggle → confirm dialog (both directions) → toast with
  「履歴を見る」 → 「最終更新: {date}（{user}が{設定/解除}）」; cancelling the dialog leaves the switch unchanged;
  Manager / Staff / Observer disabled + 「本部権限が必要です」 + 参照のみ; **server-side**: the same PATCH with a
  Manager / Staff token is rejected. The set/release rows land in 変更履歴 (Unit 10 checks the label — B10).
- _編集 gate (FR-021):_ HQ/System only; hidden for 退会済み; lands on the right member's form (no form cases).
- _Stress:_ 50-char full-width 姓+名 in the page title, breadcrumb (3-level, with an equally long parent
  name), head-up name line and kana; a 254-char e-mail; a 200-char street + 100-char building in 住所; four
  family rows with long names; all four banners + 3 badges in 申請・調整 at once; a long 主契約 plan name in
  the `主契約:` badge. Seed has no such values — create them on a test member through the member-form, then
  restore (see §8 data policy).

**Unit 2 — ステータス変更**

- _Status × menu matrix (umbrella FR-017, header FR-002):_ 有効 → 休会申請 / 退会申請 / 入会取り消し (only before
  the usage start date) / 移籍申請; 仮会員 (approved, start ahead) → 入会取り消し only; 休会中 → 休会解除 /
  退会申請; 退会予定 → 退会取り消し; gate-stopped → ゲートストップ解除 **added to** the status's own items;
  退会済み / 強制退会 → no ステータス変更 at all. Exactly these, nothing else. Also record what a
  `pending_suspended` member gets (nothing — **B4**).
- _Constraint blocks with inline reasons:_ 休会申請 + 移籍申請 disabled 「未納金があるため操作できません」 when
  unpaid; 移籍申請 「解約手数料期間中のため移籍できません」 for a **JOYFIT** member in the period, which wins over
  the unpaid reason — a **FIT365** member in the period is not blocked (header US1 AC-3, A-02 L48); a disabled item must not open its sheet; a blocked sheet reached anyway shows the destructive alert
  and a disabled submit (US1 AC-8).
- _Usage-start-date gates (real clock, JST):_ 退会申請 on a pre-start member shows the FR-018 guidance and
  「入会取り消しへ」, which closes the sheet and opens 入会取り消し; 退会取り消し enabled before, disabled on/after
  the start date on **both** entry points (menu + banner) with the D9 string; null start date = not arrived.
  The gate comes from the server's `pendingWithdrawal.cancellable` / `cancellationBlockedReason` — the three
  codes map to the three strings in report §cancellationBlockedReason.
- _代理申請 (header FR-005, D2, D18):_ no switch; 合意日時 and 合意方法 required; future timestamp rejected (no age limit); the server also rejects a missing proxy block (`applicationSource: proxy` only).
- _Two-step commit (FR-006):_ confirm dialog restates dates / stores / member; cancelling it keeps the input;
  double-click cannot submit twice (FR-010, SC-006).
- _Per sheet:_ 休会 month range + note + unpaid alert + 適用中の値引き確認 block and the Manager-only
  ポイント値引き返還 checkbox with 返還事由 and expected amount (FR-013); 退会予定日 ≥ 7 days + 「{date} 付で
  退会処理されます。」 + free-text 退会理由 sent as `memo`, always `normal` (FR-014); 移籍 read-only current store
  - destination from the store master + 3-step JOYFIT / 4-step FIT365 hint (FR-015, **B1**, **B2**); 休会解除
    read-only block + 復帰月 ≥ current month (FR-016) and the null-suspension case (known FE defect, §6 note);
    退会取り消し required 取り消し事由, status back to 有効, API `userMessage` on rejection (FR-020); 入会取り消し
    target block + required 取消理由 + cancel-reason cap (500) + toast 「入会を取り消しました」 / 「契約を無効化しました」 /
    「履歴を見る」 (FR-026).
- _Real API:_ server validation beyond the client (month order, 7-day rule, proxy timestamp window); error
  codes the unit can receive — `409 E-TRF-006` (移籍元 has no primary store — B1), `422 E-TRF-007`
  (JOYFIT in the cancellation-fee period), `404 E-STR-001` (non-operating destination store — B2), `409 E-SUS-215`
  (release of a not-yet-started suspension), `422 E-WDR-201` (退会取り消し after the start date), the C-01
  cancel rules (start date must be after today, **at most 2 same-day cancellations**), `400 E-VAL-001`; each
  must keep the sheet open with the input intact (header FR-009). **Concurrent application** (two tabs, same
  member, 休会 then 退会) — the second is rejected and the screen refetches to the new status (Edge Cases).
  **Server-enforced role:** the same POST with an Observer token is refused. **Persistence:** pending banner +
  badge + 申請・調整 badge survive reload and re-login; the application appears in A-03 / A-02 (link intent only).
  **Audit:** every submission leaves a 変更履歴 record naming operator and reason (SC-005 — B10 aside).
- _Stress:_ a 1000-char 退会理由 / 取り消し事由 / 取消理由 in the textarea and restated in the confirm dialog;
  a long store name in the 移籍 picker and the workflow hint; a 50-char member name in every 対象会員 block.

**Unit 3 — 会員操作・制限解除**

- _Menu (header FR-003):_ 「管理操作」 label + separator; ゲートストップ設定 hidden while a gate stop is active
  (decided by the gate-stop record, never the status); ブラックリスト登録 disabled with a reason when an active
  entry exists (`409 E-BL-200` ahead-of-prototype guard); 強制退会 absent (D1). Withdrawn header: only `⋯` →
  個人情報削除; 再入会 absent.
- _Role gates (header FR-004):_ GS設定/解除 HQ / System / Manager / Staff (Staff **own store only** — test a
  Staff on an in-store and an out-of-store gate-stop target); BL登録 + 個人情報削除 HQ/System only; ペナルティ
  解除 Staff and above, Observer tooltip. Each with a server-side check: the same call with a Manager token on
  `POST …/blacklist` and `POST …/anonymize` is refused.
- _ゲートストップ設定 (FR-017):_ 3 pattern cards with one-line explanations, 設定理由 required (4 values),
  端末メッセージ optional, `メッセージ確認後も入館不可にする` checkbox, immediate-effect warning, confirm dialog;
  no store-scope selector. After success: banner + 基本情報 card + menu change without reload (FR-008).
- _ゲートストップ解除 (FR-018):_ read-only current setting (`—` when absent), 解除理由 required (4 values),
  詳細 optional, release operator/date preview, acknowledgement checkbox gates the button, confirm dialog;
  reachable from the menu **and** the 基本情報 card. Re-set after release creates a new record (Edge Case).
- _予約ペナルティ解除 (FR-019):_ read-only penalty (適用日 / 予約不可期限 / 無断キャンセル回数 / 対象), 解除理由
  required, 詳細 optional, app-notification disclosure, checkbox, immediate effect (no pending state).
- _ブラックリスト登録 (FR-022):_ target block with 登録日 「本日（実行時に自動記録）」, 5 reasons (incl. 機器破損),
  sent as one-element `reasonCategories`, optional メモ, irreversibility warning; afterwards the HQ banner
  appears and 個人情報削除 becomes blocked.
- _個人情報削除 (FR-024):_ blocker alerts — BL only / unpaid only / both — each disabling the action; otherwise
  削除理由 ≤ 500 (「操作履歴に記録されます（500文字以内）」) and the typed member ID (trimmed, full-width folded,
  case-insensitive) enable 削除を実行; the request carries `confirmation: "ANONYMIZE"`; afterwards the
  head-up shows the dummy values.
- _Real API:_ `409 E-BL-200` on a second registration (two tabs); gate-stop set on an already-stopped member
  from a second tab; server rejection of `always_open` on the set endpoint (Edge Case); anonymize answers
  `201`, not the declared `200` (report, closed — assert the UI treats it as success); release surfaces for a
  member whose restriction vanished meanwhile show the "no information" placeholder (Edge Case). Audit rows
  for every operation (header FR-025).
- _Stress:_ a long 端末メッセージ in the set sheet, the banner and the release sheet's read-only block; a
  1000-char BL メモ; a 500-char 削除理由; a long member ID typed with full-width characters.

**Unit 4 — 契約操作**

- _主契約 (tabs FR-012/013/013a):_ プラン名 / 月額 / 適用開始日 / 利用開始日 / 状態 + 「個別会費調整 適用中」;
  while 休会中 「休会費（通常 {monthly}）」 / 「休会中（〜{end}）」; 変更 HQ/System only, others see
  「主契約の変更は本部のみ可能です」; the sheet excludes the current plan **by id**, shows before → after and the
  difference (price incl. tax), 翌月1日 note, 代理申請 required; submitting books a pending change shown
  read-only on the card; no cancel control; a second booking is accepted (13a amendment).
- _個別会費調整 (FR-014):_ rows 期間 / 調整後金額 / 事由 / 設定者 / 状態; 「あと{n}日」 only for 適用中 ending
  within 14 days (boundary 14 / 15 days; suppressed for 終了); add sheet HQ/System/Manager only (tooltip
  「本部・マネージャー権限が必要です」), all four fields required, 終了月 ≥ 開始月, **no** 代理申請 (D3); the
  head-up 「個別会費調整中」 badge appears after an active adjustment (cross-check Unit 1); 調整後金額 is
  **digits-only** (0–1,000,000): non-digits cannot be typed, a pasted non-integer is kept and flagged at once (never stripped), and no native browser bubble appears
  (TC-062, TC-189).
- _オプション契約 (FR-015–017):_ per-row 変更 / 解約; role gate on the dedicated 「オプション操作」 right —
  Manager and Staff **can**, Observer cannot (a disabled control with the reason, and the endpoint refuses);
  blocks with stated reasons for 休会中 (all three), 退会予定 (all three), cancellation-fee period, unpaid
  (add only, 「未納金があるため、追加費用が発生するオプション追加はできません」); add 今日から / 翌月から (B5),
  change from next month (B6), cancel 即時解約 / 当月末で解約 + optional reason (D4) — a real cancel with
  `next_month` returns `pending_cancel` with `endDate` = end of the **current** month.
- _キャンペーン適用 / 1DayPass / 契約サマリー (FR-018–020):_ active-first then newest; 全期間 / 適用中のみ /
  終了済みのみ; **no 適用予定 badge** (spec; a 適用予定 badge on screen is an FE `NG`); 1DayPass month scope +
  explicit 有効期限 (D16); 契約サマリー 未納金額 highlighted when non-zero; 休会・退会履歴 strip + empty state.
- _Real API:_ server rejection of a start date outside today / next-month-1st (`422 E-OPT-007`); unpaid /
  status blocks enforced server-side when the UI gate is bypassed; persistence of every write after reload;
  audit rows in 変更履歴 for plan change and option cancel (the option_contract / plan_change sources were
  "TODO upstream" once — record what shows).
- _Stress:_ long plan / option / campaign names in rows, sheets and the `主契約:` badge; many option rows; a
  7-digit amount with ¥ + thousands separators in 月額 / 月額合計; 2 active adjustments with badges.
- _Ladyroom slice (tag `[Ladyroom]`, LR1–LR3 in §4; fixtures from the 029 plan §8):_
  - **Candidate matrix** — for members whose 性別 is 女性 / 男性 / その他 / 回答しない / 未設定, open
    主契約変更, オプション追加 and オプション変更 and leave with キャンセル: 女性 → `QA-E02-AREA-PLAN-F` and
    `-N` offered, `-M` and `-NOBODY` absent; 男性 → `-M` and `-N`; the other three → `-N` only. Same matrix for
    `QA-E02-AREA-OPT-*` (switched 有効 for this step only). G-01 性別制限 alone (no area) gates the same way.
    Removed items are **absent**, not disabled.
  - **None left** → select disabled with `変更できる主契約はありません` / `追加できるオプションはありません` /
    `変更できるオプションはありません`; 主契約変更 also shows `会員の性別に合う変更先の主契約がありません。` and its
    submit is disabled.
  - **Live change** — after 029 Unit G flips an area's 性別の条件, reload: the candidates follow (029 step 13).
  - **API backstop** — a replayed 主契約変更 / オプション追加 with a non-matching item → 422 `E-ARE-003`, nothing
    saved, the error shown — throw-away member only.
  - **Happy path** — a 女性 throw-away member changes to `-PLAN-F` / adds `-OPT-F` (irreversible class, §8);
    a member that cannot reach the needed state → `Block (fixture)`; option add / change submits stay
    `Block (B5|B6)` while those mutations are mock.
  - **Stress** — long QA 主契約 / オプション names in the three selects at 1024px.

**Unit 5 — 支払い履歴**

- 入出金明細: newest first; `¥9,900` vs `-¥2,200` in the destructive colour; 種別 badge variants; period
  (全期間 / 今月 / 先月 / 過去3ヶ月 / 過去6ヶ月 / 期間指定 + date-range picker, tabs Amendment T12, 2026-10-14) × type
  (全種別 / 売上 / 返金) with AND; filter change resets to
  page 1 and keeps rows dimmed (FR-021, FR-024, FR-009-a).
- 請求一覧: all five statuses as **one** server-derived badge with the PO colours (入金済み success / 確定 info /
  未確定 warning / 未回収 + 貸倒 destructive); 月次 default vs 都度 outline (FR-022, FR-009-b).
- 支払いサマリー: title names the selected period; 売上合計 / 返金合計 / 差引合計 / 最終入金日 / 決済方法 from the
  server `summary` — **not** summed from the visible page; unpaid > 0 highlighted (FR-023, FR-009-c).
- Real API: 25 rows per page with server totals (D14); a member with > 25 rows in each table for
  real page 2; empty strings 「入出金履歴はありません」 / 「請求履歴はありません」 / 「該当する履歴はありません」;
  another brand's billing never shown; option-only member under Staff (D15); payment methods from data.
- Stress: 7-digit amounts, long 内容 text, long payment-method labels, at 1024px.

**Unit 6 — 利用履歴**

- 入退館履歴: date-range picker (default current month, max 12 months) + store select (全店舗 default, server search), both not in the URL (tabs Amendment T11, 2026-10-14), 日時 / 店舗 / 種別 (入館 info + icon, 退館
  default + icon) / 認証方法 with the exact vocabulary (QRコード / ICカード / 顔認証 / 手動解錠 — B-01's 「NFC
  カード」 difference is open, note it); an in-progress visit shows only its 入館 row; 25 per page (no PO
  decision — note).
- レッスン予約履歴: 受講済み / キャンセル / 予約中 / 欠席 labels (FR-026); オプション利用履歴 `{count}回`
  right-aligned (UH-3).
- 利用状況: server `usage-summary` (N23, done 2026-09-23) — 今月来館回数 + delta (hidden at 0, success /
  destructive colours), よく利用する時間帯 / 店舗 hidden when absent, レッスン予約数 + delta, オプション利用数 +
  breakdown; a missing metric omitted, never 0 (FR-028, UH-4).
- Month picker stays usable in the error state (UH-1, FR-005); one failing card never blanks the tab (UH-6);
  no entry/exit editing (FR-029).
- Stress: long store and lesson names, many option breakdown rows.

**Unit 7 — ポイント履歴**

- Card title from the brand: ENJOYポイント履歴 (JOYFIT) / ベアレージポイント履歴 (FIT365) — test one member of
  each brand (FR-031).
- Unified table: 種別 derived from the sign, `+n pt` / `-n pt` coloured; 日付 and 種別 sort both ways with the
  indicator and tooltip; period filter — 月次 month picker and 期間指定 date range (FR-030-a, `A-01 FR-011`) — with 「この月のデータはありません。」 / 「この期間のデータはありません。」 (FR-030).
- ポイントサマリー: 残高, 期間内獲得合計 / 期間内消費合計 from the server `summary` for the **selected month or range**
  (D10), 失効予定 + date from `summary.expiringPoints` / `expiringAt` (hidden when the brand has none); balance
  still renders on an empty month (Edge Case); read-only.
- Cross-check: a manual refund made in Unit 10 appears here as a 獲得 row and moves 残高.
- Stress: 7-digit balances, long 事由 text.

**Unit 8 — トレーニング記録 + アンケート回答**

- トレーニング記録: newest first; 全期間 / 今月 / 過去3ヶ月 / 過去1年; 記録サマリー names the period, 実施回数 /
  合計時間 / 合計消費カロリー / 最多ルーティン from the server (not summed from the page); empty
  「この期間にトレーニング記録がありません」; source failure → retry (FR-035–037).
- アンケート回答: one member-scoped list (network: a single request, no per-questionnaire fan-out — FR-033),
  newest first, 種別 badge ライフサイクル / オペレーション, response timestamp; selecting navigates to the detail
  (intent only); 「回答なし」.
- Read-only: no create / edit / delete on either tab.
- Stress: long routine and survey names, many response cards.

**Unit 9 — ボディーデータ**

- Consent gate (FR-038, SC-004): granted → content; 未同意 → Lock 「この会員はCRMへのボディデータ連携に同意して
  いません。」 **and no body-data request in the network log**; 拒否 → 「会員が情報連携を拒否しています」 /
  「ボディーデータは閲覧できません。」 (B7); consent re-read when switching between members (Edge Case).
- Granted: 最新記録サマリー with date; 12 体組成 metrics (FR-039); 身体データ with separate 左/右 for 上腕 /
  前腕 / 太もも / ふくらはぎ + 身長 (FR-040); 推移グラフ Select over 12 metrics (D5), truncation notice when capped
  (B8); 測定履歴 latest 5 + 「全{n}件」 + 「全{n}件を表示」 sheet with データソース badges (B9); zero records
  → 「まだボディーデータの記録がありません」 (D17).
- Real API: `403 E-BDY-100` handled as the consent state, not as a generic error.
- Stress: 12 long metric labels in the Select trigger and list at 1024px; many history rows in the sheet.

**Unit 10 — 紹介関係 + 変更履歴**

- 紹介関係: 紹介経由 banner; referrer link or 「紹介者なし（紹介経由の入会ではありません）」; 招待実績 rows
  (氏名 / 会員ID / 入会日 / 付与済み・未付与) with count badge and row navigation; 紹介サマリー figures from the
  server; the referral links never point the member to themself (FR-042–044).
- ポイント手動返還 (FR-044a, umbrella US5): Manager / HQ / System enabled, Staff disabled with 「ポイント手動返還は
  Manager以上の権限が必要です」; dialog requires 返還ポイント ≥ 1 and 返還理由 ≤ 1000; toast 「ポイントを返還
  しました」 / 「{n}pt を {会員名}様に返還しました」; the refund recorded in 変更履歴 and visible in Unit 7;
  server-side: the same POST with a Staff token is refused; 0 / negative / non-integer points rejected
  client- and server-side.
- 変更履歴: 更新日時 / 操作者 (a **name**, never a UUID) / 変更フィールド / 変更前 → 変更後, newest first;
  multi-field change grouped once; ステータス rendered as a status badge, creation as 新規作成, missing
  values `—` (FR-045/046); pagination (FR-047); 「変更履歴はありません」; no write controls.
- **Audit sweep (SC-005, header FR-025):** after Units 1–4 have run, every write they made has a record —
  動作確認用アカウント set/release (label: B10), 入会取り消し, 休会/退会/移籍 applications, 退会取り消し, gate stop
  set/release, penalty release, BL registration, 個人情報削除, plan change, fee adjustment, option cancel,
  manual refund. A missing record is `NG`; a record present but labelled with a raw code is `Block (B10)` only
  for the `test_account_*` actions.
- Stress: 1000-char reasons and long field values in 変更前 / 変更後, many fields in one grouped record.

**Unit 11 — アプリ連携 (A-01 FR-027)**

- Summary-strip item: the four states (未連携 / 連携済み / 一時ロック中 / 永続ロック中), each with its tooltip, and
  a withdrawn member (reads 未連携, no tooltip — FR-026 as corrected 2026-11-13); a lock on a **linked** number reads 連携済み; the item opens the sheet; the strip has 4 items.
- Sheet 今の状態 per state (FR-027): 連携日時, 連携経路 for each route incl. 「—」 for an unrecorded one,
  アカウント masked as `email／phone` (L2, closed by PO 2026-11-13 — one value alone when the other is null,
  「—」 when both are), 操作者 only for 手動紐付け;
  一時ロック: ロックした日時 / 自動で解除する時刻 / 連続 / 累計; 永続ロック: ロックした日時 / 累計 /
  「自動では解除されません」.
- Operations per state (FR-028): 一時ロック offers 手動紐付け only, **no** ロック解除 (L1); 永続ロック and 連携済み
  offer their two-way choice; 退会済み none with 「退会済みのため紐付けできません」.
- Search (FR-029): exact match only (a partial email finds nothing); email and phone (both domestic `090…` and
  `+81…`); not found; linked to another member; the member's own account on 紐付け直し; アカウント作成日 shown /
  hidden; empty input and missing identity check block the confirm with their reasons.
- Writes, each with confirm (キャンセル keeps the input), toast + 「履歴を見る」, re-read state and the 変更履歴 row
  (FR-030): 手動紐付け on 未連携 and on 一時ロック中; 紐付け直し (request carries `replace: true`, no DELETE first);
  ロック解除 on 永続ロック; 連携解除.
- Server refusals shown with the server's message (Edge Cases, L4): E-MEM-219 withdrawn, E-MEM-232, E-MEM-235,
  E-MEM-215 / E-MEM-233 (stale screen).
- Roles (FR-028): HQ / System / Manager all four writes; Staff — 連携解除 disabled with 「連携解除は本部・
  マネージャーの権限で行います」; Observer — read-only sheet, operations disabled with 「閲覧のみの権限のため操作
  できません」, no search / identity check; Trainer — no screen. Server-side denials with a token of each role.

---

## 6. Known Round 1/2 gaps

Carried from [report.md](../../../api-integration-output/member-detail/report.md) (open rows only, 2026-09-23).
Treatment for every row: the case is **written to the spec**; a failure matching the row is recorded
**`Block (Bn)`** citing the row; any other failure is `NG`.

| Bn         | Blocker (report ref)                                                                                                                                                                                                                                                                | UI behaviour today                                                                                       | Test treatment                                                                                                                                                |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B1**     | **N46** — the server takes 移籍元 from `members.primary_store_id`; the SPEC (and the FE) take it from the main contract's store. A member with `primaryStore` null but an active contract gets `409 E-TRF-006`.                                                                     | 移籍申請 fails for such members after the confirm dialog.                                                | Happy path on a member **with** a primary store. Add one case on a `primaryStore`-null member → `Block (B1)` when it answers E-TRF-006.                       |
| **B2**     | **L53 / N19** — `GET /admin/stores` `status` takes one value; the 移籍 picker lists `operating` stores only, so 一時休業 stores are hidden pending a BE ruling.                                                                                                                     | Destination list has no 一時休業 store.                                                                  | Assert operating stores listed. The absence of 一時休業 stores → `Block (B2)`, not NG.                                                                        |
| ~~**B3**~~ | ~~**N45** — no dev plan sets `cancellationFeeMonths`, the branch never ran~~ — **closed 2026-11-02**: dev now has members in the period for both brands (JOYFIT JF-0000637, FIT365 F3-0000652). Still open on N45: the JOYFIT manual-exception path (`feeBlockOverride`) has no UI. | JOYFIT: 移籍申請 locked in the period. FIT365: not locked (A-02 L48; fixed after tester bug 2026-11-02). | Run the FR-017 / header US1 AC-3 cases on real members. Do not assert a JOYFIT manual-release UI (N45).                                                       |
| **B4**     | ~~**N21**~~ (closed 2026-09-30: cancelling a pending 休会 is not in the original spec) **N21** — a `pending_suspended` (休会予定) member has no ステータス変更 entry and no way to cancel the pending suspension from this screen; `/cancel` exists but no UI calls it.             | Dead end after a 休会申請 whose start is in the future.                                                  | Write the pending-banner 取り消す case for 休会 (D6) → `Block (B4)`. Clean up Unit 2's own pending suspension via the admin `/cancel` endpoint directly (§8). |
| **B5**     | **N40 + N20/N37** — オプション追加 is **still on mock**: the pro-rata arbitrary start date is undecided (API accepts today / next-month-1st only, `422 E-OPT-007`), and the add sheet's 代理申請 block is not built.                                                                | The sheet "succeeds" against the mock; nothing persists on the real backend.                             | Write the add cases to the spec. A mock success is **not** `OK` → `Block (B5)`. The block's own UI (fields, validation) may still be judged.                  |
| **B6**     | **N16** — オプション変更 is **still on mock**: `UpdateOptionContractDto` cannot change `optionId`; the business meaning of 変更 is open. Also a known FE defect in the same sheet: 変更先オプション does not exclude the current option (id-space mismatch).                        | The sheet runs on mock.                                                                                  | Change cases → `Block (B6)`. The non-exclusion defect is an FE `NG` if seen (report FE list) — cite it, do not fold it into B6.                               |
| **B7**     | **L138** — the API exposes only `bodyDataCrmConsentAt` + `403 E-BDY-100`, so 拒否 cannot be told from 未同意; a revoked consent looks like never-consented.                                                                                                                         | Only granted / not-granted render.                                                                       | Granted and 未同意 cases run normally. The 拒否 case → `Block (B7)`.                                                                                          |
| **B8**     | **N43** — no series endpoint for 推移グラフ; the chart reads the latest **100** measurements (API cap) with a truncation note, no period choice.                                                                                                                                    | Chart correct up to 100 points.                                                                          | Chart cases run on ≤ 100 records. Anything needing > 100 → `Block (B8)` (no dev member is known to have that many).                                           |
| **B9**     | **N44** — 測定履歴 cannot merge `bodyRecords` and `bodyMeasurements` (shared paging), so 3DScanner / 手動 measurement sessions are missing from the table.                                                                                                                          | Table lists 体組成 records only.                                                                         | Assert the spec (全記録, source badge per row). Missing measurement-type rows → `Block (B9)`.                                                                 |
| **B10**    | **L209** — `change-history` has no Japanese label for `test_account_enabled` / `test_account_disabled`; the row falls back to the raw code.                                                                                                                                         | The record exists but reads as a code.                                                                   | Record present + raw code → `Block (B10)`. Record **absent** → `NG`.                                                                                          |
| **B11**    | **Unit 11, local run** — with `YAMAUCHI_USER_API_ENABLED=false` the backend never calls Yamauchi: search reads the contact copied onto member rows, so アカウント作成日 (`createdAt`) is always null.                                                                               | アカウント作成日 never shows.                                                                            | Assert the hidden line on real data. The shown line → `Block (B11)` (verify on dev, where Yamauchi answers).                                                  |
| **B12**    | **Unit 11, local run** — in the same mode the linked account's contact (`linking.account`) is read from the **member's own** row, not from the Yamauchi account just linked.                                                                                                        | After a 手動紐付け the アカウント row shows the member's own masked email/phone.                         | Assert a masked value is present and its format. "Shows the linked account's contact" → `Block (B12)`, not NG.                                                |
| **B11**    | **L74** — `campaign-applications` `includeHistorical` is a no-op; no UI effect because the FE never sends it.                                                                                                                                                                       | None.                                                                                                    | Note only — so a probe seeing `historical` rows with `=false` is not filed against the screen.                                                                |

**Known FE defects (report "FE (nội bộ)", not blockers — record `NG` citing the report line):**
休会解除 sheet does nothing when `currentSuspension` is null (should be disabled with a message); the
キャンペーン 適用予定 branch is dead code (a 適用予定 badge on screen contradicts tabs FR-018); the B6
non-exclusion defect.

**Settled decisions a tester must not report** (report "FE tự chốt", prototype-gap-list): 来館回数 counting
rules; 個別会費調整 has no 代理申請 (D3 until qa-242 answers); `cancellationBlockedReason` strings; 主契約店舗 /
登録日 sources; gap-list #2, #5, #7, #8, #9, #10.

**Test data already on dev:** `JF-0000035` (`6d815400-703a-4358-a59a-ccbfe442d8b0`) carries a real blacklist
entry left by the integration run (2026-08-26, reason marked as a verification) — **use it** for every
"blacklisted" read case (banner, 個人情報削除 blocker, BL登録 disabled) instead of registering a new one.

**Ladyroom slice**: AREA-BE (area API not confirmed on dev) and AREA-MOCK (a candidate list not read from the real API) in the 029 plan §7e apply to every `[Ladyroom]` case → `Block (AREA-BE|AREA-MOCK)`. Option add / change submits: `Block (B5|B6)` **only if** those mutations are still on mock at run time — the 2026-09-30 run of the Unit 4 doc found both already calling the real API, so the AREA-MOCK pre-flight decides. Contract note for BE: `E-ARE-003` appears only in the `StorePlanDto` / `StoreOptionDto.genderCondition` descriptions, not in the 422 lists of `…/plan-changes` / `…/option-contracts`, and `…/switch` documents no gender refusal at all.

---

## 7. Traceability map

**Umbrella** [spec.md](../spec.md):

| FR     | Summary                                                     | Unit(s)                             |
| ------ | ----------------------------------------------------------- | ----------------------------------- |
| FR-001 | Title + back link / 3-level breadcrumb                      | 1                                   |
| FR-002 | Head-up identity + pending label                            | 1                                   |
| FR-003 | 休会まで / 退会予定日 next to the badge                     | 1                                   |
| FR-004 | 4-item summary strip                                        | 1 (+11 the アプリ連携 item)         |
| FR-005 | Gate-stop + penalty banners with 解除...                    | 1 (display), 3 (release)            |
| FR-006 | Blacklist banner, HQ/System only                            | 1 (+3 produces it)                  |
| FR-007 | Pending banner: message, 詳細を見る, 取り消す               | 1 (display), 2 (取り消す, D6)       |
| FR-008 | Tab order + URL                                             | 1                                   |
| FR-009 | 基本情報 cards                                              | 1                                   |
| FR-010 | 契約操作                                                    | 4                                   |
| FR-011 | 支払い履歴                                                  | 5                                   |
| FR-012 | 利用履歴                                                    | 6                                   |
| FR-013 | ポイント履歴                                                | 7                                   |
| FR-014 | アンケート回答 + トレーニング記録; 紹介関係 + manual refund | 8, 10                               |
| FR-015 | ボディーデータ consent gate + content                       | 9                                   |
| FR-016 | 変更履歴 incl. test-account, penalty and app-link rows      | 10, 11                              |
| FR-017 | ステータス変更 menu by status                               | 2                                   |
| FR-018 | 退会申請 pre-start block                                    | 2                                   |
| FR-019 | 入会取り消し dialog                                         | 2                                   |
| FR-020 | 休会 / 退会 / 移籍 with 代理申請 + pending state            | 2                                   |
| FR-021 | 編集 HQ/System, hidden when withdrawn                       | 1                                   |
| FR-022 | 会員操作 管理操作 group; no 強制退会                        | 3                                   |
| FR-023 | Withdrawn: 個人情報削除 only, with blocks                   | 3                                   |
| FR-024 | 動作確認用アカウント toggle                                 | 1 (+10 audit)                       |
| FR-025 | Permission matrix + data scope                              | 1 (access/scope); all units (gates) |
| FR-026 | アプリ連携 summary item: state + tooltip                    | 11                                  |
| FR-027 | アプリ連携 sheet 今の状態 per state                         | 11                                  |
| FR-028 | Operations per state + FR-027 権限                          | 11                                  |
| FR-029 | Exact search, identity check, confirm dialogs, replace      | 11                                  |
| FR-030 | App-link 変更履歴 rows + toast                              | 11                                  |

**Header-actions** [header-actions/spec.md](../header-actions/spec.md): FR-001 → 2, 3 · FR-002 → 2 · FR-003 → 3 ·
FR-004 → 1 (編集), 2, 3 · FR-005 → 2 (+4 for the contract sheets) · FR-006, FR-008 – FR-012 → 2, 3 · FR-007 → 3 ·
FR-013 – FR-016 → 2 · FR-017 – FR-019 → 3 · FR-020 → 2 · FR-021 (superseded) → 3, absence check · FR-022 → 3 ·
FR-023 (superseded) → 3, absence check · FR-024 → 3 · FR-025 → 10 (read), 2/3 (each write asserts its record) ·
FR-026 → 2.

**Tabs** [tabs/spec.md](../tabs/spec.md): FR-001, FR-002 → 1 · FR-003 – FR-006 → every tab unit (1, 4–10) ·
FR-007 – FR-011, FR-011a → 1 · FR-012 – FR-020, FR-013a, FR-015a → 4 · FR-021 – FR-024, FR-009-a…d → 5 ·
FR-025 – FR-029, UH-1…UH-6 → 6 (UH-5 is an absence check) · FR-030 – FR-032 → 7 · FR-033 – FR-037 → 8 ·
FR-038 – FR-041 → 9 · FR-042 – FR-044a, FR-045 – FR-047 → 10.

**PO** `A-01.md`: FR-002 → 1 · FR-003 → 1, 10 · FR-004 → 1 · FR-005 → 2 · FR-006 – FR-008 → 4 · FR-009 → 5 ·
FR-010 → 6 · FR-011 → 7 · FR-012 → 8 · FR-013 → 9 · FR-014 → 3 (+1 card/banner) · FR-015 → 3 (+1 banner) ·
FR-017 → 2, 4 · FR-018 → 3 · FR-019 → 4 · FR-021 → 2 (workflow hint only) · FR-025 → 1, 10 · FR-026 → 2 ·
FR-S001 → 10 (+2, 休会申請 point-discount return) · FR-027 → 11 · 権限マトリクス / データスコープ → all.
Cross-document: `A-03 FR-002` → 2 · `D-01 FR-010` → 3 · `G-04 FR-004` → 8 · `C-01 FR-M008` → 2 ·
`APP-F-02 FR-M006 / FR-M009 / FR-M010` → 11.

**Requirements with no unit:**

- None of the umbrella, header-actions or tabs FRs is uncovered.
- PO **FR-016** 強制退会の自動判定 — a server batch; only the absence of a manual control is asserted (Unit 3).
- PO **FR-001**, **FR-020** — member list (019). **FR-022** 臨時休会 — separate screen. **FR-023 / FR-024**
  (Could) — out of scope per the umbrella Assumptions.
- `A-02` transfer automation (PO FR-021) beyond the workflow hint — owned by A-02.
- **Ladyroom slice** — E-02 FR-016 / G-01 FR-M002 / G-02 FR-002 (sale / grant limited to matching members),
  applied to PO FR-006 主契約変更 and FR-007 オプション追加・変更 → Unit 4, LR1–LR3. Not in the umbrella spec; the
  PO specs are the source.

---

## 8. Execution notes (for `execute-testcases`)

**Credentials.** Real Cognito accounts, one per role, password `Password@123` — from
`src/lib/auth/demo-users.ts` (Headquarter: `lodu4289+headquater@gmail.com`). Sign in through the app, or use the header's 「デモ: ユーザー切替」, which is rendered only while
`NEXT_PUBLIC_APP_ENV=development` and signs in for real. Fallback: inject the `SESSION` cookie on
`localhost` (`{access_token: <staff token>, token_type: 'Bearer'}`, TTL ~1 hour — re-inject mid-run).

| PC   | Role        | Account                         | Used for                                                                                                   |
| ---- | ----------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| PC-A | Headquarter | `lodu4289+headquater@gmail.com` | default session; every HQ-only surface (編集, 主契約変更, BL, 個人情報削除, test-account toggle)           |
| PC-B | System      | `lodu4289+1@gmail.com`          | System = HQ checks; one full pass of the HQ-only positives                                                 |
| PC-C | Manager     | `lodu4289+manager@gmail.com`    | managed-store scope; status changes, gate stop, option ops, fee adjustment, manual refund; HQ-only denials |
| PC-D | Staff       | `lodu4289+staff@gmail.com`      | own-store scope; gate stop own store only; refund denial; HQ-only denials                                  |
| PC-E | Observer    | `lodu4289+observer@gmail.com`   | read-only everywhere; every write control disabled with its reason                                         |
| PC-F | Trainer     | `lodu4289+trainer@gmail.com`    | no access to the screen at all                                                                             |

Resolve each account's store scope at run time (`/crm/me`) before choosing in-scope and out-of-scope members.

**Environment.** App `http://localhost:3000`; API `https://api.dev.fitness-v2.okamoto-hd.com`. The backend is
**shared with other people** and there is **no seed reset**.

**Fixture register — build it first.** Before any case, find (read-only GETs only) one member per state and
write the table (state → member number → id) at the top of each TC doc: 有効 with a primary store; 有効 with
`primaryStore` null; 仮会員 with a future usage start date; 休会中; 休会予定 (`pending_suspended`); 退会予定
before / after the usage start date; 退会済み; 強制退会; gate-stopped; blacklisted (`JF-0000035`); unpaid;
active 個別会費調整; active 予約ペナルティ; body-data consent granted (with and without records) and not
consented; JOYFIT and FIT365 brand; a member with > 10 payment rows and > 25 access-log rows; a member with
family, a referrer and invitees; one in and one out of the Manager's and Staff's scope. A state with no member
→ the dependent cases are `Block (fixture: <state>)`, never `NG`. Do not borrow a member another feature's run
is using.

**Data policy — this screen writes to real members.**

- **Prefix** every free-text value the run types (reasons, memos, 合意方法 notes, 端末メッセージ) with
  `QA-MD-<yyyymmdd>` so the record is traceable in 変更履歴, A-02 / A-03 and the blacklist list.
- **Reversible writes — do, then undo, in the same case:** 動作確認用アカウント (set → release);
  ゲートストップ設定 → 解除; 退会申請 → 退会取り消し; 休会申請 → cancel via
  `POST /api/v1/admin/suspension-applications/{id}/cancel` (no UI, B4); 移籍申請 → 否認 in A-02 (no cancel
  exists). Snapshot `GET /admin/members/{id}` before, diff after, write the result in the case Notes.
- **Writes that cannot be undone from the CRM — ask the user before each one, keep to one attempt, list it at
  the end of the TC doc:** 主契約変更 (books a job that applies next month's 1st, no cancel — N31);
  個別会費調整 (no delete); オプション解約 (the add path is mock, so the option cannot be restored through the
  UI — create a throw-away option contract first with a direct `POST …/option-contracts` using an allowed start
  date, then cancel that one); ポイント手動返還 (use 1 pt); 予約ペナルティ解除 (penalties come from D-01
  no-shows and cannot be recreated at will).
- **Irreversible and destructive — Unit 3's last cases, explicit go-ahead required, throw-away members only:**
  ブラックリスト登録 (there is **no** removal endpoint) and 個人情報削除 (anonymises for good). Never run either
  on a pre-existing member. Obtain throw-away members through the C-01 enrollment flow (UI or
  `POST /admin/applications`) with `QA-MD-` names; if one cannot be created → `Block (fixture)`.
- **入会取り消し** voids the contract **and the member** and triggers a refund, and the server allows **at most
  2 same-day cancellations** — run it on a throw-away 仮会員 created through C-01, once.
- **Never edit or delete** a pre-existing member's personal data, contract, status or store data outside the
  bracketed cases above. For the long-value stress cases, write the long name / address through the
  member-form on the fixture member, snapshot → edit → restore, exactly as the 020 plan does.
- Everything left behind (bookings, adjustments, refunds, blacklisted and anonymised throw-aways, the
  pending-application ids) is listed at the end of the TC doc with ids, so BE can clear it.
- **Ladyroom slice (Unit 4 `[Ladyroom]`)**: pre-existing members are used only to open the three sheets and
  read the candidates — always キャンセル. Every submit (happy path, `E-ARE-003` replay) runs on a throw-away
  member created with the needed `gender`, under the "ask the user first" rule above. A member whose 性別 is 未設定 cannot be a throw-away (`CreateApplicationMemberDto.gender` is required) — use a pre-existing one read-only, else `Block (fixture)`. Fixtures
  (`QA-E02-AREA-*`) per the [029 plan §8](../../029-equipment-management/tests/test-plan.md); switch
  `QA-E02-AREA-OPT-*` to 有効 only for these cases and back to 無効 after (026 policy).

**Unit 11 environment (アプリ連携) — local backend, Yamauchi off.** The dev backend does not have FR-027 yet,
and from this machine the Yamauchi System API refuses calls (502 `E-EXT-002`). Unit 11 therefore runs against
the **local** backend:

- App `http://localhost:3000` with `NEXT_PUBLIC_REAL_API_URL=http://localhost:4000`; backend
  `fitness-backend-v2` started with `make dev`, the BFF on **:4000**.
- `YAMAUCHI_USER_API_ENABLED=false` in the backend `.env` **for the whole run** (search falls back to the
  contact copy on member rows — B11, B12). Restore it to `true` and restart the backend afterwards.
- Sessions: no Cognito account exists locally; mint a staff session per role for the local staff rows
  (HQ `…0011`, Manager `…0021`, Staff `…0031`, Observer `…0051`, Trainer `…0041`, System `…0000`) and inject
  it as the `SESSION` cookie. Delete the minted Redis sessions at the end.
- Fixtures: the local DB is disposable but is **restored after the run**. Snapshot `auth.members` (and the
  `auth.member_change_histories` ids) first; build lock states by writing `link_locked_at` /
  `link_fail_total` (permanent) or the Redis counter `link_target_fail:code:<number>` with a TTL (temporary);
  build routes by `app_link_method`. Restore every touched member row from the snapshot and diff the whole
  table at the end; list the 変更履歴 rows the run added.
- Positions: local Manager / Staff / Observer positions lack `can_view_member`; if the screen refuses them, run
  their gates at API level and record the UI case `Block (fixture: position)`.

**Known-gap policy.** A failure matching a §6 `Bn` row → `Block (Bn)`, citing the row. A §4 open-conflict row
(D3, D6, D15, D16) → `Block (Dn)` with the question. A wrong **value returned by the API** is a `Block`
against the backend; a wrong value produced by the frontend is `NG`. Any other failure → `NG` with a bug id.
Do not use §6 to excuse a defect it does not name.

**Viewport.** **1024×768** (the supported floor) for every layout and long-value case, plus one wide pass at
**≥1440px**. Below 1024px is out of scope.

**Account safety.** Repeated wrong-password attempts lock a real Cognito account for ~15 minutes. No case in
this feature needs a wrong password; never re-type one to "retry" a session. Run the six-role sweep once, in
PC order, rather than re-signing in per case.

**Date sensitivity.** Every gate is computed against the **real** date in JST: usage-start-date gates,
退会予定日 ≥ 7 days, 復帰月 ≥ current month, 「あと{n}日」 ≤ 14 days, current-month
defaults of every month picker, 翌月1日 effective dates. Compute boundaries at run time.

---

## 9. Suggested order

Read-only units first, writes after, irreversible last. The 変更履歴 audit sweep runs once more at the end.

1. **Unit 1 — Shell + head-up + 基本情報.** Every other unit enters through it; its fixture register serves
   all units. Its one write (test-account toggle) runs at the end of the unit and is undone.
2. **Unit 5 — 支払い履歴.** Read-only; settles which members really carry unpaid balances, which Units 2–4's
   blocks depend on.
3. **Unit 6 — 利用履歴.** Read-only; independent.
4. **Unit 7 — ポイント履歴.** Read-only; records the balance baseline Unit 10's refund will move.
5. **Unit 8 — トレーニング記録 + アンケート回答.** Read-only, smallest surface.
6. **Unit 9 — ボディーデータ.** Read-only; needs the consent fixtures from step 1.
7. **Unit 10 — 紹介関係 + 変更履歴 (baseline).** Read cases plus the 1 pt refund; captures the 変更履歴 baseline
   so later records are unambiguous.
8. **Unit 4 — 契約操作.** First write-heavy unit; reversible-free writes need the user's go-ahead one by one.
   Produces the 個別会費調整中 badge Unit 1 asserts.
9. **Unit 2 — ステータス変更.** Applications with their undo in the same case; 入会取り消し last, on a
   throw-away member.
10. **Unit 3 — 会員操作・制限解除.** Gate stop set/release first (reversible), then penalty release, then the
    two irreversible cases (BL registration, 個人情報削除) on throw-away members with an explicit go-ahead.
11. **Unit 10 — 変更履歴 audit sweep** (re-run of the audit group) and a closing **role sweep** across all
    units against the 権限マトリクス.
12. **Unit 11 — アプリ連携** (added 2026-11-13). Independent of 1–10; runs on the local backend (§8). Read
    states first, then 手動紐付け → 紐付け直し → ロック解除 → 連携解除, restoring after each.
13. **Unit 4 `[Ladyroom]`** — inside the cross-feature order of the 029 plan §9 (step 10), after the 023 / 026
    slices created the QA 主契約 / オプション. Read-only candidate checks first, throw-away submits last;
    re-checked at 029's step 13.

---

## 10. Definition of done

- [ ] A TC doc per unit under `specs/032-member-detail/tests/cases/`, named per §2 — Units 1 and 5 re-authored
      from this plan (not re-run from their 2026-07 mock versions), the other eight authored new.
- [ ] Every FR in §7 (umbrella, header-actions, tabs, PO) traced to ≥ 1 case; the absence checks (強制退会,
      再入会, 入退館設定, 移籍 取り消す) present as cases.
- [ ] Parity checklist PAR001–PAR461 reconciled first: the §3 prototype-sample rows rewritten or marked
      non-applicable, the known-deviation rows turned into deviation assertions; any element/state without a
      case added before execution.
- [ ] §4 deltas marked in the affected cases' Notes; §5 real-API and 1024px stress cases present; §6 `Bn`
      treatments wired in.
- [ ] Each doc executed once in the §9 order with OK / NG / `Block (Bn | Dn | fixture)` per case and
      evidence for every NG.
- [ ] 入会取り消し verified end-to-end against the live API for the first time (never in the report).
- [ ] Open questions handed to the PO: D3 (qa-242), D6 (FR-007 wording / gap-list #8 approval), D8 (500 vs
      1000), D9 (two disabled strings), D15 (option-only scope), D16 (P-01 – P-03).
- [ ] Test data: every reversible write undone and diff-verified; every irreversible one listed with ids at the
      end of its TC doc.
- [ ] Unit 4 `[Ladyroom]` cases (LR1–LR3) added and run in the 029 cross-feature order.

---

## Next step

Run **`gen-testcases`** on **Unit 1 — Shell + head-up + 基本情報**
(`TC -【Fitness CRM】- [A-01-01][会員詳細（ヘッドアップ・基本情報）].md`, re-author) — sources in §3, deltas in §4,
coverage focus in §5, gaps in §6.
