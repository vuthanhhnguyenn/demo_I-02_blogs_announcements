'use client';

// Client component: react-hook-form state, mutations, and the discard guard
import { type FormEvent, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useBackToListHref } from '@/hooks/use-return-to.hook';
import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard.hook';

import { BackLink } from '@/components/common/back-link';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';

import {
  adminStaffPermissionControllerCreatePositionMutation,
  adminStaffPermissionControllerGetPositionQueryKey,
  adminStaffPermissionControllerListPositionsQueryKey,
  adminStaffPermissionControllerPermissionCatalogOptions,
  adminStaffPermissionControllerPositionPermissionsQueryKey,
  adminStaffPermissionControllerUpdatePositionMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { PositionDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import {
  type PositionFormValues,
  createEmptyPositionFormValues,
  mapFormValuesToCreateBody,
  mapFormValuesToUpdateBody,
  mapPositionToFormValues,
  positionFormSchema,
} from '../../_schemas/position-form.schema';
import { POSITION_ERROR_CODE, getPositionErrorCode } from '../../_utils/position-api.util';
import { PositionFormBasicInfoSection } from './position-form-basic-info-section';
import { PositionFormPermissionsSection } from './position-form-permissions-section';

export type PositionFormMode = 'create' | 'edit' | 'clone';

const PAGE_TITLES: Record<PositionFormMode, string> = {
  create: '職位 新規作成',
  edit: '職位 編集',
  clone: '職位 複製して作成',
};

const DUPLICATE_NAME_MESSAGE = '同じロール内に同名の職位が既に存在します';
const SYSTEM_MANAGED_MESSAGE = 'システム管理の職位は編集できません';
/**
 * サーバー起因のインラインエラーに付ける `type`。「未入力の項目があります」は
 * FR-015 の「未入力」専用なので、この type のエラーは集計から除外する。
 */
const SERVER_ERROR_TYPE = 'server';

type PositionFormProps = {
  mode: PositionFormMode;
  /** edit / clone prefill source (FR-012 / FR-013) */
  defaultDetail?: PositionDto;
};

export function PositionForm({ mode, defaultDetail }: Readonly<PositionFormProps>) {
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/positions'));
  const queryClient = useQueryClient();
  const scrollToFirstError = useScrollToFirstError();

  const isEdit = mode === 'edit';
  const positionId = defaultDetail?.id;

  const form = useForm<PositionFormValues>({
    resolver: zodResolver(positionFormSchema),
    defaultValues: defaultDetail
      ? mapPositionToFormValues(defaultDetail, { blankName: mode === 'clone' })
      : createEmptyPositionFormValues(),
  });

  /**
   * `isDirty` は **render 中に読む**こと。react-hook-form は Proxy 経由で購読を
   * 判定するため、イベントハンドラの中だけで参照すると購読が立たず、値が初期の
   * `false` のまま更新されない（破棄ダイアログが一度も開かなかった不具合）。
   */
  const { isDirty, dirtyFields, isSubmitted, errors } = form.formState;

  const { confirmDiscard, navigateAfterSave } = useUnsavedChangesGuard(isDirty);

  const { data: permissionCatalog } = useQuery({
    ...adminStaffPermissionControllerPermissionCatalogOptions(),
  });

  const navigateToList = useCallback(() => {
    router.push(navigate('/positions'));
  }, [router]);

  const finish = (id: string) => {
    queryClient.invalidateQueries({
      queryKey: adminStaffPermissionControllerListPositionsQueryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: adminStaffPermissionControllerGetPositionQueryKey({ path: { id } }),
    });
    queryClient.invalidateQueries({
      queryKey: adminStaffPermissionControllerPositionPermissionsQueryKey({ path: { id } }),
    });
    toast.success(isEdit ? '職位の変更を保存しました' : '職位を登録しました');
    // 保存済み = 破棄するものは無い。dirty を落としてから、ガードが積んだ
    // history センチネルを外して遷移する（戻るボタンに余計な履歴を残さない）
    form.reset(form.getValues());
    navigateAfterSave(navigateToList);
  };

  // 失敗トーストは共有 MutationCache が userMessage を出す (D6) — ここでは
  // コード別のインライン表示だけを担当する
  const handleMutationError = (error: unknown) => {
    const code = getPositionErrorCode(error);
    // 409 (role, name) 重複 — 職位名フィールドのインラインエラーとして表示 (FR-010)
    if (code === POSITION_ERROR_CODE.duplicateName) {
      form.setError('name', { type: SERVER_ERROR_TYPE, message: DUPLICATE_NAME_MESSAGE });
      scrollToFirstError();
      return;
    }
    // 422 — システム管理の職位は読み取り専用。UI 側で導線を塞いでいるため通常は到達しない
    if (code === POSITION_ERROR_CODE.systemManaged) {
      form.setError('name', { type: SERVER_ERROR_TYPE, message: SYSTEM_MANAGED_MESSAGE });
      scrollToFirstError();
    }
  };

  /**
   * 二重送信ガード。`isPending` は非同期 state なので、同一 tick 内の連打は
   * re-render 前にすべて通ってしまう（6連打で6リクエスト）。同期的な ref で塞ぐ。
   */
  const submittingRef = useRef(false);
  const releaseSubmitLock = () => {
    submittingRef.current = false;
  };

  const createMutation = useMutation({
    ...adminStaffPermissionControllerCreatePositionMutation(),
    onSuccess: (result) => finish(result.id),
    onError: handleMutationError,
    onSettled: releaseSubmitLock,
  });

  const updateMutation = useMutation({
    ...adminStaffPermissionControllerUpdatePositionMutation(),
    onSuccess: (result) => finish(result.id),
    onError: handleMutationError,
    onSettled: releaseSubmitLock,
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const submitValidValues = (values: PositionFormValues) => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    if (isEdit && positionId) {
      // 変更されたフィールドだけを送る (PATCH の「省略＝据え置き」契約)。
      // 全項目を毎回送ると、別タブで保存済みの変更を黙って上書きしてしまう。
      updateMutation.mutate({
        path: { id: positionId },
        body: mapFormValuesToUpdateBody(values, dirtyFields),
      });
    } else {
      createMutation.mutate({ body: mapFormValuesToCreateBody(values) });
    }
  };

  // handleSubmit の生成は submit イベントの中で行う（render 中に ref を触る
  // 関数を渡さないため — react-hooks/refs）
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    void form.handleSubmit(submitValidValues, scrollToFirstError)(event);
  };

  const handleCancel = () => confirmDiscard(navigateToList);

  // 「未入力の項目があります」は未入力バリデーション専用 (FR-015)。
  // サーバー起因のインラインエラー (409/422) では出さない。
  const hasMissingRequiredField = [errors.name, errors.role].some(
    (error) => error != null && error.type !== SERVER_ERROR_TYPE,
  );

  return (
    <Form {...form}>
      <PageHeader
        breadcrumb={
          <BackLink
            label="職位マスター管理に戻る"
            onClick={() => confirmDiscard(() => router.push(backToListHref))}
          />
        }
        title={PAGE_TITLES[mode]}
      />

      <form
        onSubmit={handleSubmit}
        className="bg-background min-h-0 flex-1 overflow-y-auto px-6 py-4"
      >
        <div className="mx-auto flex max-w-[960px] flex-col gap-6">
          <PositionFormBasicInfoSection
            isRoleLocked={isEdit}
            seedCsvDefaultsOnRoleChange={mode === 'create'}
          />
          <PositionFormPermissionsSection />

          <div className="flex items-center justify-end gap-2 border-t p-4">
            {isSubmitted && hasMissingRequiredField && (
              <p className="text-destructive mr-auto text-xs">未入力の項目があります</p>
            )}
            <Button type="button" size="lg" variant="outline" onClick={handleCancel}>
              キャンセル
            </Button>
            <Button type="submit" size="lg" disabled={isSubmitting || !permissionCatalog}>
              {isSubmitting ? '保存中...' : isEdit ? '変更を保存する' : '登録する'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
