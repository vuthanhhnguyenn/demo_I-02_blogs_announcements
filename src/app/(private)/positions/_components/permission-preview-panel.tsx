'use client';

// Client component: React Query data + accordion interaction for the preview pane
import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowUpRight, CheckCircle2, Eye, MinusCircle, Pencil } from 'lucide-react';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import {
  adminStaffPermissionControllerGetPositionOptions,
  adminStaffPermissionControllerListStaffOptions,
  adminStaffPermissionControllerPositionPermissionsOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { StaffSummaryDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';
import { cn } from '@/lib/utils';

import { Permission } from '@/types/permission.type';

import {
  CSV_CATEGORY_KEY,
  type CategoryAccessLevel,
  DESTRUCTIVE_PERMISSION_TOOLTIP,
  deriveCategoryLevel,
  isDestructivePermission,
} from '../_constants/position-permissions.constant';
import {
  POSITION_ROLE_BADGE_LABELS,
  SYSTEM_MANAGED_EDIT_TOOLTIP,
} from '../_constants/position.constants';

function PermissionLevelIcon({ level }: Readonly<{ level: CategoryAccessLevel }>) {
  switch (level) {
    case 'edit':
      return <CheckCircle2 className="text-success size-4 shrink-0" />;
    case 'view':
      return <Eye className="text-info size-4 shrink-0" />;
    default:
      return <MinusCircle className="text-muted-foreground/60 size-4 shrink-0" />;
  }
}

function permissionLevelLabel(level: CategoryAccessLevel): string {
  switch (level) {
    case 'edit':
      return '閲覧・編集';
    case 'view':
      return '閲覧のみ';
    default:
      return 'アクセス不可';
  }
}

function permissionLevelTextClass(level: CategoryAccessLevel): string {
  switch (level) {
    case 'edit':
      return 'text-success';
    case 'view':
      return 'text-info';
    default:
      return 'text-muted-foreground/60';
  }
}

const PREVIEW_STAFF_LIMIT = 3;

/** 所属表示 — 店舗スタッフは店舗名、FCスタッフはFC企業名（staff 一覧が解決済みで返す） */
function staffAffiliation(staff: StaffSummaryDto): string {
  if (staff.affiliationType === 'fc_company') return staff.fcCompanyName ?? 'FC企業';
  return staff.storeName ?? '';
}

type PermissionPreviewPanelProps = {
  positionId: string | null;
  onEdit: (id: string) => void;
};

/** 権限プレビューペイン — Y-01 FR-009 (PAR038-PAR052) */
export function PermissionPreviewPanel({
  positionId,
  onEdit,
}: Readonly<PermissionPreviewPanelProps>) {
  const enabled = positionId !== null;

  const {
    data: detail,
    isLoading: isDetailLoading,
    isError: isDetailError,
    refetch: refetchDetail,
  } = useQuery({
    ...adminStaffPermissionControllerGetPositionOptions({ path: { id: positionId ?? '' } }),
    enabled,
  });
  const {
    data: preview,
    isError: isPreviewError,
    refetch: refetchPreview,
  } = useQuery({
    ...adminStaffPermissionControllerPositionPermissionsOptions({
      path: { id: positionId ?? '' },
    }),
    enabled,
  });
  // 割当スタッフの先頭3名 (FR-008)。総数は PositionDto.staffCount が返すように
  // なったため、このクエリの pagination からは取らない (round 2 / R204)
  const { data: staffsRes, isPending: isStaffPending } = useQuery({
    ...adminStaffPermissionControllerListStaffOptions({
      query: {
        positionId: positionId ?? '',
        page: 1,
        limit: PREVIEW_STAFF_LIMIT,
        sort: 'status',
        order: 'asc',
      },
    }),
    enabled,
  });
  const visibleStaff = staffsRes?.items ?? [];

  if (positionId === null) {
    return (
      <Card className="py-0">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="bg-muted flex size-12 items-center justify-center rounded-full">
            <Eye className="text-muted-foreground size-6" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">職位を選択してください</p>
          <p className="text-muted-foreground text-xs">
            左の一覧から職位を選ぶと権限プレビューが表示されます
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isDetailError || isPreviewError) {
    return (
      <Card className="py-0">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="text-muted-foreground text-sm">職位の取得に失敗しました</p>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              if (isDetailError) void refetchDetail();
              if (isPreviewError) void refetchPreview();
            }}
          >
            再試行
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isDetailLoading || !detail || !preview) {
    return (
      <Card className="gap-0 py-0">
        <CardHeader className="px-4 py-4">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-4 py-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  const staffCount = detail.staffCount;
  const remainingStaffCount = staffCount - visibleStaff.length;
  const inactiveShownCount = visibleStaff.filter((staff) => staff.status === 'inactive').length;

  return (
    <Card className="gap-0 py-0">
      {/* Preview Header */}
      <CardHeader className="px-4 py-4">
        {/* CardHeader は grid のため、この行自体にも min-w-0 が無いと auto トラックが
            説明文の min-content まで広がり「権限を編集」ボタンがカード外へはみ出す。 */}
        <div className="flex min-w-0 items-start justify-between gap-2">
          {/* min-w-0 が無いと flex item が縮まず、区切りの無い長い職位名が
              「権限を編集」ボタンを画面外へ押し出す。wrap-anywhere で必ず折り返す
              (break-all は全角スペース「　」の連続を折り返せない)。 */}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-start gap-2">
              <p
                className="min-w-0 text-sm leading-tight font-bold wrap-anywhere"
                title={detail.name}
              >
                {detail.name}
              </p>
              <Badge variant="outline" className="shrink-0 text-xs">
                {POSITION_ROLE_BADGE_LABELS[detail.role]}
              </Badge>
            </div>
            {/* 長文の説明でヘッダーが縦に伸び続けないよう 3 行で省略し、全文は title で見せる */}
            {detail.description && (
              <p
                className="text-muted-foreground line-clamp-3 text-xs wrap-anywhere"
                title={detail.description}
              >
                {detail.description}
              </p>
            )}
          </div>
          <RoleGatedButton
            size="sm"
            className="h-8 shrink-0 text-xs"
            requiredPermission={Permission.PositionsEdit}
            disabled={detail.isSystemManaged}
            tooltip={detail.isSystemManaged ? SYSTEM_MANAGED_EDIT_TOOLTIP : undefined}
            onClick={() => onEdit(detail.id)}
          >
            <Pencil className="size-3" />
            権限を編集
          </RoleGatedButton>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-4 py-4">
        {/* カテゴリ別アクセス権限 */}
        <div>
          <p className="text-muted-foreground mb-3 text-xs font-semibold">カテゴリ別アクセス権限</p>
          <Accordion multiple className="w-full">
            {preview.categories.map((category) => {
              const level = deriveCategoryLevel(category.permissions);
              const grantedCount = category.permissions.filter(
                (permission) => permission.granted,
              ).length;
              // 重要操作の判定はサーバーの `type` 由来 (FR-007a / spec drift note)
              const hasDestructiveGranted = category.permissions.some(
                (permission) => permission.granted && isDestructivePermission(permission),
              );
              const isCsv = category.categoryKey === CSV_CATEGORY_KEY;
              // CSV出力管理カテゴリは 出力可/出力不可 表記 (FR-S001 / PAR044)
              const csvLevelText = level === 'none' ? '出力不可' : '出力可';
              const levelText = isCsv ? csvLevelText : permissionLevelLabel(level);

              return (
                <AccordionItem
                  key={category.categoryKey}
                  value={category.categoryKey}
                  className="border-b last:border-b-0"
                >
                  <AccordionTrigger className="py-2 hover:no-underline">
                    <div className="mr-2 flex min-w-0 flex-1 items-center gap-2">
                      <PermissionLevelIcon level={level} />
                      <span
                        className={cn(
                          'flex-1 text-left text-xs',
                          level === 'none' && 'text-muted-foreground/70',
                        )}
                      >
                        {category.categoryLabel}
                      </span>
                      <span className={cn('text-xs', permissionLevelTextClass(level))}>
                        {levelText}
                      </span>
                      {hasDestructiveGranted && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger render={<span className="inline-flex" />}>
                              <AlertTriangle className="text-warning size-3 shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs">{DESTRUCTIVE_PERMISSION_TOOLTIP}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <Badge
                        variant="secondary"
                        className="h-5 shrink-0 px-1 text-[10px] tabular-nums"
                      >
                        {grantedCount}/{category.permissions.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <div className="flex flex-col gap-1 pl-6">
                      {category.permissions.map((permission) => (
                        <div key={permission.permissionKey} className="flex items-center gap-2">
                          {permission.granted ? (
                            <CheckCircle2 className="text-success size-3 shrink-0" />
                          ) : (
                            <MinusCircle className="text-muted-foreground/40 size-3 shrink-0" />
                          )}
                          <span
                            className={cn(
                              'text-xs',
                              permission.granted ? 'text-foreground' : 'text-muted-foreground/60',
                            )}
                          >
                            {permission.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>

        <Separator />

        {/* 割当スタッフ */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-muted-foreground text-xs font-semibold">割当スタッフ</p>
            {staffCount > 0 && (
              <span className="text-muted-foreground text-xs tabular-nums">
                {staffCount}名
                {inactiveShownCount > 0 && (
                  <span className="text-muted-foreground ml-1 text-[11px]">
                    無効{inactiveShownCount}名
                  </span>
                )}
              </span>
            )}
          </div>
          {staffCount === 0 ? (
            <p className="text-muted-foreground text-xs">割当なし</p>
          ) : isStaffPending ? (
            // 総数は detail 由来で先に出るため、名前が届くまでは行シェイプの
            // スケルトンを出す (code-rule II)
            <div className="flex flex-col gap-0.5">
              {Array.from({ length: Math.min(staffCount, PREVIEW_STAFF_LIMIT) }, (_, index) => (
                <div
                  key={`preview-staff-skeleton-${index}`}
                  className="flex items-center gap-2 py-2"
                >
                  <Skeleton className="size-6 shrink-0 rounded-full" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2.5 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-0.5">
                {visibleStaff.map((staff) => {
                  const isInactive = staff.status === 'inactive';
                  const isInvited = staff.status === 'invited';
                  return (
                    <Link
                      key={staff.id}
                      href={navigate('/staffs/[id]', staff.id)}
                      className="group hover:bg-muted/60 -mx-2 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors"
                    >
                      <span
                        className={cn(
                          'bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium',
                          isInactive && 'opacity-60',
                        )}
                      >
                        {staff.name.trim().charAt(0) || '?'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1">
                          <span
                            className={cn(
                              'truncate text-xs font-medium',
                              isInactive ? 'text-muted-foreground' : 'text-foreground',
                            )}
                          >
                            {staff.name}
                          </span>
                          {isInactive && (
                            <Badge
                              variant="outline"
                              className="bg-muted text-muted-foreground border-border h-4 shrink-0 px-1 text-[10px] font-normal"
                            >
                              無効
                            </Badge>
                          )}
                          {isInvited && (
                            <Badge
                              variant="outline"
                              className="border-border text-muted-foreground h-4 shrink-0 px-1 text-[10px] font-normal"
                            >
                              招待中
                            </Badge>
                          )}
                        </span>
                        <span className="text-muted-foreground block truncate text-[11px]">
                          {staffAffiliation(staff)}
                        </span>
                      </span>
                      <ArrowUpRight className="text-muted-foreground/50 size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  );
                })}
              </div>
              <Link
                href={navigate('/staffs', { position: positionId })}
                className="text-primary mt-2 inline-block cursor-pointer text-xs hover:underline"
              >
                {remainingStaffCount > 0
                  ? `他 ${remainingStaffCount} 名を見る →`
                  : 'スタッフ一覧で見る →'}
              </Link>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
