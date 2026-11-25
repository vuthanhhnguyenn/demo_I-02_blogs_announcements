'use client';

import { formatDateYYYYMMDD } from '@/utils/date.util';
import type { ColumnDef } from '@tanstack/react-table';
import { Ban, CheckCircle2, MoreHorizontal, Pencil } from 'lucide-react';

import { BrandBadge, type BrandEnumValue } from '@/components/common/brand-badge';
import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { RoleGatedMenuItem } from '@/components/common/role-gated-menu-item';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { QuestionnaireListItemDto } from '@/lib/api-real/types.gen';

import { Permission, UserRole } from '@/types/permission.type';

import {
  SURVEY_REAL_STATUS_BADGE_CLASSES,
  SURVEY_REAL_STATUS_LABELS,
  SURVEY_RESPONSE_CATEGORY_BADGE_CLASSES,
  SURVEY_RESPONSE_CATEGORY_LABELS,
  type SurveyRealStatus,
  type SurveyResponseCategory,
} from '../_constants/constants';
import { collapseSurveyBrandEnums } from '../_constants/survey-brand-group';

type SurveyRow = QuestionnaireListItemDto;

interface SurveysTableColumnsProps {
  onEditClick?: (id: string) => void;
  onDisableClick?: (survey: SurveyRow) => void;
  onEnableClick?: (survey: SurveyRow) => void;
}

// G-04 L241/L160: lifecycle surveys are edited/disabled by Headquarter/System only; operational surveys
// follow the position flag (survey.create — SurveysEdit/SurveysDelete resolve to the same flag).
const LIFECYCLE_ALLOWED_ROLES = [UserRole.Headquarter, UserRole.System] as const;

