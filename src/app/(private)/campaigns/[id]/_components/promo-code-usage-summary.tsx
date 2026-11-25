'use client';

import { Ticket } from 'lucide-react';

interface PromoCodeUsageSummaryProps {
  issuedCount: number;
}

/** V0 campaign-detail.tsx:L860-880 の Summary Footer。 */
/** 総利用 (全コードの使用回数合計) は API-089 に集計値が無いため表示しない。 */
export function PromoCodeUsageSummary({ issuedCount }: Readonly<PromoCodeUsageSummaryProps>) {
  return (
    <div className="bg-muted/50 flex items-center gap-4 border-t px-4 py-3">
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <Ticket className="size-3" />
        発行数: <span className="text-foreground font-semibold">{issuedCount}件</span>
      </div>
    </div>
  );
}
