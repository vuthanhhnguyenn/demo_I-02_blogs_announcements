'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { useSingleFlight } from '@/hooks/use-single-flight';

import { Error as ErrorState } from '@/components/common/data-state-boundary/error';
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
import { Skeleton } from '@/components/ui/skeleton';
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
  adminSalesBillingControllerDetailOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { Api114BillingItemDto, TransactionRowDto } from '@/lib/api-real/types.gen';

import { formatYen } from '../../_constants/sales-labels.constant';
import { parseRefundAmount } from '../../_utils/refund-amount.util';
import { invalidateRefundQueries } from '../../refunds/_utils/refund-api.util';
import {
  REFUND_REASON_MAX_LENGTH,
  type TransactionRefundRequestDialogSubmitValues,
  type TransactionRefundRequestDialogValues,
  createTransactionRefundRequestDialogSchema,
} from '../_schemas/transaction-refund-request-dialog.schema';
import { TRANSACTION_REFUND_ALERT_MESSAGES } from '../_utils/transaction-labels.util';

/** Lets the outer Dialog see the inner form's in-flight submit (it owns the mutation) */
const REFUND_REQUEST_MUTATION_KEY = ['transactions', 'refund-request'] as const;

const toFullAmount = (cap: number | undefined) => (cap && cap > 0 ? String(cap) : '');

interface TransactionRefundRequestDialogProps {
  /** A `sale` row (one billing line, API-116 v0.7.3) whose `refundApplyContext.applicable` is true */
  row: TransactionRowDto | null;
  onOpenChange: (open: boolean) => void;
}

