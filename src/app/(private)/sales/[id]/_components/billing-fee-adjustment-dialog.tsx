'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { toSelectItems } from '@/utils/app.util';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Percent } from 'lucide-react';
import { toast } from 'sonner';

import { useSingleFlight } from '@/hooks/use-single-flight';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import {
  adminBillingRunControllerCreateAdjustmentMutation,
  adminMemberContractOpsControllerListContractsOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';

import { Permission } from '@/types/permission.type';

import {
  type BillingFeeAdjustmentDialogSubmitValues,
  type BillingFeeAdjustmentDialogValues,
  FEE_ADJUSTMENT_REASON_MAX,
  billingFeeAdjustmentDialogSchema,
} from '../_schemas/billing-fee-adjustment-dialog.schema';
import {
  type BillingHeader,
  FEE_ADJUSTMENT_PATTERNS,
  FEE_ADJUSTMENT_PATTERN_LABELS,
  type FeeAdjustmentPattern,
  invalidateBillingQueries,
  isBillingConfirmed,
} from '../_utils/billing-detail-api.util';

interface BillingFeeAdjustmentDialogProps {
  header: BillingHeader;
  /** 調整対象 name from the adjustments list, until the contracts query answers */
  contractName: string | null;
}

/**
 * 会費調整 — API-115 §10 `POST billing-adjustments` at the billing's main contract (015 D11; option
 * contracts are out of scope per API-115 §10.1). `appliedMonth` is omitted → the earliest month
 * BR-BIL-102 allows (FR-012「次回の請求確定時に反映」).
 */
export function BillingFeeAdjustmentDialog({
  header,
  contractName,
}: Readonly<BillingFeeAdjustmentDialogProps>) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { contractId, memberId, storeId } = header;
  const isConfirmed = isBillingConfirmed(header);

  // Same query (and cache entry) as the 明細追加 dialog — resolves the contract's plan name
  const { data: contracts } = useQuery({
    ...adminMemberContractOpsControllerListContractsOptions({
      path: { memberId },
      query: { includeInactive: true, storeId },
    }),
    enabled: open,
  });
  const targetContract = contracts?.contracts.find(
    (contract) => contract.contractId === contractId,
  );
  const targetLabel = targetContract?.plan.name ?? contractName ?? '主契約';
  // A discount larger than the monthly fee would bill a negative amount — refused before sending.
  // `priceMonthly` is 税込 since !880 (API-094 v0.13 §14B).
  const contractPriceWithTax = targetContract?.plan.priceMonthly;

  const form = useForm<
    BillingFeeAdjustmentDialogValues,
    unknown,
    BillingFeeAdjustmentDialogSubmitValues
  >({
    resolver: zodResolver(billingFeeAdjustmentDialogSchema),
    mode: 'onSubmit',
    defaultValues: {
      pattern: 'fixed_amount',
      value: '',
      reason: '',
    },
  });

  const pattern = useWatch({ control: form.control, name: 'pattern' }) ?? 'fixed_amount';
  const suffix = pattern === 'discount_rate' ? '%' : '円';

  const { acquire, release } = useSingleFlight();

  const mutation = useMutation({
    ...adminBillingRunControllerCreateAdjustmentMutation(),
    onSettled: release,
    onSuccess: () => {
      invalidateBillingQueries(queryClient);
      toast.success('会費調整を登録しました。次回の請求確定時に反映されます');
      form.reset();
      setOpen(false);
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    if (!contractId) return;
    if (
      values.pattern === 'discount_amount' &&
      contractPriceWithTax !== undefined &&
      Number(values.value) > contractPriceWithTax
    ) {
      form.setError('value', {
        message: `値引き額は契約の月額（¥${contractPriceWithTax.toLocaleString('ja-JP')}）以下で入力してください`,
      });
      return;
    }
    if (!acquire()) return;
    mutation.mutate({
      body: {
        memberId,
        contractId,
        adjustmentPattern: values.pattern,
        value: Number(values.value),
        reason: values.reason.trim(),
      },
    });
  });

  const handleOpenChange = (next: boolean) => {
    // Esc / overlay / キャンセル wait for the request: closing mid-run would reset the form under it
    if (!next && mutation.isPending) return;
    setOpen(next);
    if (!next) form.reset();
  };

  return (
    <>
      <RoleGatedButton
        requiredPermission={Permission.SalesFeeAdjust}
        denyTooltip="会費調整の権限がありません"
        variant="outline"
        size="sm"
        className="h-8 gap-1 text-xs"
        disabled={isConfirmed || !contractId}
        onClick={() => setOpen(true)}
      >
        <Percent className="size-3" />
        会費調整
      </RoleGatedButton>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-120">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">会費調整</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <div className="space-y-4">
              {/* 調整対象 — the billing's main contract (D11); not selectable */}
              <div className="space-y-1">
                <p className="text-xs font-medium">
                  調整対象 <span className="text-destructive">*</span>
                </p>
                <Select
                  value="contract"
                  disabled
                  items={[{ value: 'contract', label: targetLabel }]}
                >
                  <SelectTrigger className="h-8 w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">{targetLabel}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <FormField
                control={form.control}
                name="pattern"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">
                      調整パターン <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) =>
                        field.onChange((v ?? 'fixed_amount') as FeeAdjustmentPattern)
                      }
                      items={toSelectItems(
                        FEE_ADJUSTMENT_PATTERNS.map((value) => ({
                          value,
                          label: FEE_ADJUSTMENT_PATTERN_LABELS[value],
                        })),
                      )}
                    >
                      <FormControl>
                        <SelectTrigger className="h-8 w-full text-sm">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FEE_ADJUSTMENT_PATTERNS.map((key) => (
                          <SelectItem key={key} value={key}>
                            {FEE_ADJUSTMENT_PATTERN_LABELS[key]}
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
                name="value"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">
                      調整値 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          className="h-8 pr-8 text-sm"
                          type="number"
                          placeholder="0"
                          {...field}
                        />
                        <span className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 text-xs">
                          {suffix}
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">
                      調整事由 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-20 text-sm"
                        placeholder="調整理由を入力してください"
                        maxLength={FEE_ADJUSTMENT_REASON_MAX}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="text-muted-foreground text-xs">
                ※ 調整後の金額は次回の請求確定時に反映されます
              </p>
            </div>
          </Form>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              disabled={mutation.isPending}
              onClick={() => handleOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button size="sm" disabled={mutation.isPending} onClick={handleSubmit}>
              適用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
