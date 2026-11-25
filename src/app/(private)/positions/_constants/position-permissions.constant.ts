import type { CatalogCategoryDto, PositionDto } from '@/lib/api-real/types.gen';

// ---------------------------------------------------------------------------
// Feature-local metadata for the position permission catalog.
//
// The real API owns the catalog completely: GET /api/v1/admin/permissions
// returns every category, key, label, order, helper `description` and a `type`
// (view/edit/destructive) per key, and GET /api/v1/admin/positions/{id} returns
// the granted flags keyed by the same `permissionKey`. Nothing about the
// catalog is declared on the FE anymore — no key list, no labels, no helper
// descriptions (round 2, 2026-09-17).
//
// What is left here is feature rules the contract does not carry: the CSV
// role defaults (FR-S001), the 重要操作 set (FR-007a) and the category access
// level derivation (FR-009).
// ---------------------------------------------------------------------------

export type PositionRole = PositionDto['role'];

export type PositionPermissionCategoryKey = CatalogCategoryDto['categoryKey'];

export const CSV_CATEGORY_KEY = 'csv_export' satisfies PositionPermissionCategoryKey;

/**
 * FR-S001 role defaults: HQ・Manager=出力可 / Staff・Trainer・Observer=出力不可.
 * The keys the default is applied to come from the catalog's CSV出力管理
 * category at runtime (`csvPermissionKeys`) — only the per-role rule is local.
 */
export const CSV_DEFAULTS_BY_ROLE: Record<PositionRole, boolean> = {
  system: false,
  headquarter: true,
  manager: true,
  staff: false,
  trainer: false,
  observer: false,
};

/**
 * 重要操作（破壊的）判定は **サーバーの `type: 'destructive'`** を使う。
 *
 * NOTE(spec-drift 2026-09-17 / spec.md Clarifications 同日, FR-007a):
 * spec FR-007a は 重要操作 を 3 キー固定（強制退会 / 請求確定後の変更 / 返金）と
 * 書いており、Clarifications 2026-09-08 で `can_anonymize_member` を意図的に除外
 * していた。一方カタログは全キーに `type` を返すようになり、その分類は 3 キーより
 * 広い（匿名化・各種削除など）。PO / デザインはまだ spec に反映していないため、
 * ユーザー指示（2026-09-17「API に合わせる」）に従い **API の分類を採用** する。
 * FE 側の 3 キー固定リスト（旧 `DESTRUCTIVE_PERMISSION_KEYS`）は削除済み。
 * サーバー側スキーマ自身が "Otaki ruling pending" と注記しているので、PO 承認時に
 * FR-007a の文面を確定させること（spec.md Q6）。
 */
export function isDestructivePermission(permission: { type: 'view' | 'edit' | 'destructive' }) {
  return permission.type === 'destructive';
}

/**
 * Tooltip copy for a category containing a granted 重要操作 permission.
 * 文言は spec FR-007a のまま（カタログは文言を返さない）。
 */
export const DESTRUCTIVE_PERMISSION_TOOLTIP = '強制退会・返金など重要操作を含みます';

export type CategoryAccessLevel = 'edit' | 'view' | 'none';

/**
 * Derives a category's access level from the granted state of its keys,
 * mirroring the V0 prototype's derivation (research R5): any granted
 * edit/destructive-type key → 閲覧・編集, otherwise any granted view-type key →
 * 閲覧のみ, otherwise アクセス不可. `type` is the server catalog's own
 * classification — no local key→kind map exists anymore.
 */
export function deriveCategoryLevel(
  permissions: ReadonlyArray<{ type: 'view' | 'edit' | 'destructive'; granted: boolean }>,
): CategoryAccessLevel {
  let hasView = false;
  for (const permission of permissions) {
    if (!permission.granted) continue;
    if (permission.type !== 'view') return 'edit';
    hasView = true;
  }
  return hasView ? 'view' : 'none';
}
