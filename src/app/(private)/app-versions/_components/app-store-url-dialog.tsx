'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';

import { useAuthUser } from '@/contexts/auth-user.context';
import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { FormField } from '@/components/common/form-field';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminAppStoreUrlControllerGetAllOptions,
  adminAppStoreUrlControllerGetAllQueryKey,
  adminAppStoreUrlControllerPutAllMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { ValidationErrorDetailDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import { APP_STORE_URL_FIELDS } from '../_constants/app-version.constants';
import {
  AppStoreUrlFormSchema,
  type AppStoreUrlFormValues,
  appStoreUrlFormValuesToBody,
  appStoreUrlsToFormValues,
} from '../_schemas/app-store-url.schema';
import {
  validationDetailMessage,
  validationDetailsOf,
} from '../_utils/app-version-server-errors.util';

function storeUrlDetailMessage(label: string, code: ValidationErrorDetailDto['code']): string {
  if (code === 'invalid_format') return 'URL の形式で入力してください';
  return validationDetailMessage(label, code);
}

interface AppStoreUrlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Y-05 FR-M006 ストアの URL の設定 — the store page each app's update button opens. */
export function AppStoreUrlDialog({ open, onOpenChange }: AppStoreUrlDialogProps) {
  const queryClient = useQueryClient();
  const canEdit = useAuthUser().hasPermission(Permission.AppVersionsEdit);

  const { data, isLoading, isError, refetch } = useQuery({
    ...adminAppStoreUrlControllerGetAllOptions(),
    enabled: open,
  });

  const formValues = useMemo(() => appStoreUrlsToFormValues(data), [data]);
  const form = useForm<AppStoreUrlFormValues>({
    resolver: zodResolver(AppStoreUrlFormSchema),
    mode: 'onSubmit',
    values: formValues,
  });
  const { errors } = form.formState;

  const saveMutation = useMutation({
    ...adminAppStoreUrlControllerPutAllMutation(),
    meta: { suppressErrorToast: true },
    onSuccess: (saved) => {
      toast.success('ストアの URL を保存しました');
      queryClient.setQueryData(adminAppStoreUrlControllerGetAllQueryKey(), saved);
      onOpenChange(false);
    },
    onError: (error) => {
      // E-VAL-001 names the failing app by its body key; land the server's verdict under it.
      const details = validationDetailsOf(error);
      let hasUnmappedError = details.length === 0;
      for (const detail of details) {
        const field = APP_STORE_URL_FIELDS.find(({ key }) => key === detail.field);
        if (!field) {
          hasUnmappedError = true;
          continue;
        }
        form.setError(field.key, { message: storeUrlDetailMessage(field.label, detail.code) });
      }
      if (hasUnmappedError) toast.error(resolveApiErrorMessage(error));
    },
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) form.reset(formValues);
    onOpenChange(next);
  };

  const handleSubmit = form.handleSubmit((values) =>
    saveMutation.mutate({ body: appStoreUrlFormValuesToBody(values) }),
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-140">
        <DialogHeader>
          <DialogTitle>ストアの URL の設定</DialogTitle>
          <DialogDescription>
            アップデートのボタンから開くストアのページを、アプリごとに設定します。
          </DialogDescription>
        </DialogHeader>

        <DataStateBoundary
          isLoading={isLoading}
          isError={isError}
          isEmpty={false}
          onRetry={() => void refetch()}
          skeleton={
            <div className="flex flex-col gap-4">
              {APP_STORE_URL_FIELDS.map(({ key }) => (
                <Skeleton key={key} className="h-14 w-full" />
              ))}
            </div>
          }
        >
          <form className="flex flex-col gap-4 wrap-anywhere" noValidate onSubmit={handleSubmit}>
            {APP_STORE_URL_FIELDS.map(({ key, brand, os, label }) => {
              const saved = data?.items.find((item) => item.brand === brand && item.os === os);
              return (
                <FormField
                  key={key}
                  label={label}
                  required
                  description={
                    saved?.updatedAt
                      ? `更新: ${saved.updatedByName ?? '—'} ${formatDateYYYYMMDD_HHMM(saved.updatedAt)}`
                      : undefined
                  }
                  error={errors[key]?.message}
                >
                  <Input
                    type="url"
                    placeholder="https://"
                    disabled={!canEdit}
                    aria-invalid={!!errors[key]}
                    {...form.register(key)}
                  />
                </FormField>
              );
            })}
          </form>
        </DataStateBoundary>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={saveMutation.isPending}
          >
            キャンセル
          </Button>
          <RoleGatedButton
            requiredPermission={Permission.AppVersionsEdit}
            denyTooltip="本部権限が必要です"
            onClick={handleSubmit}
            disabled={saveMutation.isPending || isLoading || isError}
          >
            保存する
          </RoleGatedButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
