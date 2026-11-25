'use client';

import Link from 'next/link';

import { AvailableAreasReadout } from '@/app/(private)/area-master/_components/available-areas';
import { useAuthUser } from '@/contexts/auth-user.context';
import { formatDateYYYYMMDD } from '@/utils/date.util';
import { formatYen } from '@/utils/format.util';
import { ArrowRight } from 'lucide-react';

import { Field } from '@/components/common/field';
import { JargonTip } from '@/components/common/jargon-tip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

import type { PlanDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import {
  PLAN_LIMIT_OF_SEX_LABELS,
  enrollmentFeeFieldsForBrand,
  isJoyfitBrand,
} from '../../_constants/constants';
import {
  ALL_DAY_CLOSE,
  ALL_DAY_OPEN,
  PLAN_USAGE_DAYS,
  PLAN_USAGE_DAY_LABELS,
} from '../../_schemas/contract-form.schema';

interface PricingTabProps {
  plan: PlanDetailDto;
}

function ageRestrictionLabel(minAge: number | null, maxAge: number | null): string {
  if (minAge != null && maxAge != null) return `${minAge}歳〜${maxAge}歳`;
  if (minAge != null) return `${minAge}歳以上`;
  if (maxAge != null) return `${maxAge}歳以下`;
  return '制限なし';
}

/** One 利用可能時間 row: 休業, 終日 (the form's fixed 00:00〜24:00 window) or its own hours. */
function usageHourLabel(row: PlanDetailDto['usageHours'][number]) {
  if (row.isClosed) return <span className="text-muted-foreground">休業</span>;
  if (row.openTime === ALL_DAY_OPEN && row.closeTime === ALL_DAY_CLOSE) {
    return <span className="text-success">終日（24時間）</span>;
  }
  return (
    <span className="font-mono">
      {row.openTime ?? '―'} 〜 {row.closeTime ?? '―'}
    </span>
  );
}

export function PricingTab({ plan }: PricingTabProps) {
  const { hasPermission } = useAuthUser();
  const brandFeeFields = enrollmentFeeFieldsForBrand(plan.brandEnum);
  // Y-07 keeps 費用 on the two top-level brands; every JOYFIT sub-brand reads JOYFIT's.
  const feeBrandCode = isJoyfitBrand(plan.brandEnum) ? 'JOYFIT' : 'FIT365';
  const usageHours = [...plan.usageHours].sort(
    (a, b) => PLAN_USAGE_DAYS.indexOf(a.dayOfWeek) - PLAN_USAGE_DAYS.indexOf(b.dayOfWeek),
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">料金</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <Field
              label="料金（税込）"
              value={<span className="text-lg font-semibold">{formatYen(plan.priceMonthly)}</span>}
            />
            <Field label="休会時請求金額（税込）" value={formatYen(plan.suspensionFee, '―')} />
            <Field label="違約金（税込）" value={formatYen(plan.cancellationFee, '―')} />
            <Field label="税率" value={`${plan.taxRate}%`} />
            <Field label="会計コード" value={plan.accountingCode || '―'} mono />
          </div>

          {/* qa-185 §1: each brand shows only its own two 入会時費用 items — the same pair the form
              edits, so セキュリティ管理／施設メンテナンス料 is one charge, not two. */}
          <div className="mt-4 border-t pt-4">
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-muted-foreground text-xs">
                入会時費用（ブランド費用・税込）
              </Label>
              {/* Y-07 FR-002: the brand detail's 費用 tab is the source of these amounts. */}
              {brandFeeFields && hasPermission(Permission.BrandsView) && (
                <Link
                  href={`${navigate('/brands/[id]', feeBrandCode)}?variant=fees`}
                  className="text-primary inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
                >
                  ブランド費用設定を見る
                  <ArrowRight className="size-3" />
                </Link>
              )}
            </div>
            {brandFeeFields ? (
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {brandFeeFields.map((fee) => (
                  <Field
                    key={fee.name}
                    label={`${fee.label}（税込）`}
                    value={formatYen(plan[fee.name], '―')}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">このブランドの費用マスタは未設定です</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">利用条件</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <Field label="利用開始日" value={formatDateYYYYMMDD(plan.usageStartDate, '―')} />
            <Field
              label="月額会員回数上限"
              value={plan.monthlyVisitLimit != null ? `${plan.monthlyVisitLimit}回/月` : '制限なし'}
            />
          </div>
          <div className="mt-4 border-t pt-4">
            <Label className="text-muted-foreground mb-2 block text-xs">
              利用可能時間（曜日別）
            </Label>
            <div className="flex flex-col gap-2">
              {usageHours.map((d) => (
                <div key={d.dayOfWeek} className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground w-8 shrink-0">
                    {PLAN_USAGE_DAY_LABELS[d.dayOfWeek]}
                  </span>
                  {usageHourLabel(d)}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            <JargonTip term="休会">休会</JargonTip>・退会
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <Field
              label="休会可能月"
              value={plan.suspendableMonths != null ? `${plan.suspendableMonths}ヶ月` : '―'}
            />
            {/* qa-102: 退会可能月 is carried by `cancellationFeeMonths`. */}
            <Field
              label="退会可能月"
              value={plan.cancellationFeeMonths != null ? `${plan.cancellationFeeMonths}ヶ月` : '―'}
            />
            <Field
              label="初回支払月数"
              value={plan.prepaidMonths != null ? `${plan.prepaidMonths}ヶ月` : '―'}
            />
            <Field
              label="退会申請当月の退会"
              value={plan.sameMonthWithdrawalAllowed ? '可' : '不可'}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">対象制限</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <Field label="年齢制限" value={ageRestrictionLabel(plan.minAge, plan.maxAge)} />
            <Field label="性別制限" value={PLAN_LIMIT_OF_SEX_LABELS[plan.limitOfSex]} />
            <Field label="課金有無" value={plan.hasBilling ? 'あり' : 'なし'} />
            {/* No 変更可否 here (removed against the prototype): 主契約変更可否 lives on 基本情報. */}
          </div>
        </CardContent>
      </Card>

      {/* 利用できるエリア (G-01 FR-M002, prototype 11/12) — right under 対象制限, as on the form. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">利用できるエリア</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {/* Area-master order (newest first), as the form's 確認 step lists them — the API returns
              them in the order they were ticked. エリアID is a registration sequence, so descending
              エリアID is that order. */}
          <AvailableAreasReadout
            subject="plan"
            areas={[...plan.areas].sort((x, y) =>
              y.areaCode.localeCompare(x.areaCode, undefined, { numeric: true }),
            )}
            limitOfSex={plan.limitOfSex}
          />
        </CardContent>
      </Card>
    </div>
  );
}
