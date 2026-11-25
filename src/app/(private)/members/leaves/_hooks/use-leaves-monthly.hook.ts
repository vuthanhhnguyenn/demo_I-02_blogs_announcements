import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { adminSuspensionWithdrawalControllerListQueryKey } from '@/lib/api-real/@tanstack/react-query.gen';
import { AdminSuspension__WithdrawalApi092 } from '@/lib/api-real/sdk.gen';
import type {
  AdminSuspensionWithdrawalControllerListData,
  SuspWdrListItemDto,
} from '@/lib/api-real/types.gen';

import { MONTHLY_VIEW_FETCH_LIMIT } from '../_constants/constants';

type LeavesFilterParams = Omit<
  NonNullable<AdminSuspensionWithdrawalControllerListData['query']>,
  'page' | 'limit'
>;

/**
 * 月別ビュー groups applications by member and resolves one state per month, which is a
 * whole-set aggregation: a member whose applications straddle a page boundary would
 * otherwise render the wrong month states (spec Q-11). So this view walks every page of the
 * filtered set at the endpoint's maximum page size instead of reusing the 一覧 page.
 */
export function useLeavesMonthly(filterParams: LeavesFilterParams, enabled: boolean) {
  return useQuery({
    queryKey: [
      ...adminSuspensionWithdrawalControllerListQueryKey({ query: filterParams }),
      'monthly',
    ],
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      const leaves: SuspWdrListItemDto[] = [];
      let page = 1;
      let totalPages = 1;
      let totalAll: number | undefined;
      do {
        const { data } =
          await AdminSuspension__WithdrawalApi092.adminSuspensionWithdrawalControllerList({
            query: {
              ...filterParams,
              page,
              limit: MONTHLY_VIEW_FETCH_LIMIT,
              // The banner denominator does not change between pages; ask for it once.
              includeTotalAll: page === 1,
            },
            signal,
            throwOnError: true,
          });
        leaves.push(...data.items);
        totalAll ??= data.pagination.totalAllItems ?? undefined;
        totalPages = data.pagination.totalPages;
        page += 1;
      } while (page <= totalPages);

      return { leaves, total: leaves.length, totalAll };
    },
  });
}
