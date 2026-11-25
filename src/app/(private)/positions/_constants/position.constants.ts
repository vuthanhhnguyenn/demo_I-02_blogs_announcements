import type { PositionRole } from './position-permissions.constant';

/** `limit` is clamped to 1–100 server-side, so 200 is not offered (decision D4) */
export const POSITION_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const POSITION_DEFAULT_PAGE_SIZE = 50;

/** `page` is `minimum: 1` server-side — a hand-edited `?page=0` would be E-VAL-001 */
export const POSITION_MIN_PAGE = 1;

/**
 * Mirrors `GET /api/v1/admin/positions` → `search` (`maxLength: 100`). Enforced on the
 * input as well as on the request so an over-long paste is capped where the operator can
 * see it, instead of coming back as a 400 (same treatment as the blacklist search box).
 */
export const POSITION_SEARCH_MAX_LENGTH = 100;

/** `name` は BE 契約の `maxLength: 100`（CreatePositionDto / UpdatePositionDto）に一致 */
export const POSITION_NAME_MAX_LENGTH = 100;

/**
 * The BE `crm_role` enum, in definition order — exactly the 6 values
 * `CreatePositionDto.role` accepts. FR-018 keeps `system` out of the *selectable*
 * options below; the schema mirrors the contract, the options mirror the product rule.
 */
export const POSITION_ROLE_VALUES = [
  'system',
  'headquarter',
  'manager',
  'staff',
  'trainer',
  'observer',
] as const satisfies ReadonlyArray<PositionRole>;

/** 対象ロール select options (System is never selectable — Y-01 FR-018) */
export const POSITION_ROLE_OPTIONS: ReadonlyArray<{
  value: Exclude<PositionRole, 'system'>;
  label: string;
}> = [
  { value: 'headquarter', label: '本部' },
  { value: 'manager', label: 'マネージャー (Manager)' },
  { value: 'staff', label: 'スタッフ (Staff)' },
  { value: 'trainer', label: 'トレーナー (Trainer)' },
  { value: 'observer', label: '閲覧のみ (Observer)' },
];

/** Short role display names for the list/preview badges (system rows are read-only — D8) */
export const POSITION_ROLE_BADGE_LABELS: Record<PositionRole, string> = {
  system: 'システム',
  headquarter: '本部',
  manager: 'マネージャー',
  staff: 'スタッフ',
  trainer: 'トレーナー',
  observer: '閲覧のみ',
};

/** システム管理の職位は API 側で読み取り専用 (422 E-STF-012) — UI でも編集/削除を塞ぐ (D7) */
export const SYSTEM_MANAGED_EDIT_TOOLTIP = 'システム管理の職位は編集できません';
export const SYSTEM_MANAGED_DELETE_TOOLTIP = 'システム管理の職位は削除できません';
