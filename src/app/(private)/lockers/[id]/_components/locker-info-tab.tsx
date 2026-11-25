import Image from 'next/image';

import { formatDateYYYYMMDD } from '@/utils/date.util';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { LockerDetailDto } from '@/lib/api-real/types.gen';

import {
  LOCKER_ORDER_TYPE_LABELS,
  LOCKER_SHAPE_TYPE_LABELS,
  formatLockerSlotLabel,
} from '../../_constants/locker-enum-labels.constants';
import { useLockerFeeOptions } from '../../_hooks/use-locker-fee-options.hook';
import { formatLockerFee } from '../../_utils/locker-fee.util';
import { formatLockerSlotRange } from '../../_utils/locker-slot-numbering.util';

interface LockerInfoTabProps {
  locker: LockerDetailDto;
  storeName: string;
}

export function LockerInfoTab({ locker, storeName }: LockerInfoTabProps) {
  const { byId: feeOptionsById } = useLockerFeeOptions({ storeId: locker.storeId });

  const locationCode = locker.location.locationCode;
  const defaultFeeOption = locker.optionId ? feeOptionsById.get(locker.optionId) : undefined;
  // 個別会費設定済み = a slot with its own fee option (`feeOptionId`, FR-013 — any slot since
  // API-101 v0.15)
  const configuredSlotFees = locker.slots.filter((slot) => slot.feeOptionId !== null);

  // minmax(0, …) lets a long unbroken 案内文 wrap instead of widening the grid track
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">ロッカー情報</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-xs">ロッカーID</p>
              <p className="text-sm font-medium">{locationCode}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">店舗</p>
              <p className="text-sm font-medium">{storeName || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">エリア</p>
              <p className="text-sm font-medium">{locker.location.locationName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">形状</p>
              <p className="text-sm font-medium">{LOCKER_SHAPE_TYPE_LABELS[locker.shapeType]}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">契約種類（初期設定）</p>
              <Badge variant="secondary" className="mt-1 text-xs font-normal">
                {locker.optionName ?? '—'}
              </Badge>
              {defaultFeeOption ? (
                <span className="text-muted-foreground ml-2 text-xs">
                  {formatLockerFee(defaultFeeOption)}/月
                </span>
              ) : null}
            </div>
            <div>
              <p className="text-muted-foreground text-xs">契約形態コード</p>
              <p className="font-mono text-sm font-medium">{locker.optionCode ?? '—'}</p>
              {locker.bottomOptionCode ? (
                <p className="text-muted-foreground text-xs">
                  最下段: <span className="font-mono">{locker.bottomOptionCode}</span>
                  {locker.bottomOptionName ? `（${locker.bottomOptionName}）` : ''}
                </p>
              ) : null}
            </div>
            <div className="md:col-span-2">
              <p className="text-muted-foreground text-xs">ナンバリングパターン</p>
              <p className="text-sm font-medium">
                {formatLockerSlotRange(
                  locationCode,
                  locker.slotStartNumber,
                  locker.slotSummary.total,
                )}
                <span className="text-muted-foreground ml-2 text-xs">
                  （{LOCKER_ORDER_TYPE_LABELS[locker.orderType]}）
                </span>
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-muted-foreground text-xs">案内文</p>
              <p className="text-sm [overflow-wrap:anywhere] break-words whitespace-pre-wrap">
                {locker.locationCaption ?? '—'}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-muted-foreground text-xs">補足説明</p>
              <p className="text-sm [overflow-wrap:anywhere] break-words whitespace-pre-wrap">
                {locker.supplementaryNote ?? '—'}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-muted-foreground text-xs">スロット個別料金</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-success/15 text-success border-success/20 text-xs font-medium"
                >
                  個別会費設定済み {configuredSlotFees.length}件
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {configuredSlotFees.length > 0 ? (
                  configuredSlotFees.map((slot) => {
                    const option = slot.feeOptionId
                      ? feeOptionsById.get(slot.feeOptionId)
                      : undefined;
                    return (
                      <Badge key={slot.id} variant="outline" className="text-xs font-normal">
                        {formatLockerSlotLabel(locationCode, slot.slotCode)}:{' '}
                        {option ? `${option.name} ${formatLockerFee(option)}/月` : '個別設定'}
                      </Badge>
                    );
                  })
                ) : (
                  <span className="text-muted-foreground text-sm">設定なし</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">写真・外観</CardTitle>
          </CardHeader>
          <CardContent>
            {locker.images.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {locker.images.map((image) => (
                  <div
                    key={image.id}
                    className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border"
                  >
                    {/* `imageUrl` is a self-signed delivery URL (BE MR !792) — a plain <img> load */}
                    <Image
                      src={image.imageUrl}
                      alt={`${locationCode}の写真`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground flex h-56 items-center justify-center rounded-lg border border-dashed text-sm">
                画像は未登録です
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-0">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">スロットサマリー</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">総スロット数</span>
              <span className="font-semibold">{locker.slotSummary.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">利用可</span>
              <span className="text-success font-semibold">{locker.slotSummary.available}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">使用中</span>
              <span className="text-info font-semibold">{locker.slotSummary.inUse}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">開放待ち</span>
              <span className="text-warning font-semibold">
                {locker.slotSummary.pendingRelease}
              </span>
            </div>
            {/* TODO(round3) R302: 稼働率 — FR-014 moved to Phase 2 (API-100 v0.4) and is outside
                API-100 / 101. Integrate in phase 2.
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-muted-foreground">稼働率</span>
              <span className="font-semibold">{locker.summary.utilization_rate_percent}%</span>
            </div>
            */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">その他情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">作成日時</p>
              <p>{formatDateYYYYMMDD(locker.createdAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">更新日時</p>
              <p>{formatDateYYYYMMDD(locker.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
