'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { toSelectItems } from '@/utils/app.util';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useSingleFlight } from '@/hooks/use-single-flight';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { adminRefundControllerBulkCreateMutation } from '@/lib/api-real/@tanstack/react-query.gen';
import type { RefundBulkCreateFailedDto } from '@/lib/api-real/types.gen';

import {
  BULK_REFUND_FAILURE_LABELS,
  REFUND_REASON_CODE_LABELS,
} from '../_constants/sales-labels.constant';
import {
  type BulkRefundReasonCode,
  type SalesBulkRefundDialogSubmitValues,
  type SalesBulkRefundDialogValues,
  salesBulkRefundDialogSchema,
} from '../_schemas/sales-bulk-refund-dialog.schema';
import { invalidateSalesBillingQueries } from '../_utils/sales-query.util';

const REASON_CODE_OPTIONS = (Object.keys(REFUND_REASON_CODE_LABELS) as BulkRefundReasonCode[]).map(
  (value) => ({ value, label: REFUND_REASON_CODE_LABELS[value] }),
);

/** API-118 §4B: 1–200 billing ids (E-REF-009) */
const BULK_REFUND_MAX_IDS = 200;

interface SalesBulkRefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billingRecordIds: string[];
  /** `billingId` → 請求ID (`publicId`) for the per-billing failure list */
  publicIdById?: ReadonlyMap<string, string>;
  onSuccess?: () => void;
}

export function SalesBulkRefundDialog({
  open,
  onOpenChange,
  billingRecordIds,
  publicIdById,
  onSuccess,
}: Readonly<SalesBulkRefundDialogProps>) {
  const queryClient = useQueryClient();
  const [failures, setFailures] = useState<RefundBulkCreateFailedDto[]>([]);
  const [hasPartialSuccess, setHasPartialSuccess] = useState(false);

  const form = useForm<SalesBulkRefundDialogValues, unknown, SalesBulkRefundDialogSubmitValues>({
    resolver: zodResolver(salesBulkRefundDialogSchema),
    mode: 'onSubmit',
    defaultValues: { reason_code: '', detail: '' },
  });

  const { acquire, release } = useSingleFlight();
  // API-118 §4B: a retry after a timeout replays the first response instead of applying twice —
  // one key per request body, kept while the screen is open
  const [idempotencyKeys] = useState(() => new Map<string, string>());

  const mutation = useMutation({
    ...adminRefundControllerBulkCreateMutation(),
    onSettled: release,
    onSuccess: (result) => {
      invalidateSalesBillingQueries(queryClient);
      if (result.summary.successCount > 0) {
        toast.success(`${result.summary.successCount}件の返金申請を送信しました`);
      }
      form.reset();
      onSuccess?.();
      if (result.failed.length > 0) {
        setFailures(result.failed);
        setHasPartialSuccess(result.summary.successCount > 0);
        return;
      }
      onOpenChange(false);
    },
  });

  const isOverLimit = billingRecordIds.length > BULK_REFUND_MAX_IDS;

  const handleSubmit = form.handleSubmit((values) => {
    if (billingRecordIds.length === 0 || isOverLimit || !acquire()) return;
    const note = values.detail.trim();
    const body = {
      billingIds: billingRecordIds,
      reasonCode: values.reason_code,
      // B3: omit an empty note — never send `null` (400 E-VAL-001 before MR !808)
      ...(note ? { note } : {}),
    };
    const bodyKey = JSON.stringify(body);
    const idempotencyKey = idempotencyKeys.get(bodyKey) ?? crypto.randomUUID();
    idempotencyKeys.set(bodyKey, idempotencyKey);
    mutation.mutate({ body, headers: { 'Idempotency-Key': idempotencyKey } });
  });

  const handleOpenChange = (next: boolean) => {
    // Esc / overlay / キャンセル wait for the request: its failures would land on the next open
    if (!next && mutation.isPending) return;
    onOpenChange(next);
    if (!next) {
      form.reset();
      setFailures([]);
    }
  };

  if (failures.length > 0) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-120">
          <DialogHeader>
            <DialogTitle className="text-base">
              {hasPartialSuccess
                ? '一部の返金申請を送信できませんでした'
                : '返金申請を送信できませんでした'}
            </DialogTitle>
            <DialogDescription>
              {failures.length}件の売上データは返金申請されませんでした。
            </DialogDescription>
          </DialogHeader>
          <ul className="bg-muted/50 max-h-60 space-y-1 overflow-y-auto rounded-md border p-3 text-xs">
            {failures.map((failure) => (
              <li key={failure.billingId} className="flex justify-between gap-3">
                <span className="font-mono">
                  {publicIdById?.get(failure.billingId) ?? failure.billingId}
                </span>
                <span className="text-muted-foreground text-right">
                  {BULK_REFUND_FAILURE_LABELS[failure.code] ?? failure.message}
                </span>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button onClick={() => handleOpenChange(false)}>閉じる</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-120">
        <DialogHeader>
          <DialogTitle className="text-base">返金申請</DialogTitle>
          <DialogDescription>
            {billingRecordIds.length}件の売上データに対して返金申請を行います。
          </DialogDescription>
        </DialogHeader>
        {/* 確認ダイアログの理由入力は「ユーザーが取り戻したい未保存データ」ではないため、
            離脱・ログアウト・ダイアログを閉じる操作を破棄確認で止めない。 */}
        <Form {...form} guardUnsaved={false}>
          <div className="space-y-4 py-2">
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-muted-foreground mb-1 text-xs">対象件数</p>
              <p className="text-sm font-medium">{billingRecordIds.length}件</p>
            </div>
            {isOverLimit && (
              <p className="text-destructive text-xs">
                一度に申請できるのは{BULK_REFUND_MAX_IDS}件までです。
              </p>
            )}
            <FormField
              control={form.control}
              name="reason_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    返金理由 <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => field.onChange(value ?? '')}
                    items={toSelectItems(REASON_CODE_OPTIONS)}
                  >
                    <FormControl>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="返金理由を選択" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REASON_CODE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="detail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">詳細・備考</FormLabel>
                  <FormControl>
                    <Textarea placeholder="返金理由の詳細を入力してください" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Form>
        <DialogFooter>
          {/* Through handleOpenChange so the reason / detail are cleared for the next open */}
          <Button
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => handleOpenChange(false)}
          >
            キャンセル
          </Button>
          <Button
            variant="destructive"
            disabled={mutation.isPending || isOverLimit}
            onClick={handleSubmit}
          >
            返金申請を送信
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
