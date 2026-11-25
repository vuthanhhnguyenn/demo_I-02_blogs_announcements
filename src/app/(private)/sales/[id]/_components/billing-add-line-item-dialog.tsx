'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { toSelectItems } from '@/utils/app.util';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';

import { useSingleFlight } from '@/hooks/use-single-flight';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { getApiErrorCode } from '@/lib/api-error.util';
import {
  adminBillingRunControllerAddItemMutation,
  adminMemberContractOpsControllerListContractsOptions,
  adminReceivableControllerMemberDetailOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { cn } from '@/lib/utils';

import {
  type AddLineItemFormSubmitValues,
  type AddLineItemFormValues,
  addLineItemFormSchema,
} from '../../_schemas/add-line-item-form.schema';
import {
  BILLING_ERROR_CODE,
  type BillingHeader,
  invalidateBillingQueries,
} from '../_utils/billing-detail-api.util';
import {
  type LineItemContractOption,
  buildLineItemContractOptions,
  toAddItemBody,
} from '../_utils/billing-line-item-options.util';

const SOURCE_OPTIONS = [
  { value: 'contract', label: '契約から選択' },
  // Prototype sales-detail 明細追加: 「手動補正」 — matches the dialog's 「手動補正項目」 copy
  { value: 'manual', label: 'その他(手動補正)' },
];

function formatContractOption(option: LineItemContractOption): string {
  return `${option.label}（¥${option.amount.toLocaleString('ja-JP')}・税込）`;
}

const TAX_RATE_OPTIONS = [
  { value: '10', label: '10%' },
  { value: '8', label: '8%（軽減）' },
];

interface BillingAddLineItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  header: BillingHeader;
}

