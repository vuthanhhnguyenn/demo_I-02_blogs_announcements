import { Card } from '@/components/ui/card';

import type { EnrollmentApplicationKpiDto } from '@/lib/api-real/types.gen';

interface MembershipApplicationsKpiCardsProps {
  kpi: EnrollmentApplicationKpiDto | undefined;
  isLoading: boolean;
  isError?: boolean;
}

/**
 * Two KPI cards read from the server-computed `kpi` (FR-004, research R3) —
 * a paginated response cannot be counted client-side. 未審査 counts status 未審査 only,
 * so the card agrees with the status column (prototype 9/8). 未成年 is not shown: mobile-app
 * validation makes it a non-issue in practice (research R8).
 *
 * BL要注意 renders `blacklistFlaggedCount` as served: the API counts flagged applications in
 * every status (verified live 2026-10-06). Accepted as-is (B16, decided 2026-10-07).
 */
export function MembershipApplicationsKpiCards({
  kpi,
  isLoading,
  isError = false,
}: Readonly<MembershipApplicationsKpiCardsProps>) {
  // A fetch error must not render as "0" — that reads as a genuinely
  // empty/clean queue (BUG-C01-08) rather than "we don't know right now".
  const showPlaceholder = isLoading || isError;
  const pending = kpi?.pendingReviewCount ?? 0;
  const blacklistAlert = kpi?.blacklistFlaggedCount ?? 0;

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* 未審査 — persistent warning border regardless of count */}
      <Card className="border-warning/50 p-4">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs">未審査</span>
          <div className="flex items-baseline gap-2">
            <span className="text-warning text-2xl font-semibold">
              {showPlaceholder ? '—' : pending}
            </span>
            <span className="text-muted-foreground text-xs">件</span>
          </div>
        </div>
      </Card>

      {/* BL要注意 — success at 0, destructive with a destructive border above 0 */}
      <Card className={`p-4 ${blacklistAlert > 0 ? 'border-destructive/50' : ''}`}>
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs">BL要注意</span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-semibold ${blacklistAlert === 0 ? 'text-success' : 'text-destructive'}`}
            >
              {showPlaceholder ? '—' : blacklistAlert}
            </span>
            <span className="text-muted-foreground text-xs">件</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
