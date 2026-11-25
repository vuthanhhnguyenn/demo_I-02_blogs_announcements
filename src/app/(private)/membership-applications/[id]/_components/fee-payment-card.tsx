'use client';

import { formatYen } from '@/utils/format.util';
import { CheckCircle, Info } from 'lucide-react';

import { RequiredMark } from '@/components/common/field-marker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

import { staffWaiverReasonSchema, textError } from '../../_schemas/application-text.schema';
import {
  type ApplicationDetail,
  PAYMENT_METHOD_LABELS,
  isCardPayment,
  isReviewable,
  toFeeRows,
  uiStatusOf,
  waiverStateOf,
  waiverWord,
} from './membership-application.utils';

interface FeePaymentCardProps {
  app: ApplicationDetail;
  staffExemptionOpen: boolean;
  staffExemptionReason: string;
  onStaffExemptionOpenChange: (open: boolean) => void;
  onStaffExemptionReasonChange: (reason: string) => void;
}

function Field({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <span className="text-sm wrap-anywhere">{value}</span>
    </div>
  );
}

/**
 * FR-M006 fee breakdown + the 入会金 waiver block (FR-025 / FR-026).
 *
 * The rows come from `calculatedAmounts` (§4.3, amounts as served) and the total is
 * `totalInitial` as served — never re-summed. Which waiver applies is decided by the
 * server (`enrollmentFeeWaiver` / `reenrollmentWaiver`, D9); the client only previews a
 * reviewer-entered staff reason until approve persists it.
 */
