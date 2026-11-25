'use client';

import { Label } from '@/components/ui/label';

export function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      {/* wrap-anywhere: an unbroken value (e.g. a 100-char token) wraps inside its grid cell
          instead of widening the cell past the card edge. */}
      <span className={`text-sm wrap-anywhere ${mono ? 'font-mono' : ''}`}>{value ?? '―'}</span>
    </div>
  );
}
