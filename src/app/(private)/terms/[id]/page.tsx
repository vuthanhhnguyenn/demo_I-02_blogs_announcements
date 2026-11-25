'use client';

import { useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import { TermsDeleteDialog } from '@/app/(private)/terms/_components/terms-delete-dialog';
import { TermsDetailSkeleton } from '@/app/(private)/terms/_components/terms-detail/terms-detail-skeleton';
import { TermsDetailTabs } from '@/app/(private)/terms/_components/terms-detail/terms-detail-tabs';
import { TermsStatusBadge } from '@/app/(private)/terms/_components/terms-detail/terms-status-badge';
import { TERMS_ID_PATTERN } from '@/app/(private)/terms/_constants/constants';
import { useQuery } from '@tanstack/react-query';
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { RoleGatedMenuItem } from '@/components/common/role-gated-menu-item';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { getApiErrorStatus } from '@/lib/api-error.util';
import { adminTermsControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { UserRole } from '@/types/permission.type';

export default function TermsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/terms'));
  const withReturnTo = useWithReturnTo();
  const termsId = params.id as string;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isValidId = TERMS_ID_PATTERN.test(termsId);

  const {
    data: terms,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    ...adminTermsControllerDetailOptions({ path: { id: termsId } }),
    enabled: isValidId,
  });
  // An unknown / out-of-scope id (404 E-TERM-001) or a non-UUID one is a not-found, not a
  // network failure (staffs / transfers detail pattern).
  const isNotFound = !isValidId || getApiErrorStatus(error) === 404;

  if (!terms) {
    return (
      <DataStateBoundary
        isLoading={isLoading}
        isError={isError && !isNotFound}
        isEmpty={isNotFound || (!isLoading && !isError)}
        onRetry={() => void refetch()}
        emptyState={{
          variant: 'empty',
          title: '規約文書が見つかりません',
          description: `指定された規約ID（${termsId}）は存在しないか、参照権限がありません。`,
          action: (
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => router.push(navigate('/terms'))}
            >
              規約文書管理に戻る
            </Button>
          ),
        }}
        skeleton={<TermsDetailSkeleton />}
      />
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        breadcrumb={<BackToListLink label="規約文書管理に戻る" listPath={navigate('/terms')} />}
        title={terms.title}
        badge={<TermsStatusBadge terms={terms} dot />}
        actions={
          terms.deletedAt ? undefined : (
            <div className="flex items-center gap-2">
              <RoleGatedButton
                allowedRoles={[UserRole.Headquarter, UserRole.System]}
                variant="outline"
                className="gap-1"
                onClick={() =>
                  router.push(withReturnTo(navigate('/terms/[id]/edit', termsId), backToListHref))
                }
              >
                <Pencil className="size-4" />
                編集
              </RoleGatedButton>
              <RoleGatedButton
                allowedRoles={[UserRole.Headquarter, UserRole.System]}
                className="gap-1"
                onClick={() =>
                  router.push(
                    withReturnTo(navigate('/terms/[id]/new-version', termsId), backToListHref),
                  )
                }
              >
                <Plus className="size-4" />
                新規バージョン作成
              </RoleGatedButton>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" size="icon" />}>
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <RoleGatedMenuItem
                    allowedRoles={[UserRole.Headquarter, UserRole.System]}
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="size-4" />
                    削除
                  </RoleGatedMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        }
      />

      <div className="px-6 py-4">
        <TermsDetailTabs terms={terms} />
      </div>

      <TermsDeleteDialog
        target={deleteOpen ? { id: terms.id, title: terms.title } : null}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.push(navigate('/terms'))}
      />
    </div>
  );
}
