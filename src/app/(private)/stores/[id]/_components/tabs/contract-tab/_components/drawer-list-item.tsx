import { Checkbox } from '@/components/ui/checkbox';

import { cn } from '@/lib/utils';

import type { MasterSource } from '../contract-tab.data';
import { PlanOriginBadge } from './plan-origin-badge';

type Props = {
  selected: boolean;
  onToggle: () => void;
  name: string;
  subText: string;
  /** Plans only (区分 badge); options carry no origin, so they omit it (D18) */
  source?: MasterSource;
};

export function DrawerListItem({ selected, onToggle, name, subText, source }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'border-border bg-card flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors',
        selected && 'border-primary bg-primary/5',
      )}
    >
      <Checkbox checked={selected} onCheckedChange={onToggle} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        {/* The name wraps (even an unbroken token) and the 区分 badge stays beside it rather than
            dropping to its own line (BUG-U5-11 / BUG-U5-13) */}
        <div className="flex items-start gap-2">
          <p className="text-foreground min-w-0 flex-1 text-sm font-medium [overflow-wrap:anywhere]">
            {name}
          </p>
          {source ? (
            <span className="mt-0.5 inline-flex shrink-0">
              <PlanOriginBadge source={source} />
            </span>
          ) : null}
        </div>
        <p className="text-muted-foreground mt-1 text-xs [overflow-wrap:anywhere]">{subText}</p>
      </div>
    </button>
  );
}
