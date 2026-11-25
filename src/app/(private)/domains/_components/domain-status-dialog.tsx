'use client';

import { AlertTriangle } from 'lucide-react';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import type { DomainMasterSummaryDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

interface DomainStatusDialogProps {
  domain: DomainMasterSummaryDto | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

/**
 * Y-14 FR-S001 有効化・無効化の確認。無効化は紐づくスタッフ全員の次回ログインを止めるため、
 * 専用トグルの前に確認を挟む。紐づきスタッフがいても無効化は許可する（止めることが目的）。
 */
export function DomainStatusDialog({
  domain,
  isSubmitting,
  onOpenChange,
  onConfirm,
}: Readonly<DomainStatusDialogProps>) {
  const isReactivation = domain?.isActive === false;
  // 無効スタッフは元々ログインできないので、影響を受ける「有効スタッフ」(有効 + 招待中) の人数を出す
  const staffCount = domain?.activeStaffCount ?? 0;

  return (
    <AlertDialog open={domain !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isReactivation ? 'ドメインを有効化しますか？' : 'ドメインを無効化しますか？'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <span className="break-all">
              「{domain?.name}（{domain?.domain}）」
            </span>
            {isReactivation ? (
              <>
                を有効化します。有効化すると、このドメインのメールアドレスで再びCRMにログインできるようになります。
              </>
            ) : (
              <>
                を無効化します。無効化すると、このドメインのメールアドレスでは次回ログインからCRMにログインできなくなり、新規招待もできなくなります。ログイン中のセッションは最大60分で失効します。
                <br />※ 後から再度有効化できます。
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {!isReactivation && staffCount > 0 && (
          <Alert className="border-warning/50 bg-warning/15">
            <AlertTriangle className="text-warning size-4" />
            <AlertDescription className="text-foreground text-xs">
              このドメインには {staffCount}{' '}
              名のスタッフが紐づいています。無効化すると全員が次回ログインからCRMにログインできなくなります。
            </AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>キャンセル</AlertDialogCancel>
          <RoleGatedButton
            requiredPermission={Permission.DomainsEdit}
            denyTooltip="ドメインの編集権限がありません"
            disabled={isSubmitting}
            className={
              isReactivation
                ? 'bg-success text-success-foreground hover:bg-success/90'
                : 'bg-warning text-warning-foreground hover:bg-warning/90'
            }
            onClick={onConfirm}
          >
            {isReactivation ? '有効化する' : '無効化する'}
          </RoleGatedButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
