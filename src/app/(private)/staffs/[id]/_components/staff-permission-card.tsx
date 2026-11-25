'use client';

import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { adminStoreControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { type StaffDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { STAFF_ROLE_BADGE_CLASSES, STAFF_ROLE_LABELS, StaffRole } from '../../_constants/constants';

interface StaffPermissionCardProps {
  staff: StaffDetailDto;
}

/**
 * 所属・権限 card — ロール / 職位 / 所属 (store or FC pattern) / position-permissions link
 * src: staff-detail.tsx L231-282
 */
export function StaffPermissionCard({ staff }: StaffPermissionCardProps) {
  const role = staff.role as StaffRole;
  const positionName = staff.positionName || '—';

  // FR-017 — pattern B grants access to every store the FC company runs, so the detail view
  // has to name that span. `managedStoreCount` only counts `staff_stores` rows and stays 0 for
  // FC staff, so the stores are resolved the same way the 新規登録 form does it. Pattern A
  // staff never issue this request.
  const { data: fcStoresRes } = useQuery({
    ...adminStoreControllerListOptions({
      query: { page: 1, limit: 100, fcCompanyId: staff.fcCompanyId ?? undefined },
    }),
    enabled: !!staff.fcCompanyId,
  });
  const fcStores = fcStoresRes?.items ?? [];
  const fcStoreCount = fcStoresRes?.pagination.totalItems ?? fcStores.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">所属・権限</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <p className="text-muted-foreground mb-1 text-xs">ロール</p>
            <Badge variant="outline" className={`text-xs ${STAFF_ROLE_BADGE_CLASSES[role]}`}>
              {STAFF_ROLE_LABELS[role] || '-'}
            </Badge>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">職位</p>
            {/* 職位名 can be up to 100 chars — let the badge wrap instead of clipping at h-5/nowrap */}
            <Badge
              variant="secondary"
              className="h-auto rounded-md text-left text-xs break-all whitespace-normal"
            >
              {positionName}
            </Badge>
          </div>
          <div className="col-span-2">
            <p className="text-muted-foreground mb-1 text-xs">所属</p>
            {staff.stores.length > 0 && (
              <>
                {/* Pattern A holds one store, or several for a Manager — whose 所属店舗 are
                    exactly the stores it manages (spec.md "Manager multi-store affiliation"). */}
                <ul className="flex flex-col gap-0.5" aria-label="所属店舗">
                  {staff.stores.map((store) => (
                    <li key={store.storeId} className="text-sm">
                      {store.storeName ?? '—'}
                      {store.storeCode && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          ({store.storeCode})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  パターンA: 店舗直接紐づき
                  {role === StaffRole.MANAGER &&
                    `（管轄店舗: ${staff.stores.length}店舗 — 所属店舗がすべて管轄店舗になります）`}
                </p>
              </>
            )}
            {staff.fcCompanyId && (
              <>
                <p className="text-sm">{staff.fcCompanyName ?? '—'}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">パターンB: FC企業紐づき</p>
                {fcStores.length > 0 && (
                  <div className="bg-muted/30 mt-2 rounded-md border p-3">
                    <p className="text-muted-foreground mb-2 text-xs">
                      管轄{fcStoreCount}店舗（このスタッフがアクセスできる店舗）:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {fcStores.map((store) => (
                        <Badge
                          key={store.id}
                          variant="outline"
                          className="h-auto max-w-full text-left text-[10px] [overflow-wrap:anywhere] whitespace-normal"
                        >
                          {store.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            {staff.stores.length === 0 && !staff.fcCompanyId && <p className="text-sm">未設定</p>}
          </div>
          <div className="col-span-2 border-t pt-2">
            <Link
              href={navigate('/positions', { positionId: staff.positionId })}
              className="text-primary inline-flex items-center gap-1 text-xs break-all hover:underline"
            >
              {positionName}の権限を確認
              <ExternalLink className="size-3" />
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
