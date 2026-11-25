import { Badge } from '@/components/ui/badge';

import type { OptionListItemDto } from '@/lib/api-real/types.gen';
import { Brand } from '@/lib/api/types.gen';

/** The real API's `brandEnum` — the same five brands as the mock `Brand`, spelt in PascalCase. */
export type BrandEnumValue = OptionListItemDto['brandEnum'];

export const BRAND_LABELS: Record<Brand, string> = {
  [Brand.JOYFIT]: 'JOYFIT',
  [Brand.FIT365]: 'FIT365',
  [Brand.JOYFIT_PLUS]: 'JOYFIT+',
  [Brand.JOYFIT_YOGA]: 'JOYFIT YOGA',
  [Brand.JOYFIT24]: 'JOYFIT24',
};

export const BRAND_ENUM_LABELS: Record<BrandEnumValue, string> = {
  Joyfit: 'JOYFIT',
  Fit365: 'FIT365',
  JoyfitPlus: 'JOYFIT+',
  JoyfitYoga: 'JOYFIT YOGA',
  Joyfit24: 'JOYFIT24',
};

export const BRAND_COLOR_MAP: Record<Brand, string> = {
  [Brand.JOYFIT]: 'primary',
  [Brand.FIT365]: 'destructive',
  [Brand.JOYFIT_PLUS]: 'warning',
  [Brand.JOYFIT_YOGA]: 'success',
  [Brand.JOYFIT24]: 'info',
};

const BRAND_ENUM_COLOR_MAP: Record<BrandEnumValue, string> = {
  Joyfit: 'primary',
  Fit365: 'destructive',
  JoyfitPlus: 'warning',
  JoyfitYoga: 'success',
  Joyfit24: 'info',
};

// The two spellings never collide (`joyfit24` vs `Joyfit24`), so one lookup serves both.
const LABELS: Record<Brand | BrandEnumValue, string> = { ...BRAND_LABELS, ...BRAND_ENUM_LABELS };
const COLORS: Record<Brand | BrandEnumValue, string> = {
  ...BRAND_COLOR_MAP,
  ...BRAND_ENUM_COLOR_MAP,
};

interface BrandBadgeProps {
  brand: Brand | BrandEnumValue;
  className?: string;
}
export function BrandBadge({ brand, className = '' }: BrandBadgeProps) {
  const token = COLORS[brand];
  const badgeClass = token
    ? `bg-${token}/15 text-${token} border-${token}/20`
    : 'bg-muted text-muted-foreground border-border';
  // An unmapped brand gets a neutral mark, never another brand's name.
  const label = LABELS[brand] || '—';
  return (
    <Badge variant="outline" className={`${badgeClass} ${className}`}>
      {label}
    </Badge>
  );
}
