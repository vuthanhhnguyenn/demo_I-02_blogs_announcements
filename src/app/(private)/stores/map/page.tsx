'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { MapPin } from 'lucide-react';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { Card, CardContent } from '@/components/ui/card';

import { StoreMapShell, headerScopedStoreMapHref } from '../[id]/map/_components/store-map-shell';

/**
 * 店舗マップ設定 with no store in the address — the E-01 locker list's entry (FR-071).
 *
 * The map is per store, so a single-store header scope goes straight to that store's screen
 * (FR-004). Only 全店舗 stays here, on the 「対象店舗を選択してください」 prompt (FR-005, prototype
 * L618-L629); picking a store in the header then lands on its map through the same redirect.
 *
 * The redirect marks the map as header-scoped, so the map screen keeps following the header: a
 * later header store change swaps the map, behind the discard dialog when a draft is pending
 * (FR-052). A map opened with its store in the address ignores the header (FR-003).
 */
export default function StoreMapEntryPage() {
  const router = useRouter();
  const { currentStoreId, isLoading } = useCurrentStore();
  const isAllStores = currentStoreId === ALL_STORES;

  useEffect(() => {
    if (isLoading || isAllStores) return;
    router.replace(headerScopedStoreMapHref(currentStoreId));
  }, [isLoading, isAllStores, currentStoreId, router]);

  if (isLoading || !isAllStores) {
    return <Loading />;
  }

  return (
    <StoreMapShell>
      <Card>
        <CardContent className="py-4">
          <Empty
            variant="empty"
            icon={MapPin}
            title="対象店舗を選択してください"
            description="ロッカーマップは店舗ごとに設定します。ヘッダーの店舗セレクターで対象店舗を選択すると、その店舗のフロアマップが表示されます。"
          />
        </CardContent>
      </Card>
    </StoreMapShell>
  );
}
