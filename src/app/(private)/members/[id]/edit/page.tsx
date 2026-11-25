'use client';

import { useEffect, useMemo, useState } from 'react';
import { type Resolver, useForm, useFormState } from 'react-hook-form';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { defaultMinAgeForBrand } from '@/app/(private)/contracts/_constants/constants';
import { useAuthUser } from '@/contexts/auth-user.context';
import { phoneForDisplay } from '@/utils/phone.util';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard.hook';

import { BackLink } from '@/components/common/back-link';
import { BackToListLink } from '@/components/common/back-to-list-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Form } from '@/components/ui/form';

import {
  adminMemberControllerDetailOptions,
  adminMemberControllerDetailQueryKey,
  adminMemberControllerListQueryKey,
  adminMemberControllerUpdateProfileMutation,
  adminMemberRelationsControllerChangeHistoryQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { MemberDetailDto, UpdateMemberProfileAdminDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';
import { cn } from '@/lib/utils';

import { Permission } from '@/types/permission.type';

import { MembersForm } from '../../_components/members-form';
import {
  type MemberFormValues,
  createMemberFormSchema,
  emptyMemberFormValues,
  genderFromStored,
} from '../../_schemas/member-form.schema';
import {
  normalizePostalCode,
  postalCodeForDisplay,
  prefectureCodeFromStored,
  toApiPhone,
  trimOrUndefined,
} from '../../_utils';
import { getDuplicateFieldError } from '../../_utils/member-error';

const mapMemberDetailToFormValues = (member: MemberDetailDto): MemberFormValues => {
  const personalInfo = member.personalInfo;

  return {
    last_name: personalInfo.lastName ?? '',
    first_name: personalInfo.firstName ?? '',
    last_name_kana: personalInfo.lastNameKana ?? '',
    first_name_kana: personalInfo.firstNameKana ?? '',
    birthday: personalInfo.dateOfBirth ?? '',
    // The detail response types gender as a plain string, so an unknown value is dropped
    // rather than cast into the select (genderFromStored).
    gender: genderFromStored(personalInfo.gender),
    // Stored as 7 bare digits; the 郵便番号 input works in the hyphenated display form.
    postal_code: postalCodeForDisplay(personalInfo.postalCode),
    // Q11 / client decision 2026-08-21: the three stored address fields map straight onto the
    // three controls. The select holds the JIS code, so a legacy row storing the 都道府県名
    // is resolved back to its code instead of showing an empty select.
    prefecture: prefectureCodeFromStored(personalInfo.prefecture),
    street_address: personalInfo.streetAddress ?? '',
    building: personalInfo.building ?? '',
    // Stored as bare digits; the 電話番号 input works in the hyphenated display form.
    phone: phoneForDisplay(personalInfo.phone),
    email: personalInfo.email ?? '',
  };
};

/**
 * Which fields differ from what the screen loaded — the baseline `form.reset` was given.
 * Every value is a string, so `!==` is enough. This drives the PATCH payload only: validation
 * runs over the whole form (FR-016, FR-018), because a required field stays required whoever
 * left it blank.
 */
const changedFields = (values: MemberFormValues, baseline: MemberFormValues) =>
  new Set(
    (Object.keys(values) as Array<keyof MemberFormValues>).filter(
      (key) => values[key] !== baseline[key],
    ),
  );

export default function MemberEditPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const scrollToFirstError = useScrollToFirstError();

  // A-01 FR-004 / FR-032: page-level gate — same MembersEdit permission as the
  // route guard and entry points, independent of the server-side rejection.
  const { hasPermission, isLoading: isAuthLoading } = useAuthUser();
  const canEdit = hasPermission(Permission.MembersEdit);

  // FR-018: footer summary shown after a failed submit; re-evaluated only on
  // the next submit (Q5 — it intentionally outlives the inline messages).
  const [submitFailed, setSubmitFailed] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    ...adminMemberControllerDetailOptions({ path: { memberId: id } }),
    enabled: Boolean(id) && canEdit,
  });

  const member = data;

  const defaultValues = useMemo<MemberFormValues>(() => {
    if (!member) {
      return emptyMemberFormValues;
    }
    return mapMemberDetailToFormValues(member);
  }, [member]);

  // 年齢制限 follows the member's brand configuration (G-01): JOYFIT 15歳以上 / FIT365 16歳以上.
  const resolver = useMemo(
    () =>
      zodResolver(
        createMemberFormSchema(member ? defaultMinAgeForBrand(member.brandGroup) : null),
      ) as Resolver<MemberFormValues>,
    [member],
  );

  const form = useForm<MemberFormValues>({
    resolver,
    // FR-015: validate on submit only; FR-019: a flagged field re-validates
    // (and clears) as soon as the user changes it.
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues,
  });

  useEffect(() => {
    if (!member) return;
    form.reset(defaultValues);
  }, [defaultValues, form, member]);

  // FR-020: any change marks the screen dirty for the discard guard. The guard variant
  // covers sidebar navigation and the browser's Back button too, not just キャンセル /
  // the back link — leaving by any of them must not drop the operator's edits silently.
  const { isDirty } = useFormState({ control: form.control });
  const { confirmDiscard, navigateAfterSave } = useUnsavedChangesGuard(isDirty);

  const updateMutation = useMutation({
    ...adminMemberControllerUpdateProfileMutation(),
    onError: (error) => {
      // 409 E-MEM-203 / E-MEM-204: the value is already registered to another Yamauchi
      // account. Only the code says which field collided, so it is mapped here — the
      // server's wording itself rides the global mutation toast.
      const duplicate = getDuplicateFieldError(error);
      if (duplicate) {
        form.setError(duplicate.field, { type: 'server', message: duplicate.message });
        scrollToFirstError();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminMemberControllerDetailQueryKey({ path: { memberId: id } }),
      });
      // No argument: the key is a single object, so React Query's partial match
      // invalidates every filter/page variant of the list, not just one.
      queryClient.invalidateQueries({ queryKey: adminMemberControllerListQueryKey() });
      // FR-028 / A-01 FR-004 「HQ/Systemによる編集時は変更履歴タブに記録」: the record is written
      // server-side, but the 変更履歴 tab reads its own query — without this key it keeps
      // serving the pre-save page for the cache lifetime. Only `path` is passed, so the
      // partial match covers every page of the tab.
      queryClient.invalidateQueries({
        queryKey: adminMemberRelationsControllerChangeHistoryQueryKey({
          path: { memberId: id },
        }),
      });
      // FR-022: the saved values become the new baseline, so the form is no longer
      // dirty and nothing warns on the way out.
      form.reset(form.getValues());
      toast.success('会員情報を更新しました');
      // Drops the guard's history sentinel before leaving, so the saved form does not
      // strand a duplicate entry in the operator's back stack.
      navigateAfterSave(() => router.push(navigate('/members/[id]', id)));
    },
  });

  const handleSubmit = form.handleSubmit(
    (values) => {
      setSubmitFailed(false);

      // PATCH semantics: a key left out is left untouched, so only the edited fields go up.
      // Resending the rest would re-write values the operator never looked at and re-proxy
      // them to Yamauchi — and the endpoint has no way to express "leave as it is" per field.
      // FR-024 / Q10: still only the eight FR-004 field groups; profile_info /
      // emergency_contact / notes are never touched by this screen.
      const changed = changedFields(values, defaultValues);
      const body: UpdateMemberProfileAdminDto = {};

      // Family and given name go up as four separate fields — joining them into one
      // string would throw away the boundary the form already captured (QA09 §2.3).
      if (changed.has('last_name')) body.lastName = values.last_name.trim();
      if (changed.has('first_name')) body.firstName = values.first_name.trim();
      if (changed.has('last_name_kana')) body.lastNameKana = values.last_name_kana.trim();
      if (changed.has('first_name_kana')) body.firstNameKana = values.first_name_kana.trim();
      if (changed.has('gender')) body.gender = values.gender;
      if (changed.has('birthday')) body.dateOfBirth = values.birthday;
      if (changed.has('postal_code')) body.postalCode = normalizePostalCode(values.postal_code);
      if (changed.has('prefecture')) body.prefecture = values.prefecture;
      if (changed.has('street_address')) body.streetAddress = values.street_address.trim();
      // `building` is the one Yamauchi-mastered field `null` clears; every other one
      // rejects `null`, which is why they are omitted rather than nulled.
      if (changed.has('building')) body.building = trimOrUndefined(values.building) ?? null;
      // JP domestic digits or E.164 — the endpoint stores both as E.164 (API-093 §18.3 v0.14).
      if (changed.has('phone')) body.phone = toApiPhone(values.phone);
      if (changed.has('email')) body.email = values.email.trim();

      // The real DTO is flat, so the FR-004 field groups go up as top-level keys.
      updateMutation.mutate({ path: { memberId: id }, body });
    },
    () => {
      // FR-018: block the save, show the footer summary, scroll to the first
      // invalid control.
      setSubmitFailed(true);
      scrollToFirstError();
    },
  );

  const handleCancel = () => {
    // Cancel and the back link return to the edited member's detail — prototype
    // `0a73739` (2026-09-16) sends both there, superseding FR-025's list destination.
    // Guarded by the discard confirmation while dirty (FR-020).
    confirmDiscard(() => router.push(navigate('/members/[id]', id)));
  };

  // Prototype subtitle: 氏名（ID: 会員番号 / 旧No: 旧会員コード）. 旧No is dropped when the member
  // was created in this system, the way the head-up card renders it.
  const memberSubtitle = member
    ? `${[member.personalInfo.lastName, member.personalInfo.firstName].filter(Boolean).join(' ')}（ID: ${member.memberNumber}${member.legacyMemberCode ? ` / 旧No: ${member.legacyMemberCode}` : ''}）`
    : undefined;

  const pageHeader = (
    <PageHeader
      breadcrumb={<BackLink label="会員詳細に戻る" onClick={handleCancel} />}
      title="会員情報を編集"
      subtitle={memberSubtitle}
    />
  );

  // Wait for the auth context before deciding access (avoids a denied flash).
  if (isAuthLoading) {
    return (
      <>
        {pageHeader}
        <DataStateBoundary isLoading isEmpty={false} onRetry={() => refetch()} />
      </>
    );
  }

  if (!canEdit) {
    return (
      <>
        <PageHeader
          breadcrumb={<BackToListLink label="会員管理に戻る" listPath={navigate('/members')} />}
          title="会員情報を編集"
        />
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-muted-foreground text-sm">
            会員情報の編集は本部（Headquarter / System）のみアクセスできます
          </p>
        </div>
      </>
    );
  }

  if (isLoading || isError || !member) {
    return (
      <>
        {pageHeader}
        <DataStateBoundary
          isLoading={isLoading}
          isError={isError}
          isEmpty={!member}
          onRetry={() => refetch()}
          errorTitle="会員情報の取得に失敗しました"
        />
      </>
    );
  }

  // FR-033: the member detail hides the edit button for withdrawn members;
  // block direct URL access the same way.
  const isWithdrawn =
    member.memberStatus === 'withdrawn' || member.memberStatus === 'forced_withdrawal';
  if (isWithdrawn) {
    return (
      <>
        <PageHeader
          breadcrumb={<BackToListLink label="会員管理に戻る" listPath={navigate('/members')} />}
          title="会員情報を編集"
        />
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-16 text-center">
          <p className="text-sm font-semibold">退会済みの会員は編集できません</p>
          <p className="text-muted-foreground text-xs">
            会員情報の変更が必要な場合は、再入会の手続きを行ってください。
          </p>
          <Link
            href={navigate('/members/[id]', id)}
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            会員詳細に戻る
          </Link>
        </div>
      </>
    );
  }

  if (member.anonymizedAt) {
    return (
      <>
        <PageHeader
          breadcrumb={<BackLink label="会員管理に戻る" href={navigate('/members')} />}
          title="会員情報を編集"
        />
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-16 text-center">
          <p className="text-sm font-semibold">個人情報が削除された会員は編集できません</p>
          <p className="text-muted-foreground text-xs">
            個人情報の削除は取り消せないため、この会員の情報は変更できません。
          </p>
          <Link
            href={navigate('/members/[id]', id)}
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            会員詳細に戻る
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      {pageHeader}

      <div className="mx-auto flex max-w-240 flex-col gap-6 px-6 py-4">
        <Form {...form}>
          {/* noValidate: zod owns validation — the browser's native email/required
              bubbles must not intercept the submit (FR-016 messages instead). */}
          <form onSubmit={handleSubmit} noValidate>
            <MembersForm />

            {/* Footer: summary left (after a failed submit), actions right */}
            <div className="mt-6 flex items-center justify-end gap-2 border-t p-4">
              {submitFailed && (
                <p className="text-destructive mr-auto text-xs">未入力の項目があります</p>
              )}
              <Button type="button" size="lg" variant="outline" onClick={handleCancel}>
                キャンセル
              </Button>
              {/* Session decision 2026-07-28 (supersedes V0's always-enabled save):
                  disabled until the form has at least one change. */}
              <Button type="submit" size="lg" disabled={!isDirty || updateMutation.isPending}>
                {updateMutation.isPending ? '保存中...' : '保存する'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </>
  );
}
