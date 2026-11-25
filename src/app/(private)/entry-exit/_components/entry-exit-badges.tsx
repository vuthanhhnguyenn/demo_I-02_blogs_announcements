import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { VisitMonitorActivityItemDto } from '@/lib/api-real/types.gen';

export type FrequencyBadgeTier = NonNullable<VisitMonitorActivityItemDto['badge']>['tier'];
export type CompanionRole = VisitMonitorActivityItemDto['companionBadge'];

const FREQUENCY_BADGE_CONFIG: Record<FrequencyBadgeTier, { label: string; description: string }> = {
  regular: { label: '常連', description: '月10回以上来館している常連会員です。' },
  returning: {
    label: '久しぶり',
    description: '30日以上来館がなかった会員です。お声がけで継続利用を促しましょう。',
  },
};

/** FR-S002 来館頻度バッジ（常連/久しぶり）。ラベルはブランド別に FR-S003 で変更可能。 */
export function FrequencyBadge({
  tier,
  label,
}: {
  tier: FrequencyBadgeTier;
  /** Brand-specific label from the badge threshold master; falls back to the default wording. */
  label?: string | null;
}) {
  const config = FREQUENCY_BADGE_CONFIG[tier];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Badge
              variant="outline"
              className="bg-success/15 text-success border-success/20 cursor-help"
            />
          }
        >
          {label || config.label}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs leading-relaxed">
          {config.description}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const COMPANION_BADGE_CONFIG: Record<CompanionRole, { label: string; description: string }> = {
  inviter: {
    label: '招待者',
    description: 'プレミアムプラン会員として同伴者を招待しています。',
  },
  companion: {
    label: '同伴者',
    description: 'プレミアム会員の招待で当日限り入館しているゲスト（C区分）です。',
  },
};

/** 認証拒否の行（result が denied_*）。入退館履歴の「拒否」バッジと同じ見た目。 */
export function DeniedBadge() {
  return (
    <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/20">
      拒否
    </Badge>
  );
}

/** FR-M008/M009 同伴招待の視覚識別。判定ロジックはシステム側、ここでは状態表示のみ。 */
export function CompanionBadge({ role }: { role: CompanionRole }) {
  const config = COMPANION_BADGE_CONFIG[role];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Badge variant="outline" className="bg-info/15 text-info border-info/20 cursor-help" />
          }
        >
          {config.label}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs leading-relaxed">
          {config.description}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