export function TransactionRefundRequestDialog({
  row,
  onOpenChange,
}: Readonly<TransactionRefundRequestDialogProps>) {
  const isSubmitting = useIsMutating({ mutationKey: REFUND_REQUEST_MUTATION_KEY }) > 0;
  return (
    <Dialog
      open={row !== null}
      // Esc / overlay must not unmount the form mid-submit
      onOpenChange={(open) => {
        if (!open && isSubmitting) return;
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-170">
        {row?.billingId && row.billingItemId && (
          // Keyed by the row so switching rows always starts from a clean form
          <TransactionRefundRequestBody
            key={row.rowKey}
            row={row}
            billingId={row.billingId}
            billingItemId={row.billingItemId}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface TransactionRefundRequestBodyProps {
  row: TransactionRowDto;
  billingId: string;
  billingItemId: string;
  onClose: () => void;
}

/** D5: load the billing on open for the line's 明細名; the refund covers this row's line only */
function TransactionRefundRequestBody({
  row,
  billingId,
  billingItemId,
  onClose,
}: Readonly<TransactionRefundRequestBodyProps>) {
  const { data, isLoading, isError, refetch } = useQuery(
    adminSalesBillingControllerDetailOptions({ path: { billingId } }),
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-base font-bold">返金申請</DialogTitle>
        <DialogDescription className="text-xs">
          請求 {data?.header.publicId ?? billingId} の明細 {billingItemId.slice(-8)}{' '}
          の返金額を指定して申請します。承認後、決済方法に応じた返金処理へ進みます。
        </DialogDescription>
      </DialogHeader>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {data && (
        <TransactionRefundRequestForm
          row={row}
          billingId={billingId}
          items={data.items.filter((item) => item.billingItemId === billingItemId)}
          headerRefundable={data.header.refundableAmount}
          onClose={onClose}
        />
      )}
    </>
  );
}

interface TransactionRefundRequestFormProps {
  row: TransactionRowDto;
  billingId: string;
  items: Api114BillingItemDto[];
  /** v0.12.3 header cap — discount lines can leave a line's balance above what was collected */
  headerRefundable: number;
  onClose: () => void;
}

function TransactionRefundRequestForm({
  row,
  billingId,
  items,
  headerRefundable,
  onClose,
}: Readonly<TransactionRefundRequestFormProps>) {
  const queryClient = useQueryClient();
  // List row (v0.7.3): `applicableAmount` is this line's remainder — the tighter of it and the
  // detail's per-item cap wins if the two reads raced
  const lineCap = row.refundApplyContext?.applicableAmount ?? 0;
  const caps = items.map((item) => Math.min(item.refundableAmount, lineCap, headerRefundable));
  const totalRefundable = caps.reduce((sum, cap) => sum + cap, 0);

  const form = useForm<
    TransactionRefundRequestDialogValues,
    unknown,
    TransactionRefundRequestDialogSubmitValues
  >({
    resolver: zodResolver(createTransactionRefundRequestDialogSchema(caps)),
    // 送信 is disabled while an amount is invalid, so the reason has to show as the user types
    mode: 'onChange',
    // FR-004 (prototype): 全額返金 is ON by default — every line at its refundable balance
    defaultValues: {
      lines: items.map((item, index) => ({
        billingItemId: item.billingItemId,
        amount: toFullAmount(caps[index]),
      })),
      reason: '',
    },
  });

  const [isFullRefund, setIsFullRefund] = useState(true);
  const handleFullRefundChange = (checked: boolean) => {
    setIsFullRefund(checked);
    caps.forEach((cap, index) => {
      form.setValue(`lines.${index}.amount`, checked ? toFullAmount(cap) : '');
    });
    form.clearErrors('lines');
  };

  const lines = useWatch({ control: form.control, name: 'lines' }) ?? [];
  // Only valid amounts count, so 返金合計 never shows ¥-1 / ¥10.5 / over the balance (validation
  // shows the error); 送信 stays disabled while any amount is invalid or the total is 0
  const parsedAmounts = lines.map((line) => {
    const raw = line?.amount?.trim() ?? '';
    return raw === '' ? 0 : parseRefundAmount(raw);
  });
  const hasInvalidAmount = parsedAmounts.some(
    (amount, index) => amount === null || amount > (caps[index] ?? 0),
  );
  const totalAmount = parsedAmounts.reduce<number>(
    (sum, amount, index) => (amount !== null && amount <= (caps[index] ?? 0) ? sum + amount : sum),
    0,
  );
  const isPartial = totalAmount > 0 && totalAmount < totalRefundable;
  const linesError = form.formState.errors.lines;
  const linesErrorMessage = linesError?.message ?? linesError?.root?.message;

  // Error toasts come from the shared MutationCache (D15)
  const { acquire, release } = useSingleFlight();
  const mutation = useMutation({
    ...adminRefundControllerCreateMutation(),
    mutationKey: REFUND_REQUEST_MUTATION_KEY,
    onSettled: release,
    onSuccess: (result) => {
      // A new application also changes the refund queue, 承認待ち banner, balances and receivables
      invalidateRefundQueries(queryClient, result.id);
      toast.success('返金申請を送信しました', {
        description: `${formatYen(totalAmount)}（${isPartial ? '部分返金' : '全額返金'}）。一つ上の権限ロールへ承認依頼を通知しました。`,
      });
      onClose();
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    const refundLines = values.lines.flatMap((line) => {
      const amount = Number(line.amount.trim() || 0);
      return amount > 0
        ? [{ billingId, billingItemId: line.billingItemId, refundAmount: amount }]
        : [];
    });
    if (!acquire()) return;
    mutation.mutate({
      body: {
        memberId: row.memberId,
        applicationReason: values.reason.trim(),
        lines: refundLines,
      },
    });
  });

  const alertVariant = row.refundApplyContext?.alertVariant;

  return (
    <>
      {alertVariant && (
        <Alert className="bg-info/10 border-info/20 text-info">
          <AlertTriangle className="size-4" />
          <AlertDescription className="text-xs">
            {TRANSACTION_REFUND_ALERT_MESSAGES[alertVariant]}
          </AlertDescription>
        </Alert>
      )}

      {/* 確認ダイアログの理由入力は「ユーザーが取り戻したい未保存データ」ではないため、
          離脱・ログアウト・ダイアログを閉じる操作を破棄確認で止めない。 */}
      <Form {...form} guardUnsaved={false}>
        <div className="space-y-4">
          <div className="bg-muted/50 space-y-1 rounded-lg border px-3 py-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">会員</span>
              <span className="font-medium">
                {row.memberName ?? '—'}（{row.memberCode ?? row.memberId}）
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">返金可能残高</span>
              <span className="font-medium tabular-nums">{formatYen(totalRefundable)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="mb-2 flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <Label className="text-xs">全額返金</Label>
                <p className="text-muted-foreground mt-0.5 text-[10px]">OFFで返金額を指定</p>
              </div>
              <Switch checked={isFullRefund} onCheckedChange={handleFullRefundChange} />
            </div>
            <span className="text-xs font-medium">
              返金明細 <span className="text-destructive">*</span>
            </span>
            <div className="max-h-64 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="px-3 py-2 text-xs font-semibold">明細</TableHead>
                    <TableHead className="px-3 py-2 text-right text-xs font-semibold">
                      税率
                    </TableHead>
                    <TableHead className="px-3 py-2 text-right text-xs font-semibold">
                      税込額
                    </TableHead>
                    <TableHead className="px-3 py-2 text-right text-xs font-semibold">
                      返金可能残高
                    </TableHead>
                    <TableHead className="w-36 px-3 py-2 text-xs font-semibold">返金額</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.billingItemId}>
                      <TableCell className="px-3 py-2">
                        <div className="text-xs">{item.description ?? item.itemType}</div>
                        <div className="text-muted-foreground font-mono text-[10px]">
                          {item.billingItemId}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right text-xs">
                        {item.taxRate}%
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right text-xs tabular-nums">
                        {formatYen(item.amountWithTax)}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right text-xs font-medium tabular-nums">
                        {formatYen(caps[index] ?? 0)}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <FormField
                          control={form.control}
                          name={`lines.${index}.amount`}
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    inputMode="numeric"
                                    className="h-8 pr-8 text-right text-sm tabular-nums"
                                    placeholder="0"
                                    disabled={isFullRefund || (caps[index] ?? 0) <= 0}
                                    {...field}
                                  />
                                  <span className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 text-xs">
                                    円
                                  </span>
                                </div>
                              </FormControl>
                              <FormMessage className="text-[10px]" />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {linesErrorMessage && <p className="text-destructive text-xs">{linesErrorMessage}</p>}
          </div>

          <div className="bg-muted/50 flex items-center justify-between rounded-md px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">返金合計</span>
              {isPartial && (
                <Badge
                  variant="outline"
                  className="bg-info/15 text-info border-info/20 px-1 py-0 text-[10px]"
                >
                  部分返金
                </Badge>
              )}
            </div>
            <span className="text-sm font-bold tabular-nums">{formatYen(totalAmount)}</span>
          </div>

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
                    maxLength={REFUND_REASON_MAX_LENGTH}
                    placeholder="返金事由を具体的に記載してください"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>

      <DialogFooter>
        <Button variant="outline" size="sm" disabled={mutation.isPending} onClick={onClose}>
          キャンセル
        </Button>
        <Button
          size="sm"
          disabled={mutation.isPending || totalAmount <= 0 || hasInvalidAmount}
          onClick={handleSubmit}
        >
          返金申請を送信
        </Button>
      </DialogFooter>
    </>
  );
}
