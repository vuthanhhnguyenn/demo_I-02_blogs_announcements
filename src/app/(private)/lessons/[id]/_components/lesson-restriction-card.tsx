import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { LessonDetailDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

interface LessonRestrictionCardProps {
  detail: LessonDetailDto;
}

interface RestrictionItem {
  id: string;
  name: string;
  isActive: boolean;
}

/**
 * @param count the restriction count from `restrictionSummary` — can exceed `items` when the plan /
 *   option master was unreachable (the ids stay, only the resolved names drop out).
 */
function ContractRow({
  label,
  items,
  count,
}: {
  label: string;
  items: RestrictionItem[];
  count: number;
}) {
  const unresolvedCount = Math.max(count - items.length, 0);

  return (
    <div className="flex justify-between gap-4 py-2">
      <span className="text-muted-foreground shrink-0 text-xs">{label}</span>
      {items.length === 0 && unresolvedCount === 0 ? (
        <span className="text-sm">制限なし</span>
      ) : (
        <div className="flex flex-wrap justify-end gap-1">
          {items.map((item) => (
            <Badge
              key={item.id}
              variant="secondary"
              className={cn('text-[11px]', !item.isActive && 'text-muted-foreground')}
            >
              {item.name}
              {!item.isActive && '（無効）'}
            </Badge>
          ))}
          {unresolvedCount > 0 && (
            <Badge variant="outline" className="text-muted-foreground text-[11px]">
              他{unresolvedCount}件
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * "制限・料金" card — restricted main/option contracts (or 制限なし) and the
 * per-use fee row only when pricing is 都度有料 (FR-003-P1-04).
 */
export function LessonRestrictionCard({ detail }: LessonRestrictionCardProps) {
  // `fee` is tax-included as the API sends it (API-111 §6.9)
  const perUseFee = detail.feeType === 'per_use' ? detail.fee : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">制限・料金</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          <ContractRow
            label="制限主契約"
            items={detail.planRestrictions.map((plan) => ({
              id: plan.planId,
              name: plan.planName,
              isActive: plan.isActive,
            }))}
            count={detail.restrictionSummary.planCount}
          />
          <ContractRow
            label="制限オプション契約"
            items={detail.optionRestrictions.map((option) => ({
              id: option.optionId,
              name: option.optionName,
              isActive: option.isActive,
            }))}
            count={detail.restrictionSummary.optionCount}
          />
          {perUseFee !== null && (
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground text-xs">都度利用料金（税込）</span>
              <span className="text-sm font-semibold">¥{perUseFee.toLocaleString()}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
