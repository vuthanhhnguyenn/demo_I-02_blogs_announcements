'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { toSelectItems } from '@/utils/app.util';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';

import { SearchableSelect } from '@/components/common/searchable-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

import { adminMemberContractOpsControllerListContractsOptions } from '@/lib/api-real/@tanstack/react-query.gen';

import {
  type ManualDraftLineItemSubmitValues,
  type ManualDraftLineItemValues,
  manualDraftLineItemSchema,
} from '../../_schemas/manual-registration-form.schema';
import { buildContractOptions, toTaxIncludedAmount } from '../../_utils/contract-options.util';

/** One line of the register screen before the billing exists (API-115 §8.1.1 `items[]`) */
export type ManualLineItemDraft = {
  id: string;
  label: string;
  /** Tax-excluded unit price */
  amount: number;
  /** 税込 — the master price for contract lines, the 税込見積 for custom lines */
  amountWithTax: number;
  /** Fraction (0.1 / 0.08) */
  taxRate: number;
  reason?: string;
} & (
  | { source: 'contract'; contractId: string }
  | { source: 'option_contract'; optionContractId: string }
  | { source: 'custom'; description: string }
);

const SOURCE_OPTIONS = [
  { value: 'contract', label: '契約から選択' },
  { value: 'manual', label: 'その他(手動入力)' },
];

const TAX_RATE_OPTIONS = [
  { value: '10', label: '10%' },
  { value: '8', label: '8%（軽減）' },
];

function formatYen(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

interface AddDraftLineItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  storeId: string;
  onAdd: (item: ManualLineItemDraft) => void;
}

const DRAFT_LINE_ITEM_DEFAULTS: ManualDraftLineItemValues = {
  source: 'contract',
  contract_key: '',
  label: '',
  amount: '',
  tax_rate: '10',
  reason: '',
};

