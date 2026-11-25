'use client';

import { useState } from 'react';

import { formatDate } from '@/utils/format.util';
import { useQuery } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  adminStoreControllerDetailOptions,
  adminStoreSettingsControllerGetMutualUseOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { cn } from '@/lib/utils';

import { Permission, UserRole } from '@/types/permission.type';

import {
  STORE_BRAND_BADGE_CLASSES,
  STORE_BRAND_LABELS,
  type StoreBrandEnum,
} from '../../../../_constants/constants';
import { MutualUseSheet } from './mutual-use-sheet';

/** Y-02 L189 「相互利用設定: HQ/Systemのみ」 */
const MUTUAL_USE_EDIT_ROLES = [UserRole.Headquarter, UserRole.System] as const;

/** 受入可 / 有効 vs 受入不可 / 無効 — `store-detail.tsx` L2455, L2468 */
const ON_BADGE_CLASS = 'border-success/20 bg-success/15 text-success';
const OFF_BADGE_CLASS = 'border-border bg-muted text-muted-foreground';

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground mb-1 text-xs">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function StatusBadge({ on, label }: { on: boolean; label: string }) {
  return (
    <Badge variant="outline" className={cn('text-[10px]', on ? ON_BADGE_CLASS : OFF_BADGE_CLASS)}>
      {label}
    </Badge>
  );
}

