import type {
  CampaignAutoOptionInputDto,
  CampaignChangeHistoryListResponseDto,
  CampaignOptionDiscountInputDto,
} from '@/lib/api-real/types.gen';

import {
  CAMPAIGN_APPLY_START_MONTH_LABELS,
  CAMPAIGN_BRAND_LABELS,
  CAMPAIGN_PUBLISH_SCOPE_LABELS,
  CAMPAIGN_TARGET_SEX_LABELS,
  type CampaignBrand,
} from '../../_constants/constants';
import { formatDiscountValue } from '../../_utils/campaign-discount';

export type CampaignHistoryEntry = CampaignChangeHistoryListResponseDto['items'][number];

/**
 * The snapshot keeps plans, options and stores as raw ids (API-088 §14.3: "no plan / option /
 * store names"), so the screen resolves them. Each lookup returns `undefined` until it knows the
 * name; the row then shows the id.
 */
export type CampaignHistoryNames = {
  option: (id: string) => string | undefined;
  plan: (id: string) => string | undefined;
  store: (id: string) => string | undefined;
};

/** The ids a page of history entries refers to, per lookup. */
export type CampaignHistoryRefs = {
  optionIds: string[];
  planIds: string[];
  storeIds: string[];
};

type SnapshotOptionDiscount = Partial<CampaignOptionDiscountInputDto>;
type SnapshotAutoOption = Partial<CampaignAutoOptionInputDto>;

/** Satellite arrays whose items are matched by an id and shown one row per changed item. */
const KEYED_LIST_FIELDS = {
  campaignOptionDiscounts: 'optionId',
  campaignAutoOptions: 'optionId',
  publishedStores: 'storeId',
} as const;

type KeyedListField = keyof typeof KEYED_LIST_FIELDS;

function isKeyedListField(field: string): field is KeyedListField {
  return field in KEYED_LIST_FIELDS;
}

/** A history table row. `field === null` marks a lifecycle event (created / deleted / restored). */
export type CampaignHistoryRow = {
  key: string;
  date: string;
  user: string;
  field: string | null;
  from: string | null;
  to: string | null;
};

const EVENT_LABELS: Record<CampaignHistoryEntry['eventType'], string> = {
  created: '新規作成',
  updated: '更新',
  deleted: '削除',
  restored: '復元',
};

const FIELD_LABELS: Record<string, string> = {
  name: 'キャンペーン名',
  campaignCode: 'キャンペーンコード',
  remarks: '備考',
  isAccepting: '受付可否',
  capacityLimit: '先着件数上限',
  recruitmentStart: '募集開始日',
  recruitmentEnd: '募集終了日',
  usageStart: '利用開始期間（開始）',
  usageEnd: '利用開始期間（終了）',
  applyStartMonth: '適用開始月',
  applyStartSpecificN: '適用開始月（X月指定）',
  applyDurationMonths: '適用期間',
  planId: '適用主契約',
  planDiscountType: '主契約割引種別',
  planDiscountValue: '主契約割引値',
  enrollmentFeeDiscountType: '入会金割引種別',
  enrollmentFeeDiscountValue: '入会金割引値',
  cancellationFeeMonths: '縛り期間（解約手数料期間）',
  cancellationFeeType: '違約金種別',
  cancellationFeeAmount: '違約金額',
  cancellationFeeTaxRate: '違約金の税率',
  campaignOptionDiscounts: 'オプション割引',
  campaignAutoOptions: '自動付与オプション',
  publishScope: '公開範囲',
  publishedStores: '公開店舗',
  referralBasePoints: '紹介特典ポイント',
  referralPointsAnnualReset: '紹介ポイント年次リセット',
  referralTiers: '紹介ポイント段階増加',
  brandEnum: 'ブランド',
};

/** Bookkeeping columns the server stamps on every update — not a user-visible change. */
const HIDDEN_FIELDS = new Set([
  'updatedAt',
  'updatedBy',
  'acceptanceStopReason',
  'planDiscountMonth1',
  'planDiscountMonth2',
]);

