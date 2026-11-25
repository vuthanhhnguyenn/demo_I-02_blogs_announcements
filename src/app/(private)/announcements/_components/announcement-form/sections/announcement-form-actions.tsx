import { ANNOUNCEMENT_FORM_ERROR_SUMMARY } from '@/app/(private)/announcements/_constants/announcement-form.constants';
import { Eye } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface AnnouncementFormActionsProps {
  /** Shows 「未入力の項目があります」 on the left after a failed submit. */
  hasSubmitErrors: boolean;
  /** Disables every button while the save is in flight (and e.g. while the thumbnail uploads). */
  isPending: boolean;
  /** Disables only the save button (e.g. a Staff user without a targetable store). */
  isSaveDisabled?: boolean;
  /** Save button label — `ANNOUNCEMENT_SAVE_LABELS[publishMethod]`. */
  saveLabel: string;
  onCancel: () => void;
  onPreview: () => void;
  onSubmit: () => void;
}

/** Form footer (prototype blog-form.tsx L546-L558). */
export function AnnouncementFormActions({
  hasSubmitErrors,
  isPending,
  isSaveDisabled = false,
  saveLabel,
  onCancel,
  onPreview,
  onSubmit,
}: Readonly<AnnouncementFormActionsProps>) {
  return (
    <div className="flex items-center justify-end gap-2 border-t p-4">
      {hasSubmitErrors && (
        <p className="text-destructive mr-auto text-xs">{ANNOUNCEMENT_FORM_ERROR_SUMMARY}</p>
      )}
      <Button type="button" size="lg" variant="outline" onClick={onCancel} disabled={isPending}>
        キャンセル
      </Button>
      <Button
        type="button"
        size="lg"
        variant="outline"
        className="gap-1"
        onClick={onPreview}
        disabled={isPending}
      >
        <Eye className="size-4" />
        プレビュー
      </Button>
      <Button type="button" size="lg" onClick={onSubmit} disabled={isPending || isSaveDisabled}>
        {saveLabel}
      </Button>
    </div>
  );
}
