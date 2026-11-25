'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { useRouter } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Lock } from 'lucide-react';
import { toast } from 'sonner';

import { useBackToListHref } from '@/hooks/use-return-to.hook';
import { useSingleFlight } from '@/hooks/use-single-flight';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard.hook';

import { BackLink } from '@/components/common/back-link';
import { useStoreLabel } from '@/components/common/data-select-input/store-select-input';
import { MonthPicker } from '@/components/common/month-picker';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

import { getApiErrorCode, resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminBillingRunControllerCreateManualMutation,
  adminReceivableControllerMemberDetailOptions,
  adminSalesBillingControllerConfirmMutation,
  adminStoreControllerListOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { ManualBillingCreateRequestDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import {
  type ManualRegistrationFormValues,
  manualRegistrationFormSchema,
} from '../../_schemas/manual-registration-form.schema';
import { currentMonth } from '../../_utils/billing-month.util';
import { invalidateSalesBillingQueries } from '../../_utils/sales-query.util';
import { StoreMemberPicker, getMemberDisplayName } from '../store-member-picker';
import { ManualRegistrationConfirmDialog } from './manual-registration-confirm-dialog';
import {
  type ManualLineItemDraft,
  ManualRegistrationLineItems,
} from './manual-registration-line-items';

/** API-115 BR-BIL-104: member has non-exempted arrears → no charge-adding manual billing */
const OUTSTANDING_DEBT_ERROR_CODE = 'E-BIL-202';

/** True when a 400 E-VAL-001 names `field` in its `details[]` */
function isFieldValidationError(error: unknown, field: string): boolean {
  if (getApiErrorCode(error) !== 'E-VAL-001') return false;
  const details = (error as { details?: unknown }).details;
  return (
    Array.isArray(details) &&
    details.some(
      (detail) =>
        typeof detail === 'object' &&
        detail !== null &&
        (detail as { field?: unknown }).field === field,
    )
  );
}

type ManualBillingItemInput = ManualBillingCreateRequestDto['items'][number];

function toItemInput(item: ManualLineItemDraft): ManualBillingItemInput {
  switch (item.source) {
    case 'contract':
      return { source: 'contract', contractId: item.contractId };
    case 'option_contract':
      return { source: 'option_contract', optionContractId: item.optionContractId };
    case 'custom':
      return {
        source: 'custom',
        description: item.description,
        unitPrice: item.amount,
        taxRate: item.taxRate === 0.08 ? 8 : 10,
        changeReason: item.reason || undefined,
      };
  }
}

export function ManualRegistrationForm() {
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/sales'));
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthUser();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  /** Set once the user picks a store; until then the store follows the header store */
  const [pickedStore, setPickedStore] = useState<{ id: string; name: string }>();
  const [pickedMemberName, setPickedMemberName] = useState<string>();
  /** The member the API blocked with E-BIL-202 — there is no pre-check endpoint (FR-015) */
  const [blockedMemberId, setBlockedMemberId] = useState<string | null>(null);

  const form = useForm<ManualRegistrationFormValues>({
    resolver: zodResolver(manualRegistrationFormSchema),
    mode: 'onSubmit',
    defaultValues: {
      store_id: '',
      member_id: '',
      billing_month: currentMonth(),
      notes: '',
    },
  });

  const storeId = useWatch({ control: form.control, name: 'store_id' });
  const memberId = useWatch({ control: form.control, name: 'member_id' });
  const billingMonth = useWatch({
    control: form.control,
    name: 'billing_month',
  });

  // The store defaults to the header store (or, under 全店舗, the first store in the caller's
  // scope) and follows it until the user picks one; Manager / Staff can pick only their stores.
  const { currentStoreId, restrictedStores, canSelectAllStores } = useCurrentStore();
  const headerStoreId = currentStoreId === ALL_STORES ? undefined : currentStoreId;
  // HQ / System have no store list in the store context: the header store's name is looked up by id
  // (300+ stores do not fit one page), and under 全店舗 the first store of one page is the default
  const restrictedHeaderStore = restrictedStores.find((store) => store.id === headerStoreId);
  const { label: headerStoreLabel } = useStoreLabel(headerStoreId, {
    enabled: !restrictedHeaderStore,
  });
  const { data: storesRes } = useQuery({
    ...adminStoreControllerListOptions({
      query: { page: 1, limit: 1, sort: 'name', order: 'asc' },
    }),
    enabled: !headerStoreId,
  });
  const defaultStoreName = headerStoreId
    ? (restrictedHeaderStore?.name ?? headerStoreLabel ?? undefined)
    : storesRes?.items[0]?.name;
  const defaultStoreId = headerStoreId ?? storesRes?.items[0]?.id;
  const effectiveStoreId = storeId || defaultStoreId || '';
  useEffect(() => {
    if (pickedStore || !defaultStoreId || storeId === defaultStoreId) return;
    // resetField keeps an untouched form clean (setValue would read as an unsaved change), and the
    // member picked under the previous store no longer applies
    form.resetField('store_id', { defaultValue: defaultStoreId });
    form.resetField('member_id');
  }, [pickedStore, storeId, defaultStoreId, form]);
  const selectedStoreName = pickedStore?.name ?? defaultStoreName;

  // Drafted lines belong to the member they were added for: switching or clearing the member
  // (including a header store switch) drops them
  const [lineDraft, setLineDraft] = useState<{ memberId: string; items: ManualLineItemDraft[] }>({
    memberId: '',
    items: [],
  });
  const lineItems = lineDraft.memberId === memberId ? lineDraft.items : [];
  const updateLineItems = (update: (items: ManualLineItemDraft[]) => ManualLineItemDraft[]) =>
    setLineDraft((prev) => ({
      memberId,
      items: update(prev.memberId === memberId ? prev.items : []),
    }));

  // FR-011 異常系 pre-check: the API-117 member detail tells whether the picked member has unpaid
  // billings not excluded from write-off. Roles without 未回収 view skip it — for them the server's
  // E-BIL-202 on 登録 stays the only signal.
  const canReadReceivables = hasPermission(Permission.SalesReceivablesView);
  // 確定状態で登録 is a manual registration too: it needs both grants (F-01 権限マトリクス)
  const canManualRegister = hasPermission(Permission.SalesManualRegister);
  const { data: memberReceivable } = useQuery({
    ...adminReceivableControllerMemberDetailOptions({
      path: { memberId },
      query: { includeKonbiniHistory: false },
    }),
    enabled: Boolean(memberId) && canReadReceivables,
    retry: false,
  });
  const hasOutstandingDebt =
    memberReceivable?.memberId === memberId &&
    memberReceivable.unpaidBillings.some(
      (billing) => !memberReceivable.exclusionStatus.excludedBillingIds.includes(billing.billingId),
    );
  const isBlockedByUnpaid =
    Boolean(memberId) && (blockedMemberId === memberId || hasOutstandingDebt);

  const totalAmount = lineItems.reduce((sum, item) => sum + item.amountWithTax, 0);
  const canSubmit =
    Boolean(memberId) && !isBlockedByUnpaid && lineItems.length > 0 && Boolean(billingMonth);

  // Held until the screen navigates away: released only when the user stays to retry
  const { acquire, release } = useSingleFlight();
  const createMutation = useMutation({
    ...adminBillingRunControllerCreateManualMutation(),
    // E-BIL-202 renders the inline arrears alert instead of a toast; every other code is toasted
    // here exactly as the shared MutationCache would
    meta: { suppressErrorToast: true },
    onError: (error) => {
      if (getApiErrorCode(error) === OUTSTANDING_DEBT_ERROR_CODE) {
        setBlockedMemberId(form.getValues('member_id'));
        return;
      }
      if (isFieldValidationError(error, 'billingMonth')) {
        form.setError('billing_month', { message: '適用月は当月以降を選択してください' });
        return;
      }
      toast.error(resolveApiErrorMessage(error));
    },
  });
  // The confirm failure is worded below (the billing already exists), not by the shared toast
  const confirmMutation = useMutation({
    ...adminSalesBillingControllerConfirmMutation(),
    meta: { suppressErrorToast: true },
  });

  // Unsaved input = any edited header field or a drafted line (lines live outside the form)
  const isDirty = form.formState.isDirty || lineItems.length > 0;
  const { confirmDiscard, navigateAfterSave } = useUnsavedChangesGuard(isDirty);
  const isSubmitting = createMutation.isPending || confirmMutation.isPending;

  const buildRequestBody = (): ManualBillingCreateRequestDto => {
    const values = form.getValues();
    const note = values.notes?.trim();
    return {
      storeId: values.store_id,
      memberId: values.member_id,
      billingMonth: values.billing_month,
      ...(note ? { note } : {}),
      items: lineItems.map(toItemInput),
    };
  };

  const handleRegisterUnconfirmed = form.handleSubmit(() => {
    if (!canSubmit || !acquire()) return;
    createMutation.mutate(
      { body: buildRequestBody() },
      {
        onSuccess: () => {
          invalidateSalesBillingQueries(queryClient);
          toast.success('請求を登録しました');
          navigateAfterSave(() => router.push(navigate('/sales')));
        },
        onError: release,
      },
    );
  });

  // 015 D2: create (starts `pending`) then confirm (API-114 §7) — two calls. When the confirm
  // fails the billing exists but stays 未確定: the toast says so (with the reason) and the user
  // lands on the new billing's detail page to retry from there.
  const handleConfirmedRegister = async () => {
    if (!acquire()) return;
    setConfirmDialogOpen(false);
    let billingId: string;
    try {
      billingId = (await createMutation.mutateAsync({ body: buildRequestBody() })).billingId;
    } catch {
      release();
      return; // surfaced by the create mutation's onError
    }
    invalidateSalesBillingQueries(queryClient);
    try {
      await confirmMutation.mutateAsync({ path: { billingId }, body: {} });
      invalidateSalesBillingQueries(queryClient);
      toast.success('請求を確定状態で登録しました');
      navigateAfterSave(() => router.push(navigate('/sales')));
    } catch (error) {
      toast.error('請求は未確定の状態で登録されました。確定できませんでした', {
        description: resolveApiErrorMessage(error),
      });
      navigateAfterSave(() => router.push(navigate('/sales/[id]', billingId)));
    }
  };

  return (
    <>
      {/* The header lives here so its back link goes through the unsaved-changes guard */}
      <PageHeader
        breadcrumb={
          <BackLink
            label="売上管理に戻る"
            onClick={() => confirmDiscard(() => router.push(backToListHref))}
          />
        }
        title="請求の手動追加"
      />
      <div className="bg-background flex-1 px-6 py-4">
        {/* The page-level guard below covers the drafted lines too, so the form's own registrar is off */}
        <Form {...form} guardUnsaved={false}>
          <div className="mx-auto max-w-[960px] space-y-4">
            {isBlockedByUnpaid && (
              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <AlertTitle>この会員には未納金があります</AlertTitle>
                <AlertDescription>
                  未納金のある会員への追加費用が発生する手動請求はブロックされます。未納金の解消後に再度お試しください。
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardContent className="space-y-4">
                <h3 className="text-sm font-bold">基本情報</h3>

                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="flex flex-col gap-2">
                    <span className="text-muted-foreground text-xs">請求ID</span>
                    <p className="text-muted-foreground text-sm">自動採番</p>
                  </div>

                  <StoreMemberPicker
                    control={form.control}
                    storeLabel={selectedStoreName ?? (headerStoreId ? '—' : undefined)}
                    storeOptions={canSelectAllStores ? undefined : restrictedStores}
                    memberLabel={pickedMemberName}
                    onStoreChange={(store) => {
                      setPickedStore(store ? { id: store.id, name: store.name } : undefined);
                      setPickedMemberName(undefined);
                      form.resetField('member_id');
                    }}
                    onMemberChange={(member) => {
                      setPickedMemberName(
                        member
                          ? `${member.memberNumber}: ${getMemberDisplayName(member)}`
                          : undefined,
                      );
                    }}
                  />

                  {/* TODO(round3) R303: 請求日 / 請求方法 / 請求区分 are not in FR-011 and API-115 §8.1 rejects billingType / paymentMethod (server-fixed `manual`) — integrate in phase 2
              <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-xs">請求日</span>
                <Input type="date" value={todayBillingDateISO()} readOnly />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-xs">請求方法</span>
                <p className="py-2 text-sm">手動</p>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-xs">請求区分</span>
                <p className="py-2 text-sm">都度請求</p>
              </div>
              */}
                  <FormField
                    control={form.control}
                    name="billing_month"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          適用月<span className="text-destructive ml-0.5">*</span>
                        </FormLabel>
                        <FormControl>
                          <MonthPicker
                            showArrows={false}
                            className="w-full"
                            // API-115 §8.1: 適用月 is the current month or later
                            min={currentMonth().replace('-', '/')}
                            hasError={Boolean(form.formState.errors.billing_month)}
                            value={field.value.replace('-', '/')}
                            onChange={(value) => field.onChange(value.replace('/', '-'))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>請求備考</FormLabel>
                      <FormControl>
                        <Textarea placeholder="備考を入力（任意）" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="px-4">
                <h3 className="mb-4 text-sm font-bold">集計情報</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs">請求総額（税込）</span>
                    <span className="text-sm font-medium tabular-nums">
                      {lineItems.length > 0 ? `¥${totalAmount.toLocaleString('ja-JP')}` : '—'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs">明細件数</span>
                    <span className="text-sm font-medium">
                      {lineItems.length > 0 ? `${lineItems.length}件` : '—'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <ManualRegistrationLineItems
              memberId={memberId || null}
              storeId={effectiveStoreId}
              items={lineItems}
              isBlockedByUnpaid={isBlockedByUnpaid}
              onAdd={(item) => updateLineItems((prev) => [...prev, item])}
              onRemove={(id) => updateLineItems((prev) => prev.filter((item) => item.id !== id))}
            />

            <div className="flex items-center justify-end gap-2 border-t p-4">
              <Button
                size="lg"
                variant="outline"
                onClick={() => confirmDiscard(() => router.push(navigate('/sales')))}
              >
                キャンセル
              </Button>
              <RoleGatedButton
                requiredPermission={Permission.SalesConfirm}
                denyTooltip="請求を追加する権限がありません"
                size="lg"
                variant="outline"
                className="gap-2"
                disabled={!canManualRegister || !canSubmit || isSubmitting}
                onClick={async () => {
                  if (await form.trigger()) setConfirmDialogOpen(true);
                }}
              >
                <Lock className="size-4" />
                確定状態で登録
              </RoleGatedButton>
              <RoleGatedButton
                requiredPermission={Permission.SalesManualRegister}
                denyTooltip="請求を追加する権限がありません"
                size="lg"
                disabled={!canSubmit || isSubmitting}
                onClick={handleRegisterUnconfirmed}
              >
                登録
              </RoleGatedButton>
            </div>

            <ManualRegistrationConfirmDialog
              open={confirmDialogOpen}
              onOpenChange={setConfirmDialogOpen}
              storeName={selectedStoreName ?? '—'}
              memberName={pickedMemberName ?? '—'}
              billingMonth={billingMonth}
              lineItemCount={lineItems.length}
              totalAmount={totalAmount}
              isSubmitting={isSubmitting}
              onConfirm={() => void handleConfirmedRegister()}
            />
          </div>
        </Form>
      </div>
    </>
  );
}