function ActionsCell({
  survey,
  onEditClick,
  onDisableClick,
  onEnableClick,
}: {
  survey: SurveyRow;
  onEditClick?: (id: string) => void;
  onDisableClick?: (survey: SurveyRow) => void;
  onEnableClick?: (survey: SurveyRow) => void;
}) {
  const isOperational = survey.category === 'operational';
  const denyBadge = isOperational ? '権限なし' : '本部';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" />}
        onClick={(event) => event.stopPropagation()}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
        <RoleGatedMenuItem
          allowedRoles={isOperational ? undefined : LIFECYCLE_ALLOWED_ROLES}
          requiredPermission={isOperational ? Permission.SurveysEdit : undefined}
          denyBadge={denyBadge}
          onClick={(event) => {
            event.stopPropagation();
            onEditClick?.(survey.questionnaireId);
          }}
        >
          <Pencil className="size-4" />
          編集
        </RoleGatedMenuItem>
        <DropdownMenuSeparator />
        {/* There is no hard delete: the agreed off switch is `inactive` (qa-143), and the same PATCH turns it back on. */}
        {survey.status === 'inactive' ? (
          <RoleGatedMenuItem
            allowedRoles={isOperational ? undefined : LIFECYCLE_ALLOWED_ROLES}
            requiredPermission={isOperational ? Permission.SurveysDelete : undefined}
            denyBadge={denyBadge}
            onClick={(event) => {
              event.stopPropagation();
              onEnableClick?.(survey);
            }}
          >
            <CheckCircle2 className="size-4" />
            有効化
          </RoleGatedMenuItem>
        ) : (
          <RoleGatedMenuItem
            allowedRoles={isOperational ? undefined : LIFECYCLE_ALLOWED_ROLES}
            requiredPermission={isOperational ? Permission.SurveysDelete : undefined}
            denyBadge={denyBadge}
            className="text-destructive focus:text-destructive"
            onClick={(event) => {
              event.stopPropagation();
              onDisableClick?.(survey);
            }}
          >
            <Ban className="size-4" />
            無効化
          </RoleGatedMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SurveysTableColumns({
  onEditClick,
  onDisableClick,
  onEnableClick,
}: SurveysTableColumnsProps): ColumnDef<SurveyRow>[] {
  return [
    {
      id: 'id',
      accessorKey: 'code',
      header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
      meta: { className: 'w-[80px]' },
      cell: ({ row }) => <span className="text-muted-foreground text-xs">{row.original.code}</span>,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="アンケート名" />,
      meta: { className: 'min-w-46' },
      cell: ({ row }) => (
        <span className="block max-w-80 text-xs font-medium wrap-anywhere whitespace-normal">
          {row.original.name}
        </span>
      ),
    },
    {
      id: 'type',
      accessorKey: 'category',
      header: ({ column }) => <DataTableColumnHeader column={column} title="種別" />,
      meta: { className: 'w-[120px]' },
      cell: ({ row }) => {
        const category = row.original.category as SurveyResponseCategory;
        return (
          <Badge variant="outline" className={SURVEY_RESPONSE_CATEGORY_BADGE_CLASSES[category]}>
            {SURVEY_RESPONSE_CATEGORY_LABELS[category] ?? row.original.category}
          </Badge>
        );
      },
    },
    {
      id: 'trigger',
      accessorKey: 'triggerName',
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="発動トリガー" />,
      meta: { className: 'w-[120px]' },
      cell: ({ row }) =>
        row.original.triggerCode ? (
          <Badge variant="outline">{row.original.triggerName ?? row.original.triggerCode}</Badge>
        ) : (
          <span className="text-xs">—</span>
        ),
    },
    {
      id: 'brand',
      accessorKey: 'brandEnums',
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="ブランド" />,
      meta: { className: 'w-[100px]' },
      cell: ({ row }) =>
        row.original.brandEnums.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {collapseSurveyBrandEnums(row.original.brandEnums as BrandEnumValue[]).map((brand) => (
              <BrandBadge key={brand} brand={brand} />
            ))}
          </div>
        ) : (
          <span className="text-xs">—</span>
        ),
    },
    {
      id: 'question_count',
      accessorKey: 'questionCount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="設問数" className="justify-end" />
      ),
      meta: { className: 'w-[80px] text-right' },
      cell: ({ row }) => (
        <span className="inline-block w-full text-right text-xs">
          {row.original.questionCount}問
        </span>
      ),
    },
    {
      id: 'response_count',
      accessorKey: 'responseCount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="回答件数" className="justify-end" />
      ),
      meta: { className: 'w-[100px] text-right' },
      cell: ({ row }) => (
        <span className="inline-block w-full text-right text-xs">
          {row.original.responseCount.toLocaleString()}件
        </span>
      ),
    },
    {
      id: 'response_rate',
      accessorKey: 'responseRatePct',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="回答率" className="justify-end" />
      ),
      meta: { className: 'w-[80px] text-right' },
      cell: ({ row }) => (
        <span className="inline-block w-full text-right text-xs">
          {row.original.responseRatePct === null
            ? '—'
            : `${row.original.responseRatePct.toFixed(1)}%`}
        </span>
      ),
    },
    {
      id: 'last_response_date',
      accessorKey: 'lastAnsweredAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="最終回答日" />,
      meta: { className: 'w-[120px]' },
      cell: ({ row }) => (
        <span className="text-xs">{formatDateYYYYMMDD(row.original.lastAnsweredAt, '—')}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="状態" />,
      meta: { className: 'w-[80px]' },
      cell: ({ row }) => {
        const status = row.original.status as SurveyRealStatus;
        return (
          <Badge variant="outline" className={SURVEY_REAL_STATUS_BADGE_CLASSES[status]}>
            {SURVEY_REAL_STATUS_LABELS[status] ?? row.original.status}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: () => null,
      meta: { className: 'w-10' },
      cell: ({ row }) => (
        <ActionsCell
          survey={row.original}
          onEditClick={onEditClick}
          onDisableClick={onDisableClick}
          onEnableClick={onEnableClick}
        />
      ),
    },
  ];
}
