import type { BrandEnumValue } from '@/components/common/brand-badge';
import type { BadgeTone } from '@/components/common/tone-badge';

import type {
  AdminTermsControllerListData,
  CreateTermsDto,
  TermsDocumentDetailDto,
  TermsDocumentSummaryDto,
} from '@/lib/api-real/types.gen';

export const TERMS_DEFAULT_PAGE_SIZE = 50;

/** Terms ids are UUIDs; anything else cannot exist, so it is a not-found without asking the API. */
export const TERMS_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TermsType = NonNullable<AdminTermsControllerListData['query']>['termsType'] & string;
/** The two brand groups; `null` (shared by both) is only a create value, never a brand to pick. */
export type TermsBrand = NonNullable<CreateTermsDto['brandEnum']>;
export type TermsStatus = TermsDocumentSummaryDto['status'];

/** Y-04 規約タイプ一覧 (8 types), in the table's order. */
export const TERMS_TYPES: readonly TermsType[] = [
  'membership',
  'privacy',
  'payment',
  'suspension',
  'withdrawal',
  'companion',
  'account_terms',
  'digital_ticket',
];

/** Terms are managed per brand group (Y-04): the API enum is exactly JOYFIT / FIT365. */
export const TERMS_BRANDS: readonly TermsBrand[] = ['JOYFIT', 'FIT365'];

export const TERMS_STATUSES: readonly TermsStatus[] = ['published', 'ended', 'draft'];

/** Official names (Y-04) — used by the form select and the detail page. */
export const TERMS_TYPE_LABELS: Record<string, string> = {
  membership: '会員規約',
  privacy: 'プライバシーポリシー',
  payment: '会費お支払いに関する規約',
  suspension: '休会に関する規約',
  withdrawal: '退会に関する規約',
  companion: '同伴利用に関するご案内',
  account_terms: 'ヤマウチアカウント利用規約',
  digital_ticket: 'デジタルチケット利用規約',
};

/** Short list-tab labels (prototype): the head of the official name, no separate aliases. */
export const TERMS_TYPE_TAB_LABELS: Record<TermsType, string> = {
  membership: '会員規約',
  privacy: 'プライバシーポリシー',
  payment: '会費お支払い',
  suspension: '休会',
  withdrawal: '退会',
  companion: '同伴利用',
  account_terms: 'ヤマウチアカウント',
  digital_ticket: 'デジタルチケット',
};

export const TERMS_BRAND_LABELS: Record<string, string> = {
  JOYFIT: 'JOYFIT',
  FIT365: 'FIT365',
};

const TERMS_BRAND_ENUMS: Record<string, BrandEnumValue> = {
  JOYFIT: 'Joyfit',
  FIT365: 'Fit365',
};

/** A brand-less (null) term applies to every brand group, so it shows one badge per brand. */
export const termsBrandEnums = (brand: string | null | undefined): BrandEnumValue[] =>
  brand
    ? [TERMS_BRAND_ENUMS[brand]].filter(Boolean)
    : TERMS_BRANDS.map((b) => TERMS_BRAND_ENUMS[b]);

export const TERMS_STATUS_LABELS: Record<TermsStatus, string> = {
  published: '公開中',
  ended: '適用終了',
  draft: '下書き',
};

/**
 * Status vocabulary differs by location: the document-level badge (header + 管理情報) uses
 * `公開中`, but the version-history timeline entry badge uses `適用中` for the same underlying
 * `published` status (Y-04 spec, terms-detail vocabulary note). See BUG-Y04D-03.
 */
export const TERMS_TIMELINE_STATUS_LABELS: Record<TermsStatus, string> = {
  ...TERMS_STATUS_LABELS,
  published: '適用中',
};

export const TERMS_STATUS_TONES: Record<TermsStatus, BadgeTone> = {
  published: 'success',
  ended: 'neutral',
  draft: 'warning',
};

export type TermsVersionKind = 'original' | 'version';

export const VERSION_KIND_LABELS: Record<TermsVersionKind, string> = {
  original: 'オリジナル規約',
  version: 'バージョン規約',
};

export type TermsDetail = TermsDocumentDetailDto;
