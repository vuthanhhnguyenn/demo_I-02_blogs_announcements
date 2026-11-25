import type { QueryClient } from '@tanstack/react-query';

const TERMS_QUERY_IDS = ['adminTermsControllerList', 'adminTermsControllerDetail'];

/**
 * Marks every terms list and detail query stale. A version's detail embeds `relatedVersions`
 * (version / remarks / status of its siblings), so editing, adding or deleting one document
 * also changes the other versions' cached detail — not just the one being touched.
 */
export function invalidateTermsQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey[0] as { _id?: string } | undefined;
      return key?._id !== undefined && TERMS_QUERY_IDS.includes(key._id);
    },
  });
}
