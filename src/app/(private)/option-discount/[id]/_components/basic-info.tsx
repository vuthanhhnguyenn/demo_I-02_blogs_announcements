'use client';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { useQuery } from '@tanstack/react-query';
import { Percent } from 'lucide-react';

import { Field } from '@/components/common/field';
import { JargonTip } from '@/components/common/jargon-tip';
import { StatusCard } from '@/components/common/status-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { adminStaffPermissionControllerGetStaffOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { OptionSetDetailDto } from '@/lib/api-real/types.gen';

import {
  OPTION_DISCOUNT_STATUS_LABELS,
  OPTION_DISCOUNT_TYPE_BADGE_CLASSES,
  OPTION_DISCOUNT_TYPE_LABELS,
  OPTION_SET_APPLICATION_CONDITION_LABELS,
  OPTION_SET_APPLICATION_RULES,
  formatOptionDiscountValue,
  toOptionSetStatus,
} from '../../_constants/constants';

interface BasicInfoProps {
  data: OptionSetDetailDto;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground mb-1 text-xs">{label}</p>
      <p className="text-sm font-medium wrap-anywhere">{value}</p>
    </div>
  );
}

export function BasicInfo({ data }: BasicInfoProps) {
  const isActive = data.isActive;
  const discountLabel = formatOptionDiscountValue(data.discountType, data.discountValue);

  // The detail only carries the staff id in `updatedBy` (null when never updated) — 更新者 shows the
  // staff's name, so it is looked up on the staff master.
  const { data: updatedByStaff } = useQuery({
    ...adminStaffPermissionControllerGetStaffOptions({ path: { id: data.updatedBy ?? '' } }),
    enabled: data.updatedBy !== null,
  });

  return (
    <div className="flex gap-4">
      <div className="flex w-[60%] flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">基本情報</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <p className="text-muted-foreground mb-1 text-xs">
                  <JargonTip term="セット割">セット割ID</JargonTip>
                </p>
                <p className="text-sm font-medium wrap-anywhere">{data.id}</p>
              </div>
              <InfoRow label="セット割名" value={data.name} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">対象商品</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-muted-foreground mb-2 text-xs">対象オプション</p>
                <div className="flex flex-wrap gap-2">
                  {data.items.map((item) => (
                    <Badge
                      key={item.optionId}
                      variant="outline"
                      className="h-auto max-w-full shrink justify-start text-left text-xs wrap-anywhere whitespace-normal"
                    >
                      {item.optionName}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">割引設定</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <p className="text-muted-foreground mb-1 text-xs">割引タイプ</p>
                <Badge
                  variant="outline"
                  className={`text-xs font-medium ${OPTION_DISCOUNT_TYPE_BADGE_CLASSES[data.discountType]}`}
                >
                  {OPTION_DISCOUNT_TYPE_LABELS[data.discountType]}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-xs">
                  {data.discountType === 'fixed_amount' ? '割引金額' : '割引率'}
                </p>
                <p className="text-sm font-medium">
                  {discountLabel}
                  <span className="text-muted-foreground ml-1 text-xs font-normal">/ 月</span>
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-xs">適用条件</p>
                <p className="text-sm font-medium">
                  {OPTION_SET_APPLICATION_CONDITION_LABELS[data.applicationCondition]}
                </p>
              </div>
            </div>
            <div className="mt-4 border-t pt-4">
              <p className="text-muted-foreground mb-1 text-xs">説明</p>
              <p className="text-muted-foreground text-sm wrap-anywhere">
                {data.description ?? '—'}
              </p>
            </div>
            <div className="mt-4 border-t pt-4">
              <p className="text-muted-foreground mb-2 text-xs">適用ルール</p>
              <ul className="flex flex-col gap-2">
                {OPTION_SET_APPLICATION_RULES.map((rule) => (
                  <li key={rule} className="text-muted-foreground flex items-start gap-2 text-xs">
                    <span className="text-foreground">&bull;</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="w-[40%]">
        <div className="sticky top-0 flex flex-col gap-4">
          <StatusCard
            tone={isActive ? 'success' : 'muted'}
            icon={Percent}
            label={OPTION_DISCOUNT_STATUS_LABELS[toOptionSetStatus(isActive)]}
            meta={`更新: ${formatDateYYYYMMDD_HHMM(data.updatedAt)}`}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">適用状況</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">対象会員数</span>
                    <span className="text-sm font-semibold">
                      {data.appliedContractCount.toLocaleString()}名
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    構成オプションをすべて契約中の会員数
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">その他情報</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="flex flex-col gap-4">
                <Field label="作成日時" value={formatDateYYYYMMDD_HHMM(data.createdAt)} />
                <Field label="最終更新日時" value={formatDateYYYYMMDD_HHMM(data.updatedAt)} />
                <Field label="更新者" value={updatedByStaff?.name ?? '—'} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
