'use client';

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

type RoutineDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routineName: string;
  /** 公開中は削除不可。true の場合は削除アクションを出さず、ガイダンスのみ表示 */
  isPublished: boolean;
  isSubmitting?: boolean;
  onConfirm: () => void;
  /**
   * 詳細画面のプロトタイプ文言（モバイル配信の一文・「キャンセル」）。一覧は従来の文言のまま。
   */
  variant?: 'list' | 'detail';
  /** 公開中ダイアログの「非公開にする」（Delta #3）。未指定ならボタンを出さない */
  onUnpublish?: () => void;
  isUnpublishing?: boolean;
};

export function RoutineDeleteDialog({
  open,
  onOpenChange,
  routineName,
  isPublished,
  isSubmitting,
  onConfirm,
  variant = 'list',
  onUnpublish,
  isUnpublishing,
}: RoutineDeleteDialogProps) {
  const isDetail = variant === 'detail';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isPublished
              ? 'このルーティンは削除できません'
              : isDetail
                ? 'ルーティンを削除しますか？'
                : '削除しますか？'}
          </AlertDialogTitle>
          {/* An unbroken 200-char name must wrap inside the dialog, not push the buttons out. */}
          <AlertDialogDescription className="wrap-anywhere">
            {isPublished
              ? '公開中のルーティンは削除できません。先にステータスを「非公開」に変更してから削除してください。'
              : isDetail
                ? `「${routineName}」を削除します。モバイルアプリには配信されなくなります。この操作は元に戻せません。`
                : `「${routineName}」を削除します。この操作は元に戻せません。`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {isDetail && !isPublished ? 'キャンセル' : '閉じる'}
          </AlertDialogCancel>
          {isPublished && onUnpublish && (
            <AlertDialogAction
              disabled={isUnpublishing}
              onClick={(event) => {
                event.preventDefault();
                onUnpublish();
              }}
            >
              {isUnpublishing ? '処理中...' : '非公開にする'}
            </AlertDialogAction>
          )}
          {!isPublished && (
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSubmitting}
              onClick={(event) => {
                event.preventDefault();
                onConfirm();
              }}
            >
              {isSubmitting ? '削除中...' : '削除する'}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
