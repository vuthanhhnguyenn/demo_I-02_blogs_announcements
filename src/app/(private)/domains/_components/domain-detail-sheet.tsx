'use client';

import { useRef } from 'react';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { useQuery } from '@tanstack/react-query';
import { Ban, CheckCircle2, Globe, Pencil, Trash2 } from 'lucide-react';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import { adminDomainMasterControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { DomainMasterSummaryDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import { DOMAIN_AUTH_METHOD_LABELS } from '../_constants/domain.constants';
import { DomainLinkedStaffList } from './domain-linked-staff-list';
import { DomainStatusBadge } from './domain-status-badge';

interface DomainDetailSheetProps {
  domain: DomainMasterSummaryDto | null;
  onOpenChange: (open: boolean) => void;
  onEditClick: (row: DomainMasterSummaryDto) => void;
  onToggleActiveClick: (row: DomainMasterSummaryDto) => void;
  onDeleteClick: (row: DomainMasterSummaryDto) => void;
}

export function DomainDetailSheet({
  domain,
  onOpenChange,
  onEditClick,
  onToggleActiveClick,
  onDeleteClick,
}: Readonly<DomainDetailSheetProps>) {
  // 一覧の行は 作成者名 (`createdByName`) を持たないため詳細を取り直す (FR-M003 / FR-009)。
  // 取得中は行の値をそのまま表示してシートが空にならないようにする
  const detailQuery = useQuery({
    ...adminDomainMasterControllerDetailOptions({ path: { id: domain?.id ?? '' } }),
    enabled: domain !== null,
  });
  const detail = detailQuery.data ?? domain;

  // 紐づくスタッフの無限スクロールは、この本文の領域をスクロール root にする
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  return (
    <Sheet open={domain !== null} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[480px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[480px]">
        <div className="shrink-0 border-b py-4 pr-12 pl-6">
          <SheetHeader className="gap-0 p-0">
            <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
              <Globe className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 break-all">{detail?.domain}</span>
              {detail && (
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {DOMAIN_AUTH_METHOD_LABELS[detail.authProvider]}
                </Badge>
              )}
            </SheetTitle>
            <SheetDescription className="sr-only">
              ドメインの詳細情報と紐づくスタッフの一覧
            </SheetDescription>
          </SheetHeader>
        </div>

        {detail && (
          <>
            <div ref={bodyScrollRef} className="flex-1 overflow-y-auto px-6">
              <div className="py-4">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs">ID</p>
                    <p className="text-sm">{detail.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs">管理名</p>
                    <p className="text-sm break-all">{detail.name}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground mb-1 text-xs">ドメイン</p>
                    <p className="font-mono text-sm break-all">{detail.domain}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs">認証方式</p>
                    <p className="text-sm">{DOMAIN_AUTH_METHOD_LABELS[detail.authProvider]}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs">スタッフ数</p>
                    <p className="text-sm tabular-nums">{detail.staffCount}名</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs">状態</p>
                    <DomainStatusBadge isActive={detail.isActive} />
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs">作成者</p>
                    <p className="text-sm break-all">
                      {detailQuery.data?.createdByName ?? detail.createdBy ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs">作成日時</p>
                    <p className="text-sm">{formatDateYYYYMMDD_HHMM(detail.createdAt)}</p>
                  </div>
                </div>
              </div>

              <Separator className="-mx-6 data-horizontal:w-[calc(100%+3rem)]" />

              <DomainLinkedStaffList
                domain={domain?.domain ?? null}
                scrollRootRef={bodyScrollRef}
              />
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t px-6 py-4">
              <RoleGatedButton
                requiredPermission={Permission.DomainsDelete}
                denyTooltip="ドメインの削除権限がありません"
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive gap-1"
                onClick={() => onDeleteClick(toSummary(detail))}
              >
                <Trash2 className="size-4" />
                削除
              </RoleGatedButton>
              {/* Y-14 FR-S001: 状態切替は登録・編集とは独立した専用操作 */}
              <RoleGatedButton
                requiredPermission={Permission.DomainsEdit}
                denyTooltip="ドメインの編集権限がありません"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => onToggleActiveClick(toSummary(detail))}
              >
                {detail.isActive ? (
                  <>
                    <Ban className="size-4" />
                    無効化する
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    有効化する
                  </>
                )}
              </RoleGatedButton>
              <RoleGatedButton
                requiredPermission={Permission.DomainsEdit}
                denyTooltip="ドメインの編集権限がありません"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => onEditClick(toSummary(detail))}
              >
                <Pencil className="size-4" />
                編集
              </RoleGatedButton>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/**
 * 詳細レスポンスは `createdByName` を余分に持つだけで、それ以外は一覧行と同じ形。編集・削除
 * ダイアログには一覧行の型で渡す必要があるため、詳細で取り直した最新値だけを取り出す。
 */
function toSummary(detail: DomainMasterSummaryDto): DomainMasterSummaryDto {
  return {
    id: detail.id,
    name: detail.name,
    domain: detail.domain,
    authProvider: detail.authProvider,
    staffCount: detail.staffCount,
    activeStaffCount: detail.activeStaffCount,
    isActive: detail.isActive,
    createdBy: detail.createdBy,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  };
}
