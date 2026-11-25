import type { StoreSummaryDto } from '@/lib/api-real/types.gen';

/** 'FIT365' | 'JOYFIT' — the brand axis the screens show (`stores.brand_group`). */
export type BrandGroup = 'FIT365' | 'JOYFIT';

export function toBrandGroup(brandEnum: StoreSummaryDto['brandEnum']): BrandGroup {
  return brandEnum === 'Fit365' ? 'FIT365' : 'JOYFIT';
}
