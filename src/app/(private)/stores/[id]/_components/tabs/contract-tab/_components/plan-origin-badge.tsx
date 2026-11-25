import { Building2, Store } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

import { cn } from '@/lib/utils';

import { MASTER_SOURCE_META, type MasterSource } from '../contract-tab.data';

/** 区分 badge shared by the 主契約プラン table and its link drawer (FR-031a / FR-033) */
export function PlanOriginBadge({ source }: { source: MasterSource }) {
  const Icon = source === 'hq' ? Building2 : Store;
  return (
    <Badge
      variant="outline"
      className={cn(
        'h-4 shrink-0 gap-0.5 px-1 py-0 text-[10px] font-medium',
        MASTER_SOURCE_META[source].className,
      )}
    >
      <Icon className="size-2.5" aria-hidden />
      {MASTER_SOURCE_META[source].label}
    </Badge>
  );
}
