import { Badge } from '@/components/ui/badge';

import { cn } from '@/lib/utils';

import { getRealBrandBadgeContent } from '../_constants/detail.constants';

/** Brand badge keyed by the real API's `brandEnum` (`BrandBadge` is keyed by the mock enum) */
export function RealBrandBadge({ brandEnum }: Readonly<{ brandEnum: string }>) {
  const { label, colorToken } = getRealBrandBadgeContent(brandEnum);
  const badgeClass = colorToken
    ? `bg-${colorToken}/15 text-${colorToken} border-${colorToken}/20`
    : 'bg-muted text-muted-foreground border-border';
  return (
    <Badge variant="outline" className={cn('text-[10px]', badgeClass)}>
      {label}
    </Badge>
  );
}
