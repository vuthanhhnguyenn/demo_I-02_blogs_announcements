'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { formatDateYYYYMMDD } from '@/utils/date.util';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import { useSingleFlight } from '@/hooks/use-single-flight';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

import {
  adminRefundControllerCreateMutation,
  adminTransactionControllerDetailOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';

import { Permission } from '@/types/permission.type';

import { formatYen, getPaymentMethodLabel } from '../../_constants/sales-labels.constant';
import { parseRefundAmount } from '../../_utils/refund-amount.util';
import {
  type BillingRefundRequestDialogValues,
  REFUND_REASON_MAX,
  billingRefundRequestDialogSchema,
} from '../_schemas/billing-refund-request-dialog.schema';
import {
  type BillingDetail,
  type RefundDialogAlert,
  SBPS_VOID_WINDOW_DAYS,
  formatSignedYen,
  getRefundDialogAlert,
  invalidateBillingQueries,
  isBillingConfirmed,
} from '../_utils/billing-detail-api.util';

function formatPaidAt(paidAt: string | null): string {
  return paidAt ? formatDateYYYYMMDD(paidAt) : '—';
}

/** FR-004 決済方法別 Alert (動的分岐) — copy per sale `alertVariant` (API-116 BR-TXN-001) */
function RefundMethodAlert({
  alert,
  methodLabel,
}: Readonly<{ alert: RefundDialogAlert; methodLabel: string }>) {
  switch (alert.kind) {
    case 'sbps_void':
      return (
        <Alert className="bg-info/15 border-info/20 text-info">
          <AlertTriangle className="size-4" />
          <AlertDescription className="text-xs">
            {`この請求は SBPS 決済です（決済日 ${formatPaidAt(alert.paidAt)}・${SBPS_VOID_WINDOW_DAYS}日以内が対象）。`}
            {
              '承認時に、全額返金は SBPS 取消、一部返金は SBPS 金額変更（1取引につき1回のみ・購入から約25日以内が目安）で返金されます。'
            }
          </AlertDescription>
        </Alert>
      );
    case 'sbps_past_window':
      return (
        <Alert className="bg-warning/15 border-warning/20 text-warning">
          <AlertTriangle className="size-4" />
          <AlertDescription className="text-xs">
            この請求は SBPS 決済です。決済日（{formatPaidAt(alert.paidAt)}）から
            {SBPS_VOID_WINDOW_DAYS}日を超過しているため、SBPS
            取消での返金はできません。別途対応（銀行振込等での返金）をご検討ください。
          </AlertDescription>
        </Alert>
      );
    case 'jaccs_manual':
      return (
        <Alert className="bg-info/15 border-info/20 text-info">
          <AlertTriangle className="size-4" />
          <AlertDescription className="text-xs">
            この請求は <span className="font-semibold">{methodLabel}</span>{' '}
            決済です。承認後、手動返金または CASHPOST での対応が必要です。
          </AlertDescription>
        </Alert>
      );
    case 'cash_onsite':
      return (
        <Alert className="bg-info/15 border-info/20 text-info">
          <AlertTriangle className="size-4" />
          <AlertDescription className="text-xs">
            この請求は <span className="font-semibold">{methodLabel}</span>{' '}
            決済です。承認後、手動での返金対応が必要です。
          </AlertDescription>
        </Alert>
      );
    case 'none':
      return null;
  }
}

interface BillingRefundRequestDialogProps {
  detail: BillingDetail;
}

/**
 * 返金申請 (FR-004) — API-118 §4 `POST refund-applications`. Each line is capped at the API's
 * `items[].refundableAmount` (S1, FR-004 Dev Q&A 08-24 — the FE never recomputes it).
 */
export function BillingRefundRequestDialog({ detail }: Readonly<BillingRefundRequestDialogProps>) {
  const queryClient = useQueryClient();
  const { header, items, payments } = detail;
  const [open, setOpen] = useState(false);
  const [isFullRefund, setIsFullRefund] = useState(true);
  const [lineAmounts, setLineAmounts] = useState<Record<string, string>>({});
  const [now] = useState(() => Date.now());

  const form = useForm<BillingRefundRequestDialogValues>({
    resolver: zodResolver(billingRefundRequestDialogSchema),
    mode: 'onSubmit',
    defaultValues: { reason: '' },
  });

  // `refundApplyContext` lives on the API-116 sale detail (sourceId = billingId), not on API-114
  const { data: saleDetail } = useQuery({
    ...adminTransactionControllerDetailOptions({
      path: { transactionType: 'sale', sourceId: header.billingId },
    }),
    enabled: open,
  });
  const refundApplyContext =
    saleDetail?.transactionType === 'sale' ? saleDetail.refundApplyContext : null;
  const alert = getRefundDialogAlert(payments, refundApplyContext, now);
  const latestPayment = payments.find((payment) => payment.paidAt) ?? payments[0];
  const methodLabel = getPaymentMethodLabel(latestPayment?.paymentMethod);

  const refundableLines = items.filter((item) => item.refundableAmount > 0);
  // v0.12.3 header cap: discount lines make Σ items[].refundableAmount exceed what was collected
  const totalRefundable = Math.min(
    header.refundableAmount,
    refundableLines.reduce((sum, item) => sum + item.refundableAmount, 0),
  );
  // 全額返金: lines take their balance in order until the billing-level cap is used up
  const fullRefundAmounts = new Map<string, number>();
  refundableLines.reduce((remaining, item) => {
    const amount = Math.min(item.refundableAmount, remaining);
    fullRefundAmounts.set(item.billingItemId, amount);
    return remaining - amount;
  }, totalRefundable);
  const blockedReason = !isBillingConfirmed(header)
    ? '未確定の請求のため返金申請できません。請求を確定し、入金確認後に申請してください'
    : totalRefundable === 0
      ? '返金可能残高が0円のため返金申請できません（承認済み・承認待ちの返金で請求額に達しています）'
      : null;

  // Half-width digits only, as in the 取引一覧 dialog: `-1`, `10.5`, `1e3` read as NaN (malformed)
  const lineAmount = (billingItemId: string) => {
    const raw = (lineAmounts[billingItemId] ?? '').trim();
    return raw === '' ? 0 : (parseRefundAmount(raw) ?? Number.NaN);
  };
  const isMalformed = (billingItemId: string) => Number.isNaN(lineAmount(billingItemId));
  // FR-004 異常系: an amount above the line's refundable balance is refused on the FE too
  const isOverLine = (item: (typeof refundableLines)[number]) =>
    lineAmount(item.billingItemId) > item.refundableAmount;
  // Only valid amounts count, so 返金合計 never shows ¥-1 / ¥10.5 / over the balance (Bug-No4: a
  // huge amount stretched the dialog) — the line's own message explains why it was left out
  const totalRefund = isFullRefund
    ? totalRefundable
    : refundableLines.reduce(
        (sum, item) =>
          sum +
          (isMalformed(item.billingItemId) || isOverLine(item)
            ? 0
            : lineAmount(item.billingItemId)),
        0,
      );
  const hasMalformedLine =
    !isFullRefund && refundableLines.some((item) => isMalformed(item.billingItemId));
  const hasOverLine = !isFullRefund && refundableLines.some(isOverLine);
  const isOverTotal = totalRefund > totalRefundable;
  const hasInvalidLine = hasMalformedLine || hasOverLine || isOverTotal;
  // API-118 E-REF-007: past the SBPS 90-day window the application is refused — block it here
  const isPastSbpsWindow = alert.kind === 'sbps_past_window';
  const isPartialRefund = !isFullRefund && totalRefund > 0 && totalRefund < totalRefundable;

  // API-118 §16.3 Idempotency-Key: a retry after a timeout replays the first response instead of
  // creating a second application — one key per request body, dropped when the dialog resets
  const [idempotencyKeys] = useState(() => new Map<string, string>());

  const reset = () => {
    setIsFullRefund(true);
    setLineAmounts({});
    form.reset();
    idempotencyKeys.clear();
  };

  const { acquire, release } = useSingleFlight();

  const mutation = useMutation({
    ...adminRefundControllerCreateMutation(),
    onSettled: release,
    onSuccess: () => {
      invalidateBillingQueries(queryClient);
      toast.success('返金申請を送信しました。一つ上の権限ロールへ承認依頼を通知します');
      reset();
      setOpen(false);
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    if (totalRefund <= 0 || hasInvalidLine || isPastSbpsWindow || !acquire()) return;
    const lines = refundableLines
      .map((item) => ({
        billingId: header.billingId,
        billingItemId: item.billingItemId,
        refundAmount: isFullRefund
          ? (fullRefundAmounts.get(item.billingItemId) ?? 0)
          : lineAmount(item.billingItemId),
      }))
      .filter((line) => line.refundAmount > 0);
    const body = { memberId: header.memberId, applicationReason: values.reason, lines };
    const bodyKey = JSON.stringify(body);
    const idempotencyKey = idempotencyKeys.get(bodyKey) ?? crypto.randomUUID();
    idempotencyKeys.set(bodyKey, idempotencyKey);
    mutation.mutate({ body, headers: { 'Idempotency-Key': idempotencyKey } });
  });

  const handleOpenChange = (next: boolean) => {
    // Esc / overlay / キャンセル wait for the request: closing mid-run would reset the form under it
    if (!next && mutation.isPending) return;
    setOpen(next);
    if (!next) reset();
  };

  return (
    <>
      <RoleGatedButton
        requiredPermission={Permission.SalesRefundInitiate}
        denyTooltip="返金申請の権限がありません"
        variant="outline"
        size="sm"
        className="text-destructive border-destructive/20 hover:bg-destructive/15 h-7 gap-1 text-xs"
        disabled={blockedReason !== null}
        // FR-004: a disabled button swallows hover, so the reason goes through the wrapper tooltip
        tooltip={blockedReason ?? undefined}
        onClick={() => setOpen(true)}
      >
        <RotateCcw className="size-3" />
        返金申請
      </RoleGatedButton>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-140">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">返金申請</DialogTitle>
            <DialogDescription className="text-xs">
              承認後、決済方法に応じた返金処理へ進みます
            </DialogDescription>
          </DialogHeader>

          <RefundMethodAlert alert={alert} methodLabel={methodLabel} />

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <Label className="text-xs">全額返金</Label>
                <p className="text-muted-foreground mt-0.5 text-[10px]">
                  ONで返金可能残高の全額、OFFで明細ごとに返金額を指定
                </p>
              </div>
              <Switch checked={isFullRefund} onCheckedChange={setIsFullRefund} />
            </div>

            {/* 全額返金 ON shows the same lines read-only, so the user sees what each line returns */}
            {refundableLines.length > 0 && (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="h-8 px-3 text-[10px] font-semibold">明細</TableHead>
                      <TableHead className="h-8 px-3 text-right text-[10px] font-semibold">
                        請求額
                      </TableHead>
                      <TableHead className="h-8 px-3 text-right text-[10px] font-semibold">
                        返金可能残高
                      </TableHead>
                      <TableHead className="h-8 w-35 px-3 text-right text-[10px] font-semibold">
                        返金額
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {refundableLines.map((item) => {
                      const isOver =
                        !isFullRefund && (isOverLine(item) || isMalformed(item.billingItemId));
                      return (
                        <TableRow key={item.billingItemId}>
                          <TableCell className="px-3 py-2 text-xs">
                            {item.description ?? item.itemType}
                          </TableCell>
                          <TableCell className="text-muted-foreground px-3 py-2 text-right text-xs tabular-nums">
                            {formatSignedYen(item.amountWithTax)}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-right text-xs tabular-nums">
                            {formatYen(item.refundableAmount)}
                          </TableCell>
                          <TableCell className="px-3 py-2">
                            {isFullRefund ? (
                              <p className="text-right text-xs tabular-nums">
                                {formatYen(fullRefundAmounts.get(item.billingItemId) ?? 0)}
                              </p>
                            ) : (
                              <div className="relative">
                                <Input
                                  inputMode="numeric"
                                  aria-invalid={isOver}
                                  className={`h-7 pr-6 text-right text-xs tabular-nums ${isOver ? 'border-destructive' : ''}`}
                                  value={lineAmounts[item.billingItemId] ?? ''}
                                  onChange={(event) =>
                                    setLineAmounts((prev) => ({
                                      ...prev,
                                      [item.billingItemId]: event.target.value,
                                    }))
                                  }
                                />
                                <span className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 text-[10px]">
                                  円
                                </span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {hasMalformedLine && (
                  <p className="text-destructive px-3 py-2 text-[10px]">
                    返金額は0以上の整数（円）で入力してください
                  </p>
                )}
                {!hasMalformedLine && (hasOverLine || isOverTotal) && (
                  <p className="text-destructive px-3 py-2 text-[10px]">
                    返金可能残高を超える金額は申請できません（承認済み・承認待ちの返金額を差し引いた残高が上限です）
                  </p>
                )}
              </div>
            )}

            <div className="bg-muted/50 flex items-center justify-between rounded-md px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">返金合計</span>
                {isPartialRefund && (
                  <Badge
                    variant="outline"
                    className="bg-warning/15 text-warning border-warning/20 px-1 py-0 text-[10px]"
                  >
                    部分返金
                  </Badge>
                )}
              </div>
              <span className="text-sm font-bold tabular-nums">
                {formatYen(totalRefund)}
                <span className="text-muted-foreground text-xs font-normal">
                  {' '}
                  / 返金可能残高 {formatYen(totalRefundable)}
                </span>
              </span>
            </div>

            {/* 確認ダイアログの理由入力は「ユーザーが取り戻したい未保存データ」ではないため、
                離脱・ログアウト・ダイアログを閉じる操作を破棄確認で止めない。 */}
            <Form {...form} guardUnsaved={false}>
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">
                      返金事由 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-20 text-sm"
                        placeholder="返金事由を具体的に記載してください"
                        maxLength={REFUND_REASON_MAX}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Form>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              disabled={mutation.isPending}
              onClick={() => handleOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button
              size="sm"
              disabled={
                totalRefund <= 0 || hasInvalidLine || isPastSbpsWindow || mutation.isPending
              }
              onClick={handleSubmit}
            >
              申請
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