export function FeePaymentCard({
  app,
  staffExemptionOpen,
  staffExemptionReason,
  onStaffExemptionOpenChange,
  onStaffExemptionReasonChange,
}: Readonly<FeePaymentCardProps>) {
  const amounts = app.calculatedAmounts;
  const feeRows = toFeeRows(amounts);
  // Older rows carry an all-null snapshot — say so instead of a column of 「—」.
  const notComputed = amounts.totalInitial === null && feeRows.every((r) => r.amount === null);
  const waiverState = waiverStateOf(app, staffExemptionReason);
  const reviewable = isReviewable(uiStatusOf(app));
  const campaignName = app.campaign?.name ?? null;

  const waiverType = waiverState?.waiver?.type;
  const campaignApplies = waiverType === 'campaign';
  const rejoinApplies = waiverType === 'reenrollment';
  const alreadyStaffExempt = waiverType === 'staff' && !waiverState?.staffWaiverAvailable;
  const panelOpen = staffExemptionOpen || alreadyStaffExempt;
  // The 「個別に免除する」 affordance: reviewable, no server waiver yet, 入会金 > 0 (DTO note).
  const staffPanelEligible = !!waiverState?.staffWaiverAvailable || alreadyStaffExempt;
  const discount = waiverState?.discount ?? 0;
  const waiverReasonError = alreadyStaffExempt
    ? undefined
    : textError(staffWaiverReasonSchema, staffExemptionReason.trim());
  const localStaffPreview =
    !!waiverState?.staffWaiverAvailable && staffExemptionReason.trim().length > 0;
  const total =
    amounts.totalInitial != null ? amounts.totalInitial - (localStaffPreview ? discount : 0) : null;

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="px-4 pt-4 pb-3">
        <CardTitle className="text-sm">費用・決済情報</CardTitle>
      </CardHeader>
      {/* Fixed layout: the 金額 column keeps its width, so the waiver reason input (and a long
          unbroken reason) wraps inside 項目 instead of widening the table (BUG-B-10 / C-BUG-04). */}
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs font-semibold first:pl-4 last:pr-4">項目</TableHead>
            <TableHead className="w-36 text-right text-xs font-semibold first:pl-4 last:pr-4">
              金額
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {notComputed && (
            <TableRow>
              <TableCell colSpan={2} className="text-muted-foreground text-sm first:pl-4">
                費用内訳が計算されていません
              </TableCell>
            </TableRow>
          )}
          {!notComputed &&
            feeRows.map((row) => {
              const showExemptionUi = row.isEnrollmentFee && reviewable && waiverState;
              const discounted = row.isEnrollmentFee && row.amount !== null && discount > 0;

              return (
                <TableRow key={row.key}>
                  <TableCell className="text-sm wrap-anywhere whitespace-normal first:pl-4 last:pr-4">
                    {row.label}
                    {showExemptionUi && (
                      <div className="mt-2 flex flex-col gap-2">
                        {campaignApplies && (
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant="outline"
                              className="bg-info/15 text-info border-info/20 w-fit gap-1 text-[10px]"
                            >
                              <Info className="size-3" />
                              キャンペーン{waiverWord(waiverState)}（自動）
                            </Badge>
                            <p className="text-info text-xs">適用: {campaignName ?? '—'}</p>
                          </div>
                        )}
                        {/* Re-enrolment rule row — hidden entirely when the brand has no rule. */}
                        {!campaignApplies && waiverState.rule && (
                          <div className="flex flex-col gap-1">
                            <p className="text-muted-foreground text-[10px]">
                              再入会免除規則: 退会後{' '}
                              <span className="text-foreground font-medium">
                                {waiverState.rule.ruleDays}日
                              </span>{' '}
                              以内
                            </p>
                            {app.member.previousWithdrawalDate ? (
                              rejoinApplies || waiverState.rule.eligible ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className="bg-success/15 text-success border-success/20 gap-1 text-[10px]"
                                  >
                                    <CheckCircle className="size-3" />
                                    再入会免除に該当（自動）
                                  </Badge>
                                  <span className="text-muted-foreground text-[10px]">
                                    前回退会 {app.member.previousWithdrawalDate}・
                                    {waiverState.rule.ruleDays}日以内
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className="bg-muted text-muted-foreground border-border gap-1 text-[10px]"
                                  >
                                    再入会免除 非該当
                                  </Badge>
                                  <span className="text-muted-foreground text-[10px]">
                                    前回退会 {app.member.previousWithdrawalDate}・
                                    {waiverState.rule.ruleDays}日超過
                                  </span>
                                </div>
                              )
                            ) : (
                              <span className="text-muted-foreground text-[10px]">
                                前回退会履歴なし
                              </span>
                            )}
                          </div>
                        )}
                        {staffPanelEligible && (
                          <div className="flex flex-col gap-2">
                            {!panelOpen ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground h-6 w-fit px-2 text-xs"
                                onClick={() => onStaffExemptionOpenChange(true)}
                              >
                                個別に免除する
                              </Button>
                            ) : (
                              <div className="border-border/50 bg-muted/20 flex flex-col gap-2 rounded-md border p-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-medium">
                                    免除理由
                                    <RequiredMark />
                                  </Label>
                                  {!alreadyStaffExempt && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-muted-foreground h-5 px-1 text-[10px]"
                                      onClick={() => {
                                        onStaffExemptionOpenChange(false);
                                        onStaffExemptionReasonChange('');
                                      }}
                                    >
                                      取消
                                    </Button>
                                  )}
                                </div>
                                <Textarea
                                  placeholder="免除理由を入力してください（必須）..."
                                  rows={2}
                                  aria-invalid={!!waiverReasonError}
                                  className="max-h-40 overflow-y-auto text-xs wrap-anywhere"
                                  readOnly={alreadyStaffExempt}
                                  value={
                                    alreadyStaffExempt
                                      ? (waiverState.waiver?.reason ?? '')
                                      : staffExemptionReason
                                  }
                                  onChange={(e) => onStaffExemptionReasonChange(e.target.value)}
                                />
                                {waiverReasonError && (
                                  <p className="text-destructive text-xs">{waiverReasonError}</p>
                                )}
                                <p className="text-muted-foreground text-[10px]">
                                  スタッフの裁量による例外的な個別免除です。理由は承認ログに記録されます。
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right align-top text-sm first:pl-4 last:pr-4">
                    {discounted ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-muted-foreground text-xs line-through">
                          {formatYen(row.amount)}
                        </span>
                        <span className="text-success font-medium">
                          {formatYen((row.amount ?? 0) - discount)}
                        </span>
                        <span className="text-success text-[10px]">-{formatYen(discount)}</span>
                      </div>
                    ) : row.isDiscount ? (
                      <span className="text-success">-{formatYen(row.amount)}</span>
                    ) : (
                      formatYen(row.amount)
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          <TableRow className="bg-muted/50 border-t-2">
            <TableCell className="text-sm font-medium first:pl-4 last:pr-4">合計</TableCell>
            <TableCell className="text-right text-sm font-medium first:pl-4 last:pr-4">
              <span className={discount > 0 ? 'text-success' : undefined}>{formatYen(total)}</span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <Separator className="my-0" />
      <div className="flex flex-col gap-3 px-4 py-3">
        <Field
          label="支払方法"
          value={app.paymentMethod ? (PAYMENT_METHOD_LABELS[app.paymentMethod] ?? '—') : '—'}
        />
        {app.paymentMethod && !isCardPayment(app) && (
          <Alert className="border-info/50 bg-info/10 py-2">
            <Info className="text-info size-4" />
            <AlertDescription className="text-info text-xs">
              JACCS（口座振替）利用者のため、初回請求は翌月合算になるケースがあります。請求タイミングにご注意ください。
            </AlertDescription>
          </Alert>
        )}
      </div>
    </Card>
  );
}
