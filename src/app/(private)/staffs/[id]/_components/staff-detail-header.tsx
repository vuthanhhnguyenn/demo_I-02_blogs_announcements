'use client';

import { useAuthUser } from '@/contexts/auth-user.context';
import { Pencil } from 'lucide-react';

import { BackLink } from '@/components/common/back-link';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Badge } from '@/components/ui/badge';

import { UserRole } from '@/types/permission.type';

import { StaffDeleteAction } from '../../_components/staff-delete-action';
import { STAFF_STATUS_CLASSES, STAFF_STATUS_LABELS, StaffStatus } from '../../_constants/constants';
import { canEditStaffAccount } from '../../_utils/can-edit-staff.util';
import { StaffMagicLinkAction } from './staff-magic-link-action';

interface StaffDetailHeaderProps {
  staffId: string;
  fullName: string;
  staffEmail: string;
  staffStatus: StaffStatus;
  staffRole: string;
  /** 所属店舗 ids — empty unless linkage.type === 'direct_store' */
  linkedStoreIds?: readonly string[];
  onEdit: () => void;
  /** The list URL the breadcrumb returns to, with the list's search/paging kept */
  backHref: string;
}

/**
 * Detail page header — breadcrumb, title, status badge, and role-gated actions
 * (magic-link / delete / edit) — src: staff-detail.tsx L149-191
 */
export function StaffDetailHeader({
  staffId,
  fullName,
  staffEmail,
  staffStatus,
  staffRole,
  linkedStoreIds,
  onEdit,
  backHref,
}: StaffDetailHeaderProps) {
  const { user } = useAuthUser();
  const isSelf = Boolean(user?.staffId) && user?.staffId === staffId;

  const magicLinkAllowedRoles = isSelf
    ? ([
        UserRole.System,
        UserRole.Headquarter,
        UserRole.Manager,
        UserRole.Staff,
        UserRole.Trainer,
        UserRole.Observer,
      ] as const)
    : ([UserRole.Headquarter, UserRole.System] as const);

  const isManagerEditAllowed =
    user?.role === UserRole.Manager &&
    canEditStaffAccount(user, { role: staffRole, storeIds: linkedStoreIds });
  const editAllowedRoles = isManagerEditAllowed
    ? ([UserRole.Headquarter, UserRole.System, UserRole.Manager] as const)
    : ([UserRole.Headquarter, UserRole.System] as const);
  // Two different denials, and the mockup gives each its own wording — so pick by *why*
  // the button is off, not by `isManagerEditAllowed`: that flag is only ever true when the
  // button is enabled, which made 「管理者権限が必要です」 dead code and left every denial
  // reading as a store-scope problem, including for roles that may never edit at all
  // (BUG-P2-04-16 / TC-014). A Manager looking at a スタッフ-role account is refused by
  // store scope; anyone else is refused by authority.
  const editDenyTooltip =
    user?.role === UserRole.Manager && staffRole === 'staff'
      ? '担当店舗のスタッフのみ編集できます'
      : '管理者権限が必要です';

  return (
    <PageHeader
      breadcrumb={<BackLink label="スタッフ管理に戻る" href={backHref} />}
      // PageHeader's h1 is `truncate`, so a long unbroken name was clipped with no ellipsis
      // and no way to read the rest. TextWithTooltip keeps the truncation but reveals the full
      // value on hover — the same treatment the list table already gives 氏名.
      title={<TextWithTooltip text={fullName} className="text-xl font-bold" />}
      badge={
        <Badge
          variant="outline"
          className={`gap-1 text-xs font-medium ${STAFF_STATUS_CLASSES[staffStatus]}`}
        >
          <span className="size-1.5 rounded-full bg-current" />
          {STAFF_STATUS_LABELS[staffStatus]}
        </Badge>
      }
      actions={
        <>
          <StaffMagicLinkAction
            staffId={staffId}
            staffName={fullName}
            staffEmail={staffEmail}
            allowedRoles={magicLinkAllowedRoles}
          />
          <StaffDeleteAction staffId={staffId} mode="detail" />
          <RoleGatedButton
            variant="outline"
            allowedRoles={editAllowedRoles}
            denyTooltip={editDenyTooltip}
            className="gap-1"
            onClick={onEdit}
          >
            <Pencil className="size-4" />
            編集
          </RoleGatedButton>
        </>
      }
    />
  );
}
