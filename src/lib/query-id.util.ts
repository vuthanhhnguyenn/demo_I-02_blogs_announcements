import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * Invalidates every cached query for one generated operation, whatever path or query params it was
 * issued with. The generated keys carry the operation id in `_id`, so a key built for a sample
 * path is enough to identify the family — needed for the `/{id}`-shaped queries, whose key helpers
 * require a concrete id and so cannot be matched by prefix the way a list key can.
 */
export function invalidateOperation(
  queryClient: QueryClient,
  sampleKey: readonly [{ _id: string }, ...unknown[]],
) {
  const { _id } = sampleKey[0];
  void queryClient.invalidateQueries({
    predicate: (query) => (query.queryKey as QueryKey & [{ _id?: string }])[0]?._id === _id,
  });
}

/**
 * The generated operation ids (`queryKey[0]._id`) of some query keys, built on first use.
 *
 * Never build such a set at module load: the generated SDK is an async module (`client.gen`
 * has a top-level await), and a module that calls its exports while loading can run before
 * they are set — a direct page load then fails with 「…QueryKey is not a function」.
 */
export function lazyQueryIds(
  buildKeys: () => ReadonlyArray<readonly [{ _id: string }]>,
): () => ReadonlySet<string> {
  let ids: ReadonlySet<string> | undefined;
  return () => (ids ??= new Set(buildKeys().map((key) => key[0]._id)));
}
