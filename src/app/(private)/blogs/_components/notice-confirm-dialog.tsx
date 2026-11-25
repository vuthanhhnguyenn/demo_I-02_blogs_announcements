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

export type NoticeConfirmKind = 'publish' | 'unpublish' | 'delete';

export interface NoticeConfirmCopy {
  title: string;
  /** Receives the target article's title (お知らせ quotes it; blog ignores it). */
  description: (title: string) => string;
  confirmLabel: string;
  destructive: boolean;
}

interface NoticeConfirmDialogProps {
  /** Which confirmation to show; null closes the dialog. */
  kind: NoticeConfirmKind | null;
  copy: Record<NoticeConfirmKind, NoticeConfirmCopy>;
  targetTitle: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

/** Publish / unpublish / delete confirmation of the I-02 article lists (copy per screen). */
export function NoticeConfirmDialog({
  kind,
  copy,
  targetTitle,
  onOpenChange,
  onConfirm,
  isPending,
}: NoticeConfirmDialogProps) {
  // Keep the last kind / title while the dialog animates out, so the copy does not blank mid-close
  const [shown, setShown] = useState({ kind, targetTitle });
  if (kind && (kind !== shown.kind || targetTitle !== shown.targetTitle)) {
    setShown({ kind, targetTitle });
  }
  const current = shown.kind ? copy[shown.kind] : null;

  return (
    <AlertDialog open={kind !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{current?.title}</AlertDialogTitle>
          <AlertDialogDescription>{current?.description(shown.targetTitle)}</AlertDialogDescription>
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
