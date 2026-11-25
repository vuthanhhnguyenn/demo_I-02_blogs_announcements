'use client';

import { ArrowRight } from 'lucide-react';

import { BRAND_ENUM_LABELS } from '@/components/common/brand-badge';
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

import {
  APP_VERSION_OS_LABELS,
  type AppVersionBrand,
  formatAppVersionPair,
} from '../../_constants/app-version.constants';
import type { AppVersionMinChange } from '../../_utils/app-version-min-change.util';

interface AppVersionMinChangeDialogProps {
  brand: AppVersionBrand | null;
  changes: AppVersionMinChange[];
  confirmLabel: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function dialogTitle(changes: AppVersionMinChange[]): string {
  const directions = new Set(changes.map((change) => change.direction));
  if (directions.size > 1) return '最低バージョンの変更の確認';
  return directions.has('raise')
    ? '最低バージョンの引き上げの確認'
    : '最低バージョンの引き下げの確認';
}

/** FR-M002 引き上げ／引き下げの確認: target app, minimum before → after, and the raise warning. */
export function AppVersionMinChangeDialog({
  brand,
  changes,
  confirmLabel,
  isPending,
  onCancel,
  onConfirm,
}: AppVersionMinChangeDialogProps) {
  const hasRaise = changes.some((change) => change.direction === 'raise');

  return (
    <AlertDialog
      open={brand !== null && changes.length > 0}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent className="data-[size=default]:sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{dialogTitle(changes)}</AlertDialogTitle>
          <AlertDialogDescription render={<div />} className="flex flex-col gap-3">
            <ul className="bg-muted/40 grid grid-cols-[max-content_minmax(0,max-content)_max-content_minmax(0,max-content)] items-center gap-x-3 gap-y-1.5 rounded-md border px-3 py-2 text-sm">
              {changes.map((change) => (
                <li key={change.os} className="contents">
                  <span className="text-foreground font-medium">
                    {brand ? BRAND_ENUM_LABELS[brand] : ''} {APP_VERSION_OS_LABELS[change.os]}
                  </span>
                  <span className="min-w-0 font-mono wrap-anywhere">
                    {change.before ? formatAppVersionPair(change.before) : '未設定'}
                  </span>
                  <ArrowRight className="size-3.5" />
                  <span className="text-foreground min-w-0 font-mono wrap-anywhere">
                    {formatAppVersionPair(change.after)}
                  </span>
                </li>
              ))}
            </ul>
            {hasRaise && (
              <p>
                このバージョン未満のアプリを使っている会員は、アップデートするまでアプリを使えなくなります。ストアで公開・反映済みであることを確認してください
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
