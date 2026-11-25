'use client';

import { useState } from 'react';

import { RoleGatedButton } from '@/components/common/role-gated-button';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { Permission, UserRole } from '@/types/permission.type';

/** `QnrStatusDto.reason` maxLength (the prototype's 1000 is wider than the contract). */
const REASON_MAX_LENGTH = 500;

interface SurveyDisableDialogProps {
  isPending: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `reason` is recorded in the questionnaire history (empty → omitted). */
  onConfirm: (reason: string) => void;
  /** Renders the status-card button; the list opens the dialog from its row menu instead. */
  showTrigger?: boolean;
  /** Survey category: lifecycle → Headquarter/System only, operational → the position flag (as the list row). */
  category?: string;
}

export function SurveyDisableDialog({
  isPending,
  open,
  onOpenChange,
  onConfirm,
  showTrigger = true,
  category,
}: SurveyDisableDialogProps) {
  const [reason, setReason] = useState('');
  const isOperational = category === 'operational';

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setReason('');
        onOpenChange(nextOpen);
      }}
    >
      {showTrigger && (
        <RoleGatedButton
          allowedRoles={isOperational ? undefined : [UserRole.Headquarter, UserRole.System]}
          requiredPermission={isOperational ? Permission.SurveysDelete : undefined}
          variant="outline"
          size="sm"
          fullWidth
          disabled={isPending}
          onClick={() => {
            setReason('');
            onOpenChange(true);
          }}
        >
          無効化する
        </RoleGatedButton>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>このアンケートを無効化しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            無効化すると新規の回答は受け付けなくなります。既存の回答データは保持されます。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex min-w-0 flex-col gap-2 py-2">
          <Label htmlFor="survey-disable-reason" className="text-muted-foreground text-xs">
            無効化の理由（履歴に記録されます）
          </Label>
          <Textarea
            id="survey-disable-reason"
            maxLength={REASON_MAX_LENGTH}
            placeholder="例: 設問の見直しが必要なため一時停止"
            rows={3}
            // field-sizing grows with the text: cap the height and wrap long tokens so the
            // footer buttons stay on screen.
            className="max-h-40 wrap-anywhere"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <p className="text-muted-foreground text-right text-[10px]">
            {reason.length} / {REASON_MAX_LENGTH}
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              onConfirm(reason.trim());
            }}
          >
            無効化する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
