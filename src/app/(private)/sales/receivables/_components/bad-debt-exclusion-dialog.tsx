'use client';

import { useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { useSingleFlight } from '@/hooks/use-single-flight';

import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Textarea } from '@/components/ui/textarea';

import { getApiErrorCode } from '@/lib/api-error.util';
import { AdminReceivablesApi117 } from '@/lib/api-real';

import { formatYen } from '../../_constants/sales-labels.constant';
import {
  BAD_DEBT_REASON_MAX_LENGTH,
  type BadDebtExclusionDialogValues,
  badDebtExclusionDialogSchema,
} from '../_schemas/bad-debt-exclusion-dialog.schema';
import {
  type ReceivableBillingTarget,
  invalidateReceivableQueries,
} from '../_utils/receivable-status.util';

/** API-117 §9: 10 requests / minute per user — wait out the window instead of failing */
const RATE_LIMIT_WAIT_MS = 6000;
const RATE_LIMIT_RETRIES = 10;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type BadDebtDialogMode = 'exclude' | 'release';
/** `line` = opened from one 明細 of the detail sheet (B4: the whole billing is still affected) */
export type BadDebtDialogScope = 'line' | 'member';

interface BadDebtExclusionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  mode: BadDebtDialogMode;
  scope: BadDebtDialogScope;
  /** API-117 §9: exclusion is set / released per billing */
  billings: ReceivableBillingTarget[];
}

