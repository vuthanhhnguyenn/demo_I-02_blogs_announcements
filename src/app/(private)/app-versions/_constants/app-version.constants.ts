import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';

import { BRAND_ENUM_LABELS } from '@/components/common/brand-badge';
import type { BadgeTone } from '@/components/common/tone-badge';

import type {
  AppStoreUrlItemDto,
  AppVersionDto,
  AppVersionEffectiveDto,
  AppVersionPairDto,
} from '@/lib/api-real/types.gen';

export const DEFAULT_PAGE_SIZE = 50;

/** Matches every cached version-setting detail, whatever its id. */
export const APP_VERSION_DETAIL_QUERY_PREFIX = [
  { _id: 'adminAppVersionControllerDetail' },
] as const;

export type AppVersionBrand = AppVersionDto['brandEnum'];
export type AppVersionStatus = AppVersionDto['status'];

export const APP_VERSION_BRANDS = [
  'Joyfit',
  'Fit365',
] as const satisfies readonly AppVersionBrand[];

/** Y-05 FR-M001 状態 — derived by the server. */
export const APP_VERSION_STATUSES = [
  'active',
  'scheduled',
  'ended',
] as const satisfies readonly AppVersionStatus[];

export const APP_VERSION_STATUS_LABELS: Record<AppVersionStatus, string> = {
  active: '適用中',
  scheduled: '予約',
  ended: '終了',
};

export const APP_VERSION_STATUS_TONES: Record<AppVersionStatus, BadgeTone> = {
  active: 'success',
  scheduled: 'info',
  ended: 'neutral',
};

/** One version slot of a setting: OS × minimum (required update) / latest (optional update). */
export type AppVersionSlot = keyof AppVersionEffectiveDto;

export const APP_VERSION_OSES = ['ios', 'android'] as const;
export type AppVersionOs = (typeof APP_VERSION_OSES)[number];

export const APP_VERSION_OS_LABELS: Record<AppVersionOs, string> = {
  ios: 'iOS',
  android: 'Android',
};

export const APP_VERSION_SLOT_KINDS = ['Min', 'Latest'] as const;
export type AppVersionSlotKind = (typeof APP_VERSION_SLOT_KINDS)[number];

export const APP_VERSION_SLOT_KIND_LABELS: Record<AppVersionSlotKind, string> = {
  Min: '最低バージョン',
  Latest: '最新バージョン',
};

export function appVersionSlot(os: AppVersionOs, kind: AppVersionSlotKind): AppVersionSlot {
  return `${os}${kind}`;
}

/** The pair as entered on this setting (null = left blank, so the value is carried over). */
export function enteredAppVersionPair(
  record: AppVersionDto,
  slot: AppVersionSlot,
): AppVersionPairDto | null {
  const versionName = record[`${slot}VersionName`];
  const buildNumber = record[`${slot}BuildNumber`];
  if (versionName === null || buildNumber === null) return null;
  return { versionName, buildNumber };
}

/** 完全バージョン, e.g. `2.3.0（45）`. */
export function formatAppVersionPair(pair: AppVersionPairDto): string {
  return `${pair.versionName}（${pair.buildNumber}）`;
}

/** Record name for the header and the delete dialog, e.g. `JOYFIT 2026/11/18 10:00`. */
export function formatAppVersionTitle(item: Pick<AppVersionDto, 'brandEnum' | 'effectiveAt'>) {
  return `${BRAND_ENUM_LABELS[item.brandEnum]} ${formatDateYYYYMMDD_HHMM(item.effectiveAt)}`;
}

export type AppStoreUrlKey =
  `${AppStoreUrlItemDto['brand']}${Capitalize<AppStoreUrlItemDto['os']>}`;

export const APP_STORE_URL_FIELDS: ReadonlyArray<{
  key: AppStoreUrlKey;
  brand: AppStoreUrlItemDto['brand'];
  os: AppStoreUrlItemDto['os'];
  label: string;
}> = [
  { key: 'joyfitIos', brand: 'joyfit', os: 'ios', label: 'JOYFIT の App Store の URL' },
  { key: 'joyfitAndroid', brand: 'joyfit', os: 'android', label: 'JOYFIT の Google Play の URL' },
  { key: 'fit365Ios', brand: 'fit365', os: 'ios', label: 'FIT365 の App Store の URL' },
  { key: 'fit365Android', brand: 'fit365', os: 'android', label: 'FIT365 の Google Play の URL' },
];
