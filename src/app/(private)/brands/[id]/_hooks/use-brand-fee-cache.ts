import { useCallback } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import {
  adminBrandControllerDetailQueryKey,
  adminBrandControllerHistoryQueryKey,
  adminBrandControllerSubBrandDetailQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { SubBrandFeeDetailDto } from '@/lib/api-real/types.gen';

import type { BrandGroup, SubBrandEnum } from '../../_constants/brand-real.constants';

/**
 * Cache upkeep after a 費用マスタ write (plan R2-D6).
 *
 * Every write except DELETE answers with the card in the `GET .../sub-brands/{brandEnum}` shape,
 * so the card is written straight into the cache instead of refetched. The brand detail
 * (`feeMasterStatus` → the 費用 tab badge) and the history (a new audit row per write) are
 * invalidated either way. The history key carries only the path, so it matches every page.
 */
export function useBrandFeeCache(brandGroup: BrandGroup) {
  const queryClient = useQueryClient();

  const invalidateRelated = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: adminBrandControllerDetailQueryKey({ path: { brandGroup } }),
    });
    void queryClient.invalidateQueries({
      queryKey: adminBrandControllerHistoryQueryKey({ path: { brandGroup } }),
    });
  }, [queryClient, brandGroup]);

  const applyCard = useCallback(
    (card: SubBrandFeeDetailDto) => {
      queryClient.setQueryData(
        adminBrandControllerSubBrandDetailQueryKey({
          path: { brandGroup, brandEnum: card.brandEnum },
        }),
        card,
      );
      invalidateRelated();
    },
    [queryClient, brandGroup, invalidateRelated],
  );

  /** `DELETE .../fee-master` answers 204, so the card has to be refetched. */
  const refetchCard = useCallback(
    (brandEnum: SubBrandEnum) => {
      void queryClient.invalidateQueries({
        queryKey: adminBrandControllerSubBrandDetailQueryKey({ path: { brandGroup, brandEnum } }),
      });
      invalidateRelated();
    },
    [queryClient, brandGroup, invalidateRelated],
  );

  return { applyCard, refetchCard };
}
