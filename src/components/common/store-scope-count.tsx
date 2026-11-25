import { Store } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Applicable store count — how many stores a master/setting record applies to (shared across screens).
 *
 * Always render the count (`N店舗`), never a scope name such as "全店舗": resolving "all stores"
 * would require matching the record's store set against the store master on every row. The count
 * is a plain number the record already carries, so no reconciliation is needed — and how many
 * stores it covers is the only thing these screens ask.
 *
 * The only accepted wording is `{n}店舗`; "全N店舗" and "N/M店舗" are not used. A record with no
 * store at all renders `―` so that "unset" stays distinguishable from "1 store".
 *
 * Similar-looking wording that must NOT use this component:
 * - store switchers in filters/headers — a narrowing condition, not an application scope
 * - the store a record itself belongs to (sales, entry/exit, a member's home store) — a single fact
 */
export function StoreScopeCount({
  count,
  size = 'sm',
  className,
}: Readonly<{
  /** Applicable store count */
  count: number;
  /** sm = list cell / md = detail field value */
  size?: 'sm' | 'md';
  className?: string;
}>) {
  if (!count) {
    return <span className="text-muted-foreground text-xs">―</span>;
  }

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <Store className={cn('text-muted-foreground', size === 'md' ? 'size-4' : 'size-3')} />
      <span className={size === 'md' ? 'text-sm font-medium' : 'text-xs'}>{count}店舗</span>
    </span>
  );
}
