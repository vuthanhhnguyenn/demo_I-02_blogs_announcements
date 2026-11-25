import { Construction } from 'lucide-react';

/** Centered 「この機能は準備中です」 placeholder for screens that have not shipped yet. */
export function ComingSoonPlaceholder() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
      <Construction className="text-muted-foreground/40 size-8" strokeWidth={1.5} />
      <p className="text-muted-foreground text-sm font-medium">この機能は準備中です</p>
    </main>
  );
}
