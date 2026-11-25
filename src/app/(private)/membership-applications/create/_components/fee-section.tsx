'use client';

import { formatYen } from '@/utils/format.util';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

import {
  CARD_ISSUANCE_FEE_HINT,
  REGISTRATION_FEE_HINT,
} from '../_constants/enrollment-form.constants';
import type { EnrollmentFeeBreakdown } from '../_utils/enrollment-fee.util';

export type EstimateState = 'idle' | 'loading' | 'ready' | 'error';

interface FeeSectionProps {
  readonly brand: string | undefined;
  readonly fees: EnrollmentFeeBreakdown;
  readonly estimateState: EstimateState;
  readonly campaignLabel: string | null;
}

/**
 * 入会金・先払い費用 (FR-053). Amounts come from `POST /admin/applications/price-estimate`,
 * recomputed whenever store / plan / campaign / 利用開始日 / 決済方法 change; the total is the
 * estimate's `totalInitial` as served.
 */
export function FeeSection({ brand, fees, estimateState, campaignLabel }: FeeSectionProps) {
  if (!brand) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>入会金・先払い費用</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            ブランドを選択すると費用項目が切り替わります
          </p>
        </CardContent>
      </Card>
    );
  }

  const placeholder =
    estimateState === 'loading'
      ? '計算中...'
      : estimateState === 'error'
        ? '計算できませんでした'
        : '店舗・プラン・キャンペーン・利用開始日を選択';

  const proratedField = (
    <FormItem>
      <FormLabel>初月会費（日割）</FormLabel>
      <FormControl>
        <Input
          readOnly
          value={fees.proratedFee !== null ? formatYen(fees.proratedFee) : ''}
          placeholder={placeholder}
        />
      </FormControl>
      <p className="text-muted-foreground text-xs">利用開始日から月末までの日割りで自動計算</p>
    </FormItem>
  );
  const monthlyField = (
    <FormItem>
      <FormLabel>翌月会費</FormLabel>
      <FormControl>
        <Input
          readOnly
          value={fees.monthlyFee !== null ? formatYen(fees.monthlyFee) : ''}
          placeholder={estimateState === 'ready' ? '—' : placeholder}
        />
      </FormControl>
      <p className="text-muted-foreground text-xs">プランの月額から自動適用</p>
    </FormItem>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>入会金・先払い費用</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {brand === 'FIT365' ? (
          <div className="grid grid-cols-2 gap-4">
            <FormItem>
              <FormLabel>カード発行料</FormLabel>
              <FormControl>
                <Input
                  readOnly
                  value={fees.cardIssuanceFee !== null ? formatYen(fees.cardIssuanceFee) : ''}
                  placeholder={placeholder}
                />
              </FormControl>
              <p className="text-muted-foreground text-xs">{CARD_ISSUANCE_FEE_HINT}</p>
            </FormItem>
            {proratedField}
            {monthlyField}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* B12 (closed 2026-10-07): the create API takes no 入会金 selection — the plan's own
                enrolment fee applies. The master select is kept, read-only, showing it. */}
            <FormItem>
              <FormLabel>入会金（マスタ参照）</FormLabel>
              <FormControl>
                <Input
                  readOnly
                  disabled
                  value={
                    fees.enrollmentFee !== null
                      ? `プランの入会金（${formatYen(fees.enrollmentFee)}）`
                      : ''
                  }
                  placeholder={placeholder}
                />
              </FormControl>
              <p className="text-muted-foreground text-xs">
                プランの入会金を自動適用（入会金マスタからの選択はAPI未対応）
              </p>
            </FormItem>
            <FormItem>
              <FormLabel>金額（マスタから自動適用）</FormLabel>
              <FormControl>
                <Input
                  readOnly
                  value={
                    fees.enrollmentFee !== null
                      ? formatYen(fees.enrollmentFee - fees.enrollmentFeeDiscount)
                      : ''
                  }
                  placeholder="—"
                />
              </FormControl>
              {/* The campaign discount is folded into 入会金 (prototype 9/17). */}
              {fees.enrollmentFee !== null && fees.enrollmentFeeDiscount > 0 && (
                <p className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground line-through">
                    {formatYen(fees.enrollmentFee)}
                  </span>
                  <span className="text-success font-medium whitespace-nowrap">
                    -{formatYen(fees.enrollmentFeeDiscount)}
                  </span>
                  <span className="text-muted-foreground">キャンペーン割引（{campaignLabel}）</span>
                </p>
              )}
            </FormItem>
            <FormItem>
              <FormLabel>登録事務手数料</FormLabel>
              <FormControl>
                <Input
                  readOnly
                  value={fees.registrationFee !== null ? formatYen(fees.registrationFee) : ''}
                  placeholder={placeholder}
                />
              </FormControl>
              <p className="text-muted-foreground text-xs">{REGISTRATION_FEE_HINT}</p>
            </FormItem>
            {proratedField}
            {monthlyField}
          </div>
        )}
        <Separator />
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground text-sm">合計</span>
            <span className="text-lg font-semibold">
              {fees.total !== null ? formatYen(fees.total) : '—'}
            </span>
          </div>
          {estimateState === 'error' && (
            <p className="text-destructive text-xs">
              費用を計算できませんでした。選択内容を確認してください。
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
