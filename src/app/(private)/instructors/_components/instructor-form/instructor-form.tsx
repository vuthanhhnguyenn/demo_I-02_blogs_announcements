'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useBackToListHref } from '@/hooks/use-return-to.hook';
import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form } from '@/components/ui/form';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminTrainerControllerCreateMutation,
  adminTrainerControllerDetailOptions,
  adminTrainerControllerUpdateMeMutation,
  adminTrainerControllerUpdateMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { TrainerDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import {
  INSTRUCTOR_ERROR_CODE,
  canEditField,
  formValuesToCreateBody,
  formValuesToUpdateBody,
  formValuesToUpdateMeBody,
  instructorToFormValues,
  invalidateInstructorQueries,
} from '../../_utils/instructor-api.util';
import type {
  InstructorFormInput,
  InstructorFormMode,
  InstructorFormValues,
} from '../instructor-form.schema';
import { InstructorFormSchema } from '../instructor-form.schema';
import { InstructorFormBasicInfo } from './instructor-form-basic-info';
import { InstructorFormBufferSettings } from './instructor-form-buffer-settings';
import { InstructorFormConfirmDialog } from './instructor-form-confirm-dialog';
import { InstructorFormCrmLink } from './instructor-form-crm-link';
import { InstructorFormPhoto } from './instructor-form-photo';
import { InstructorFormProfile } from './instructor-form-profile';

interface InstructorFormProps {
  mode: InstructorFormMode;
  /** Edit: the detail the form was opened with — its values, `updatedAt` lock and `editableFields` */
  instructor?: TrainerDetailDto;
  /** Edit the signed-in trainer's own profile through `PATCH /trainers/me` (D13) */
  selfEdit?: boolean;
}

export function InstructorForm({ mode, instructor, selfEdit = false }: InstructorFormProps) {
  const router = useRouter();
  const isEdit = mode === 'edit';
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitValues, setSubmitValues] = useState<InstructorFormValues | null>(null);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const isSubmittingRef = useRef(false);
  const scrollToFirstError = useScrollToFirstError();
  const queryClient = useQueryClient();
  // The list with the tab / search / page it was left from (`?returnTo=`), as 「指導者管理に戻る」
  const listHref = useBackToListHref(navigate('/instructors'));

  // The detail the form's values came from: the change diff and the `expectedUpdatedAt` lock are
  // taken from it, never from a later refetch, so the three always describe the same version.
  // Only the stale-save reload (below) moves it, together with the form's values.
  const [baseline, setBaseline] = useState(instructor);
  const [staleOpen, setStaleOpen] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  // D13: what the caller may change comes from the API (`["*"]` = everything)
  const editableFields = baseline?.editableFields ?? ['*'];
  const nameLocked = !canEditField(editableFields, 'lastName');
  const roleClassificationsLocked = !canEditField(editableFields, 'coachTypes');
  const crmLinkLocked = !canEditField(editableFields, 'staffId');

  const form = useForm<InstructorFormInput, unknown, InstructorFormValues>({
    resolver: zodResolver(InstructorFormSchema),
    mode: 'onSubmit',
    defaultValues: instructor
      ? instructorToFormValues(instructor)
      : {
          lastName: '',
          firstName: '',
          romajiLastName: '',
          romajiFirstName: '',
          nickname: '',
          roleClassifications: [],
          profileText: '',
          instructingHistory: '',
          facePhotoS3Key: null,
          photoUrl: null,
          minBookingLeadHours: 0,
          preBufferMinutes: 0,
          postBufferMinutes: 0,
          crmAccountLinkStaffId: null,
          crmAccountLinkStaffName: null,
        },
  });

  const handleSaved = (message: string, href: string) => {
    toast.success(message);
    invalidateInstructorQueries(queryClient);
    router.push(href);
  };

  // Edits suppress the shared MutationCache toast: a stale save (E-TRN-012) is answered by the
  // reload dialog instead, every other error is toasted here exactly as the MutationCache would
  const handleSaveError = (error: unknown) => {
    if ((error as { code?: string } | null)?.code === INSTRUCTOR_ERROR_CODE.stale) {
      setStaleOpen(true);
      return;
    }
    toast.error(resolveApiErrorMessage(error));
  };

  // Errors are toasted by the shared MutationCache (D19). A new trainer goes back to the list it
  // was registered from, keeping its tab (UT D-04 No7); an edit goes to the saved detail.
  const createMutation = useMutation({
    ...adminTrainerControllerCreateMutation(),
    onSuccess: () => handleSaved('指導者を登録しました', listHref),
  });

  const updateMutation = useMutation({
    ...adminTrainerControllerUpdateMutation(),
    meta: { suppressErrorToast: true },
    onSuccess: (data) =>
      handleSaved('指導者の変更を保存しました', navigate('/instructors/[id]', data.id)),
    onError: handleSaveError,
  });

  const updateMeMutation = useMutation({
    ...adminTrainerControllerUpdateMeMutation(),
    meta: { suppressErrorToast: true },
    onSuccess: (data) =>
      handleSaved('指導者の変更を保存しました', navigate('/instructors/[id]', data.id)),
    onError: handleSaveError,
  });

  /**
   * Stale save: another user saved first. Read the latest version, then reset the form's values
   * AND the baseline to it — the edits made here are discarded, as the dialog says, so nothing
   * stale can be sent back over the other user's change.
   */
  const handleReloadLatest = async () => {
    if (!baseline) return;
    setIsReloading(true);
    try {
      const latest = await queryClient.fetchQuery({
        ...adminTrainerControllerDetailOptions({ path: { trainerId: baseline.id } }),
        staleTime: 0,
      });
      form.reset(instructorToFormValues(latest));
      setBaseline(latest);
      setSubmitValues(null);
      setStaleOpen(false);
      invalidateInstructorQueries(queryClient);
      toast.success('最新のデータを読み込みました');
    } catch (error) {
      toast.error(resolveApiErrorMessage(error));
    } finally {
      setIsReloading(false);
    }
  };

  const hasErrors = Object.keys(form.formState.errors).length > 0;
  const submitLabel = isEdit ? '変更を保存する' : '入力内容を確認する';
  const isPending =
    createMutation.isPending || updateMutation.isPending || updateMeMutation.isPending;
  // Create: back to the list with its tab kept (UT D-04 No14), as 「指導者管理に戻る」
  const cancelHref = isEdit && baseline ? navigate('/instructors/[id]', baseline.id) : listHref;

  const handleSubmit = () => {
    // The photo's key reaches the form only when its upload ends: confirm what will be saved
    if (isPhotoUploading) return;
    form.handleSubmit(
      (values) => {
        setSubmitValues(values);
        setConfirmOpen(true);
      },
      () => {},
    )();
  };

  const handleConfirm = () => {
    if (!submitValues || isPhotoUploading) return;
    // Guard against rapid double-clicks firing multiple create/update requests.
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setConfirmOpen(false);
    const settled = { onSettled: () => (isSubmittingRef.current = false) };
    if (!isEdit || !baseline) {
      createMutation.mutate({ body: formValuesToCreateBody(submitValues) }, settled);
      return;
    }
    // Only the changed fields go out, with the lock of the version the form shows (D13)
    const body = selfEdit
      ? formValuesToUpdateMeBody(submitValues, baseline)
      : formValuesToUpdateBody(submitValues, baseline);
    if (Object.keys(body).length === 1) {
      isSubmittingRef.current = false;
      toast.info('変更された項目はありません');
      router.push(navigate('/instructors/[id]', baseline.id));
      return;
    }
    if (selfEdit) {
      updateMeMutation.mutate({ body }, settled);
    } else {
      updateMutation.mutate({ body, path: { trainerId: baseline.id } }, settled);
    }
  };

  return (
    <Form {...form}>
      <form noValidate onSubmit={form.handleSubmit(handleSubmit, scrollToFirstError)}>
        <main className="bg-background min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="mx-auto max-w-240">
            <Card className="mb-6">
              <CardContent className="px-6">
                <InstructorFormBasicInfo
                  nameLocked={nameLocked}
                  roleClassificationsLocked={roleClassificationsLocked}
                />
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardContent className="px-6">
                <InstructorFormPhoto onUploadingChange={setIsPhotoUploading} />
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardContent className="px-6">
                <InstructorFormProfile />
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardContent className="px-6">
                <InstructorFormBufferSettings />
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardContent className="px-6">
                <InstructorFormCrmLink locked={crmLinkLocked} />
              </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-2 border-t p-4">
              <Button
                size="lg"
                variant="outline"
                type="button"
                onClick={() => router.push(cancelHref)}
              >
                キャンセル
              </Button>
              <Button
                size="lg"
                type="button"
                onClick={handleSubmit}
                disabled={isPending || isPhotoUploading}
              >
                {submitLabel}
              </Button>
            </div>
            {isPhotoUploading && (
              <div className="flex justify-end px-4">
                <p className="text-muted-foreground text-xs">
                  画像のアップロードが完了するまでお待ちください。
                </p>
              </div>
            )}
            {hasErrors && (
              <div className="flex justify-end px-4">
                <p className="text-destructive text-xs">
                  入力内容に不備があります。エラー表示の項目をご確認ください。
                </p>
              </div>
            )}
          </div>
        </main>

        <InstructorFormConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          mode={mode}
          values={submitValues ?? {}}
          onConfirm={handleConfirm}
          isSubmitting={isPending || isPhotoUploading}
        />

        <AlertDialog open={staleOpen} onOpenChange={(open) => !isReloading && setStaleOpen(open)}>
          <AlertDialogContent className="sm:max-w-[480px]">
            <AlertDialogHeader>
              <AlertDialogTitle>他の担当者がこの指導者を更新しました</AlertDialogTitle>
              <AlertDialogDescription>
                最新のデータを取得してフォームを更新します。編集中の内容は破棄されます。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isReloading}>キャンセル</AlertDialogCancel>
              <Button type="button" disabled={isReloading} onClick={handleReloadLatest}>
                {isReloading && <Loader2 className="mr-2 size-4 animate-spin" />}
                最新のデータを読み込む
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </form>
    </Form>
  );
}