export function AccessSettingsTab({
  storeId,
  storeBrand,
}: Readonly<{ storeId: string; storeBrand: StoreBrandEnum }>) {
  const {
    data: mutualUse,
    isLoading: isMutualUseLoading,
    isError: isMutualUseError,
    refetch: refetchMutualUse,
  } = useQuery({
    ...adminStoreSettingsControllerGetMutualUseOptions({ path: { id: storeId } }),
    enabled: Boolean(storeId),
  });

  // The under-18 entry window and the brand group live on the store row, not on the mutual-use
  // settings row
  const {
    data: store,
    isLoading: isStoreLoading,
    isError: isStoreError,
    refetch: refetchStore,
  } = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id: storeId } }),
    enabled: Boolean(storeId),
  });

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  // Bumped on every opening so the Sheet remounts and starts its draft from the latest read
  const [sheetSession, setSheetSession] = useState(0);

  const openSheet = () => {
    setSheetSession((prev) => prev + 1);
    setIsSheetOpen(true);
  };

  if (!storeId) {
    return null;
  }

  if (isMutualUseLoading || isStoreLoading || isMutualUseError || isStoreError || !mutualUse) {
    return (
      <DataStateBoundary
        isLoading={isMutualUseLoading || isStoreLoading}
        isError={isMutualUseError || isStoreError}
        isEmpty={!mutualUse}
        onRetry={() => {
          void refetchMutualUse();
          void refetchStore();
        }}
        errorTitle="入退館設定の取得に失敗しました"
      />
    );
  }

  // D20 — the brand group (derived server-side from `brandEnum`) picks the wording and decides
  // whether the どこでもJOY-only rows render at all
  const isFit365 = store?.brandGroup === 'FIT365';
  const brandGroupLabel = store?.brandGroup ?? STORE_BRAND_LABELS[storeBrand] ?? storeBrand;
  const { settings, allowedStores } = mutualUse;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        <Card className="gap-0 py-0">
          <CardHeader className="border-b p-4 pb-2!">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">相互利用設定</CardTitle>
              <RoleGatedButton
                allowedRoles={MUTUAL_USE_EDIT_ROLES}
                requiredPermission={Permission.StoresConfigAccess}
                denyTooltip="相互利用設定はHQ/Systemのみ編集可能"
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={openSheet}
              >
                <Pencil className="size-3" />
                編集
              </RoleGatedButton>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 p-4">
            {/* Y-02 FR-070 / D20 — one acceptance flag, worded by brand group */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="text-xs font-medium">
                  {isFit365 ? '相互利用オプション（¥500）の受入' : 'どこでもJOYの受入'}
                </Label>
                <p className="text-muted-foreground mt-0.5 text-[10px]">
                  {isFit365
                    ? '相互利用オプション契約者（他のFIT365店舗の会員）の利用を受け入れる'
                    : 'どこでもJOYを利用する他のJOYFIT店舗の会員を受け入れる'}
                </p>
              </div>
              <StatusBadge
                on={settings.isAcceptEnabled}
                label={settings.isAcceptEnabled ? '受入可' : '受入不可'}
              />
            </div>

            {/* FR-070a — 1日単位の後払い is a どこでもJOY (JOYFIT) parameter; FIT365 never shows it */}
            {!isFit365 && (
              <div className="flex items-center justify-between gap-3 border-t pt-4">
                <div>
                  <Label className="text-xs font-medium">1日単位の後払い設定</Label>
                  <p className="text-muted-foreground mt-0.5 text-[10px]">
                    どこでもJOYの他店舗利用分を1日単位の後払いで請求する
                  </p>
                </div>
                <StatusBadge
                  on={settings.payLaterEnabled}
                  label={settings.payLaterEnabled ? '有効' : '無効'}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-8 gap-y-4 border-t pt-4">
              <InfoItem
                label="相互利用受入可能期間（開始日）"
                value={formatDate(settings.acceptPeriodStart)}
              />
              <InfoItem
                label="相互利用受入可能期間（終了日）"
                value={formatDate(settings.acceptPeriodEnd)}
              />
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 border-t pt-4">
              <InfoItem
                label="18歳未満入館可能時間（開始）"
                value={store?.minorEntryAllowedStart || '—'}
              />
              <InfoItem
                label="18歳未満入館可能時間（終了）"
                value={store?.minorEntryAllowedEnd || '—'}
              />
            </div>

            {/* FR-072 / D23 — read-only in Phase 1: the partner add/remove UI (former FR-076) is
                out of scope (D22, research R6), even though the backend has the endpoints. */}
            <div className="border-t pt-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-xs">
                  相互利用グループ（許可店舗・{brandGroupLabel}ブランドのみ）
                </p>
                <Badge variant="secondary" className="text-[10px]">
                  {allowedStores.length}店舗
                </Badge>
              </div>
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-semibold">店舗名</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">
                        ブランド
                      </TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">
                        設定日
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allowedStores.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-muted-foreground py-6 text-center text-sm"
                        >
                          データなし
                        </TableCell>
                      </TableRow>
                    ) : (
                      allowedStores.map((partner) => {
                        const brand = partner.brandEnum as StoreBrandEnum;
                        return (
                          <TableRow key={partner.storeId}>
                            <TableCell className="max-w-[28rem] min-w-0 text-xs [overflow-wrap:anywhere] whitespace-normal">
                              {partner.name.trim() || '—'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(STORE_BRAND_BADGE_CLASSES[brand], 'text-[10px]')}
                              >
                                {STORE_BRAND_LABELS[brand] ?? partner.brandEnum}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {formatDate(partner.linkedAt)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FR-073 / D20 — どこでもJOY YOGA is JOYFIT-only, so a FIT365 store shows no such card */}
        {!isFit365 && (
          <Card className="gap-0 py-0">
            <CardHeader className="p-4 pb-2!">
              <CardTitle className="text-base">どこでもJOY YOGA利用料金</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {/* Two-line left side, so the note is top-aligned with the label row */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">YOGA利用料金（1日）</p>
                  <p className="text-sm font-medium tabular-nums">
                    ¥{settings.yogaUsageFee.toLocaleString()}
                  </p>
                </div>
                <p className="text-muted-foreground text-xs">利用店舗に計上</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <MutualUseSheet
        key={sheetSession}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        storeId={storeId}
        isFit365={isFit365}
        settings={settings}
        minorEntryAllowedStart={store?.minorEntryAllowedStart ?? null}
        minorEntryAllowedEnd={store?.minorEntryAllowedEnd ?? null}
      />
    </div>
  );
}
