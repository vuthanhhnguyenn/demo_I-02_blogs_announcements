# Quickstart: Blog List (ブログ一覧) — manual verification

## Setup

1. `git checkout blog-list` and `npm install`.
2. Locally (never commit): remove `'/blogs'` from `PHASE2_ROUTE_PREFIXES` in `src/constants/phase.constants.ts` so the proxy does not redirect to `/todo`.
3. `npm run dev` (regenerates `routes.config.ts`). After changing mock routes / schemas: `npm run generate-openapi` then `npm run generate-api` with the dev server running.
4. Open `http://localhost:3000/blogs`. Test accounts per role are the ones whose staff ids / home stores were captured into the seeds (research R3, R5).

## Checks (map to spec)

| #   | Do                                                                    | Expect                                                                                                                                                                                                            | Spec                   |
| --- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 1   | Open as Headquarter, header = 全店舗                                  | Title ブログ管理 + count; only blog rows (no notice rows); default order ID desc; 50 rows/page                                                                                                                    | FR-001–008, FR-012–013 |
| 2   | Check row cells                                                       | BL-YYYY-NNNN, thumbnail / placeholder, 未分類 badge, scope badge, 対象 (全ブランド・全店舗 / brand / brand + store name), WEB/アプリ badges, 公開日 or —, status colours, WP連携 同期済み / 同期失敗 / 未同期 / — | FR-002–007, Q1         |
| 3   | Search a title fragment; open 詳細フィルター and combine filters      | Partial match; AND; count badge on toggle; result banner with summary and clear; page resets to 1                                                                                                                 | FR-009–011             |
| 4   | ブランド = JOYFIT24                                                   | JOYFIT24 rows + JOYFIT whole-brand rows; no 全社 rows                                                                                                                                                             | FR-010, Q3             |
| 5   | 店舗 filter = a JOYFIT24 directory store (header 全店舗)              | 全社 + JOYFIT/JOYFIT24 ブランド指定 + that store's 店舗指定                                                                                                                                                       | FR-010, FR-014, Q4     |
| 6   | Header = a FIT365 store                                               | 店舗 filter hidden; no JOYFIT ブランド指定 rows                                                                                                                                                                   | FR-014, Q4             |
| 7   | ステータス = 削除済み（ゴミ箱）                                       | Only deleted rows, reduced opacity, 削除済み badge                                                                                                                                                                | FR-010, FR-020         |
| 8   | Sort each sortable header twice; change page size; reload; back       | Direction icons + tooltips; state kept in URL                                                                                                                                                                     | FR-012–013             |
| 9   | As Manager: 公開にする / 非公開にする / 削除 / 復元する with confirm  | Dialog copy, row updates < 2 s, toasts; restore → 非公開                                                                                                                                                          | FR-019–021, SC-003     |
| 10  | As Staff: own row vs other's row                                      | Own: 編集 / 公開系 enabled; other's: disabled with 他者作成; 削除 / 復元 disabled with role marker (the 「削除権限がありません」 server rejection is verified in Phase 2); カテゴリマスタを編集 disabled          | FR-015–018, FR-021, Q6 |
| 11  | As Observer                                                           | Read-only: 新規登録 and all row actions disabled                                                                                                                                                                  | FR-014–016             |
| 12  | As Trainer, open `/blogs`                                             | Permission guard denies                                                                                                                                                                                           | FR-014                 |
| 13  | Row click / 編集 / 新規登録                                           | Placeholder pages "準備中" with link back to the list (filters kept)                                                                                                                                              | FR-023, Q5             |
| 14  | プレビュー                                                            | PC / モバイル tabs, copy per parity                                                                                                                                                                               | FR-022                 |
| 15  | Empty / filtered-empty / error (stop dev mock or force 500) / loading | Four states, retry works                                                                                                                                                                                          | FR-025                 |
| 16  | Go to a page > 1, filter to fewer rows                                | Page clamps to last valid page                                                                                                                                                                                    | Edge cases             |

## Gates before "done"

- `npm run type-check`, `npm run lint` → 0 errors; `npm run build` (new routes).
- Restore `'/blogs'` in `PHASE2_ROUTE_PREFIXES` before committing.
- Run `verify-parity` against `checklists/parity.md`.
