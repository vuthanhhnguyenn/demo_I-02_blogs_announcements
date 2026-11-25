/**
 * 契約タイプ labels.
 *
 * `StorePlanDto.contractType` is a bare `string` on the wire even though `openapi.real.json`
 * enumerates the nine values below elsewhere, so the table is keyed by `string` and an unknown
 * value renders raw — the same "degrade visibly" idiom as the change-history labels (D8).
 */
export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  general: '通常会員',
  oneDay: '1Day',
  family: 'ファミリー',
  kids: 'キッズ',
  student: '学生',
  corporate: '法人',
  welfare: '福利厚生',
  prepaid: 'プリペイド',
  special: '特殊契約',
};

export const contractTypeLabel = (value: string) => CONTRACT_TYPE_LABELS[value] ?? value;

export type MasterSource = 'hq' | 'store';

/**
 * 区分 of a main-contract plan (Y-02 FR-031a, D17): the HQ-wide master versus a contract only
 * this store sells. The labels follow the 販売設定 開発回答 — 「全社共通／当店限定の特殊契約」 —
 * and replace the earlier 本部 / 店舗 wording (`store-detail.tsx` L1688-L1694). Options carry no
 * origin at all (D18), so this is plan-only.
 */
export const MASTER_SOURCE_META: Record<MasterSource, { label: string; className: string }> = {
  hq: {
    label: '全社共通',
    className: 'border-warning/30 bg-warning/15 text-warning hover:bg-warning/15',
  },
  store: {
    label: '当店限定',
    className: 'border-info/30 bg-info/15 text-info hover:bg-info/15',
  },
};

/**
 * 1DayPass price bounds (Y-02 FR-003). A Phase 1 system constant on the FE, and now enforced
 * server-side too: a price outside the range is refused with 422 `E-STR-009`. The real API
 * exposes no min/max field, so the pair lives here rather than coming down with the response.
 */
export const ONE_DAY_PASS_MIN_PRICE = 700;
export const ONE_DAY_PASS_MAX_PRICE = 1800;
