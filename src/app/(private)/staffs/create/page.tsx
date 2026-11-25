'use client';

import { useState } from 'react';
import { type DefaultValues, useForm, useWatch } from 'react-hook-form';

import { useRouter } from 'next/navigation';

import { STAFF_BULK_INVITE_MAX_ROWS } from '@/constants/app.constants';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useBackToListHref } from '@/hooks/use-return-to.hook';
import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard.hook';

import { BackLink } from '@/components/common/back-link';
import { PageHeader } from '@/components/common/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';

import {
  adminStaffControllerInviteBulkMutation,
  adminStaffPermissionControllerListStaffQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { invalidateDomainStaffCountQueries } from '../_utils/invalidate-domain-staff-count.util';
import { AffiliationSection } from './_components/affiliation-section';
import { NoteSection } from './_components/note-section';
import { PermissionSection } from './_components/permission-section';
import { StaffRowsSection } from './_components/staff-rows-section';
import { type StaffCreateFormValues, staffCreateFormSchema } from './_schemas/staff-create.schema';
import {
  buildInviteStaffBulkPayload,
  extractFailedInviteRows,
  getErrorUserMessage,
  getFieldErrorFlags,
  getSubmitErrorMessage,
  hasAnyDuplicate,
  mapFailedInviteRowsToFields,
} from './_utils/staff-create.util';

const DEFAULT_VALUES: DefaultValues<StaffCreateFormValues> = {
  rows: [{ last_name: '', first_name: '', email: '' }],
  role: undefined,
  position_id: '',
  affiliation_type: 'direct_store',
  store_ids: [],
  store_reselect_required: false,
  fc_company_id: '',
  note: '',
};

export default function StaffCreatePage() {
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/staffs'));
  const queryClient = useQueryClient();
  const scrollToFirstError = useScrollToFirstError();

  const form = useForm<StaffCreateFormValues>({
    resolver: zodResolver(staffCreateFormSchema),
    mode: 'onChange',
    defaultValues: DEFAULT_VALUES,
  });
  const rows = useWatch({ control: form.control, name: 'rows' });

  const filledRowCount = rows.filter(
    (row) => row.last_name.trim() || row.first_name.trim() || row.email.trim(),
  ).length;

  /**
   * react-hook-form's `isDirty` is a deep comparison against `defaultValues`, not a record
   * of what the user did: adding a row, typing in it and removing it again lands back on
   * the pristine values and reads clean, so the discard guard never fired. Row removal is
   * latched here instead — it is never undone by further editing.
   */
  const [hasRemovedRow, setHasRemovedRow] = useState(false);

  const { confirmDiscard, navigateAfterSave } = useUnsavedChangesGuard(
    form.formState.isDirty || hasRemovedRow,
  );

  const handleCancel = () => confirmDiscard(() => router.push(navigate('/staffs')));

  const hasDuplicate = hasAnyDuplicate(rows);

  const createMutation = useMutation({
    ...adminStaffControllerInviteBulkMutation(),
    // A rejection names the offending row, which `onSubmit` turns into a field error —
    // the global toast would say the same thing without pointing at a row. `onSubmit`
    // raises it itself whenever no row could be identified.
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      toast.success('スタッフを登録しました');
      queryClient.invalidateQueries({
        queryKey: adminStaffPermissionControllerListStaffQueryKey(),
      });
      invalidateDomainStaffCountQueries(queryClient);
      navigateAfterSave(() => router.push(navigate('/staffs')));
    },
  });

  const onSubmit = async (values: StaffCreateFormValues) => {
    if (hasDuplicate) {
      scrollToFirstError();
      return;
    }
    const body = buildInviteStaffBulkPayload(values);
    if (!body) return;
    try {
      await createMutation.mutateAsync({ body });
    } catch (error) {
      // 409 (E-STF-002) / 422 (E-DMN-006) / 502 (E-STF-005) all carry `details.processed[]`
      // naming the row that was refused — flag that row instead of dropping the detail.
      const fallbackMessage = getErrorUserMessage(error);
      const rowErrors = mapFailedInviteRowsToFields(
        values.rows,
        extractFailedInviteRows(error),
        fallbackMessage,
      );
      if (rowErrors.length === 0) {
        toast.error(fallbackMessage);
        return;
      }
      rowErrors.forEach(({ index, message }) =>
        form.setError(`rows.${index}.email`, { type: 'server', message }),
      );
      scrollToFirstError();
    }
  };

  // Split by origin: a 409/422 sets `type: 'server'` on a row whose fields are all filled
  // in, so counting the error tree wholesale made the footer claim 「未入力の必須項目が
  // あります」 over a complete form (BUG-P2-02-12).
  const { hasClientError, hasServerRowError } = getFieldErrorFlags(form.formState.errors);
  const submitErrorMessage = getSubmitErrorMessage(
    form.formState.isSubmitted,
    hasDuplicate,
    hasClientError,
    filledRowCount > STAFF_BULK_INVITE_MAX_ROWS,
    hasServerRowError,
  );

  const isSubmitDisabled =
    filledRowCount === 0 || form.formState.isSubmitting || createMutation.isPending;

  const submitLabel = filledRowCount > 0 ? `${filledRowCount}名を登録する` : '登録する';

  return (
    <>
      <PageHeader
        breadcrumb={
          <BackLink
            label="スタッフ管理に戻る"
            onClick={() => confirmDiscard(() => router.push(backToListHref))}
          />
        }
        title="スタッフ新規登録"
      />

      <Form {...form}>
        <form
          noValidate
          className="mx-auto flex max-w-[960px] flex-col gap-6 px-6 py-4"
          onSubmit={form.handleSubmit(onSubmit, scrollToFirstError)}
        >
          <StaffRowsSection onRowRemoved={() => setHasRemovedRow(true)} />
          <PermissionSection />
          <AffiliationSection />
          <NoteSection />

          <Alert>
            <AlertDescription className="text-xs">
              登録後、各スタッフのメールアドレスに初期パスワードが自動送信されます。スタッフは受信したメールに記載のパスワードでCRMにログインできます。
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-end gap-2 border-t p-4">
            {submitErrorMessage && (
              <p className="text-destructive mr-auto text-xs">{submitErrorMessage}</p>
            )}
            <Button size="lg" variant="outline" type="button" onClick={handleCancel}>
              キャンセル
            </Button>
            <Button size="lg" type="submit" disabled={isSubmitDisabled}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
