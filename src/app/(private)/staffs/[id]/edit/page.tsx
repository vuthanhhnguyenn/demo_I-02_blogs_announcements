'use client';

import { useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { useParams, useRouter } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useBackToListHref } from '@/hooks/use-return-to.hook';
import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard.hook';

import { BackLink } from '@/components/common/back-link';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

import {
  adminStaffControllerUpdateMutation,
  adminStaffPermissionControllerGetStaffOptions,
  adminStaffPermissionControllerGetStaffQueryKey,
  adminStaffPermissionControllerListStaffQueryKey,
  adminStaffPermissionControllerStaffChangeHistoriesQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { StaffDetailDto, UpdateStaffRequestDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { UserRole } from '@/types/permission.type';

import { canEditStaffAccount } from '../../_utils/can-edit-staff.util';
import { isSameStoreIds } from '../../_utils/store-affiliation.util';
import { AffiliationSection } from './_components/affiliation-section';
import { PermissionSettingsSection } from './_components/permission-settings-section';
import { PersonalInfoSection } from './_components/personal-info-section';
import { RoleChangeConfirmDialog } from './_components/role-change-confirm-dialog';
// ─── Schemas (externalized per rules) ─────────────────────────────────────────
import { type StaffEditFormValues, staffEditFormSchema } from './_schemas/staff-edit-form.schema';
import {
  STAFF_EMAIL_COGNITO_MAX_LENGTH,
  getEmailLockReason,
  getEmailPatchErrorMessage,
  getStaffSaveToast,
  isEmailChanged,
} from './_utils/staff-edit-email.util';

export default function StaffEditPage() {
  return <StaffEditDataProvider />;
}

function StaffEditDataProvider() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const staffId = id ?? '';

  const { user, isLoading: isUserLoading } = useAuthUser();
  const {
    data: staff,
    isLoading,
    isError,
  } = useQuery({
    ...adminStaffPermissionControllerGetStaffOptions({ path: { id: staffId } }),
    enabled: Boolean(id),
  });

  if (!id) {
    return <div className="text-destructive p-6 text-sm">スタッフIDが不正です。</div>;
  }

  if (isLoading || isUserLoading) {
    return <StaffEditPageSkeleton />;
  }

  if (isError || !staff) {
    return <div className="text-destructive p-6 text-sm">スタッフ情報の取得に失敗しました。</div>;
  }

  // FR-013: enforce the same manager-scope edit rule the detail page and the list row
  // action use, at the point of entry — a disabled button elsewhere doesn't stop direct
  // URL navigation. See specs/020-staff-permission-management/research.md #15.
  if (!canEditStaffAccount(user, staff)) {
    return (
      <div className="text-muted-foreground p-6 text-sm">
        このスタッフを編集する権限がありません。担当店舗のスタッフのみ編集できます。
      </div>
    );
  }

  return <StaffEditFormContent id={id} staff={staff} />;
}

function StaffEditFormContent({ id, staff }: { id: string; staff: StaffDetailDto }) {
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/staffs'));
  const queryClient = useQueryClient();
  const { hasRole } = useAuthUser();
  // Y-01 権限マトリクス: ロール付与・変更 and 店舗/FC企業紐づけ設定 are both ○ for System and
  // Headquarter and × for everyone else. A Manager is here for 職位割り当て（担当店舗分）,
  // which *is* ○ for them, so those two cards render locked instead of the page 403ing.
  const canChangeRole = hasRole([UserRole.Headquarter, UserRole.System]);
  const canEditAffiliation = canChangeRole;
  // Y-01 - Bug No.16: only a cognito-route staff's email can change (API-070 §6.5.3).
  const emailLockReason = getEmailLockReason(staff.authProvider);
  const [roleChangeDialogOpen, setRoleChangeDialogOpen] = useState(false);

  const defaultValues = useMemo<StaffEditFormValues>(() => {
    return {
      last_name: staff.lastName,
      first_name: staff.firstName,
      // NOTE(spec-gap, 2026-09-18): kana/phone are out of scope per Y-01 but fully supported
      // by the wire (StaffDetailDto returns them, UpdateStaffRequestDto accepts them).
      // Kept per the 2026-09-18 decision; see staff-edit-form.schema.ts for the full note.
      last_name_kana: staff.lastNameKana ?? '',
      first_name_kana: staff.firstNameKana ?? '',
      phone: staff.phone ?? '',
      email: staff.email,
      role: staff.role,
      position_id: staff.positionId,
      affiliation_type: staff.fcCompanyId ? 'fc_company' : 'direct_store',
      affiliation_store_ids: staff.storeIds ?? [],
      store_reselect_required: false,
      affiliation_fc_company_id: staff.fcCompanyId ?? '',
      note: staff.memo ?? '',
    };
  }, [staff]);

  const form = useForm<StaffEditFormValues>({
    // TODO(CODE-RULE-I): zodResolver's inferred Resolver type conflicts with a duplicate
    // react-hook-form type declaration pulled in transitively; pre-existing before this feature.
    resolver: zodResolver(staffEditFormSchema) as any,
    mode: 'onChange',
    values: defaultValues,
  });

  const { confirmDiscard, navigateAfterSave } = useUnsavedChangesGuard(form.formState.isDirty);

  const scrollToFirstError = useScrollToFirstError();

  const mutation = useMutation({
    ...adminStaffControllerUpdateMutation(),
    onSuccess: (data) => {
      // Y-01 - Bug No.16: the API re-sends the invitation itself on a 招待中 email change.
      const saveToast = getStaffSaveToast(data.reinvite);
      toast[saveToast.type](saveToast.message);
      queryClient.invalidateQueries({
        queryKey: adminStaffPermissionControllerGetStaffQueryKey({ path: { id } }),
      });
      queryClient.invalidateQueries({
        queryKey: adminStaffPermissionControllerListStaffQueryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: adminStaffPermissionControllerStaffChangeHistoriesQueryKey({ path: { id } }),
      });
      navigateAfterSave(() => router.push(navigate('/staffs/[id]', id)));
    },
    onError: (error) => {
      // The global mutation toast already reports it; also pin an address rejection to the
      // email input so the user sees which field to fix.
      const emailMessage = getEmailPatchErrorMessage(error);
      if (emailMessage) {
        form.setError('email', { type: 'server', message: emailMessage });
        scrollToFirstError();
      }
    },
  });

  /**
   * Builds the `PATCH` body as a true diff against the loaded record.
   *
   * Two rules this screen learned the hard way (2026-09-18 test pass, TC-021/031/049/055):
   *
   * 1. **Never drop a key the user cleared.** `x || undefined` omitted every emptied field,
   *    so clearing 備考 or picking 職位「未割当」 returned `200` with a success toast while the
   *    old value stayed put. `''` is how this API clears an optional string — `null` is
   *    rejected outright (`E-VAL-001 "Expected string, received null"`).
   * 2. **Never send a field the user didn't touch.** Sending `storeId`+`fcCompanyId` on every
   *    save made the backend write 「所属店舗を設定しました」+「所属FC企業を解除しました」 history
   *    rows for edits that never opened 所属設定 — one edit produced three entries.
   *
   * `email` is sent only when the user changed it (case-insensitively) and the input is
   * unlocked — API-070 §6.5.3; Y-01 - Bug No.16. Re-inviting a not-yet-onboarded staff at the
   * new address is the backend's job, not a second FE call.
   *
   * Omitted on purpose:
   * - `lastNameKana` / `firstNameKana` — Y-01 keeps furigana out of scope (2026-09-18
   *   decision), so those inputs are disabled too. If Y-01 is ever amended, re-enable the
   *   inputs **and** add the fields here; changing one side alone reintroduces the bug.
   *   Covered by TC-071 / TC-072.
   * - `phone` — same as furigana: out of scope per Y-01, input hidden (Y-01 - Bug No.15).
   */
  const buildRequestBody = (values: StaffEditFormValues): UpdateStaffRequestDto => {
    const body: UpdateStaffRequestDto = {};

    if (values.last_name !== staff.lastName) body.lastName = values.last_name;
    if (values.first_name !== staff.firstName) body.firstName = values.first_name;
    if (emailLockReason === null && isEmailChanged(values.email, staff.email)) {
      body.email = values.email.trim();
    }

    const nextMemo = values.note ?? '';
    if (nextMemo !== (staff.memo ?? '')) body.memo = nextMemo;

    // 職位 moves as a plain diff, clear included. Clearing sends `''` — not a UUID and not
    // `null`, but the backend's agreed encoding for "put this account back on its role's
    // 「未割当」 position" (BE ruling 2026-09-18). The FE cannot send that position's own id:
    // `GET /admin/positions` excludes system-managed rows by contract, so it never learns
    // one. Omitting the key instead is what made a clear return 200 with the old position
    // intact (BUG-P2-03-02 / TC-031).
    //
    // A role change carries `role` itself (Y-01 - Bug No.19, BE MR !932). Without a
    // `positionId` the backend parks the staff on the *new* role's 「未割当」; with one, it
    // must belong to the new role. `role` is sent only on an actual change: the select is
    // locked for a Manager, and a Manager sending `role` at all is `E-AUTH-103`.
    //
    // `''` must not ride along with a role change: it resolves to the 未割当 of the account's
    // *current* role, which is what wiped a real 職位 while the role stayed put
    // (BUG-P2-03-01). So an explicit clear is only sent while ロール is untouched.
    const nextPositionId = values.position_id ?? '';
    const isRoleChanged = values.role !== staff.role;
    if (isRoleChanged) {
      body.role = values.role;
      if (nextPositionId) body.positionId = nextPositionId;
    } else if (nextPositionId) {
      if (nextPositionId !== staff.positionId) body.positionId = nextPositionId;
    } else if (staff.positionId) {
      body.positionId = '';
    }
    // Stores and fcCompanyId are each sent only when they changed. The side not selected is
    // cleared (`[]` / `null`), so a pattern switch carries both keys and the "exactly one
    // remains" rule holds. Sending an unchanged `fcCompanyId: null` with every store edit
    // made the BE write a spurious 「所属FC企業を解除しました」 history row (BUG-P2-06-02).
    // `storeIds` replaces the whole set, order kept — the first becomes `storeId`.
    const isDirectStore = values.affiliation_type === 'direct_store';
    const nextStoreIds = isDirectStore ? values.affiliation_store_ids : [];
    const nextFcCompanyId = (!isDirectStore && values.affiliation_fc_company_id) || null;
    if (!isSameStoreIds(nextStoreIds, staff.storeIds ?? [])) body.storeIds = nextStoreIds;
    if (nextFcCompanyId !== (staff.fcCompanyId ?? null)) body.fcCompanyId = nextFcCompanyId;

    return body;
  };

  // `mutation.isPending` only disables the button on the *next* render, so a burst of
  // clicks inside one tick all pass the check and fire their own PATCH — four rapid clicks
  // produced two saves and two history entries (TC-055). A ref flips synchronously.
  const submitInFlightRef = useRef(false);

  const submitUpdate = (values: StaffEditFormValues) => {
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    mutation.mutate(
      { path: { id }, body: buildRequestBody(values) },
      { onSettled: () => (submitInFlightRef.current = false) },
    );
  };

  const onSubmit = (values: StaffEditFormValues) => {
    // Only a changed address is bound by Cognito's 128-character limit — a long Google
    // address that stays put must not block an unrelated edit.
    if (
      emailLockReason === null &&
      isEmailChanged(values.email, staff.email) &&
      values.email.trim().length > STAFF_EMAIL_COGNITO_MAX_LENGTH
    ) {
      form.setError('email', {
        type: 'manual',
        message: `メールアドレスは${STAFF_EMAIL_COGNITO_MAX_LENGTH}文字以内で入力してください`,
      });
      scrollToFirstError();
      return;
    }
    // 職位 is optional on a role change too (Y-01 FR-002/FR-003): left empty, the staff lands
    // on the new role's 「未割当」 (Y-01 - Bug No.19).
    if (values.role !== staff.role) {
      setRoleChangeDialogOpen(true);
      return;
    }
    submitUpdate(values);
  };

  const handleRoleChangeConfirm = () => {
    setRoleChangeDialogOpen(false);
    submitUpdate(form.getValues());
  };

  const handleCancel = () => confirmDiscard(() => router.push(navigate('/staffs/[id]', id)));

  const watchedRole = useWatch({ control: form.control, name: 'role' });

  return (
    <div className="">
      <PageHeader
        breadcrumb={
          <BackLink
            label="スタッフ管理に戻る"
            onClick={() => confirmDiscard(() => router.push(backToListHref))}
          />
        }
        title="スタッフ編集"
      />
      <div className="mx-auto max-w-4xl px-4 pt-4 pb-24">
        <Form {...form}>
          {/* `handleSubmit` is composed inside the handler, not during render: `onSubmit`
              closes over the in-flight ref, and passing it at render time trips
              react-hooks/refs ("passing a ref to a function may read its value during render"). */}
          <form
            noValidate
            className="space-y-6"
            onSubmit={(event) => form.handleSubmit(onSubmit, scrollToFirstError)(event)}
          >
            <PersonalInfoSection currentEmail={staff.email} emailLockReason={emailLockReason} />
            <PermissionSettingsSection
              canChangeRole={canChangeRole}
              positionId={staff.positionId}
              positionName={staff.positionName}
              initialRole={staff.role}
            />
            <AffiliationSection
              canEditAffiliation={canEditAffiliation}
              stores={staff.stores}
              fcCompanyLabel={staff.fcCompanyName}
            />
            <Card>
              <CardHeader>
                <CardTitle>備考</CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                {/* Registered through FormField, not a bare `register`: without FormMessage the
                    over-length error had nowhere to render, so a 1001-character note was
                    blocked with only the footer's generic 「未入力の項目があります」 (TC-050). */}
                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>備考（任意）</FormLabel>
                      <FormControl>
                        {/* The shared Textarea is `field-sizing-content`, so it stretches to fit
                            its value — 1000 characters grew the card from 100px to 314px at the
                            1024 floor. Cap it and scroll instead (TC-065). */}
                        <Textarea
                          placeholder="備考を入力してください"
                          className="max-h-50 min-h-25 overflow-y-auto text-sm leading-relaxed"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </form>
        </Form>
        <div className="fixed right-0 bottom-0 left-0 border-t bg-white px-4 py-4">
          <div className="flex items-center justify-between">
            {form.formState.isSubmitted && Object.keys(form.formState.errors).length > 0 && (
              <p className="text-destructive text-xs">未入力の項目があります</p>
            )}
            <div className="ml-auto flex gap-2">
              <Button variant="outline" type="button" onClick={handleCancel}>
                キャンセル
              </Button>
              <Button
                type="button"
                onClick={(event) => form.handleSubmit(onSubmit, scrollToFirstError)(event)}
                // Nothing to save on an untouched form (TC-051).
                disabled={mutation.isPending || !form.formState.isDirty}
              >
                {mutation.isPending ? '保存中...' : '保存する'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <RoleChangeConfirmDialog
        open={roleChangeDialogOpen}
        onOpenChange={setRoleChangeDialogOpen}
        previousRole={staff.role}
        nextRole={watchedRole}
        onConfirm={handleRoleChangeConfirm}
        isPending={mutation.isPending}
      />
    </div>
  );
}

function StaffEditPageSkeleton() {
  return (
    <div className="">
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-4 pb-20">
        <div className="py-4">
          <Skeleton className="h-7 w-32" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
