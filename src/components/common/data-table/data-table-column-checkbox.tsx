import { ButtonProps } from '@base-ui/react';
import type { Row } from '@tanstack/react-table';

import { Checkbox } from '@/components/ui/checkbox';

import { cn } from '@/lib/utils';

interface DataTableColumnCheckboxProps<TData> extends ButtonProps {
  row: Row<TData>;
  /**
   * Accessible name for this row's checkbox — pass the row's own label (e.g. "select <store name>")
   * so a screen reader announces which record is being selected. Falls back to a generic name.
   */
  title?: string;
}

export function DataTableColumnCheckbox<TData>({
  row,
  title,
  className,
}: DataTableColumnCheckboxProps<TData>) {
  return (
    <div className={cn('w-8 px-2', className)} onClick={(e) => e.stopPropagation()}>
      <Checkbox
        checked={row.getIsSelected()}
        aria-label={title ?? 'select row'}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        className="translate-y-0.5"
      />
    </div>
  );
}
