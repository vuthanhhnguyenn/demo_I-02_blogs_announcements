'use client';

import type { MouseEvent, ReactNode } from 'react';

import Link from 'next/link';

import { MapPin, ShieldAlert } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { navigate } from '@/lib/routes/routes.util';

/**
 * The store detail opened on its 店舗マップ tab — where this screen's store crumb leads (FR-002).
 * The `tab` key is read by the detail page's tab state.
 */
export function storeMapTabHref(storeId: string): string {
  return navigate('/stores/[id]', storeId, { tab: 'map' });
}

/**
 * Marks a map opened through `/stores/map` (no store in the address — FR-004): that screen
 * follows the header's store selector, so a header change swaps the store behind the discard
 * dialog (FR-052). A map opened with its store in the address ignores the header (FR-003).
 */
export const FOLLOW_HEADER_QUERY = { key: 'scope', value: 'header' } as const;

/** The map of `storeId`, opened as the header-scoped entry (see `FOLLOW_HEADER_QUERY`) */
export function headerScopedStoreMapHref(storeId: string): string {
  return navigate('/stores/[id]/map', storeId, {
    [FOLLOW_HEADER_QUERY.key]: FOLLOW_HEADER_QUERY.value,
  });
}

interface StoreMapShellProps {
  /** The store whose map this is; omitted in the 全店舗 empty state, which drops the crumb and badge */
  store?: { id: string; name: string } | null;
  /**
   * The unsaved-changes guard. The links keep their real `href` (open-in-new-tab still works),
   * but a plain click is routed through this so a dirty draft gets the discard dialog first.
   */
  onNavigate?: (href: string) => void;
  /** Rendered after the body, outside its scroll — the unsaved-changes bar */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Page chrome of the store-map setup screen (prototype `store-map-setup.tsx` L565-L617).
 *
 * The breadcrumb names the screen's place — 店舗管理 › {店舗名} › 店舗マップ設定 — not the route
 * taken, so arriving from E-01 shows the same trail (FR-073). Its row is 24px high, as the store
 * detail's back-link row is, so the title sits at the same height on both screens (L575-L576).
 *
 * The header sits outside the scrolling body and the footer below it, so neither the bar nor
 * the header ever covers the map (L566, L617, L794).
 */
export function StoreMapShell({
  store,
  onNavigate,
  footer,
  children,
}: Readonly<StoreMapShellProps>) {
  const crumbClick = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate) return;
    event.preventDefault();
    onNavigate(href);
  };
  const listHref = navigate('/stores');

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 space-y-4 border-b px-4 pt-6 pb-4 md:px-8">
        {/* One line whatever the store name (LV-06): the store crumb and badge truncate with the
            full name in a tooltip, so a long name never wraps under the app header, never runs
            off-screen and never squeezes the title */}
        <Breadcrumb className="flex h-6 min-w-0 items-center">
          <BreadcrumbList className="min-w-0 flex-nowrap">
            <BreadcrumbItem className="shrink-0">
              <BreadcrumbLink render={<Link href={listHref} />} onClick={crumbClick(listHref)}>
                店舗管理
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {store && (
              <>
                <BreadcrumbItem className="min-w-0">
                  <Tooltip>
                    <TooltipTrigger render={<span className="block min-w-0 truncate" />}>
                      <BreadcrumbLink
                        render={<Link href={storeMapTabHref(store.id)} />}
                        onClick={crumbClick(storeMapTabHref(store.id))}
                      >
                        {store.name}
                      </BreadcrumbLink>
                    </TooltipTrigger>
                    <StoreNameTooltip name={store.name} />
                  </Tooltip>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}
            <BreadcrumbItem className="shrink-0">
              <BreadcrumbPage>店舗マップ設定</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="text-foreground shrink-0 text-xl font-bold tracking-tight">
            店舗マップ設定
          </h1>
          {store && (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex min-w-0" />}>
                <Badge
                  variant="outline"
                  className="max-w-full min-w-0 shrink justify-start gap-1 text-xs font-medium"
                >
                  <MapPin className="size-3 shrink-0" />
                  <span className="truncate">{store.name}</span>
                </Badge>
              </TooltipTrigger>
              <StoreNameTooltip name={store.name} />
            </Tooltip>
          )}
        </div>
      </div>

      <div className="bg-background min-h-0 flex-1 overflow-auto px-4 py-4 md:px-8">{children}</div>

      {footer}
    </div>
  );
}

/** The full store name behind a truncated crumb or badge; an unbroken token still wraps */
function StoreNameTooltip({ name }: Readonly<{ name: string }>) {
  return (
    <TooltipContent side="bottom">
      <p className="min-w-0 text-xs [overflow-wrap:anywhere]">{name}</p>
    </TooltipContent>
  );
}

/**
 * The in-page permission wall (the `StoreFormNoAccess` pattern of `store-form-shell.tsx`).
 *
 * Intentional divergence from V0, which shows every role at least the read-only map:
 * - Trainer / Observer have × on the screen (FR-061); the route guard already answers them, and
 *   this is the screen-level statement of the same rule.
 * - Staff on a store other than their own see this instead of the map (FR-062).
 */
export function StoreMapNoAccess({ message }: Readonly<{ message: string }>) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <ShieldAlert className="text-muted-foreground size-10" />
        <h2 className="text-base font-semibold">アクセス権限がありません</h2>
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>
    </div>
  );
}