export function BadDebtExclusionDialog({
  open,
  onOpenChange,
  memberName,
  mode,
  scope,
  billings,
}: Readonly<BadDebtExclusionDialogProps>) {
  const queryClient = useQueryClient();
  const isRelease = mode === 'release';

  const form = useForm<BadDebtExclusionDialogValues>({
    resolver: zodResolver(badDebtExclusionDialogSchema),
    mode: 'onSubmit',
    defaultValues: { reason: '' },
  });

  // API-117 #6: set-exclusion requires an `Idempotency-Key`. One key per billing and reason, so a
  // retry replays the same request, while an edited reason gets a new key (same key + new body →
  // E-RCV-104).
  const idempotencyKeys = useRef(new Map<string, { reason: string; key: string }>());
  const idempotencyKeyOf = (billingId: string, reason: string) => {
    const kept = idempotencyKeys.current.get(billingId);
    if (kept?.reason === reason) return kept.key;
    const key = crypto.randomUUID();
    idempotencyKeys.current.set(billingId, { reason, key });
    return key;
  };
  // Billings already applied in this dialog — a retry after a partial failure skips them. The ref
  // drives the loop; the state mirror names them on screen after a partial failure.
  const doneBillingIds = useRef(new Set<string>());
  const [doneTargetMonths, setDoneTargetMonths] = useState<string[]>([]);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      form.reset();
      idempotencyKeys.current.clear();
      doneBillingIds.current.clear();
      setDoneTargetMonths([]);
    }
  };

  const applyOne = async (billingId: string, reason: string) => {
    const options = { path: { billingId }, body: { reason } };
    if (isRelease) {
      await AdminReceivablesApi117.adminReceivableControllerReleaseExclusion({
        ...options,
        throwOnError: true,
      });
    } else {
      await AdminReceivablesApi117.adminReceivableControllerSetExclusion({
        ...options,
        headers: { 'idempotency-key': idempotencyKeyOf(billingId, reason) },
        throwOnError: true,
      });
    }
  };

  // One call per billing (API-117 §9 has no bulk form, 10 req/min — replays count). Stops at the
  // first other failure; the shared MutationCache toasts it by `userMessage`, and 再実行 continues
  // from the billings not done yet.
  const { acquire, release } = useSingleFlight();

  const mutation = useMutation({
    mutationFn: async (reason: string) => {
      for (const billing of billings) {
        if (doneBillingIds.current.has(billing.billingId)) continue;
        for (let attempt = 0; ; attempt += 1) {
          try {
            await applyOne(billing.billingId, reason);
            break;
          } catch (error) {
            const code = getApiErrorCode(error);
            // API-117 §9.3 E-RCV-102 = already in the target state (set: an active exclusion
            // exists / release: none), e.g. from another tab — the end state is what was asked for
            if (code === 'E-RCV-102') break;
            if (code === 'E-RATE-001' && attempt < RATE_LIMIT_RETRIES) {
              await sleep(RATE_LIMIT_WAIT_MS);
              continue;
            }
            throw error;
          }
        }
        doneBillingIds.current.add(billing.billingId);
        setDoneTargetMonths((months) => [...months, billing.targetMonth]);
      }
    },
    onSuccess: () => {
      toast.success(isRelease ? '貸倒対象外指定を解除しました' : '貸倒対象外に指定しました');
      handleOpenChange(false);
    },
    onSettled: () => {
      release();
      invalidateReceivableQueries(queryClient);
    },
  });

  const handleConfirm = form.handleSubmit((values) => {
    if (!acquire()) return;
    mutation.mutate(values.reason.trim());
  });

  // 指定理由 is required (API-117 §9): the action stays disabled until a non-blank reason is typed
  const reason = useWatch({ control: form.control, name: 'reason' });
  const hasReason = (reason ?? '').trim().length > 0;

  const billingSummary = billings
    .map((billing) => `${billing.targetMonth}分 ${formatYen(billing.amount)}`)
    .join('、');

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Rate-limit waits can take a while — closing mid-run would hide which billings were done
        if (!next && mutation.isPending) return;
        handleOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-120">
        <DialogHeader>
          <DialogTitle className="text-base">
            {isRelease ? '貸倒対象外指定の解除' : '貸倒対象外指定'}
          </DialogTitle>
          <DialogDescription>
            {isRelease
              ? `${memberName} の請求（${billingSummary}）の貸倒対象外指定を解除します。`
              : `${memberName} の請求（${billingSummary}）を貸倒対象外に指定します。`}
          </DialogDescription>
        </DialogHeader>
        {scope === 'line' && (
          // B4: API-117 §9 is per billing — FR-007's per-明細 grain is pending Otaki (Q1)
          <Alert className="bg-warning/10 border-warning/20 text-warning">
            <AlertTriangle className="size-4" />
            <AlertDescription className="text-xs">
              貸倒対象外の{isRelease ? '解除' : '指定'}
              は請求単位で行われます。選択した明細を含む請求全体（同じ請求のすべての明細）が対象になります。
            </AlertDescription>
          </Alert>
        )}
        {mutation.isError && doneTargetMonths.length > 0 && (
          // Partial failure: say which billings were already applied — 再実行 continues from the rest
          <Alert className="bg-warning/10 border-warning/20 text-warning">
            <AlertTriangle className="size-4" />
            <AlertDescription className="text-xs">
              {doneTargetMonths.map((month) => `${month}分`).join('、')}は
              {isRelease ? '解除' : '指定'}
              済みです（{doneTargetMonths.length}/{billings.length}
              件）。再度実行すると残りの請求から続行します。
            </AlertDescription>
          </Alert>
        )}
        {/* 確認ダイアログの理由入力は「ユーザーが取り戻したい未保存データ」ではないため、
            離脱・ログアウト・ダイアログを閉じる操作を破棄確認で止めない。 */}
        <Form {...form} guardUnsaved={false}>
          <div className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">
                    {isRelease ? '解除理由' : '指定理由'}{' '}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        isRelease
                          ? '貸倒対象外指定を解除する理由を入力してください（必須）'
                          : '貸倒対象外とする理由を入力してください（必須）'
                      }
                      rows={4}
                      maxLength={BAD_DEBT_REASON_MAX_LENGTH}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <p className="text-muted-foreground text-xs">
              {isRelease
                ? '※ 解除した担当者・日時・理由が記録されます。解除後は通常の貸倒判定の対象に戻ります。'
                : '※ 指定した担当者・日時・理由が記録されます。対象外指定の解除も可能です。'}
            </p>
          </div>
        </Form>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => handleOpenChange(false)}
          >
            キャンセル
          </Button>
          <Button
            disabled={mutation.isPending || billings.length === 0 || !hasReason}
            onClick={handleConfirm}
          >
            {mutation.isPending ? '処理中…' : isRelease ? '指定を解除する' : '対象外に指定する'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
