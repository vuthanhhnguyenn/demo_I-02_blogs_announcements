import { formatDateYYYYMMDD_HHMMSS } from '@/utils/date.util';

import type { BrandHistoryChangeDto, BrandHistoryEntryDto } from '@/lib/api-real/types.gen';

import {
  FEE_MASTER_STATUS_LABELS,
  FEE_TYPE_LABELS,
  type FeeMasterStatus,
  type FeeType,
  HISTORY_ACTION_LABELS,
  HISTORY_FEE_PRICE_ATTRIBUTE_LABEL,
  HISTORY_FIELD_LABELS,
  SUB_BRAND_LABELS,
} from '../../_constants/brand-real.constants';
import { formatEffectiveDate } from './brand-fee-group.util';

const EMPTY_VALUE = '—';

/** One changed field of a history entry: a 変更項目 / 変更前 / 変更後 line inside its row. */
export interface BrandHistoryChangeLine {
  changedField: string;
  beforeValue: string;
  afterValue: string;
}

/**
 * One rendered row of the 変更履歴 table — one per history entry, so the row count matches the
 * tab badge and the paging range (`pagination.totalItems`, BUG-021-U2-01).
 */
export interface BrandHistoryRow {
  id: string;
  changedAt: string;
  changedBy: string;
  targetDisplayName: string;
  /** Never empty: an entry without `changes[]` gets one 「—」 line so it still renders as a row. */
  changes: BrandHistoryChangeLine[];
}

/** `feeMasterStatus` changes carry the raw state (`active` / `inactive` / `none`). */
function formatChangeValue(field: string, value: BrandHistoryChangeDto['before']): string {
  if (value === null || value === undefined || value === '') return EMPTY_VALUE;
  if (field === 'feeMasterStatus' && isFeeMasterStatus(value)) {
    return FEE_MASTER_STATUS_LABELS[value];
  }
  // API-074 §10: history fee values are tax-INCLUDED, converted with the row's generation rate.
  if (typeof value === 'number') return `¥${value.toLocaleString('ja-JP')}`;

  return String(value);
}

function isFeeMasterStatus(value: unknown): value is FeeMasterStatus {
  return typeof value === 'string' && value in FEE_MASTER_STATUS_LABELS;
}

function isFeeType(value: unknown): value is FeeType {
  return typeof value === 'string' && value in FEE_TYPE_LABELS;
}

/**
 * `changes[]` items of a fee carry the 有効開始日 of each side (G-05 FR-004 変更前 / 変更後有効開始日,
 * G-05 Bug_No1). The generated client predates these keys, so they are declared here and read
 * leniently.
 */
type BrandHistoryFeeChange = BrandHistoryChangeDto & {
  beforeEffectiveDate?: string | null;
  afterEffectiveDate?: string | null;
};

/** A plain calendar date (`2027-04-01`); anything else (null, missing, malformed) is ignored. */
function readEffectiveDate(value: unknown): string | null {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

/** 「¥3,456（2027/04/01〜）」 — the amount and the date it applies from, in one cell. */
function withEffectiveDate(value: string, effectiveDate: string | null): string {
  if (value === EMPTY_VALUE || !effectiveDate) return value;

  return `${value}（${formatEffectiveDate(effectiveDate)}〜）`;
}

/**
 * 変更前 / 変更後 for one change, each with the 有効開始日 of its own side. For 予約取消 this reads
 * 「cancelled 予約（its date〜）」 → 「price left in force（its date〜）」, so it no longer looks like a
 * price change.
 */
function buildValues(
  change: BrandHistoryFeeChange,
): Pick<BrandHistoryChangeLine, 'beforeValue' | 'afterValue'> {
  const before = formatChangeValue(change.field, change.before);
  const after = formatChangeValue(change.field, change.after);
  if (!isFeeType(change.field)) return { beforeValue: before, afterValue: after };

  return {
    beforeValue: withEffectiveDate(before, readEffectiveDate(change.beforeEffectiveDate)),
    afterValue: withEffectiveDate(after, readEffectiveDate(change.afterEffectiveDate)),
  };
}

function buildChangedField(entry: BrandHistoryEntryDto, change: BrandHistoryChangeDto): string {
  const fieldLabel = HISTORY_FIELD_LABELS[change.field] ?? change.field;
  // A 現行 correction has no action label, so it names the attribute instead (「入会金 定価」).
  if (entry.changeAction === 'fee_update' && isFeeType(change.field)) {
    return `${fieldLabel} ${HISTORY_FEE_PRICE_ATTRIBUTE_LABEL}`;
  }
  const actionLabel = HISTORY_ACTION_LABELS[entry.changeAction];

  return actionLabel ? `${actionLabel}: ${fieldLabel}` : fieldLabel;
}

/**
 * 対象 in G-05 FR-004's 「ブランド名 / サブブランド名」 form, so the JOYFIT *sub-brand* (「JOYFIT /
 * JOYFIT」) stays distinguishable from a brand-level row (「JOYFIT」). `brandEnum` is null at runtime
 * for a brand-level change (`brand_name_update`) even though the generated type omits `null`.
 */
function buildTargetDisplayName(entry: BrandHistoryEntryDto, brandName: string): string {
  const brandEnum: BrandHistoryEntryDto['brandEnum'] | null = entry.brandEnum;
  if (!brandEnum) return brandName;

  return `${brandName} / ${SUB_BRAND_LABELS[brandEnum] ?? brandEnum}`;
}

const EMPTY_CHANGE_LINE: BrandHistoryChangeLine = {
  changedField: EMPTY_VALUE,
  beforeValue: EMPTY_VALUE,
  afterValue: EMPTY_VALUE,
};

/**
 * One row per audit entry (BUG-021-U2-01): an entry's N `changes[]` become N lines grouped inside
 * that row, so the rows on a page match the entries `pagination.totalItems` counts.
 */
export function buildHistoryRows(
  entries: BrandHistoryEntryDto[],
  brandName: string,
): BrandHistoryRow[] {
  return entries.map((entry) => {
    const changes = entry.changes.map((change) => ({
      changedField: buildChangedField(entry, change),
      ...buildValues(change),
    }));

    return {
      id: entry.id,
      changedAt: formatDateYYYYMMDD_HHMMSS(entry.changedAt, EMPTY_VALUE),
      // The BE sends an empty string when the acting staff row is gone.
      changedBy: entry.changedByName || EMPTY_VALUE,
      targetDisplayName: buildTargetDisplayName(entry, brandName),
      changes: changes.length > 0 ? changes : [EMPTY_CHANGE_LINE],
    };
  });
}
