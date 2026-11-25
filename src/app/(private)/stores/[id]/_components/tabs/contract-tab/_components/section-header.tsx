import type { ReactNode } from 'react';

import { Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Props = {
  /** A node, so a section whose name is domain jargon can wrap it in `JargonTip` */
  title: ReactNode;
  count: number;
  /**
   * The section's data has not arrived yet. The count badge is left out rather than reading 0件
   * before the response is in (BUG-U5-02 / BUG-U6-07).
   */
  isLoading?: boolean;
  /** The section's read failed — there is no count to give, so the badge is left out */
  isError?: boolean;
  onAdd?: () => void;
  action?: ReactNode;
};

export function SectionHeader({
  title,
  count,
  isLoading = false,
  isError = false,
  onAdd,
  action,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <h3 className="text-foreground text-base font-semibold">{title}</h3>
        {isLoading || isError ? null : (
          <Badge variant="secondary" className="text-[10px]">
            {count}件
          </Badge>
        )}
      </div>
      {action ??
        (onAdd ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={onAdd}
          >
            <Plus className="size-3.5" />
            紐づけ追加
          </Button>
        ) : null)}
    </div>
  );
}
