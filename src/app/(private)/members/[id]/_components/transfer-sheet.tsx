'use client';

import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, Store } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';
import { useSingleFlight } from '@/hooks/use-single-flight';

import { SearchableSelect } from '@/components/common/searchable-select';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

import {
  adminMemberContractOpsControllerCreateTransferMutation,
  adminMemberControllerDetailQueryKey,
  adminMemberControllerListQueryKey,
  adminStoreControllerListInfiniteOptions,
  adminTransferControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { StoreListResponseDto, StoreSummaryDto } from '@/lib/api-real/types.gen';

import {
  STATUS_CHANGE_REASON_MAX_LENGTH,
  proxyAgreedAtSchema,
} from '../_schemas/proxy-agreement.schema';
import { invalidateMemberContractReads } from '../_utils/member-cache.util';
import { type ProxyAgreementMethod, ProxyApplicationSection } from './proxy-application-section';

type StoreRow = StoreSummaryDto;

function storeKey(store: StoreRow): string {
  return store.id;
}

// ── Zod schema ────────────────────────────────────────────────────────────────
// A-01 FR-017: an application filed from the CRM counter is a proxy filing by definition —
// `CreateTransferApplicationDto.applicationSource` only takes `mobile_app` | `proxy`, and the
// staff are not the member, so the agreement evidence is collected unconditionally. Both halves
// are required because `ApplicationProxyDto` requires both; sending one alone is a 422.
const transferFormSchema = z.object({
  to_store_id: z.string().min(1, '移籍先店舗は必須です'),
  to_store_name: z.string().min(1),
  reason: z
    .string()
    .max(
      STATUS_CHANGE_REASON_MAX_LENGTH,
      `理由は${STATUS_CHANGE_REASON_MAX_LENGTH}文字以内で入力してください`,
    )
    .optional(),
  proxy_agreed_at: proxyAgreedAtSchema,
  proxy_method: z.string().min(1, '合意方法は必須です'),
});

type TransferFormValues = z.infer<typeof transferFormSchema>;

const DEFAULT_VALUES: TransferFormValues = {
  to_store_id: '',
  to_store_name: '',
  reason: '',
  proxy_agreed_at: '',
  proxy_method: '',
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface TransferSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberBrand: 'JOYFIT' | 'FIT365';
  /**
   * 移籍元 = the store the MAIN CONTRACT is held at (A-02 「移籍元店舗 = 移籍前の主契約締結店舗」),
   * i.e. `currentMainContract.store` — **not** `member.primaryStore`, which the swagger says is
   * "not necessarily" the same store (and is null on members whose home store was never back-filled).
   * Both optional: `currentMainContract` and its `store` are nullable on the real member DTO.
   */
  currentStoreId?: string;
  currentStoreName?: string | null;
  hasUnpaidFee: boolean;
  inCancellationPeriod: boolean;
  /** An open application already exists (`currentMainContract.pendingTransfer`) — filing a second one is a 409 `E-TRF-006`. */
  hasPendingTransfer: boolean;
  /** Switches the screen to the 変更履歴 tab — target of the success toast's 「履歴を見る」 action. */
  onShowHistory: () => void;
}

// ── TransferSheet ─────────────────────────────────────────────────────────────
export function TransferSheet({
  open,
  onOpenChange,
  memberId,
  memberBrand,
  currentStoreId,
  currentStoreName,
  hasUnpaidFee,
  inCancellationPeriod,
  hasPendingTransfer,
  onShowHistory,
}: Readonly<TransferSheetProps>) {
  const queryClient = useQueryClient();
  const scrollToFirstError = useScrollToFirstError();

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    mode: 'onSubmit',
    defaultValues: DEFAULT_VALUES,
  });

  // RHF is the single source of truth; useWatch drives the conditional UI
  const toStoreId = useWatch({ control: form.control, name: 'to_store_id' });
  const toStoreName = useWatch({ control: form.control, name: 'to_store_name' });
  const proxyAgreedAt = useWatch({ control: form.control, name: 'proxy_agreed_at' });
  const proxyMethod = useWatch({ control: form.control, name: 'proxy_method' });

  // Gates the workflow hint on a destination being picked; kept aside from the submitted values
  const [selectedStore, setSelectedStore] = useState<StoreRow | null>(null);

  // FR-014: 申請 operations must be confirmed before they are sent
  const [showConfirm, setShowConfirm] = useState(false);

  // Destination-store list: server-side search + infinite scroll (no fixed limit
  // that could drop stores), excluding the member's current store. Brand group and
  // store status are filtered server-side so paging stays consistent: a transfer
  // may not cross brand groups (E-TRF-008) and a non-operating store is rejected
  // (E-STR-001).
  const [storeOpen, setStoreOpen] = useState(false);
  const [storeSearch, setStoreSearch] = useState('');
  const {
    data: storesData,
    isFetching: isStoresFetching,
    fetchNextPage: fetchNextStores,
    hasNextPage: hasMoreStores,
    isFetchingNextPage: isFetchingMoreStores,
    isFetchNextPageError: isStoresLoadMoreFailed,
  } = useInfiniteQuery({
    ...adminStoreControllerListInfiniteOptions({
      query: {
        limit: 20,
        keyword: storeSearch || undefined,
        sort: 'name',
        order: 'asc',
        brandGroup: memberBrand,
        status: 'operating',
      },
    }),
    enabled: storeOpen,
    initialPageParam: 1,
    getNextPageParam: (lastPage: StoreListResponseDto, allPages) => {
      const currentPage = allPages.length;
      const totalPages = lastPage.pagination?.totalPages ?? 0;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
  });
  const storeOptions = useMemo(
    () =>
      (storesData?.pages.flatMap((page) => page.items ?? []) ?? []).filter(
        (store) => storeKey(store) !== currentStoreId,
      ),
    [storesData, currentStoreId],
  );

  const { acquire, release } = useSingleFlight();

  const mutation = useMutation({
    ...adminMemberContractOpsControllerCreateTransferMutation(),
    onSettled: release,
    onError: () => {
      void queryClient.invalidateQueries({
        queryKey: adminMemberControllerDetailQueryKey({ path: { memberId } }),
      });
    },
    onSuccess: () => {
      toast.success('移籍申請を受け付けました', {
        description: '移籍先店舗に通知を送りました',
        action: { label: '履歴を見る', onClick: onShowHistory },
      });
      queryClient.invalidateQueries({
        queryKey: adminMemberControllerDetailQueryKey({ path: { memberId } }),
      });
      queryClient.invalidateQueries({ queryKey: adminMemberControllerListQueryKey() });
      queryClient.invalidateQueries({ queryKey: adminTransferControllerListQueryKey() });
      void invalidateMemberContractReads(queryClient, memberId);
      handleClose();
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      form.reset(DEFAULT_VALUES);
      setSelectedStore(null);
    }, 300);
  };

  // Validate first, then ask for confirmation; the mutation only runs from the dialog.
  const handleSubmit = form.handleSubmit(() => {
    setShowConfirm(true);
  }, scrollToFirstError);

  const handleConfirm = () => {
    setShowConfirm(false);
    if (!acquire()) return;
    const data = form.getValues();
    mutation.mutate({
      path: { memberId },
      body: {
        toStoreId: data.to_store_id,
        // The form collects free text; the real DTO takes a coded reason and keeps the text as
        // the memo, so an uncategorised transfer goes up as `other`.
        reasonCode: 'other',
        // `getValues()` is the raw input, not the schema's trimmed output
        memo: data.reason?.trim() || undefined,
        applicationSource: 'proxy',
        proxy: {
          agreementAt: data.proxy_agreed_at,
          agreementMethod: data.proxy_method as ProxyAgreementMethod,
        },
      },
    });
  };

  const handleProxyAgreedAtChange = (date: Date | undefined) => {
    form.setValue('proxy_agreed_at', date ? date.toISOString() : '');
    if (date) form.clearErrors('proxy_agreed_at');
  };

  const handleProxyMethodChange = (value: string) => {
    form.setValue('proxy_method', value);
    if (value) form.clearErrors('proxy_method');
  };

  const handleStoreChange = (store: StoreRow | null) => {
    setSelectedStore(store);
    form.setValue('to_store_id', store ? storeKey(store) : '', {
      shouldValidate: form.formState.isSubmitted,
    });
    form.setValue('to_store_name', store?.name ?? '');
  };

  // A-02 ブランド別設定: only JOYFIT is blocked inside the cancellation-fee period; FIT365 may transfer.
  const cancellationPeriodBlocked = inCancellationPeriod && memberBrand === 'JOYFIT';
  const isDisabled = hasUnpaidFee || cancellationPeriodBlocked || hasPendingTransfer;

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent className="flex w-120 flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-120">
          {/* Header */}
          <div className="shrink-0 border-b px-6 py-4">
            <SheetHeader className="gap-0 p-0">
              <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
                <ArrowRightLeft className="size-4" />
                移籍申請
              </SheetTitle>
              <SheetDescription className="sr-only">移籍申請フォーム</SheetDescription>
            </SheetHeader>
          </div>

          {/* Body */}
          <Form {...form}>
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto px-6">
                {/* Open application warning — takes precedence: a second filing is refused outright */}
                {hasPendingTransfer && (
                  <div className="pt-4">
                    <Alert className="border-destructive/30 bg-destructive/10">
                      <AlertDescription className="text-destructive text-xs">
                        移籍申請中のため、新しい申請はできません。
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Cancellation period warning */}
                {!hasPendingTransfer && cancellationPeriodBlocked && (
                  <div className="pt-4">
                    <Alert className="border-destructive/30 bg-destructive/10">
                      <AlertDescription className="text-destructive text-xs">
                        解約手数料期間中のため移籍できません。管理者にお問い合わせください。
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Unpaid fee warning */}
                {!hasPendingTransfer && !cancellationPeriodBlocked && hasUnpaidFee && (
                  <div className="pt-4">
                    <Alert className="border-destructive/30 bg-destructive/10">
                      <AlertDescription className="text-destructive text-xs">
                        未納金があるため操作できません。未納金を解消してから移籍申請を行ってください。
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Proxy section */}
                <div className="py-4">
                  <ProxyApplicationSection
                    alwaysProxy
                    agreedAt={proxyAgreedAt ? new Date(proxyAgreedAt) : undefined}
                    onAgreedAtChange={handleProxyAgreedAtChange}
                    method={(proxyMethod ?? '') as ProxyAgreementMethod | ''}
                    onMethodChange={handleProxyMethodChange}
                    agreedAtError={form.formState.errors.proxy_agreed_at?.message}
                    methodError={form.formState.errors.proxy_method?.message}
                  />
                </div>

                <Separator className="-mx-6 w-[calc(100%+48px)]" />

                {/* Store selection */}
                <div className="flex flex-col gap-4 py-4">
                  {/* Current store */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium">現在の主契約店舗</Label>
                    <div className="bg-muted/50 flex items-center gap-2 rounded-md px-3 py-2">
                      <Store className="text-muted-foreground size-4 shrink-0" />
                      <span className="min-w-0 text-sm font-medium wrap-anywhere">
                        {currentStoreName || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Target store */}
                  <FormField
                    control={form.control}
                    name="to_store_id"
                    render={({ fieldState }) => (
                      <FormItem>
                        <FormLabel htmlFor="transfer-store" className="text-sm font-medium">
                          移籍先店舗 <span className="text-destructive ml-1 text-xs">*</span>
                        </FormLabel>
                        <FormControl>
                          <SearchableSelect<StoreRow>
                            value={toStoreId || null}
                            valueLabel={toStoreName || undefined}
                            options={storeOptions}
                            placeholder="選択してください"
                            searchPlaceholder="店舗名・店舗IDで検索..."
                            emptyMessage="該当する店舗がありません"
                            loadingMessage="店舗を読み込み中..."
                            disabled={isDisabled}
                            open={storeOpen}
                            onOpenChange={setStoreOpen}
                            onSearchChange={setStoreSearch}
                            onSelect={handleStoreChange}
                            getOptionKey={(store) => storeKey(store)}
                            getOptionLabel={(store) => store.name ?? ''}
                            getOptionKeywords={(store) =>
                              // The real store summary carries only code + name.
                              [store.name, store.code, storeKey(store)].filter(Boolean).join(' ')
                            }
                            renderOption={(store) => (
                              <TextWithTooltip
                                text={store.name ?? ''}
                                wrapperClassName="w-full"
                                className="w-full"
                                side="right"
                                align="center"
                              />
                            )}
                            isLoading={isStoresFetching}
                            hasMore={hasMoreStores}
                            isLoadingMore={isFetchingMoreStores}
                            onLoadMore={fetchNextStores}
                            loadMoreFailed={isStoresLoadMoreFailed}
                            loadingMoreMessage="読み込み中..."
                            hasError={!!fieldState.error}
                            triggerClassName="h-9 w-full text-sm font-normal"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {selectedStore && (
                    <div className="bg-muted/50 rounded-md p-3">
                      <p className="text-muted-foreground mb-1 text-xs">移籍ワークフロー</p>
                      <p className="text-sm font-medium">
                        {memberBrand === 'JOYFIT'
                          ? '① 申請 → ② 移籍元承認 → ③ 自動移籍'
                          : '① 申請 → ② 移籍元承認 → ③ 移籍先承認 → ④ 移籍実行'}
                      </p>
                    </div>
                  )}
                </div>

                <Separator className="-mx-6 w-[calc(100%+48px)]" />

                {/* Reason */}
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem className="flex flex-col gap-2 py-4">
                      <FormLabel htmlFor="transfer-reason" className="text-sm font-medium">
                        移籍理由 <span className="text-muted-foreground ml-1 text-xs">任意</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          maxLength={STATUS_CHANGE_REASON_MAX_LENGTH}
                          id="transfer-reason"
                          rows={3}
                          className="resize-none text-sm"
                          disabled={isDisabled}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Footer */}
              <div className="flex shrink-0 gap-2 border-t px-6 py-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                  disabled={mutation.isPending}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isDisabled || mutation.isPending}
                >
                  移籍申請を送信
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Confirm AlertDialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>移籍申請を送信しますか？</AlertDialogTitle>
            <AlertDialogDescription className="wrap-anywhere">
              {currentStoreName || '—'} から {toStoreName}{' '}
              への移籍を申請します。移籍先店舗に通知が送られます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowConfirm(false);
              }}
            >
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>送信する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
