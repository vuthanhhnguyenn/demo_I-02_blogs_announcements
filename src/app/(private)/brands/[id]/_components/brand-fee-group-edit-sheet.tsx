'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { type Resolver, useFieldArray, useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes.hook';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import {
  adminBrandControllerRegisterFeeMasterMutation,
  adminBrandControllerUpdateFeeCardMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';

import { Permission } from '@/types/permission.type';

import type { BrandGroup } from '../../_constants/brand-real.constants';
import { useBrandFeeCache } from '../_hooks/use-brand-fee-cache';
import {
  type BrandFeeGroupFormValues,
  buildBrandFeeGroupFormSchema,
} from '../_schemas/brand-fee-group-form.schema';
import type { BrandFeeSheetMode, BrandFeeSheetTarget } from '../_types/brand-fee.type';
import {
  buildDefaultValues,
  toRegisterFeeMasterBody,
  toUpdateFeeCardBody,
} from '../_utils/brand-fee-group-form.util';
import { toCircledNumeral } from '../_utils/brand-fee.util';
import { FeeItemFields } from './fee-item-fields';

interface BrandFeeGroupEditSheetProps {
  brandGroup: BrandGroup;
  target: BrandFeeSheetTarget | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * The 費用マスタ sheet, shared by 変更 and 登録 (prototype 9/30).
 *
 * - **変更** → `PATCH .../sub-brands/{brandEnum}/fees` (plan B1): the whole card in one call —
 *   current price/date plus the full 予約 list per item — diffed server-side in one transaction.
 * - **登録** → `POST .../sub-brands/{brandEnum}/fee-master` for a deleted master's ［＋登録］.
 *
 * Both answer with the card, which goes straight into the cache (`useBrandFeeCache`).
 * Validation runs on save, then re-runs on every change so fixed fields clear (prototype flow).
 */
export function BrandFeeGroupEditSheet({
  brandGroup,
  target,
  onOpenChange,
}: BrandFeeGroupEditSheetProps) {
  const open = !!target;
  const feeGroup = target?.feeGroup ?? null;
  const mode: BrandFeeSheetMode = target?.mode ?? 'edit';
  const scrollToFirstError = useScrollToFirstError();
  const { applyCard } = useBrandFeeCache(brandGroup);

  // The rules differ per mode (登録 shares only the future-date rule). RHF re-reads its options
  // on every render, so a memoised resolver per mode is picked up without remounting the form.
  const resolver = useMemo(
    () => zodResolver(buildBrandFeeGroupFormSchema(mode)) as Resolver<BrandFeeGroupFormValues>,
    [mode],
  );

  const form = useForm<BrandFeeGroupFormValues>({
    resolver,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: buildDefaultValues(feeGroup, mode),
  });

  const { fields } = useFieldArray({ control: form.control, name: 'feeItems' });

  const { confirmDiscard } = useUnsavedChanges(open && form.formState.isDirty);

  // Reset only when opening, or when switching to another card / mode.
  const lastResetKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open) {
      lastResetKeyRef.current = null;
      return;
    }
    const key = `${feeGroup?.subBrandEnum}:${mode}`;
    if (lastResetKeyRef.current !== key) {
      form.reset(buildDefaultValues(feeGroup, mode));
      lastResetKeyRef.current = key;
    }
  }, [open, form, feeGroup, mode]);

  // Cross-field rules (dates vs. other dates) live on the whole schema, so after a save attempt
  // every change re-runs all of them — a per-field re-validate would leave stale conflicts behind.
  const revalidate = useCallback(() => {
    if (form.formState.isSubmitted) void form.trigger();
  }, [form]);

  const updateMutation = useMutation({
    ...adminBrandControllerUpdateFeeCardMutation(),
    onSuccess: (card) => {
      applyCard(card);
      onOpenChange(false);
    },
  });

  const registerMutation = useMutation({
    ...adminBrandControllerRegisterFeeMasterMutation(),
    onSuccess: (card) => {
      applyCard(card);
      if (feeGroup) toast.success(`「${feeGroup.title}」の費用マスタを登録しました`);
      onOpenChange(false);
    },
  });

  const isPending = updateMutation.isPending || registerMutation.isPending;
  const isRegister = mode === 'register';

  const handleValid = (values: BrandFeeGroupFormValues) => {
    if (!feeGroup) return;
    const path = { brandGroup, brandEnum: feeGroup.subBrandEnum };

    if (isRegister) {
      registerMutation.mutate({ path, body: toRegisterFeeMasterBody(values) });
    } else {
      updateMutation.mutate({ path, body: toUpdateFeeCardBody(values) });
    }
  };

  const title = feeGroup ? `${feeGroup.title}の費用マスタを${isRegister ? '登録' : '変更'}` : '';
  // e.g. 「費用項目①②」 — names the items the sheet holds (TC-108).
  const itemsLabel = `費用項目${fields.map((_, index) => toCircledNumeral(index + 1)).join('')}`;

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isPending) onOpenChange(nextOpen);
      }}
    >
      <SheetContent className="flex h-dvh w-120 flex-col gap-0 overflow-hidden p-0 sm:max-w-120">
        {/* pr-12 keeps the title clear of the absolute close ✕ (top-3 right-3, 28px). */}
        <div className="shrink-0 border-b py-3.5 pr-12 pl-5">
          <SheetHeader className="min-w-0 gap-0 p-0 text-left">
            {/* A long brand name wraps; an unbroken token breaks anywhere instead of overflowing. */}
            <SheetTitle className="min-w-0 text-sm font-semibold [overflow-wrap:anywhere]">
              {title}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {isRegister
                ? `${itemsLabel}の有効開始日・定価を入力して費用マスタを登録します`
                : `${itemsLabel}の有効開始日・定価・改定スケジュールを変更します`}
            </SheetDescription>
          </SheetHeader>
        </div>

        <Form {...form}>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={form.handleSubmit(handleValid, scrollToFirstError)}
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="flex flex-col gap-6">
                {fields.map((field, index) => (
                  <FeeItemFields
                    key={field.id}
                    form={form}
                    index={index}
                    itemLabel={`費用項目${toCircledNumeral(index + 1)}`}
                    mode={mode}
                    onChange={revalidate}
                  />
                ))}
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t px-5 pt-3.5 pb-8">
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-md text-sm"
                disabled={isPending}
                onClick={() => confirmDiscard(() => onOpenChange(false))}
              >
                キャンセル
              </Button>
              <RoleGatedButton
                type="submit"
                className="h-8 rounded-md text-sm"
                requiredPermission={Permission.BrandsEdit}
                disabled={isPending}
              >
                {isRegister ? '登録する' : '保存する'}
              </RoleGatedButton>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
