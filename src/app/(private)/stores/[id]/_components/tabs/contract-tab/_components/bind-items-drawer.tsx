'use client';

import { useRef, useState } from 'react';

import { Plus, Search, X } from 'lucide-react';

import { useInFlightGuard } from '@/hooks/use-in-flight-guard.hook';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll.hook';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

import { Permission } from '@/types/permission.type';

import type { MasterSource } from '../contract-tab.data';
import { DrawerListItem } from './drawer-list-item';
import { SectionLoadError } from './section-load-error';

type BindDrawerItem = {
  id: string;
  name: string;
  /** 区分 of a plan candidate; options have none (D18) */
  source?: MasterSource;
};

type Props<TItem extends BindDrawerItem> = {
  title: string;
  description: string;
  searchPlaceholder: string;
  listLabel: string;
  emptyLabel: string;
  /** Footer hint while nothing is selected (the prototype asks the operator to pick a plan) */
  emptySelectionLabel: string;
  /** Candidates loaded so far — every page the caller has fetched, already server-filtered */
  items: TItem[];
  isLoading: boolean;
  /** The candidate read failed — shown as an error with a retry, not as 「紐づけ可能な…はありません」 */
  isError?: boolean;
  onRetry?: () => void;
  /** Whether the catalog has further pages behind the ones in `items` */
  hasMore: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  /** Raw keyword, owned by the caller so it can debounce before hitting the API */
  search: string;
  onSearchChange: (keyword: string) => void;
  /** Told when the drawer opens or closes, so the caller can hold its query until then */
  onOpenChange?: (open: boolean) => void;
  getSubText: (item: TItem) => string;
  /**
   * Tooltip on the disabled 紐づけ追加 for a role that may not link — the section's own wording
   * (D-FR-038, e.g. 「販売設定（主契約）はHQ/Systemのみ操作可能」).
   */
  denyTooltip?: string;
  /**
   * The link write. Resolves `true` once saved — the drawer then closes — and `false` when it
   * failed (already toasted globally), in which case the drawer stays open with the selection so
   * the operator can retry (BUG-U5-07).
   */
  onBind: (selectedIds: string[]) => Promise<boolean>;
};

/**
 * The "add link" drawer for the sales-settings sections.
 *
 * The candidate list is paged and searched **server-side**: the catalogs behind it (G-01 main
 * contracts / G-02 options) grow past any single page, so loading one fixed page and filtering it in the
 * browser would silently hide every candidate past that page.
 */
export function BindItemsDrawer<TItem extends BindDrawerItem>({
  title,
  description,
  searchPlaceholder,
  listLabel,
  emptyLabel,
  emptySelectionLabel,
  items,
  isLoading,
  isError = false,
  onRetry,
  hasMore,
  onLoadMore,
  isLoadingMore,
  search,
  onSearchChange,
  onOpenChange,
  getSubText,
  denyTooltip,
  onBind,
}: Props<TItem>) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBinding, setIsBinding] = useState(false);
  const run = useInFlightGuard();
  const listRef = useRef<HTMLDivElement>(null);

  const sentinelRef = useInfiniteScroll({
    hasMore,
    isLoading: isLoading || isLoadingMore,
    onLoadMore,
    rootRef: listRef,
    enabled: open,
  });

  const setDrawerOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
    if (!nextOpen) {
      onSearchChange('');
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const closeDrawer = () => setDrawerOpen(false);

  // Guarded: two clicks landing in the same tick must not send two writes (BUG-U5-06)
  const handleBind = () =>
    run(async () => {
      if (selectedIds.length === 0) return;
      setIsBinding(true);
      try {
        if (await onBind(selectedIds)) closeDrawer();
      } finally {
        setIsBinding(false);
      }
    });

  return (
    <>
      <RoleGatedButton
        requiredPermission={Permission.StoresConfigContract}
        denyTooltip={denyTooltip}
        type="button"
        variant="outline"
        size="sm"
        className="h-8 px-3 text-xs"
        onClick={() => setDrawerOpen(true)}
      >
        <Plus className="size-3.5" />
        紐づけ追加
      </RoleGatedButton>

      <Drawer direction="right" open={open} onOpenChange={setDrawerOpen}>
        <DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-120">
          <DrawerHeader className="border-border border-b px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <DrawerTitle className="text-base">{title}</DrawerTitle>
                <DrawerDescription className="text-xs">{description}</DrawerDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={closeDrawer}
              >
                <X className="size-4" />
              </Button>
            </div>
          </DrawerHeader>

          <div className="space-y-3 p-4">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9"
              />
            </div>
            {/* While further pages remain the figure is what has loaded, not the catalog total */}
            {isError ? null : (
              <p className="text-muted-foreground text-xs">
                {listLabel}（{items.length}
                {hasMore ? '件以上' : '件'}）
              </p>
            )}

            <div ref={listRef} className="max-h-[calc(100vh-250px)] space-y-2 overflow-y-auto pr-1">
              {items.map((item) => (
                <DrawerListItem
                  key={item.id}
                  selected={selectedIds.includes(item.id)}
                  onToggle={() => toggleSelect(item.id)}
                  name={item.name}
                  source={item.source}
                  subText={getSubText(item)}
                />
              ))}

              {isLoading || isLoadingMore ? (
                <div className="space-y-2" aria-hidden>
                  {Array.from({ length: isLoading ? 4 : 2 }, (_, index) => (
                    <Skeleton key={index} className="h-14 w-full rounded-md" />
                  ))}
                </div>
              ) : null}

              {!isLoading && isError && items.length === 0 ? (
                <SectionLoadError title="候補の取得に失敗しました" onRetry={() => onRetry?.()} />
              ) : null}

              {!isLoading && !isError && items.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">{emptyLabel}</p>
              ) : null}

              <div ref={sentinelRef} className="h-px" aria-hidden />
            </div>
          </div>

          <DrawerFooter className="border-border border-t bg-neutral-50 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs">
                {selectedIds.length > 0 ? `${selectedIds.length}件を選択中` : emptySelectionLabel}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isBinding}
                  onClick={closeDrawer}
                >
                  キャンセル
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={selectedIds.length === 0 || isBinding}
                  onClick={() => void handleBind()}
                >
                  {selectedIds.length > 0 ? `${selectedIds.length}件を紐づける` : '紐づける'}
                </Button>
              </div>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
