# Quickstart: Blog Form (ブログ新規登録・編集) — manual verification

Setup as `specs/blog-list/quickstart.md` (dev server, `/blogs` locally un-gated). After mock changes: `npm run generate-openapi` → `npm run generate-api`.

| #   | Do                                                                | Expect                                                                               | Spec               |
| --- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------ |
| 1   | 新規登録 from the list (HQ)                                       | Title ブログ新規登録; 4 cards in order; defaults (WEB+アプリ on, 即時公開, 全社配信) | US1-AC1, FR-001    |
| 2   | Press 公開する empty                                              | Field errors, footer 「未入力の項目があります」, scroll to first error               | FR-016             |
| 3   | Fill + 即時公開 → 公開する                                        | Toast 「ブログを公開しました」, back to list, new row 公開中 with BL number          | US1-AC2            |
| 4   | 予約公開 with past date / future date                             | Past → error; future → 公開予定 + toast                                              | FR-014, US1-AC3    |
| 5   | 下書き保存                                                        | 下書き, no publish date                                                              | US1-AC4            |
| 6   | ブランド指定: JOYFIT全体 then a sub-brand; JOYFIT + FIT365        | Mutual exclusion; JOYFIT+FIT365 blocked                                              | FR-009, BF-04      |
| 7   | 店舗指定 with stores of two families                              | 「同一ブランドの店舗を選択してください」                                             | FR-010, Q2         |
| 8   | 全社配信                                                          | Warning alert shown                                                                  | FR-011             |
| 9   | Both channels off                                                 | Channel error                                                                        | FR-012             |
| 10  | Body with heading / list / link → save → open detail              | Detail renders the same formatting                                                   | FR-004             |
| 11  | Thumbnail upload PNG < 5MB; > 5MB                                 | Preview / inline error                                                               | FR-005             |
| 12  | HQ: カテゴリを管理 / 新規カテゴリを追加; Staff: hidden            | —                                                                                    | FR-006             |
| 13  | Edit from detail (Manager)                                        | ブログ編集, prefilled; save → back to detail with updated values                     | US3                |
| 14  | Edit a 非公開 article                                             | 「非公開のまま保存」 preselected; saving keeps 非公開                                | Q3                 |
| 15  | Staff: create (only 店舗指定, own store), edit own vs other's URL | Only store scope; other's → not-allowed state                                        | FR-008, FR-020, Q1 |
| 16  | Edit a deleted article URL                                        | Not-allowed state                                                                    | FR-021             |
| 17  | Open edit in two tabs, save in one then the other                 | Second save → conflict message, reload works                                         | FR-019             |
| 18  | Type, then キャンセル / back / sidebar link                       | 「変更を破棄しますか？」; without changes leaves directly                            | FR-018             |
| 19  | プレビュー with partial input                                     | Placeholders / current values                                                        | FR-017             |
| 20  | Double-click save                                                 | One article created                                                                  | FR-019             |

Gates: type-check, lint, build (dev server stopped), verify-parity.
