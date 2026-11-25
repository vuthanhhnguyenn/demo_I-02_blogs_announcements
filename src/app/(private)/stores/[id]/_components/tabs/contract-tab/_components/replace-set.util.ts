type EnabledFlagged = { enabled: boolean };

type Page<TItem> = {
  items: TItem[];
  pagination: { totalPages: number };
};

/**
 * Reads every page of a store-settings master list: page 1 for the page count, then the rest in
 * parallel. The API caps `limit` at 100, and a replace write needs the whole set — an id left on
 * an unread page would be dropped from the PUT body and silently unlinked.
 */
async function fetchAllPages<TItem>(
  fetchPage: (page: number) => Promise<Page<TItem>>,
): Promise<TItem[]> {
  const first = await fetchPage(1);
  const restPages = Array.from(
    { length: Math.max(first.pagination.totalPages - 1, 0) },
    (_, i) => i + 2,
  );
  const rest = await Promise.all(restPages.map(fetchPage));
  return [first, ...rest].flatMap((page) => page.items);
}

/**
 * Reads every page of a store-settings master list straight from the server and returns the ids
 * currently enabled for the store.
 *
 * `PUT …/plans` and `PUT …/options` replace the whole enabled set, so building the body from the
 * screen's cached list lets a stale tab silently undo a link another operator just made
 * (BUG-U5-08). Every write therefore re-reads the set first; `fetchPage` is expected to bypass
 * the cache (`staleTime: 0`).
 */
export async function fetchEnabledIds<TItem extends EnabledFlagged>(
  fetchPage: (page: number) => Promise<Page<TItem>>,
  getId: (item: TItem) => string,
): Promise<string[]> {
  const items = await fetchAllPages(fetchPage);
  return items.filter((item) => item.enabled).map(getId);
}

/** What the operator changed — applied on top of the freshly read set, never on a cached one */
export type SetDiff = {
  add?: readonly string[];
  remove?: readonly string[];
};

export function applySetDiff(current: readonly string[], { add = [], remove = [] }: SetDiff) {
  const next = new Set(current);
  add.forEach((id) => next.add(id));
  remove.forEach((id) => next.delete(id));
  return [...next];
}
