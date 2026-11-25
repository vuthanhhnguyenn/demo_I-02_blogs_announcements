import { Button } from '@/components/ui/button';

interface TermsFormActionsProps {
  /** A submit was refused because a required field is empty (not for other validation errors). */
  hasMissingRequiredFields: boolean;
  isSubmitting: boolean;
  isUploading: boolean;
  isEditMode: boolean;
  isDirty: boolean;
  onCancel: () => void;
}

export function TermsFormActions({
  hasMissingRequiredFields,
  isSubmitting,
  isUploading,
  isEditMode,
  isDirty,
  onCancel,
}: Readonly<TermsFormActionsProps>) {
  return (
    <div className="flex items-center justify-end gap-2 border-t p-4">
      {hasMissingRequiredFields && (
        <p className="text-destructive mr-auto text-xs">未入力の項目があります</p>
      )}
      <Button type="button" size="lg" variant="outline" disabled={isSubmitting} onClick={onCancel}>
        キャンセル
      </Button>
      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting || isUploading || (isEditMode && !isDirty)}
      >
        {isEditMode ? '保存する' : '登録する'}
      </Button>
    </div>
  );
}
