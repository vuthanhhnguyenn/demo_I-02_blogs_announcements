'use client';
// Client component: controlled AlertDialog driven by parent state and onClick handlers.
import { useState } from 'react';

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

export type NoticeDetailConfirmKind = 'unpublish' | 'cancelSchedule' | 'delete' | 'restore';

export interface NoticeDetailConfirmCopy {
  title: string;
  description: string;
  confirmLabel: string;
  destructive: boolean;
}

interface NoticeDetailConfirmDialogProps {
  /** Which confirmation to show; null closes the dialog. */
  kind: NoticeDetailConfirmKind | null;
  /** Per-screen copy (ブログ: 記事を… / お知らせ: お知らせを…). */
  copy: Record<NoticeDetailConfirmKind, NoticeDetailConfirmCopy>;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

/** Confirmation of the detail actions of ブログ詳細 / お知らせ詳細. */
export function NoticeDetailConfirmDialog({
  kind,
  copy,
  onOpenChange,
  onConfirm,
  isPending,
}: NoticeDetailConfirmDialogProps) {
  // Keep the last kind while the dialog animates out, so the copy does not blank mid-close
  const [shownKind, setShownKind] = useState(kind);
  if (kind && kind !== shownKind) setShownKind(kind);
  const current = shownKind ? copy[shownKind] : null;

  return (
    <AlertDialog open={kind !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{current?.title}</AlertDialogTitle>
          <AlertDialogDescription>{current?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            className={
              current?.destructive
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : undefined
            }
            disabled={isPending}
            onClick={onConfirm}
          >
            {current?.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
