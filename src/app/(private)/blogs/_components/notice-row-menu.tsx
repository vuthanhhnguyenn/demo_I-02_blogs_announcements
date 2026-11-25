'use client';
// Client component: dropdown menu state and the auth context (own-article / role gating).
import { useAuthUser } from '@/contexts/auth-user.context';
import { Ban, Eye, Globe, MoreHorizontal, Pencil, RotateCcw, Trash2 } from 'lucide-react';

import { RoleGatedMenuItem } from '@/components/common/role-gated-menu-item';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { type Permission, UserRole } from '@/types/permission.type';

import type { NoticeRow } from '../_types/notice.type';
import { isOwnArticle, scopedNoticeEditRoles } from '../_utils/notice-row.util';

export interface NoticeRowMenuHandlers {
  onPreview: (row: NoticeRow) => void;
  onEdit: (row: NoticeRow) => void;
  onPublish: (row: NoticeRow) => void;
  onUnpublish: (row: NoticeRow) => void;
  onDelete: (row: NoticeRow) => void;
  onRestore: (row: NoticeRow) => void;
}

/** Permissions of the screen (Blogs* / Announcements*). */
export interface NoticeRowMenuPermissions {
  edit: Permission;
  publish: Permission;
  delete: Permission;
  restore: Permission;
}

interface NoticeRowMenuProps extends NoticeRowMenuHandlers {
  row: NoticeRow;
  permissions: NoticeRowMenuPermissions;
}

/** Row menu of the I-02 article lists (prototype L735-L789); shared by ブログ / お知らせ. */
export function NoticeRowMenu({
  row,
  permissions,
  onPreview,
  onEdit,
  onPublish,
  onUnpublish,
  onDelete,
  onRestore,
}: Readonly<NoticeRowMenuProps>) {
  const { user, hasRole } = useAuthUser();

  const isDeleted = row.deletedAt !== null;
  const isPublished = row.publishStatus === 'published' || row.publishStatus === 'scheduled';
  // FR-016 / research R5: Staff only on their own article; Staff sees 他者作成, others the default.
  const editAllowedRoles = scopedNoticeEditRoles(isOwnArticle(row, user?.staffId));
  const editDenyBadge = hasRole([UserRole.Staff]) ? '他者作成' : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="操作メニュー"
        className="hover:bg-muted flex size-8 items-center justify-center rounded-md"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!isDeleted && (
          <>
            <DropdownMenuItem onClick={() => onPreview(row)}>
              <Eye className="size-4" />
              プレビュー
            </DropdownMenuItem>
            <RoleGatedMenuItem
              requiredPermission={permissions.edit}
              allowedRoles={editAllowedRoles}
              denyBadge={editDenyBadge}
              onClick={() => onEdit(row)}
            >
              <Pencil className="size-4" />
              編集
            </RoleGatedMenuItem>
            <DropdownMenuSeparator />
            {isPublished ? (
              <RoleGatedMenuItem
                requiredPermission={permissions.publish}
                allowedRoles={editAllowedRoles}
                denyBadge={editDenyBadge}
                className="text-warning"
                onClick={() => onUnpublish(row)}
              >
                <Ban className="size-4" />
                非公開にする
              </RoleGatedMenuItem>
            ) : (
              <RoleGatedMenuItem
                requiredPermission={permissions.publish}
                allowedRoles={editAllowedRoles}
                denyBadge={editDenyBadge}
                className="text-success"
                onClick={() => onPublish(row)}
              >
                <Globe className="size-4" />
                公開にする
              </RoleGatedMenuItem>
            )}
            <DropdownMenuSeparator />
            <RoleGatedMenuItem
              requiredPermission={permissions.delete}
              className="text-destructive"
              onClick={() => onDelete(row)}
            >
              <Trash2 className="size-4" />
              削除
            </RoleGatedMenuItem>
          </>
        )}
        {isDeleted && (
          // Clarification Q2: gated (V0 leaves it ungated).
          <RoleGatedMenuItem
            requiredPermission={permissions.restore}
            className="text-success"
            onClick={() => onRestore(row)}
          >
            <RotateCcw className="size-4" />
            復元する
          </RoleGatedMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
