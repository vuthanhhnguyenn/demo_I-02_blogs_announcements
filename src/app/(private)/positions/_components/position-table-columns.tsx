'use client';

// Client component: rows are interactive (click-to-select, propagation-safe action cell)
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';

import type { PositionListItemDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import { POSITION_ROLE_BADGE_LABELS } from '../_constants/position.constants';

export function PositionTableHeaderRow() {
  return (
    <TableRow className="bg-muted/50">
      <TableHead className="bg-muted/50 sticky top-0 z-10 w-[220px] min-w-[200px] text-xs font-semibold">
        職位名
      </TableHead>
      <TableHead className="bg-muted/50 sticky top-0 z-10 w-[110px] text-xs font-semibold">
        対象ロール
      </TableHead>
      <TableHead className="bg-muted/50 sticky top-0 z-10 w-[120px] text-xs font-semibold">
        アクセス権限数
      </TableHead>
      <TableHead className="bg-muted/50 sticky top-0 z-10 w-[100px] text-xs font-semibold">
        割当スタッフ
      </TableHead>
      <TableHead className="bg-muted/50 sticky top-0 z-10 w-10 text-xs font-semibold" />
    </TableRow>
  );
}

type PositionTableRowProps = {
  position: PositionListItemDto;
  isSelected: boolean;
  onToggleSelect: () => void;
  /** Select without toggle-deselect (割当スタッフ count link — PAR019) */
  onSelect: () => void;
  /** Row action menu slot (⋯) */
  actions: ReactNode;
};

export function PositionTableRow({
  position,
  isSelected,
  onToggleSelect,
  onSelect,
  actions,
}: PositionTableRowProps) {
  return (
    <TableRow
      className={cn('hover:bg-muted/50 cursor-pointer', isSelected && 'bg-primary/10')}
      onClick={onToggleSelect}
    >
      {/* 長い職位名で他カラムを押し出さないよう、この列だけ幅を固定して省略表示する。
          全文は title 属性（ホバー）で読める。 */}
      <TableCell className="max-w-[220px]">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-xs font-medium" title={position.name}>
            {position.name}
          </span>
          {position.description && (
            <span
              className="text-muted-foreground truncate text-[10px]"
              title={position.description}
            >
              {position.description}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {POSITION_ROLE_BADGE_LABELS[position.role]}
        </Badge>
      </TableCell>
      <TableCell>
        <span className="text-xs tabular-nums">
          <span className="font-semibold">{position.grantedCategoryCount}</span>
          <span className="text-muted-foreground"> / {position.totalCategoryCount}</span>
        </span>
      </TableCell>
      <TableCell>
        {position.staffCount > 0 ? (
          <button
            type="button"
            className="text-primary text-xs tabular-nums hover:underline"
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
            }}
          >
            {position.staffCount}名
          </button>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </TableCell>
      <TableCell onClick={(event) => event.stopPropagation()}>{actions}</TableCell>
    </TableRow>
  );
}
