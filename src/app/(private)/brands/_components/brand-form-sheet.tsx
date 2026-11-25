'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes.hook';

import { Button } from '@/components/ui/button';
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
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetFooter } from '@/components/ui/sheet';

import {
  adminBrandControllerDetailQueryKey,
  adminBrandControllerHistoryQueryKey,
  adminBrandControllerListQueryKey,
  adminBrandControllerUpdateGroupMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { BrandListItemDto } from '@/lib/api-real/types.gen';

import { type BrandFormValues, brandFormSchema } from '../_schemas/brand-form.schema';

/** What the sheet needs — satisfied by both a list row and the brand detail. */
export type BrandFormTarget = Pick<BrandListItemDto, 'brandGroup' | 'displayName'>;

interface BrandFormSheetProps {
  brand: BrandFormTarget | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * ブランド編集 — rename only (Y-07 260928_v3 FR-001, prototype `BrandEditSheet`), shared by the list
 * row's 編集 and the detail's 一般情報 変更. `PATCH /admin/brands/{brandGroup}` answers with the
 * brand detail, which goes straight into the cache.
 */
export function BrandFormSheet({ brand, onOpenChange }: BrandFormSheetProps) {
  const open = !!brand;
  const scrollToFirstError = useScrollToFirstError();
  const queryClient = useQueryClient();
  const lastResetBrandRef = useRef<string | null>(null);

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { displayName: brand?.displayName ?? '' },
  });

  const { confirmDiscard } = useUnsavedChanges(open && form.formState.isDirty);

  useEffect(() => {
    if (!brand) {
      lastResetBrandRef.current = null;
      return;
    }
    if (lastResetBrandRef.current !== brand.brandGroup) {
      form.reset({ displayName: brand.displayName });
      lastResetBrandRef.current = brand.brandGroup;
    }
  }, [brand, form]);

  const updateMutation = useMutation({
    ...adminBrandControllerUpdateGroupMutation(),
    onSuccess: (detail) => {
      queryClient.setQueryData(
        adminBrandControllerDetailQueryKey({ path: { brandGroup: detail.brandGroup } }),
        detail,
      );
      void queryClient.invalidateQueries({ queryKey: adminBrandControllerListQueryKey() });
      void queryClient.invalidateQueries({
        queryKey: adminBrandControllerHistoryQueryKey({ path: { brandGroup: detail.brandGroup } }),
      });
      toast.success('ブランド情報を更新しました');
      onOpenChange(false);
    },
  });

  const handleSubmit = (values: BrandFormValues) => {
    if (!brand) return;
    updateMutation.mutate({
      path: { brandGroup: brand.brandGroup },
      body: { displayName: values.displayName },
    });
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!updateMutation.isPending) onOpenChange(nextOpen);
      }}
    >
      <SheetContent className="flex w-[384px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[384px]">
        <div className="px-6 py-4">
          <h2 className="text-sm font-semibold">ブランド編集</h2>
          <SheetDescription className="sr-only">ブランド編集フォーム</SheetDescription>
        </div>
        <Separator />

        <Form {...form}>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={form.handleSubmit(handleSubmit, scrollToFirstError)}
          >
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="flex flex-col gap-5">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        ブランド名
                        <span className="text-destructive ml-1">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="例: JOYFIT" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Y-07 FR-002 ブランドIDルール: 変更不可（システム内部キー）— display only. */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="brand-form-brand-id" className="text-sm font-medium">
                    ブランドID
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Input
                    id="brand-form-brand-id"
                    value={brand?.brandGroup ?? ''}
                    placeholder="例: joyfit"
                    disabled
                    readOnly
                  />
                  <p className="text-muted-foreground text-xs">
                    システム内部キーのため変更できません。
                  </p>
                </div>

                <Separator className="-mx-6 w-[calc(100%+48px)]" />

                <div className="flex flex-col gap-1">
                  <p className="text-xs font-semibold text-slate-600">費用（入会金・手数料）</p>
                  <p className="text-muted-foreground text-xs leading-5">
                    費用の設定はブランド詳細画面の「費用」タブで管理します。
                  </p>
                </div>
              </div>
            </div>

            <Separator />
            <SheetFooter className="gap-2 px-6 pt-4 pb-6">
              <Button
                type="button"
                variant="outline"
                className="h-8 w-full rounded-md text-sm"
                disabled={updateMutation.isPending}
                onClick={() => confirmDiscard(() => onOpenChange(false))}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                className="bg-foreground text-background hover:bg-foreground/90 h-8 w-full rounded-md text-sm"
                disabled={updateMutation.isPending}
              >
                保存する
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
