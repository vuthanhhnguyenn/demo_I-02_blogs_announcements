import { Badge } from '@/components/ui/badge';

interface BrandStatusBadgeProps {
  status: 'active' | 'inactive';
  showDot?: boolean;
}

const BRAND_STATUS_LABELS: Record<BrandStatusBadgeProps['status'], string> = {
  active: '有効',
  inactive: '無効',
};

const BRAND_STATUS_CLASSES: Record<BrandStatusBadgeProps['status'], string> = {
  active: 'border-success/20 bg-success/15 text-success',
  // Grey, as in the prototype: an inactive fee master is paused, not in error.
  inactive: 'border-border bg-muted text-muted-foreground',
};

export function BrandStatusBadge({ status, showDot = true }: BrandStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`h-5 gap-1 rounded-full px-2 py-0 text-[10px] font-medium ${BRAND_STATUS_CLASSES[status]}`}
    >
      {showDot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {BRAND_STATUS_LABELS[status]}
    </Badge>
  );
}
