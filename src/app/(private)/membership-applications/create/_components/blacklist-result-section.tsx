import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { ApplicationBlacklistDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import { isBlacklistFlagged } from '../../_utils/application-dto.util';

interface BlacklistResultSectionProps {
  readonly state: ApplicationBlacklistDto['matchResult'];
}

/**
 * B14 (decided 2026-10-07): `blacklist-precheck` requires 姓・名・生年月日・電話・メール together, so the
 * check can only run once all five are entered — not on any single key (C-01 FR-M003 OR).
 */
const NOT_CHECKED_NOTE =
  '氏名・生年月日・電話番号・メールアドレスをすべて入力すると、照合が自動実行されます。';

export function BlacklistResultSection({ state }: BlacklistResultSectionProps) {
  const matched = isBlacklistFlagged(state);
  const cfg =
    state === 'unchecked'
      ? {
          badgeClass: 'bg-warning/15 text-warning border-warning/20',
          badgeLabel: '未照合',
          description: NOT_CHECKED_NOTE,
          cardClass: '',
        }
      : matched
        ? {
            badgeClass: 'bg-destructive/15 text-destructive border-destructive/20',
            badgeLabel: '照合済み：一致あり',
            description: '申請者情報がブラックリストと一致しています。審査を慎重に行ってください。',
            cardClass: 'border-destructive/50 bg-destructive/10',
          }
        : {
            badgeClass: 'bg-success/15 text-success border-success/20',
            badgeLabel: '照合済み：該当なし',
            description: 'ブラックリストとの一致はありません。',
            cardClass: '',
          };

  return (
    <Card className={cn(cfg.cardClass)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          ブラックリスト照合結果
          <Badge variant="outline" className={cn('text-xs', cfg.badgeClass)}>
            {cfg.badgeLabel}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">{cfg.description}</p>
      </CardContent>
    </Card>
  );
}
