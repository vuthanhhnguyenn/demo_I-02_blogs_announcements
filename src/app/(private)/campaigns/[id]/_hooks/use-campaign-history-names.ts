import { useQueries, useQuery } from '@tanstack/react-query';

import {
  adminCampaignControllerDetailOptions,
  adminOptionControllerDetailOptions,
  adminPlanControllerDetailOptions,
  adminStoreControllerDetailOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';

import {
  type CampaignHistoryEntry,
  type CampaignHistoryNames,
  collectCampaignHistoryRefs,
} from '../_utils/campaign-history';

/**
 * Names for the plan / option / store ids in a page of history entries. The campaign detail the
 * page already holds covers what the campaign links to today; ids it no longer links to (a removed
 * option, a former plan) are fetched one detail each, cached per id.
 */
export function useCampaignHistoryNames(
  campaignId: string,
  entries: readonly CampaignHistoryEntry[],
): CampaignHistoryNames {
  const { data: campaign } = useQuery(
    adminCampaignControllerDetailOptions({ path: { campaignId } }),
  );

  const known = {
    option: new Map<string, string>(
      [...(campaign?.campaignOptionDiscounts ?? []), ...(campaign?.campaignAutoOptions ?? [])]
        .filter((entry) => entry.optionName)
        .map((entry) => [entry.optionId, entry.optionName]),
    ),
    plan: new Map<string, string>(campaign ? [[campaign.planId, campaign.planName]] : []),
    store: new Map<string, string>(
      (campaign?.publishedStores ?? []).map((store) => [store.storeId, store.storeName]),
    ),
  };

  const refs = collectCampaignHistoryRefs(entries);
  // Wait for the detail so ids it already names are not fetched again.
  const missing = (ids: string[], names: Map<string, string>) =>
    campaign ? ids.filter((id) => !names.has(id)) : [];
  const missingOptionIds = missing(refs.optionIds, known.option);
  const missingPlanIds = missing(refs.planIds, known.plan);
  const missingStoreIds = missing(refs.storeIds, known.store);

  const optionQueries = useQueries({
    queries: missingOptionIds.map((optionId) =>
      adminOptionControllerDetailOptions({ path: { optionId } }),
    ),
  });
  const planQueries = useQueries({
    queries: missingPlanIds.map((planId) => adminPlanControllerDetailOptions({ path: { planId } })),
  });
  const storeQueries = useQueries({
    queries: missingStoreIds.map((id) => adminStoreControllerDetailOptions({ path: { id } })),
  });

  return {
    option: (id) => known.option.get(id) ?? optionQueries[missingOptionIds.indexOf(id)]?.data?.name,
    plan: (id) => known.plan.get(id) ?? planQueries[missingPlanIds.indexOf(id)]?.data?.name,
    store: (id) => known.store.get(id) ?? storeQueries[missingStoreIds.indexOf(id)]?.data?.name,
  };
}
