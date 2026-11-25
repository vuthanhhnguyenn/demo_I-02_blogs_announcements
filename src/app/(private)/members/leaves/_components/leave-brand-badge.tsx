import { Badge } from '@/components/ui/badge';

import { BRAND_GROUP_FILTER_OPTIONS, type BrandGroupFilter } from '../../_constants/constants';
import { LEAVE_BRAND_GROUP_CLASSES } from '../_constants/constants';

/** The store's brand group, rendered as returned by the API — never derived from `brandEnum`. */
export function LeaveBrandBadge({
  brandGroup,
}: Readonly<{ brandGroup: string | null | undefined }>) {
  const known: BrandGroupFilter | undefined = BRAND_GROUP_FILTER_OPTIONS.find(
    (o) => o.value === brandGroup,
  )?.value;
  if (!brandGroup) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <Badge
      variant="outline"
      className={`text-[10px] ${known ? LEAVE_BRAND_GROUP_CLASSES[known] : 'bg-muted text-muted-foreground border-border'}`}
    >
      {brandGroup}
    </Badge>
  );
}
