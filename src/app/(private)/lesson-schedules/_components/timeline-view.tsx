'use client';

import { CalendarX, Clock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

import type {
  LessonScheduleDashboardAlertItemDto,
  LessonScheduleListItemDto,
} from '@/lib/api-real/types.gen';

import { getScheduleStatus } from '../_utils/lesson-schedule-api.util';
import { LessonScheduleTimelineSkeleton } from './lesson-schedule-skeletons';
import { TimelineItem } from './timeline-item';

function CurrentTimeIndicator() {
  const now = new Date();
  // JST, like getScheduleStatus — the browser's own zone put the label off the line (CRM UT D-01 No16).
  const label = now.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo',
  });
  return (
    <div className="flex items-center px-2 py-2">
      <div className="w-16 shrink-0" />
      <Badge
        variant="secondary"
        className="bg-destructive text-destructive-foreground h-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
      >
        現在 {label}
      </Badge>
      <div className="border-destructive ml-2 flex-1 border-t border-dashed" />
    </div>
  );
}

interface TimelineViewProps {
  schedules: LessonScheduleListItemDto[];
  /** 要対応 alerts of the day, keyed by scheduleId (store dashboard) */
  alertsById?: ReadonlyMap<string, LessonScheduleDashboardAlertItemDto>;
  isLoading?: boolean;
  showBookedMembers?: boolean;
  onScheduleClick?: (item: LessonScheduleListItemDto) => void;
  onEditClick?: (item: LessonScheduleListItemDto) => void;
  canEdit?: boolean;
}

export function TimelineView({
  schedules,
  alertsById,
  isLoading = false,
  showBookedMembers = false,
  onScheduleClick,
  onEditClick,
  canEdit = false,
}: TimelineViewProps) {
  if (isLoading) {
    return <LessonScheduleTimelineSkeleton />;
  }

  const alertCount = schedules.filter((s) => alertsById?.has(s.id)).length;
  // Find insertion point for current-time indicator: first non-completed item
  const currentTimeIndex = schedules.findIndex((s) => {
    const status = getScheduleStatus(s);
    return status === 'in_progress' || status === 'scheduled';
  });

  return (
    <Card className="flex h-[560px] shrink-0 flex-col gap-0 overflow-hidden py-0">
      {/* Card header */}
      <div className="bg-muted/50 flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock className="text-muted-foreground size-4" />
          <span className="text-sm font-semibold">
            {showBookedMembers ? '担当レッスン' : 'レッスンタイムライン'}
          </span>
          <Badge variant="secondary" className="h-auto px-1 py-0 text-[10px]">
            {schedules.length}件
          </Badge>
          {alertCount > 0 && (
            <Badge
              variant="secondary"
              className="bg-destructive/15 text-destructive h-auto px-1 py-0 text-[10px]"
            >
              要対応 {alertCount}件
            </Badge>
          )}
        </div>
        <div className="text-muted-foreground flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1">
            <span className="bg-info h-3 w-1 rounded-sm" />
            スタジオ
          </span>
          <span className="flex items-center gap-1">
            <span className="bg-success h-3 w-1 rounded-sm" />
            パーソナル
          </span>
        </div>
      </div>

      {/* Timeline body */}
      <CardContent className="min-h-0 flex-1 overflow-auto p-0">
        {schedules.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 py-12">
            <CalendarX className="text-muted-foreground size-10" />
            <p className="text-muted-foreground text-sm">この日はレッスンがありません</p>
          </div>
        ) : (
          <div className="px-2">
            {schedules.map((item, i) => (
              <div key={item.id}>
                {i === currentTimeIndex && currentTimeIndex > 0 && <CurrentTimeIndicator />}
                <TimelineItem
                  item={item}
                  alert={alertsById?.get(item.id)}
                  isLast={i === schedules.length - 1}
                  showBookedMembers={showBookedMembers}
                  onScheduleClick={onScheduleClick}
                  onEditClick={onEditClick}
                  canEdit={canEdit}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
