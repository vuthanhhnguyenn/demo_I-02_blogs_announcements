import type { ComponentProps } from 'react';

import { Badge } from '@/components/ui/badge';

import { cn } from '@/lib/utils';

/**
 * Status badge (prototype 2026-10-02「札の統一」). Three kinds of badge only:
 * - status (coloured / grey): `<ToneBadge tone="…">`
 * - category (not a status, no colour meaning): shadcn `<Badge variant="outline">` with no colour/size classes
 * - count: a plain neutral `<ToneBadge>`
 * Keep the default Badge size (h-5 · text-xs) — `className` is for placement only.
 */
export type BadgeTone = 'success' | 'warning' | 'info' | 'destructive' | 'neutral';

const TONE: Record<BadgeTone, string> = {
  success: 'bg-success/15 text-success border-success/20',
  warning: 'bg-warning/15 text-warning border-warning/20',
  info: 'bg-info/15 text-info border-info/20',
  destructive: 'bg-destructive/15 text-destructive border-destructive/20',
  neutral: 'bg-card text-muted-foreground border-border',
};

const DOT: Record<BadgeTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-info',
  destructive: 'bg-destructive',
  neutral: 'bg-muted-foreground',
};

type ToneBadgeProps = Omit<ComponentProps<typeof Badge>, 'variant'> & {
  tone: BadgeTone;
  /** Only next to a detail page title; never in table columns or body fields. */
  dot?: boolean;
};

export function ToneBadge({ tone, dot, className, children, ...props }: ToneBadgeProps) {
  return (
    <Badge variant="outline" className={cn(TONE[tone], className)} {...props}>
      {dot && <span aria-hidden className={cn('size-1.5 rounded-full', DOT[tone])} />}
      {children}
    </Badge>
  );
}
