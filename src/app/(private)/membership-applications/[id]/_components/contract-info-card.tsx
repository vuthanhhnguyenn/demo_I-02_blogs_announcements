'use client';

import { formatDateYYYYMMDD } from '@/utils/date.util';
import { formatYen } from '@/utils/format.util';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

import { type ApplicationDetail, isReviewable, uiStatusOf } from './membership-application.utils';

interface ContractInfoCardProps {
  app: ApplicationDetail;
}

function Field({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <span className="text-sm wrap-anywhere">{value}</span>
    </div>
  );
}

/** 先払い rule by brand (C-01 FR-M006), shown next to the served month count. */
const PREPAYMENT_RULE_LABELS = {
  FIT365: 'FIT365: 2ヶ月固定',
  JOYFIT: 'JOYFIT: 主契約マスタ設定',
} as const;

export function ContractInfoCard({ app }: Readonly<ContractInfoCardProps>) {
  const { store, plan } = app;
  const campaignName = app.campaign ? (app.campaign.name ?? '—') : null;
  const optionNames = app.selectedOptions.map((o) => o.name ?? '—');
  const { prepaidMonths } = app.calculatedAmounts;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">契約情報</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <Field
            label="ブランド"
            value={
              <Badge variant="outline" className="text-[10px]">
                {store.brandGroup}
              </Badge>
            }
          />
          <Field label="入会店舗" value={store.name ?? '—'} />
          <Field label="プラン名" value={plan.name ?? '—'} />
          <Field label="月額料金" value={formatYen(plan.monthlyFee)} />
          <Field
            label="先払い期間"
            value={
              <span>
                {prepaidMonths != null ? `${prepaidMonths}ヶ月` : '—'}
                <span className="text-muted-foreground ml-2 text-xs">
                  （{PREPAYMENT_RULE_LABELS[store.brandGroup]}）
                </span>
              </span>
            }
          />
          {/* 契約開始日 is fixed at approval — a placeholder while still under review (prototype
              9/17). Decided rows read the created contract's start date. */}
          <Field
            label="契約開始日"
            value={
              isReviewable(uiStatusOf(app)) ? (
                <span className="text-muted-foreground">承認時に確定</span>
              ) : (
                formatDateYYYYMMDD(app.contract?.startDate ?? undefined, '—')
              )
            }
          />
          <Field
            label="利用開始日"
            value={formatDateYYYYMMDD(app.usageStartDate ?? undefined, '—')}
          />
          {campaignName && (
            <Field
              label="適用キャンペーン"
              value={
                <Badge
                  variant="outline"
                  className="bg-info/15 text-info border-info/20 h-auto max-w-full text-left text-[10px] wrap-anywhere whitespace-normal"
                >
                  {campaignName}
                </Badge>
              }
            />
          )}
          <div className="col-span-2">
            <Field
              label="選択オプション"
              value={
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {optionNames.length > 0 ? (
                    optionNames.map((name, i) => (
                      <Badge
                        key={`${name}-${i}`}
                        variant="outline"
                        className="h-auto max-w-full text-left text-[10px] wrap-anywhere whitespace-normal"
                      >
                        {name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">なし</span>
                  )}
                </div>
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
