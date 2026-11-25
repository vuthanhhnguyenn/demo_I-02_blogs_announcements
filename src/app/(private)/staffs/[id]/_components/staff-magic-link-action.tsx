'use client';

import { useState } from 'react';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { useMutation } from '@tanstack/react-query';
import { Link2 } from 'lucide-react';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { staffControllerIssueMagicLinkMutation } from '@/lib/api-real/@tanstack/react-query.gen';

import { UserRole } from '@/types/permission.type';

interface StaffMagicLinkActionProps {
  staffId: string;
  staffName: string;
  staffEmail: string;
  /** Any role may issue for their own account; otherwise Headquarter/System only — src: staff-detail.tsx L161-171 */
  allowedRoles: readonly UserRole[];
}

/**
 * "CRMのログイン用URLを送る" header action + sent-confirmation dialog
 * src: staff-detail.tsx L161-171 (action), L389-401 (dialog)
 */
export function StaffMagicLinkAction({
  staffId,
  staffName,
  staffEmail,
  allowedRoles,
}: StaffMagicLinkActionProps) {
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const mutation = useMutation({
    ...staffControllerIssueMagicLinkMutation(),
    onSuccess: (res) => {
      setExpiresAt(res.expiresAt);
    },
  });

  return (
    <>
      <RoleGatedButton
        variant="outline"
        allowedRoles={allowedRoles}
        denyTooltip="本部管理者権限が必要です"
        className="gap-1"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate({ body: { staffId, linkType: 'crm_login' } })}
      >
        <Link2 className="size-4" />
        CRMのログイン用URLを送る
      </RoleGatedButton>

      <AlertDialog open={expiresAt !== null} onOpenChange={(open) => !open && setExpiresAt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ログイン用URLを送信しました</AlertDialogTitle>
            <AlertDialogDescription>
              {staffName} さんのメールアドレス（{staffEmail}
              ）にCRMのログイン用URLを送信しました。本人がメールを開いてURLをタップすると、CRMにログインできます。
              {expiresAt && `URLの有効期限は ${formatDateYYYYMMDD_HHMM(expiresAt)} までです。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setExpiresAt(null)}>閉じる</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
