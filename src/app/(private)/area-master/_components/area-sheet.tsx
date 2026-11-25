'use client';

import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import { useAuthUser } from '@/contexts/auth-user.context';
import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { useIsMutating, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';

import { Error as ErrorState } from '@/components/common/data-state-boundary/error';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { getApiErrorCode, resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminAreaControllerDetailOptions,
  adminAreaControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { AreaDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission, UserRole } from '@/types/permission.type';

import {
  AREA_GENDER_CONDITION_LABELS,
  AREA_NOT_FOUND_ERROR_CODE,
  AREA_SAVE_MUTATION_KEY,
  type AreaBrandGroup,
  areaDeleteBlockedReason,
  isAreaUsed,
} from '../_constants/area.constants';
import { AreaForm } from './area-form';
import { AreaReadRow } from './area-read-row';

export type AreaSheetMode = 'view' | 'create' | 'edit';

interface AreaSheetProps {
  open: boolean;
  mode: AreaSheetMode;
  areaId: string | null;
  /** The brand pre-selected on 登録 (the list's brand filter, or none). */
  initialBrand: AreaBrandGroup | null;
  onModeChange: (mode: AreaSheetMode) => void;
  onClose: () => void;
  onCreated: (areaId: string) => void;
  onDeleteClick: (area: AreaDetailDto) => void;
}

/**
 * E-02 FR-016 — the right-hand sheet of the area master: view (with 使われている所), register and
 * edit in one place. Registering / editing / deleting is HQ-only; the others read.
 */
export function AreaSheet({
  open,
  mode,
  areaId,
  initialBrand,
  onModeChange,
  onClose,
  onCreated,
  onDeleteClick,
}: Readonly<AreaSheetProps>) {
  const { hasRole, checkPermission } = useAuthUser();
  const canDelete = checkPermission(Permission.AreasDelete).allowed;
  const isSaving = useIsMutating({ mutationKey: AREA_SAVE_MUTATION_KEY }) > 0;
  const queryClient = useQueryClient();
  // 見る opens with focus on the title, not on 削除 — a focused button opens its tooltip and the
  // first Escape would only close that tooltip instead of the sheet.
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Re-read on every opening (staleTime 0): another tab or user may have changed or deleted it.
  const detailQuery = useQuery({
    ...adminAreaControllerDetailOptions({ path: { areaId: areaId ?? '' } }),
    enabled: open && areaId !== null,
    staleTime: 0,
  });
  // Deleted elsewhere: never show the cached record — the error state says so.
  const isGone = getApiErrorCode(detailQuery.error) === AREA_NOT_FOUND_ERROR_CODE;
  const area = areaId && !isGone ? (detailQuery.data ?? null) : null;

  // …and drop its row from the list.
  useEffect(() => {
    if (isGone) void queryClient.invalidateQueries({ queryKey: adminAreaControllerListQueryKey() });
  }, [isGone, queryClient]);

  // Each opening of the sheet is a new form session (set during render, not in an effect — the
  // derived-state pattern the lint rule asks for); the form is keyed on it so it mounts fresh.
  const [session, setSession] = useState({ open, count: 0 });
  if (session.open !== open) {
    setSession({ open, count: open ? session.count + 1 : session.count });
  }

  // Escape / backdrop / X: the sheet itself asks first while the form inside is dirty.
  const handleOpenChange = (next: boolean) => {
    if (!next && !isSaving) onClose();
  };

  const usage = area?.usage;
  const usageCounts = area?.usageCounts;

  // 使われている所: the API lists a store-scoped role only its own stores' doors (doorCount stays the
  // total); Observer sees plans and options as counts only.
  const countOnly = hasRole([UserRole.Observer]);
  const renderUsage = () => {
    if (!usage || !usageCounts || !isAreaUsed(usageCounts)) {
      return <p className="text-muted-foreground text-sm">どこにも使われていません</p>;
    }
    const hiddenDoorCount = usageCounts.doorCount - usage.doors.length;
    const linkClass = 'text-primary text-sm wrap-anywhere hover:underline';
    return (
      <div className="flex flex-col gap-4">
        {usage.plans.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground text-xs font-medium">
              主契約 {usage.plans.length}件
            </p>
            {!countOnly &&
              usage.plans.map((p) => (
                <Link key={p.id} href={navigate('/contracts/[id]', p.id)} className={linkClass}>
                  {p.name}
                </Link>
              ))}
          </div>
        )}
        {usage.options.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground text-xs font-medium">
              オプション {usage.options.length}件
            </p>
            {!countOnly &&
              usage.options.map((o) => (
                <Link key={o.id} href={navigate('/options/[id]', o.id)} className={linkClass}>
                  {o.name}
                </Link>
              ))}
          </div>
        )}
        {usageCounts.doorCount > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground text-xs font-medium">
              エリア扉 {usageCounts.doorCount}台
            </p>
            {usage.doors.map((d) => (
              <Link key={d.id} href={navigate('/equipment/[id]', d.id)} className={linkClass}>
                {d.storeName ?? '—'}・{d.name}
              </Link>
            ))}
            {hiddenDoorCount > 0 && (
              <p className="text-muted-foreground text-xs">
                ほかの店舗の扉 {hiddenDoorCount}台は表示していません
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderDeleteButton = () => {
    if (!area || !usageCounts) return null;
    const deleteClass = 'gap-1 text-destructive hover:text-destructive';
    if (canDelete && isAreaUsed(usageCounts)) {
      return (
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <Button
              variant="outline"
              disabled
              aria-disabled="true"
              className={`${deleteClass} cursor-not-allowed opacity-50`}
            >
              <Trash2 className="size-4" />
              削除
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{areaDeleteBlockedReason(usageCounts)}</p>
          </TooltipContent>
        </Tooltip>
      );
    }
    return (
      <RoleGatedButton
        requiredPermission={Permission.AreasDelete}
        denyTooltip="エリアの削除は本部のみ可能です"
        variant="outline"
        className={deleteClass}
        onClick={() => onDeleteClick(area)}
      >
        <Trash2 className="size-4" />
        削除
      </RoleGatedButton>
    );
  };

  const title =
    mode === 'create' ? (
      'エリアを登録'
    ) : mode === 'edit' ? (
      'エリアを編集'
    ) : area ? (
      <>
        <span className="min-w-0 wrap-anywhere">{area.name}</span>
        {area.genderCondition !== 'none' && (
          <Badge variant="outline" className="shrink-0">
            {AREA_GENDER_CONDITION_LABELS[area.genderCondition]}
          </Badge>
        )}
      </>
    ) : null;

  // The area being viewed / edited is still loading, or could not be read (e.g. deleted elsewhere).
  const renderDetailState = () =>
    detailQuery.isError ? (
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <ErrorState
          description={resolveApiErrorMessage(detailQuery.error)}
          onRetry={() => void detailQuery.refetch()}
        />
      </div>
    ) : (
      <div className="flex flex-1 flex-col gap-4 px-6 py-4" aria-busy="true">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-24 w-full" />
      </div>
    );

  const formKey = `${session.count}:${mode}:${areaId ?? 'new'}`;

  const renderBody = () => {
    if (mode === 'create') {
      return (
        <AreaForm
          key={formKey}
          mode="create"
          initialBrand={initialBrand}
          onCancel={onClose}
          onSaved={onCreated}
        />
      );
    }
    if (!area) return renderDetailState();
    if (mode === 'edit') {
      return (
        <AreaForm
          key={formKey}
          mode="edit"
          area={area}
          onCancel={() => onModeChange('view')}
          onSaved={() => onModeChange('view')}
          onGone={onClose}
        />
      );
    }
    return (
      <>
        <div className="flex-1 overflow-y-auto px-6">
          <div className="flex flex-col gap-4 py-4">
            <AreaReadRow label="ブランド">{area.brandGroup}</AreaReadRow>
            <AreaReadRow label="エリアID">{area.areaCode}</AreaReadRow>
            <AreaReadRow label="エリア名">{area.name}</AreaReadRow>
            <AreaReadRow label="性別の条件">
              {AREA_GENDER_CONDITION_LABELS[area.genderCondition]}
            </AreaReadRow>
            <AreaReadRow label="備考">
              {area.note ? (
                <p className="whitespace-pre-wrap">{area.note}</p>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </AreaReadRow>
          </div>
          <Separator className="-mx-6 data-horizontal:w-[calc(100%+3rem)]" />
          <div className="flex flex-col gap-2 py-4">
            <p className="text-sm font-semibold">使われている所</p>
            {renderUsage()}
          </div>
          <Separator className="-mx-6 data-horizontal:w-[calc(100%+3rem)]" />
          <div className="py-4">
            <AreaReadRow label="最終変更">
              <span>
                {formatDateYYYYMMDD_HHMM(area.updatedAt)}　{area.updatedByName ?? '—'}
              </span>
            </AreaReadRow>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 border-t px-6 py-4">
          {renderDeleteButton()}
          <RoleGatedButton
            requiredPermission={Permission.AreasEdit}
            denyTooltip="エリアの編集は本部のみ可能です"
            variant="outline"
            className="gap-1"
            onClick={() => onModeChange('edit')}
          >
            <Pencil className="size-4" />
            編集
          </RoleGatedButton>
        </div>
      </>
    );
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        className="flex w-[480px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[480px]"
        initialFocus={mode === 'view' ? titleRef : true}
      >
        <div className="shrink-0 border-b py-4 pr-12 pl-6">
          <SheetHeader className="gap-0 p-0">
            <SheetTitle
              ref={titleRef}
              tabIndex={-1}
              className="flex min-w-0 items-center gap-2 text-sm font-semibold outline-none"
            >
              {title}
            </SheetTitle>
            <SheetDescription className="sr-only">エリアマスタのエリアの内容</SheetDescription>
          </SheetHeader>
        </div>
        {renderBody()}
      </SheetContent>
    </Sheet>
  );
}
