'use client';

import { useCallback, useState } from 'react';
import { Controller, type DefaultValues, useForm } from 'react-hook-form';

import { useRouter } from 'next/navigation';

import { TEXTAREA_MAX_LENGTH } from '@/constants/app.constants';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useInFlightGuard } from '@/hooks/use-in-flight-guard.hook';
import { useBackToListHref } from '@/hooks/use-return-to.hook';
import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard.hook';

import { BackLink } from '@/components/common/back-link';
import { BRAND_ENUM_LABELS } from '@/components/common/brand-badge';
import { DateTimePicker } from '@/components/common/date-time-picker';
import { FormField } from '@/components/common/form-field';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminAppVersionControllerCreateMutation,
  adminAppVersionControllerListOptions,
  adminAppVersionControllerListQueryKey,
  adminAppVersionControllerUpdateMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import {
  APP_VERSION_BRANDS,
  APP_VERSION_DETAIL_QUERY_PREFIX,
  APP_VERSION_OSES,
  APP_VERSION_OS_LABELS,
  APP_VERSION_SLOT_KINDS,
  APP_VERSION_SLOT_KIND_LABELS,
  type AppVersionOs,
  type AppVersionSlotKind,
  appVersionSlot,
} from '../../_constants/app-version.constants';
import {
  appVersionFormValuesToCreateBody,
  appVersionFormValuesToUpdateBody,
} from '../../_schemas/app-version-form.mapper';
import {
  AppVersionFormSchema,
  type AppVersionFormSubmitValues,
  type AppVersionFormValues,
  LATEST_BELOW_MINIMUM_MESSAGE,
  appVersionOsFieldPaths,
  emptyAppVersionFormValues,
} from '../../_schemas/app-version-form.schema';
import {
  type AppVersionMinChange,
  getAppVersionMinChanges,
} from '../../_utils/app-version-min-change.util';
import { toAppVersionServerErrors } from '../../_utils/app-version-server-errors.util';
import { AppVersionMinChangeDialog } from './app-version-min-change-dialog';

interface AppVersionFormProps {
  mode: 'create' | 'edit';
  defaultValues?: DefaultValues<AppVersionFormValues>;
  versionId?: string;
}

interface PendingSubmit {
  values: AppVersionFormSubmitValues;
  changes: AppVersionMinChange[];
}

// Y-05 FR-M002 checks 適用開始日時 only as a date-time: a reservation has no upper limit and a past
// start is refused by the server only when it precedes the active setting. The back range keeps
// react-day-picker's default; the forward one lifts its cap at the end of the current year.
const EFFECTIVE_AT_YEARS_BACK = 100;
const EFFECTIVE_AT_YEARS_AHEAD = 10;

