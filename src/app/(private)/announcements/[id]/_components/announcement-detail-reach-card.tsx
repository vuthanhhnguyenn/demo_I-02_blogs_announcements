import type { NoticeDetail } from '@/app/(private)/blogs/_types/notice.type';
import { Clock } from 'lucide-react';

import { Empty } from '@/components/common/data-state-boundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { ANNOUNCEMENT_REACH_COPY as COPY } from '../_constants/announcement-detail.constants';

function Figure({ label, value, unit }: Readonly<{ label: string; value: string; unit: string }>) {
  return (
    <div>
      <p className="text-muted-foreground mb-1 text-xs">{label}</p>
      <p className="text-xl font-semibold">
        {value}
        <span className="text-muted-foreground ml-1 text-sm font-normal">{unit}</span>
      </p>
    </div>
  );
}

interface AnnouncementDetailReachCardProps {
  detail: NoticeDetail;
}

/**
 * 通知到達サマリー (prototype L529-L565, FR-009). Decided by the publish state, also after deletion:
 * never published (下書き / 公開予定) → "公開後に集計されます"; published at least once → the figures
 * recorded at publish time, or "集計データがありません" (gap AD-01).
 */
export function AnnouncementDetailReachCard({
  detail,
}: Readonly<AnnouncementDetailReachCardProps>) {
  const { publishStatus, notificationSummary: summary } = detail;
  const isPrePublish = publishStatus === 'draft' || publishStatus === 'scheduled';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{COPY.title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        {isPrePublish && (
          <Empty
            variant="empty"
            icon={Clock}
            title={COPY.pendingTitle}
            description={
              publishStatus === 'scheduled' ? COPY.scheduledDescription : COPY.draftDescription
            }
          />
        )}
        {!isPrePublish && !summary && (
          <p className="text-muted-foreground text-sm">{COPY.noData}</p>
        )}
        {!isPrePublish && summary && (
          <div className="flex flex-col gap-4">
            <Figure
              label={COPY.targetLabel}
              value={summary.targetCount.toLocaleString('ja-JP')}
              unit={COPY.personUnit}
            />
            <Figure
              label={COPY.notifiedLabel}
              value={summary.notifiedCount.toLocaleString('ja-JP')}
              unit={COPY.personUnit}
            />
            <Figure
              label={COPY.rateLabel}
              value={summary.deliveryRate.toFixed(1)}
              unit={COPY.rateUnit}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