/** 明細追加 — API-115 §9.1 `POST billings/{billingId}/items` (pending / unconfirmed only) */
export function BillingAddLineItemDialog({
  open,
  onOpenChange,
  header,
}: Readonly<BillingAddLineItemDialogProps>) {
  const queryClient = useQueryClient();
  const { billingId, memberId, storeId, unpaidAmount } = header;

  const form = useForm<AddLineItemFormValues, unknown, AddLineItemFormSubmitValues>({
    resolver: zodResolver(addLineItemFormSchema),
    mode: 'onSubmit',
    defaultValues: {
      source: 'contract',
      contract_id: '',
      label: '',
      amount: '',
      tax_rate: '10',
      reason: '',
    },
  });

  const source = useWatch({ control: form.control, name: 'source' }) ?? 'contract';

  // FR-011 #357: every contract at the billing's store, not only the current one
  const { data: contracts } = useQuery({
    ...adminMemberContractOpsControllerListContractsOptions({
      path: { memberId },
      query: { includeInactive: true, storeId },
    }),
    enabled: open,
  });
  const contractOptions = buildLineItemContractOptions(contracts);
  const [contractPickerOpen, setContractPickerOpen] = useState(false);
  const selectedContractId = useWatch({ control: form.control, name: 'contract_id' });
  const selectedContract = contractOptions.find((option) => option.value === selectedContractId);
  // FR-011 異常系 — the member's arrears come from API-117 (未回収詳細); the add-item API has no
  // arrears check (BR-BIL-104 guards `POST billings` only). Roles without 未回収 access get a 403
  // here, so the billing's own unpaid amount (BR-BIL-008) remains the floor.
  const { data: receivable } = useQuery({
    ...adminReceivableControllerMemberDetailOptions({
      path: { memberId },
      query: { includeKonbiniHistory: false },
    }),
    enabled: open,
    retry: false,
  });
  // Same rule as 手動請求追加: arrears excluded from write-off (貸倒対象外) do not block
  const blockingArrears = (receivable?.unpaidBillings ?? [])
    .filter(
      (billing) => !receivable?.exclusionStatus.excludedBillingIds.includes(billing.billingId),
    )
    .reduce((sum, billing) => sum + billing.outstandingAmount, 0);
  const outstandingAmount = Math.max(unpaidAmount, blockingArrears);
  const isBlockedByOutstanding = outstandingAmount > 0;

  const { acquire, release } = useSingleFlight();

  const mutation = useMutation({
    ...adminBillingRunControllerAddItemMutation(),
    onSettled: release,
    onSuccess: () => {
      invalidateBillingQueries(queryClient);
      toast.success('請求明細を追加しました');
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      // E-BIL-203 / E-BIL-210: the billing was confirmed or sent to the PSP meanwhile — the shared
      // toast words it; refresh the detail so the disabled 明細追加 button shows, and close.
      const code = getApiErrorCode(error);
      if (
        code === BILLING_ERROR_CODE.confirmedBillingItems ||
        code === BILLING_ERROR_CODE.billingNotDue
      ) {
        invalidateBillingQueries(queryClient);
        form.reset();
        onOpenChange(false);
      }
    },
  });

  const handleOpenChange = (next: boolean) => {
    // Esc / overlay / キャンセル wait for the request: closing mid-run would reset the form under it
    if (!next && mutation.isPending) return;
    onOpenChange(next);
    if (!next) form.reset();
  };

  const handleSubmit = form.handleSubmit((values) => {
    if (isBlockedByOutstanding || !acquire()) return;
    mutation.mutate({ path: { billingId }, body: toAddItemBody(values) });
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-120">
        <DialogHeader>
          <DialogTitle className="text-base">請求明細を追加</DialogTitle>
          <DialogDescription className="text-xs">
            契約から追加するか、手動補正項目として追加するかを選択してください。
          </DialogDescription>
        </DialogHeader>

        {isBlockedByOutstanding && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>この会員には未納金があります</AlertTitle>
            <AlertDescription>
              未納金（¥{outstandingAmount.toLocaleString('ja-JP')}
              ）のある会員への追加費用が発生する明細追加はブロックされます。未納金の解消後に再度お試しください。
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs">追加方法</FormLabel>
                  <Select
                    value={field.value ?? 'contract'}
                    onValueChange={(value) => field.onChange(value ?? 'contract')}
                    items={toSelectItems(SOURCE_OPTIONS)}
                  >
                    <FormControl>
                      <SelectTrigger className="h-8 w-full text-sm">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="contract">契約から選択</SelectItem>
                      <SelectItem value="manual">その他(手動補正)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {source === 'contract' ? (
              <FormField
                control={form.control}
                name="contract_id"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">
                      契約 <span className="text-destructive">*</span>
                    </FormLabel>
                    {contractOptions.length === 0 ? (
                      <p className="text-muted-foreground text-xs">
                        この店舗で選択できる契約がありません。
                      </p>
                    ) : (
                      <Popover open={contractPickerOpen} onOpenChange={setContractPickerOpen}>
                        <PopoverTrigger
                          render={
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={contractPickerOpen}
                              className="h-8 w-full min-w-0 justify-between text-sm font-normal"
                            />
                          }
                        >
                          {selectedContract ? (
                            <span className="min-w-0 flex-1 truncate text-left">
                              {formatContractOption(selectedContract)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">契約を選択</span>
                          )}
                          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                        </PopoverTrigger>
                        <PopoverContent className="w-(--anchor-width) p-0" align="start">
                          {/* TC-025: search by kind (主契約 / オプション) and by name */}
                          <Command>
                            <CommandInput placeholder="種別・契約名で検索..." className="h-8" />
                            <CommandList>
                              <CommandEmpty>該当する契約がありません</CommandEmpty>
                              <CommandGroup>
                                {contractOptions.map((option) => (
                                  <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    keywords={[option.label]}
                                    onSelect={() => {
                                      field.onChange(option.value);
                                      setContractPickerOpen(false);
                                    }}
                                  >
                                    <span className="min-w-0 flex-1 wrap-anywhere">
                                      {formatContractOption(option)}
                                    </span>
                                    <Check
                                      className={cn(
                                        'ml-auto size-4',
                                        field.value === option.value ? 'opacity-100' : 'opacity-0',
                                      )}
                                    />
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">
                        請求項目（手動入力） <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input className="h-8 text-sm" placeholder="例: 臨時清掃料" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">
                          請求額（税抜） <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input className="h-8 text-sm" type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tax_rate"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">税率</FormLabel>
                        <Select
                          value={field.value ?? '10'}
                          onValueChange={(value) => field.onChange(value ?? '10')}
                          items={toSelectItems(TAX_RATE_OPTIONS)}
                        >
                          <FormControl>
                            <SelectTrigger className="h-8 w-full text-sm">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="10">10%</SelectItem>
                            <SelectItem value="8">8%（軽減）</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">
                        補正事由 <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className="min-h-15 text-sm"
                          placeholder="補正の理由を具体的に記載してください"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
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
          <Button
            size="sm"
            disabled={isBlockedByOutstanding || mutation.isPending}
            onClick={handleSubmit}
          >
            追加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
