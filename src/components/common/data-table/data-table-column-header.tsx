import { ButtonProps } from '@base-ui/react';
import type { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { cn } from '@/lib/utils';

interface DataTableColumnHeaderProps<TData, TValue> extends ButtonProps {
  column: Column<TData, TValue>;
  title: string;
  /**
   * A third click (after the first direction and its flip) clears the sort (default). Pass `false`
   * for the prototype's two-state cycle (asc ⇄ desc), where the third click goes back to the first
   * direction.
   */
  clearable?: boolean;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  clearable = true,
  ...props
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  const isSorted = column.getIsSorted();
  // A column whose def sets `sortDescFirst` (e.g. a newest-first date) starts descending; read
  // straight off the def so other columns keep starting ascending regardless of their data type.
  const firstSortDesc = column.columnDef.sortDescFirst === true;

  // The cycle is first direction → the other one → cleared (or back to the first when not
  // clearable), so a desc-first column still reaches ascending before it clears.
  const isSecondDirection = isSorted === (firstSortDesc ? 'asc' : 'desc');
  const firstDirectionLabel = firstSortDesc ? 'クリックで降順ソート' : 'クリックで昇順ソート';
  const secondDirectionLabel = firstSortDesc ? 'クリックで昇順ソート' : 'クリックで降順ソート';

  function handleSortClick() {
    if (isSorted === false) {
      column.toggleSorting(firstSortDesc);
    } else if (!isSecondDirection) {
      column.toggleSorting(!firstSortDesc);
    } else if (clearable) {
      column.clearSorting();
    } else {
      column.toggleSorting(firstSortDesc);
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <Button
            variant="ghost"
            onClick={handleSortClick}
            className={cn(
              'group/sort h-auto gap-1 p-0 text-xs font-semibold hover:bg-transparent',
              className,
            )}
            {...props}
          >
            {title}
            {isSorted === 'asc' ? (
              <ArrowUp className="size-3" />
            ) : isSorted === 'desc' ? (
              <ArrowDown className="size-3" />
            ) : (
              <ArrowUpDown className="text-muted-foreground/40 group-hover/sort:text-foreground size-3 transition-colors" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">
            {isSorted === false
              ? firstDirectionLabel
              : !isSecondDirection
                ? secondDirectionLabel
                : clearable
                  ? 'クリックで解除'
                  : firstDirectionLabel}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