function AddDraftLineItemDialog({
  open,
  onOpenChange,
  memberId,
  storeId,
  onAdd,
}: Readonly<AddDraftLineItemDialogProps>) {
  const form = useForm<ManualDraftLineItemValues, unknown, ManualDraftLineItemSubmitValues>({
    resolver: zodResolver(manualDraftLineItemSchema),
    mode: 'onSubmit',
    defaultValues: DRAFT_LINE_ITEM_DEFAULTS,
  });

  const source = useWatch({ control: form.control, name: 'source' }) ?? 'contract';
  const contractKey = useWatch({ control: form.control, name: 'contract_key' }) ?? '';
  const label = useWatch({ control: form.control, name: 'label' }) ?? '';
  const amount = useWatch({ control: form.control, name: 'amount' }) ?? '';
  const taxRate = useWatch({ control: form.control, name: 'tax_rate' }) ?? '10';
  const reason = useWatch({ control: form.control, name: 'reason' }) ?? '';

  const [contractOpen, setContractOpen] = useState(false);
  const [contractSearch, setContractSearch] = useState('');

  // #357: inactive contracts stay billable, so the picker asks for every status at this store
  const {
    data: contractsRes,
    isLoading: isContractsLoading,
    isError: isContractsError,
    refetch: refetchContracts,
  } = useQuery({
    ...adminMemberContractOpsControllerListContractsOptions({
      path: { memberId },
      query: { includeInactive: true, storeId },
    }),
    enabled: open,
  });
  const contractOptions = buildContractOptions(contractsRes?.contracts);
  const filteredContractOptions = contractOptions.filter((option) =>
    contractSearch.trim()
      ? option.label.toLowerCase().includes(contractSearch.toLowerCase())
      : true,
  );

  const canAdd =
    source === 'contract'
      ? Boolean(contractKey)
      : label.trim().length > 0 && Number(amount) > 0 && reason.trim().length > 0;

  const onSubmit = (values: ManualDraftLineItemSubmitValues) => {
    if (values.source === 'contract') {
      const option = contractOptions.find((c) => c.key === values.contract_key);
      if (!option) return;
      const base = {
        id: crypto.randomUUID(),
        label: option.label,
        amount: option.amount,
        amountWithTax: option.amountWithTax,
        taxRate: option.taxRate,
      };
      onAdd(
        option.source === 'contract'
          ? { ...base, source: 'contract', contractId: option.id }
          : { ...base, source: 'option_contract', optionContractId: option.id },
      );
    } else {
      const description = values.label.trim();
      onAdd({
        id: crypto.randomUUID(),
        source: 'custom',
        description,
        label: `手動追加：${description}`,
        amount: Number(values.amount),
        amountWithTax: toTaxIncludedAmount(Number(values.amount), Number(values.tax_rate) / 100),
        taxRate: Number(values.tax_rate) / 100,
        reason: values.reason.trim(),
      });
    }
    closeAndReset();
  };

  // reset() with no argument restores the LAST reset values — the mode switch below resets with a
  // source, so always reset to the dialog defaults explicitly.
  const closeAndReset = () => {
    onOpenChange(false);
    form.reset(DRAFT_LINE_ITEM_DEFAULTS);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) onOpenChange(true);
        else closeAndReset();
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base">請求明細を追加</DialogTitle>
          <DialogDescription className="text-xs">
            請求項目を選択し、税抜の請求額を入力してください。
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs">請求項目</FormLabel>
                  <Select
                    value={field.value ?? 'contract'}
                    // Switching mode drops what was entered in the other one
                    onValueChange={(value) =>
                      form.reset({ ...DRAFT_LINE_ITEM_DEFAULTS, source: value ?? 'contract' })
                    }
                    items={toSelectItems(SOURCE_OPTIONS)}
                  >
                    <FormControl>
                      <SelectTrigger className="h-8 w-full text-sm">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="contract">契約から選択</SelectItem>
                      <SelectItem value="manual">その他(手動入力)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {source === 'contract' ? (
              <FormField
                control={form.control}
                name="contract_key"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">契約</FormLabel>
                    {isContractsError ? (
                      // A failed load must not read as "no contracts"
                      <p className="text-destructive text-xs">
                        契約を取得できませんでした。
                        <button
                          type="button"
                          className="ml-1 underline"
                          onClick={() => void refetchContracts()}
                        >
                          再試行
                        </button>
                      </p>
                    ) : contractOptions.length === 0 ? (
                      <p className="text-muted-foreground text-xs">
                        {isContractsLoading
                          ? '契約を読み込み中...'
                          : '利用可能な契約がありません。「その他(手動入力)」で追加してください。'}
                      </p>
                    ) : (
                      <FormControl>
                        <SearchableSelect
                          value={field.value || null}
                          options={filteredContractOptions}
                          placeholder="契約を選択"
                          searchPlaceholder="契約名で検索..."
                          emptyMessage="該当する契約がありません"
                          open={contractOpen}
                          onOpenChange={setContractOpen}
                          onSearchChange={setContractSearch}
                          onSelect={(option) => field.onChange(option?.key ?? '')}
                          getOptionKey={(option) => option.key}
                          getOptionLabel={(option) =>
                            `${option.label}（¥${option.amountWithTax.toLocaleString('ja-JP')}・税込）`
                          }
                          triggerClassName="h-8 w-full justify-between text-sm"
                        />
                      </FormControl>
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
                      <FormLabel className="text-xs">請求項目（手動入力）</FormLabel>
                      <FormControl>
                        <Input
                          className="h-8 text-sm"
                          placeholder="例：退会手続き手数料"
                          {...field}
                        />
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
                        <FormLabel className="text-xs">請求額（税抜）</FormLabel>
                        <FormControl>
                          <Input
                            className="h-8 text-right text-sm tabular-nums"
                            type="number"
                            min={1}
                            {...field}
                          />
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
                {Number(amount) > 0 && (
                  <div className="bg-muted/50 rounded-md p-3">
                    <p className="text-muted-foreground text-xs">税込見積</p>
                    <p className="text-sm font-medium tabular-nums">
                      ¥
                      {toTaxIncludedAmount(Number(amount), Number(taxRate) / 100).toLocaleString(
                        'ja-JP',
                      )}
                    </p>
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">
                        事由 <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className="min-h-[60px] text-sm"
                          placeholder="手動追加の理由を記載してください"
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
          <Button variant="outline" size="sm" onClick={closeAndReset}>
            キャンセル
          </Button>
          <Button size="sm" disabled={!canAdd} onClick={form.handleSubmit(onSubmit)}>
            追加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ManualRegistrationLineItemsProps {
  memberId: string | null;
  storeId: string;
  items: ManualLineItemDraft[];
  isBlockedByUnpaid: boolean;
  onAdd: (item: ManualLineItemDraft) => void;
  onRemove: (id: string) => void;
}

export function ManualRegistrationLineItems({
  memberId,
  storeId,
  items,
  isBlockedByUnpaid,
  onAdd,
  onRemove,
}: Readonly<ManualRegistrationLineItemsProps>) {
  const [addOpen, setAddOpen] = useState(false);
  const addDisabled = !memberId || isBlockedByUnpaid;

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">請求明細情報</h3>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
            disabled={addDisabled}
            onClick={() => setAddOpen(true)}
          >
            <Plus className="size-3" />
            明細追加
          </Button>
        </div>

        {!memberId && (
          <p className="text-muted-foreground text-xs">先に利用者を選択してください。</p>
        )}
        {memberId && isBlockedByUnpaid && (
          <p className="text-destructive text-xs">
            未納金のある利用者には請求明細を追加できません。
          </p>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">請求明細ID</TableHead>
                <TableHead className="text-xs font-semibold">請求項目</TableHead>
                <TableHead className="text-right text-xs font-semibold">請求額(税抜)</TableHead>
                <TableHead className="text-right text-xs font-semibold">税率</TableHead>
                <TableHead className="text-right text-xs font-semibold">税込</TableHead>
                <TableHead className="w-12 text-xs font-semibold" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {memberId ? (
                      <p className="text-muted-foreground text-sm">明細データがありません</p>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        先に利用者を選択してください。
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      #{String(index + 1).padStart(3, '0')}
                    </TableCell>
                    <TableCell className="min-w-40 text-xs wrap-anywhere whitespace-normal">
                      {item.label}
                      {item.reason && (
                        <p className="text-muted-foreground text-[10px]">{item.reason}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {formatYen(item.amount)}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {Math.round(item.taxRate * 100)}%
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {formatYen(item.amountWithTax)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive size-7 p-0"
                        onClick={() => onRemove(item.id)}
                        aria-label="明細を削除"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {memberId && (
        <AddDraftLineItemDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          memberId={memberId}
          storeId={storeId}
          onAdd={onAdd}
        />
      )}
    </Card>
  );
}
