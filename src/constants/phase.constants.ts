/**
 * Route prefixes of the screens scheduled for Phase 2 (scope 2026-10-23, see
 * `specs/000-scope/scope-2026-10-23.md`). They are hidden from the sidebar and any direct
 * URL access is redirected to `/todo` by the edge proxy. Remove a prefix here to
 * release its screen — nothing else needs to change.
 *
 * Z-01 ダッシュボード (`/`) is Phase 2 too but is deliberately not listed: `/` is
 * the post-login landing, and the home page forwards to `/members` instead.
 */
export const PHASE2_ROUTE_PREFIXES = [
  // E-03 トレーニング機材管理
  '/training-equipment',
  // C-01 FR-S 見学・体験の管理
  '/visit-experiences',
  // Y-06 アプリメンテナンス管理
  '/app-maintenance',
  // Y-10 CRMメンテナンス管理
  '/crm-maintenance',
  // I-02 告知・ブログ管理
  //  '/announcements',
  //  '/blogs',
  '/banners',
  '/article-categories',
  // I-03 通知管理
  '/manual-notifications',
  // 家族入会 (not on the scope list)
  '/family-registrations',
] as const;
