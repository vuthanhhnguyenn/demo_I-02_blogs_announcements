import type { ReactNode } from 'react';

/** One read-only label / value pair of the area sheet. */
export function AreaReadRow({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="text-sm wrap-anywhere">{children}</div>
    </div>
  );
}