const DISCOUNT_TYPE_LABELS: Record<string, string> = {
  fixed_amount: '定額',
  percentage: '定率',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

/** 紹介ポイント段階増加 — the same 「N人目以降 Xpt」 wording as the detail screen. */
function formatReferralTiers(value: unknown[]): string {
  if (value.length === 0) return 'なし';
  return asRecords(value)
    .map(
      (tier) =>
        `${String(tier.minReferralCount)}人目以降 ${Number(tier.points).toLocaleString()}pt`,
    )
    .join('、');
}

/** 「タンニングマシン（1,000円引き）」 — the option and its discount. */
function formatOptionDiscount(item: SnapshotOptionDiscount, name: string): string {
  const discount = formatDiscountValue(item.discountType ?? null, item.discountValue ?? null);
  return `${name}（${discount || '割引なし'}）`;
}

/** 「タンニングマシン（女性）」 — `targetSexes: null` means every member. */
function formatAutoOption(item: SnapshotAutoOption, name: string): string {
  const sexes = item.targetSexes?.map((sex) => CAMPAIGN_TARGET_SEX_LABELS[sex] ?? sex) ?? [];
  return `${name}（${sexes.length > 0 ? sexes.join('・') : '全員'}）`;
}

function formatKeyedItem(
  field: KeyedListField,
  item: Record<string, unknown> | undefined,
  names: CampaignHistoryNames,
): string | null {
  if (!item) return null;
  const id = String(item[KEYED_LIST_FIELDS[field]]);
  if (field === 'publishedStores') return names.store(id) ?? id;
  const name = names.option(id) ?? id;
  return field === 'campaignOptionDiscounts'
    ? formatOptionDiscount(item as SnapshotOptionDiscount, name)
    : formatAutoOption(item as SnapshotAutoOption, name);
}

/**
 * `diff` carries a satellite array whole, so editing one option's discount would print every
 * option on both sides. Items are paired by id instead: one row per added / removed / edited item,
 * skipping pairs that read the same (a store's `publishedAt` alone is not shown).
 */
function keyedListChanges(
  field: KeyedListField,
  change: { prev?: unknown; next?: unknown },
  names: CampaignHistoryNames,
): { id: string; from: string | null; to: string | null }[] {
  const key = KEYED_LIST_FIELDS[field];
  const prev = new Map(asRecords(change.prev).map((item) => [String(item[key]), item]));
  const next = new Map(asRecords(change.next).map((item) => [String(item[key]), item]));
  return [...new Set([...prev.keys(), ...next.keys()])]
    .map((id) => ({
      id,
      from: formatKeyedItem(field, prev.get(id), names),
      to: formatKeyedItem(field, next.get(id), names),
    }))
    .filter(({ from, to }) => from !== to);
}

function formatValue(field: string, value: unknown, names: CampaignHistoryNames): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value ? 'あり' : 'なし';
  if (field === 'referralTiers' && Array.isArray(value)) return formatReferralTiers(value);
  if (typeof value === 'object') return JSON.stringify(value);
  const text = String(value);
  if (field === 'planId') return names.plan(text) ?? text;
  if (field === 'brandEnum') return CAMPAIGN_BRAND_LABELS[text as CampaignBrand] ?? text;
  if (field === 'publishScope') {
    return (
      CAMPAIGN_PUBLISH_SCOPE_LABELS[text as keyof typeof CAMPAIGN_PUBLISH_SCOPE_LABELS] ?? text
    );
  }
  if (field === 'applyStartMonth') {
    return (
      CAMPAIGN_APPLY_START_MONTH_LABELS[text as keyof typeof CAMPAIGN_APPLY_START_MONTH_LABELS] ??
      text
    );
  }
  if (field.endsWith('Type')) return DISCOUNT_TYPE_LABELS[text] ?? text;
  return text;
}

/** Every plan / option / store id the `updated` entries' diffs mention, deduplicated. */
export function collectCampaignHistoryRefs(
  entries: readonly CampaignHistoryEntry[],
): CampaignHistoryRefs {
  const optionIds = new Set<string>();
  const planIds = new Set<string>();
  const storeIds = new Set<string>();
  for (const entry of entries) {
    const diff = entry.diff as Record<string, { prev?: unknown; next?: unknown }> | null;
    if (entry.eventType !== 'updated' || !diff) continue;
    for (const [field, change] of Object.entries(diff)) {
      const sides = [change?.prev, change?.next];
      if (field === 'planId') {
        sides.forEach((id) => typeof id === 'string' && id && planIds.add(id));
      } else if (isKeyedListField(field)) {
        const target = field === 'publishedStores' ? storeIds : optionIds;
        sides
          .flatMap(asRecords)
          .forEach((item) => target.add(String(item[KEYED_LIST_FIELDS[field]])));
      }
    }
  }
  return { optionIds: [...optionIds], planIds: [...planIds], storeIds: [...storeIds] };
}

/**
 * API-088 §14 returns one event per write with a server-computed `diff` (`{ field: { prev, next } }`).
 * The screen shows one row per changed field (per changed item for option / store lists), so an
 * `updated` event fans out into N rows while created / deleted / restored stay a single lifecycle row.
 */
export function toCampaignHistoryRows(
  entries: readonly CampaignHistoryEntry[],
  names: CampaignHistoryNames,
): CampaignHistoryRow[] {
  return entries.flatMap((entry): CampaignHistoryRow[] => {
    const base = {
      date: entry.changedAt,
      user: entry.changedByName ?? '—',
    };
    const diff = entry.diff as Record<string, { prev?: unknown; next?: unknown }> | null;
    if (entry.eventType !== 'updated' || !diff) {
      return [
        {
          ...base,
          key: `${entry.id}`,
          field: null,
          from: null,
          to: EVENT_LABELS[entry.eventType],
        },
      ];
    }
    return Object.entries(diff)
      .filter(([field]) => !HIDDEN_FIELDS.has(field))
      .flatMap(([field, change]): CampaignHistoryRow[] => {
        const label = FIELD_LABELS[field] ?? field;
        if (isKeyedListField(field)) {
          return keyedListChanges(field, change ?? {}, names).map((item) => ({
            ...base,
            key: `${entry.id}:${field}:${item.id}`,
            field: label,
            from: item.from,
            to: item.to,
          }));
        }
        return [
          {
            ...base,
            key: `${entry.id}:${field}`,
            field: label,
            from: formatValue(field, change?.prev, names),
            to: formatValue(field, change?.next, names),
          },
        ];
      });
  });
}
