import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { LessonDetailDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import {
  FEE_TYPE_LABELS,
  LESSON_BRAND_BADGE_CLASSES,
  LESSON_BRAND_LABELS,
  TAB_BY_LESSON_TYPE,
} from '../../_utils/lesson-api.util';
import {
  LESSON_DETAIL_STATUS_LABELS,
  LESSON_TYPE_BADGE_LABELS,
  getTimeRowLabel,
} from '../_constants/constants';

interface LessonBasicInfoCardProps {
  detail: LessonDetailDto;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <span className="text-muted-foreground shrink-0 text-xs">{label}</span>
      <span className="min-w-0 text-right text-sm break-all">{value}</span>
    </div>
  );
}

/**
 * "基本情報" card: ID / type / brand / time (実施 or セッション) / pricing (FR-003-P1-03). Gender
 * restriction is intentionally not shown (spec 008 Clarifications 2026-06-26).
 */
export function LessonBasicInfoCard({ detail }: LessonBasicInfoCardProps) {
  const lessonTab = TAB_BY_LESSON_TYPE[detail.lessonType];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">基本情報</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          <InfoRow label="ID" value={detail.id} />
          <InfoRow label="レッスン種別" value={LESSON_TYPE_BADGE_LABELS[lessonTab]} />
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground text-xs">ブランド</span>
            <Badge
              variant="outline"
              className={cn('text-[10px]', LESSON_BRAND_BADGE_CLASSES[detail.brand])}
            >
              {LESSON_BRAND_LABELS[detail.brand]}
            </Badge>
          </div>
          <InfoRow label={getTimeRowLabel(lessonTab)} value={`${detail.durationMinutes}分`} />
          <InfoRow label="料金種別" value={FEE_TYPE_LABELS[detail.feeType]} />
          <InfoRow
            label="ステータス"
            value={LESSON_DETAIL_STATUS_LABELS[detail.isActive ? 'active' : 'inactive']}
          />
        </div>
      </CardContent>
    </Card>
  );
}
