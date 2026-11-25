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

interface DomainDeleteDialogProps {
  domain: DomainMasterSummaryDto | null;
  isSubmitting: boolean;
  blockedStaffCount: number | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DomainDeleteDialog({
  domain,
  isSubmitting,
  blockedStaffCount,
  onOpenChange,
  onConfirm,
}: Readonly<DomainDeleteDialogProps>) {
  // Prefer the confirm-time count (a staff member could have been linked after the dialog
  // opened but before confirm — spec.md Edge Cases, re-read from `GET /{id}` and backed by the
  // server's own E-DMN-004 refusal) over the row's already-loaded activeStaffCount, which covers
  // the common case proactively. FR-M004 blocks on 有効スタッフ (有効 + 招待中) only — `staffCount`
  // also counts 無効 staff and is for display (Y-14 Bug No.14).
  const staffCount = blockedStaffCount ?? domain?.activeStaffCount ?? 0;
  const isBlocked = staffCount > 0;

  return (
    <AlertDialog open={domain !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ドメインを削除しますか？</AlertDialogTitle>
          {/* FR-M004 正式版文言: N名版は下の Alert に出し、Description は sr-only で同文を保持（二重表示しない） */}
          {isBlocked ? (
            <AlertDialogDescription className="sr-only">
              {domain?.name}（{domain?.domain}）には現在{staffCount}
              名のスタッフが登録されているため削除できません。先にスタッフ管理画面で該当スタッフの所属変更または無効化を行ってください。
            </AlertDialogDescription>
          ) : (
            <AlertDialogDescription className="break-all">
              {domain?.name}（{domain?.domain}）
              を削除します。削除後、このドメインのメールアドレスでは新規招待・CRMログインができなくなります。この操作は取り消せません。
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        {isBlocked && (
          <Alert className="border-warning/50 bg-warning/15">
            <AlertTriangle className="text-warning size-4" />
            <AlertDescription className="text-foreground text-xs break-all">
              {domain?.name}（{domain?.domain}）には現在{staffCount}
              名のスタッフが登録されているため削除できません。先にスタッフ管理画面で該当スタッフの所属変更または無効化を行ってください。
            </AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          {/* 紐づくスタッフがいる場合は削除不可の案内のみ。削除ボタンは出さずキャンセルだけ残す */}
          {!isBlocked && (
            <RoleGatedButton
              requiredPermission={Permission.DomainsDelete}
              denyTooltip="ドメインの削除権限がありません"
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onConfirm}
            >
              削除する
            </RoleGatedButton>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
