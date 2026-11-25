import type { BrandEnumValue } from '@/components/common/brand-badge';

import type { AreaListItemDto, CreateAreaDto } from '@/lib/api-real/types.gen';

/** E-02 FR-016 — brand group an area belongs to (immutable after create). */
export type AreaBrandGroup = CreateAreaDto['brandGroup'];
export type AreaGenderCondition = CreateAreaDto['genderCondition'];

export const AREA_BRAND_GROUPS = ['JOYFIT', 'FIT365'] as const satisfies readonly AreaBrandGroup[];

/** `items` of a brand-group Select: a group is shown by its own name. */
export const AREA_BRAND_GROUP_ITEMS = Object.fromEntries(
  AREA_BRAND_GROUPS.map((group) => [group, group]),
) as Record<AreaBrandGroup, AreaBrandGroup>;

/** 性別の条件 in the radio order of the prototype (なし／女性のみ／男性のみ). */
export const AREA_GENDER_CONDITIONS = [
  'none',
  'female_only',
  'male_only',
] as const satisfies readonly AreaGenderCondition[];

export const AREA_GENDER_CONDITION_LABELS: Record<AreaGenderCondition, string> = {
  none: 'なし',
  female_only: '女性のみ',
  male_only: '男性のみ',
};

/** What picks 利用できるエリア (G-01 FR-M002 / G-02 FR-002). */
export type AreaSubject = 'plan' | 'option';

export const AREA_SUBJECT_LABELS: Record<AreaSubject, string> = {
  plan: '主契約',
  option: 'オプション',
};

/** Page size of the area reads that must be complete — the real API caps `limit` at 100; every page is loaded. */
export const AREA_LIST_PAGE_SIZE = 100;

/** `keyword` maxLength of `GET /admin/areas` (the list search and the エリア扉 picker). */
export const AREA_KEYWORD_MAX_LENGTH = 100;

/** BrandBadge speaks sub-brands; a brand group is shown with its lead brand's badge. */
export const AREA_BRAND_BADGE: Record<AreaBrandGroup, BrandEnumValue> = {
  JOYFIT: 'Joyfit',
  FIT365: 'Fit365',
};

export const ALL_BRANDS_LABEL = '全ブランド';
export const AREA_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const AREA_DEFAULT_PAGE_SIZE = 50;
export const AREA_NAME_MAX_LENGTH = 100;
export const AREA_NOTE_MAX_LENGTH = 1000;

/** Shared by 登録 and 編集, so the sheet can hold itself open while either is saving. */
export const AREA_SAVE_MUTATION_KEY = ['area-master', 'save'] as const;

/** 404 — the area no longer exists (deleted in another tab or by another user). */
export const AREA_NOT_FOUND_ERROR_CODE = 'E-ARE-001';

export type AreaUsageCounts = AreaListItemDto['usageCounts'];

/**
 * 使われている所 parts in the prototype order (エリア扉 → 主契約 → オプション); a zero count is left out.
 * Shared by the list column, the delete-blocked tooltip and the gender-change note.
 */
export function areaUsageParts(usage: AreaUsageCounts): string[] {
  const parts: string[] = [];
  if (usage.doorCount > 0) parts.push(`エリア扉 ${usage.doorCount}台`);
  if (usage.planCount > 0) parts.push(`主契約 ${usage.planCount}件`);
  if (usage.optionCount > 0) parts.push(`オプション ${usage.optionCount}件`);
  return parts;
}

export function isAreaUsed(usage: AreaUsageCounts): boolean {
  return usage.doorCount + usage.planCount + usage.optionCount > 0;
}

/** Why 削除 is disabled; the bracket is added when a plan uses the area (a plan with contractors is locked). */
export function areaDeleteBlockedReason(usage: AreaUsageCounts): string {
  const base = `${areaUsageParts(usage).join('・')}で使われているため削除できません。使われている所から外すと削除できます`;
  return usage.planCount > 0 ? `${base}（契約者がいる主契約は編集できないため外せません）` : base;
}

/** The warning under 性別の条件 when an area in use changes its condition. */
export function areaGenderChangeNote(usage: AreaUsageCounts): string {
  const sales: string[] = [];
  if (usage.planCount > 0) sales.push(`主契約 ${usage.planCount}件`);
  if (usage.optionCount > 0) sales.push(`オプション ${usage.optionCount}件`);
  const salesText = sales.length > 0 ? `${sales.join('・')}の販売・付与の相手` : '';
  const doorText = usage.doorCount > 0 ? `扉 ${usage.doorCount}台を開けられる人` : '';
  const target = [salesText, doorText].filter(Boolean).join('と、');
  return `このエリアを使う${target}が変わります`;
}
