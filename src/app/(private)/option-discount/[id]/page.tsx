'use client';

import { useParams, useRouter } from 'next/navigation';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { BackLink } from '@/components/common/back-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { RoleGatedMenuItem } from '@/components/common/role-gated-menu-item';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { isRecordNotFoundError } from '@/lib/api-error.util';
import {
  adminOptionSetControllerDetailOptions,
  adminOptionSetControllerDetailQueryKey,
  adminOptionSetControllerListQueryKey,
  adminOptionSetControllerSetActiveMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { OptionSetDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import {
  OPTION_DISCOUNT_STATUS_BADGE_CLASSES,
  OPTION_DISCOUNT_STATUS_LABELS,
  toOptionSetStatus,
} from '../_constants/constants';
import { BasicInfo } from './_components/basic-info';

export default function OptionDiscountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/option-discount'));
  const withReturnTo = useWithReturnTo();

  const setId = params.id as string;
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    ...adminOptionSetControllerDetailOptions({ path: { setId } }),
  });

  // G-02 FR-006: a set discount is never deleted — it is deactivated instead.
  const toggleStatusMutation = useMutation({
    ...adminOptionSetControllerSetActiveMutation(),
    onSuccess: (res) => {
      toast.success(
        res.isActive ? `「${res.name}」を有効化しました` : `「${res.name}」を無効化しました`,
      );
      queryClient.invalidateQueries({
        queryKey: adminOptionSetControllerDetailQueryKey({ path: { setId } }),
      });
      queryClient.invalidateQueries({ queryKey: adminOptionSetControllerListQueryKey() });
    },
    // The failure toast comes from the app-wide MutationCache handler (BE `userMessage`).
  });

  if (isLoading) {
    return <DataStateBoundary isLoading isEmpty={false} />;
  }

  // An unknown id (404 E-SET-001) or a malformed one (400 on `setId`) is a not-found, not a
  // failure worth retrying.
  const isNotFound = isRecordNotFoundError(error, 'setId');

  if (isError || !data) {
    return (
      <DataStateBoundary
        isLoading={false}
        isError={isError && !isNotFound}
        isEmpty={isNotFound || !data}
        onRetry={() => refetch()}
        emptyTitle="セット割が見つかりません"
      />
    );
  }

  const detail: OptionSetDetailDto = data;
  const status = toOptionSetStatus(detail.isActive);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        breadcrumb={<BackLink label="セット割設定に戻る" href={backToListHref} />}
        title={detail.name}
        badge={
          <>
            <Badge
              variant="outline"
              className={`gap-1 text-xs font-medium ${OPTION_DISCOUNT_STATUS_BADGE_CLASSES[status]}`}
            >
              <span className="size-1.5 rounded-full bg-current" />
              {OPTION_DISCOUNT_STATUS_LABELS[status]}
            </Badge>
            <Badge
              variant="outline"
              className="bg-destructive/15 text-destructive border-destructive/20 text-xs font-medium"
            >
              FIT365 限定
            </Badge>
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <RoleGatedButton
              requiredPermission={Permission.OptionDiscountsEdit}
              className="gap-1"
              onClick={() =>
                router.push(
                  withReturnTo(navigate('/option-discount/[id]/edit', setId), backToListHref),
                )
              }
            >
              <Pencil className="size-4" />
              編集
            </RoleGatedButton>

            <DropdownMenu>
              <DropdownMenuTrigger className="border-input hover:bg-accent flex size-8 items-center justify-center rounded-md border">
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* G-02 FR-006: the only management actions are list / create / edit / deactivate — no delete is defined. */}
                <RoleGatedMenuItem
                  requiredPermission={Permission.OptionDiscountsEdit}
                  disabled={toggleStatusMutation.isPending}
                  onClick={() =>
                    toggleStatusMutation.mutate({
                      path: { setId },
                      body: { isActive: !detail.isActive },
                    })
                  }
                >
                  {detail.isActive ? (
                    <>
                      <ToggleRight className="size-4" />
                      無効にする
                    </>
                  ) : (
                    <>
                      {/* The prototype detail only shows 無効にする (ToggleRight); the switched-off
                          state gets the mirrored icon. */}
                      <ToggleLeft className="size-4" />
                      有効にする
                    </>
                  )}
                </RoleGatedMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* No 変更履歴 tab: set-discount change history is out of scope (dev answer 2026-08-24). */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <BasicInfo data={detail} />
      </div>
    </div>
  );
}