export function AppVersionForm({ mode, defaultValues, versionId }: AppVersionFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const backToListHref = useBackToListHref(navigate('/app-versions'));
  const scrollToFirstError = useScrollToFirstError();

  const form = useForm<AppVersionFormValues, unknown, AppVersionFormSubmitValues>({
    resolver: zodResolver(AppVersionFormSchema) as never,
    mode: 'onSubmit',
    defaultValues: defaultValues ?? emptyAppVersionFormValues(),
  });

  // Read in render: react-hook-form only tracks `isDirty` once it is accessed here.
  const { isDirty, errors: formErrors } = form.formState;
  const [submitError, setSubmitError] = useState(false);
  const [isCheckingActive, setIsCheckingActive] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<PendingSubmit | null>(null);

  const { confirmDiscard, navigateAfterSave } = useUnsavedChangesGuard(isDirty);

  // Same href as the breadcrumb, so the list comes back with its filters and page.
  const navigateToList = useCallback(() => {
    router.push(backToListHref);
  }, [router, backToListHref]);

  const invalidateAndNavigate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: adminAppVersionControllerListQueryKey() });
    // Every detail, not just this one: a setting that starts now ends the brand's active one.
    queryClient.invalidateQueries({ queryKey: APP_VERSION_DETAIL_QUERY_PREFIX });
    // Saved: drop the dirty state so leaving the page does not prompt.
    form.reset(form.getValues());
    navigateAfterSave(navigateToList);
  }, [queryClient, form, navigateAfterSave, navigateToList]);

  // Field-level failures land under their fields; the shared toast is suppressed so the same
  // failure is not reported twice.
  const handleMutationError = (error: unknown) => {
    setPendingSubmit(null);
    const { fieldErrors, hasUnmappedError } = toAppVersionServerErrors(error);
    fieldErrors.forEach(({ name, message }) => form.setError(name, { message }));
    if (fieldErrors.length > 0) {
      setSubmitError(true);
      scrollToFirstError();
    }
    if (hasUnmappedError) toast.error(resolveApiErrorMessage(error));
  };

  const createMutation = useMutation({
    ...adminAppVersionControllerCreateMutation(),
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      toast.success('アプリバージョンを登録しました');
      invalidateAndNavigate();
    },
    onError: handleMutationError,
  });

  const updateMutation = useMutation({
    ...adminAppVersionControllerUpdateMutation(),
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      toast.success('アプリバージョンの変更を保存しました');
      invalidateAndNavigate();
    },
    onError: handleMutationError,
  });

  // Same-tick clicks would each pass `disabled` and send the write twice. The guard is
  // released once the write settles, so a saved form also stays disabled while the list loads.
  const runOnce = useInFlightGuard();
  const isSaved = createMutation.isSuccess || updateMutation.isSuccess;
  const isSaving = createMutation.isPending || updateMutation.isPending || isSaved;
  const isSubmitting = isSaving || isCheckingActive;

  const save = async (values: AppVersionFormSubmitValues) => {
    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({ body: appVersionFormValuesToCreateBody(values) });
      } else if (versionId) {
        await updateMutation.mutateAsync({
          body: appVersionFormValuesToUpdateBody(values),
          path: { id: versionId },
        });
      }
    } catch {
      // A refusal is already answered by `handleMutationError`.
    }
  };

  const submitForm = form.handleSubmit(
    async (values) => {
      setSubmitError(false);
      // FR-M002: raising or lowering the minimum against the setting in effect now asks first.
      setIsCheckingActive(true);
      try {
        const active = await queryClient.fetchQuery({
          ...adminAppVersionControllerListOptions({
            query: { brandEnum: values.brandEnum, status: 'active', limit: 1 },
          }),
          // The check must see the setting in effect at save time; the shared 2-minute cache
          // could still hold one that has since ended or been replaced.
          staleTime: 0,
        });
        const changes = getAppVersionMinChanges(active.items[0] ?? null, values);
        if (changes.length > 0) {
          setPendingSubmit({ values, changes });
          return;
        }
        await save(values);
      } catch (error) {
        toast.error(resolveApiErrorMessage(error));
      } finally {
        setIsCheckingActive(false);
      }
    },
    () => {
      setSubmitError(true);
      scrollToFirstError();
    },
  );
  const handleSubmit = (event?: React.BaseSyntheticEvent) => void runOnce(() => submitForm(event));

  const handleCancel = () => confirmDiscard(navigateToList);
  const submitLabel = mode === 'create' ? '登録する' : '保存する';
  const currentYear = new Date().getFullYear();

  return (
    <>
      <PageHeader
        breadcrumb={<BackLink label="アプリ管理に戻る" onClick={handleCancel} />}
        title={mode === 'create' ? 'バージョン登録' : 'バージョン編集'}
      />
      <div className="bg-background flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto flex max-w-240 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">バージョン情報</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="flex flex-col gap-6">
                <FormField label="ブランド" required error={formErrors.brandEnum?.message}>
                  <Controller
                    control={form.control}
                    name="brandEnum"
                    render={({ field }) => (
                      <RadioGroup
                        value={field.value ?? ''}
                        onValueChange={field.onChange}
                        className="flex flex-wrap items-center gap-6"
                      >
                        {APP_VERSION_BRANDS.map((brand) => (
                          <div key={brand} className="flex items-center gap-2">
                            <RadioGroupItem
                              value={brand}
                              id={`brand-${brand}`}
                              aria-invalid={!!formErrors.brandEnum}
                            />
                            <Label
                              htmlFor={`brand-${brand}`}
                              className="cursor-pointer text-sm font-normal"
                            >
                              {BRAND_ENUM_LABELS[brand]}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                  />
                </FormField>

                <FormField label="適用開始日時" required error={formErrors.effectiveAt?.message}>
                  <Controller
                    control={form.control}
                    name="effectiveAt"
                    render={({ field }) => (
                      <DateTimePicker
                        value={field.value ? new Date(field.value) : undefined}
                        onChange={(date) => field.onChange(date ? date.toISOString() : '')}
                        hasError={!!formErrors.effectiveAt}
                        className="w-64"
                        startMonth={new Date(currentYear - EFFECTIVE_AT_YEARS_BACK, 0)}
                        endMonth={new Date(currentYear + EFFECTIVE_AT_YEARS_AHEAD, 11)}
                      />
                    )}
                  />
                </FormField>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {APP_VERSION_OSES.map((os) => (
                    <div key={os} className="flex flex-col gap-4">
                      {APP_VERSION_SLOT_KINDS.map((kind) => (
                        <AppVersionPairField key={kind} form={form} os={os} kind={kind} />
                      ))}
                    </div>
                  ))}
                </div>

                <FormField label="備考" optional error={formErrors.remarks?.message}>
                  <Textarea
                    placeholder="バージョンに関する備考を入力"
                    rows={4}
                    maxLength={TEXTAREA_MAX_LENGTH}
                    {...form.register('remarks')}
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-2 border-t p-4">
            {submitError && (
              <p className="text-destructive mr-auto text-xs">
                未入力または不正な形式の項目があります
              </p>
            )}
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <RoleGatedButton
              requiredPermission={
                mode === 'create' ? Permission.AppVersionsCreate : Permission.AppVersionsEdit
              }
              denyTooltip="本部権限が必要です"
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {submitLabel}
            </RoleGatedButton>
          </div>
        </div>
      </div>

      <AppVersionMinChangeDialog
        brand={pendingSubmit?.values.brandEnum ?? null}
        changes={pendingSubmit?.changes ?? []}
        confirmLabel={submitLabel}
        isPending={isSaving}
        onCancel={() => setPendingSubmit(null)}
        onConfirm={() => {
          if (pendingSubmit) void runOnce(() => save(pendingSubmit.values));
        }}
      />
    </>
  );
}

interface AppVersionPairFieldProps {
  form: ReturnType<typeof useForm<AppVersionFormValues, unknown, AppVersionFormSubmitValues>>;
  os: AppVersionOs;
  kind: AppVersionSlotKind;
}

/** One version slot: name (X.Y.Z) + build number, both filled or both blank (= carry over). */
function AppVersionPairField({ form, os, kind }: AppVersionPairFieldProps) {
  const slot = appVersionSlot(os, kind);
  const namePath = `${slot}VersionName` as const;
  const buildPath = `${slot}BuildNumber` as const;
  const nameError = form.formState.errors[namePath];
  const buildError = form.formState.errors[buildPath];

  // The pair rule and latest ≥ minimum span the OS's four inputs: editing one re-checks the
  // others, so an error the edit resolved does not linger on a field that was not touched.
  const osPaths = appVersionOsFieldPaths(os);
  const depsOf = (path: (typeof osPaths)[number]) => osPaths.filter((other) => other !== path);

  // Latest ≥ minimum flags the minimum inputs too, but its message is shown once: under the latest.
  const message = [nameError?.message, buildError?.message].find(
    (text) => text && (kind === 'Latest' || text !== LATEST_BELOW_MINIMUM_MESSAGE),
  );

  return (
    <FormField
      label={`${APP_VERSION_OS_LABELS[os]} ${APP_VERSION_SLOT_KIND_LABELS[kind]}`}
      optional
      description="X.Y.Z 形式（例: 1.2.3）。空欄の場合は直前の設定を引き継ぎます"
      error={message}
    >
      <div className="flex items-center gap-2">
        <Input
          placeholder="X.Y.Z"
          className="min-w-0 flex-1"
          aria-invalid={!!nameError}
          {...form.register(namePath, { deps: depsOf(namePath) })}
        />
        <span className="text-muted-foreground text-xs whitespace-nowrap">ビルド</span>
        <Input
          inputMode="numeric"
          placeholder="番号"
          className="w-25"
          aria-invalid={!!buildError}
          {...form.register(buildPath, { deps: depsOf(buildPath) })}
        />
      </div>
    </FormField>
  );
}
