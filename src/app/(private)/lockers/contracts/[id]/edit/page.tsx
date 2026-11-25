'use client';

import { useEffect, useMemo } from 'react';
import { useForm, useFormState } from 'react-hook-form';

import { useParams, useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';
import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard.hook';

import { BreadcrumbNav } from '@/components/common/breadcrumb-nav';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';

import { isRecordNotFoundError } from '@/lib/api-error.util';
import { adminLockerContractsControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { useLockerSlotMutations } from '../../../[id]/_hooks/use-locker-slot-mutations.hook';
import { LockerContractForm } from '../../_components/locker-contract-form';
import {
  type LockerContractFormSubmitValues,
  type LockerContractFormValues,
  lockerContractFormSchema,
} from '../../_schemas/locker-contract-form.schema';
import {
  emptyLockerContractFormDefaults,
  lockerContractDetailToFormValues,
  lockerContractFormValuesToSlotPatch,
  validateDialPin,
} from '../../_utils/locker-contract-form.util';

export default function LockerContractEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const contractId = params?.id;
  const scrollToFirstError = useScrollToFirstError();
  const backToListHref = useBackToListHref(navigate('/lockers/contracts'));
  const withReturnTo = useWithReturnTo();

  const {
    data: contract,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    ...adminLockerContractsControllerDetailOptions({
      path: { optionContractId: contractId ?? '' },
    }),
    enabled: Boolean(contractId),
  });

  const defaultValues = useMemo<LockerContractFormValues>(() => {
    if (!contract) return emptyLockerContractFormDefaults;
    return lockerContractDetailToFormValues(contract);
  }, [contract]);

  const form = useForm<LockerContractFormValues, unknown, LockerContractFormSubmitValues>({
    resolver: zodResolver(lockerContractFormSchema) as never,
    // Show the PIN error as soon as the field is left, not only after 変更を保存する (BUG-E01-48)
    mode: 'onTouched',
    defaultValues,
  });

  useEffect(() => {
    if (!contract) return;
    form.reset(defaultValues);
  }, [contract, defaultValues, form]);

  const { isDirty, isValid } = useFormState({ control: form.control });
  const { confirmDiscard, navigateAfterSave } = useUnsavedChangesGuard(isDirty);
  // Success toast + invalidation of every locker query live in the shared slot mutation hook
  const { updateSlot, isUpdatingSlot } = useLockerSlotMutations();

  const onSubmit = async (values: LockerContractFormSubmitValues) => {
    if (!contract) return;
    const pinError = validateDialPin(contract, values.pinCode);
    if (pinError) {
      form.setError('pinCode', { message: pinError });
      return;
    }

    try {
      // No `expectedUpdatedAt`: the detail's `updatedAt` is the option contract's, not the slot's
      await updateSlot(contract.slotId, lockerContractFormValuesToSlotPatch(values));
    } catch {
      // The shared MutationCache toast shows the API's userMessage
      return;
    }
    navigateAfterSave(() => router.push(navigate('/lockers/contracts/[id]', contractId ?? '')));
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!isDirty) return;
    await onSubmit(values);
  }, scrollToFirstError);

  // Same not-found handling as the detail page: 404 E-LOC-016 / 400 malformed id → a way back
  const isNotFound = isError && isRecordNotFoundError(error, 'optionContractId');
  if (isLoading || !contract || (isError && !isNotFound)) {
    return (
      <DataStateBoundary
        isLoading={isLoading}
        isError={isError && !isNotFound}
        isEmpty={!contract}
        onRetry={() => refetch()}
        errorTitle="ロッカー契約の取得に失敗しました"
        emptyState={{
          title: 'ロッカー契約が見つかりません',
          description: '存在しないか、閲覧できない店舗の契約です。',
          actionLabel: '契約一覧に戻る',
          onAction: () => router.push(backToListHref),
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <BreadcrumbNav
          items={[
            { url: backToListHref, label: 'ロッカー契約管理' },
            {
              url: withReturnTo(
                navigate('/lockers/contracts/[id]', contractId ?? ''),
                backToListHref,
              ),
              label: (contract.optionContractId ?? '').slice(0, 8),
            },
            { label: '編集' },
          ]}
          variant="section"
          onNavigate={(url) => confirmDiscard(() => router.push(url))}
        />
      </div>

      <div className="mx-auto max-w-[960px] px-4 pt-4 pb-28">
        <div className="mb-4">
          <h1 className="text-xl font-bold">ロッカー契約 編集</h1>
        </div>

        <Form {...form}>
          <form onSubmit={handleSubmit}>
            <LockerContractForm contract={contract} />
          </form>
        </Form>
      </div>

      <div className="bg-background/95 fixed right-0 bottom-0 left-0 border-t px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-[960px] justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() =>
              confirmDiscard(() =>
                router.push(navigate('/lockers/contracts/[id]', contractId ?? '')),
              )
            }
          >
            キャンセル
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={!isDirty || !isValid || isUpdatingSlot}
            onClick={handleSubmit}
          >
            {isUpdatingSlot ? '保存中...' : '変更を保存する'}
          </Button>
        </div>
      </div>
    </div>
  );
}
