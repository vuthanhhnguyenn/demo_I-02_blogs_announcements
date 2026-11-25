'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';

import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

import { type SurveyFormSubmitValues, type SurveyFormValues } from '../_schemas/survey-form.schema';
import { SurveyFormBasicInfoSection } from './survey-form-basic-info';
import { SurveyFormQuestionsSection } from './survey-form-questions';
import { SurveyFormStatusSection } from './survey-form-status';

interface SurveyFormProps {
  isEdit?: boolean;
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: SurveyFormSubmitValues) => void;
}

export function SurveyForm({
  isEdit = false,
  isSubmitting = false,
  onCancel,
  onSubmit,
}: Readonly<SurveyFormProps>) {
  const form = useFormContext<SurveyFormValues>();
  const scrollToFirstError = useScrollToFirstError();
  const [deleteTarget, setDeleteTarget] = useState<{ index: number; hasResponses: boolean } | null>(
    null,
  );

  const handleFormSubmit = form.handleSubmit(onSubmit, scrollToFirstError);
  // Based on the real field errors: `isValid` can stay false for a form the resolver accepts, which
  // showed this message after a server-side rejection of a valid form.
  const hasSubmitError =
    form.formState.submitCount > 0 && Object.keys(form.formState.errors).length > 0;

  const removeDeleteTargetQuestion = () => {
    if (!deleteTarget) return;

    const questions = form.getValues('questions');
    form.setValue(
      'questions',
      questions.filter((_question, index: number) => index !== deleteTarget.index),
      { shouldDirty: true, shouldValidate: form.formState.submitCount > 0 },
    );
  };

  const confirmDeleteQuestion = () => {
    removeDeleteTargetQuestion();
    setDeleteTarget(null);
  };

  // A question with answers cannot be deleted; it is logically disabled (dropped from the list).
  const confirmHideQuestion = () => {
    removeDeleteTargetQuestion();
    setDeleteTarget(null);
    toast.success('設問を非表示にしました');
  };

  return (
    <>
      <form onSubmit={handleFormSubmit} noValidate>
        <div className="flex flex-col gap-6">
          {isEdit && (
            <div>
              <div className="border-info/20 bg-info/15 mb-3 rounded-md border px-4 py-3">
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  本部テンプレート（全店舗共通）の設問・回答選択肢を編集します。店舗ごとに使う設問の選択は「店舗別表示設定」で行います。
                </p>
              </div>
              <Alert className="border-warning/50 bg-warning/15 w-full">
                <AlertTriangle className="text-warning size-4" />
                <AlertDescription className="text-muted-foreground text-xs">
                  回答済みデータがある状態で設問を変更すると、既存の回答との整合性が失われます。
                </AlertDescription>
              </Alert>
            </div>
          )}

          <SurveyFormBasicInfoSection isEdit={isEdit} />

          <SurveyFormQuestionsSection
            onDeleteQuestion={(index) => {
              const question = form.getValues(`questions.${index}`);
              setDeleteTarget({ index, hasResponses: question.hasResponses });
            }}
          />

          <SurveyFormStatusSection />

          <div className="flex items-center justify-end gap-2 border-t p-4">
            {hasSubmitError && (
              <p className="text-destructive mr-auto text-xs">未入力の項目があります</p>
            )}
            <Button
              size="lg"
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button size="lg" type="submit" disabled={isSubmitting}>
              {isEdit ? '変更を保存する' : '登録する'}
            </Button>
          </div>
        </div>
      </form>

      <AlertDialog
        open={deleteTarget !== null && deleteTarget.hasResponses}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>この設問を削除できません</AlertDialogTitle>
            <AlertDialogDescription>
              この設問には回答データがあります。削除はできませんが、非表示に設定できます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmHideQuestion}>非表示にする</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteTarget !== null && !deleteTarget.hasResponses}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>この設問を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>この操作は取り消せません。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteQuestion}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
