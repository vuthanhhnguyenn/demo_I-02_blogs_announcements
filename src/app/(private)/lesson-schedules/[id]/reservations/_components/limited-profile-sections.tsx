'use client';

import { formatDateMDWeekday } from '@/utils/date.util';

import { Badge } from '@/components/ui/badge';

import type {
  AdminLimitedLessonHistoryItemDto,
  LimitedMemberProfileResponseDto,
} from '@/lib/api-real/types.gen';

import { MEMBER_SEX_LABELS } from '../_constants/booking-status.constants';

/** 「30歳・女性」 from the limited profile; '' when neither is known. */
export function formatAgeSex(
  profile: Pick<LimitedMemberProfileResponseDto, 'age' | 'sex'>,
): string {
  return [
    profile.age != null ? `${profile.age}歳` : null,
    profile.sex && MEMBER_SEX_LABELS[profile.sex],
  ]
    .filter(Boolean)
    .join('・');
}

/** 来館頻度 / 最終来館 — decision D12: 直近30日 N回 from `visitsLast30Days`. */
export function VisitStats({ profile }: { profile: LimitedMemberProfileResponseDto }) {
  const frequency = profile.visitFrequency;
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="bg-muted/50 rounded p-2">
        <p className="text-muted-foreground text-[10px]">来館頻度</p>
        <p className="text-xs font-medium">
          {frequency ? `直近30日 ${frequency.visitsLast30Days}回` : '—'}
        </p>
      </div>
      <div className="bg-muted/50 rounded p-2">
        <p className="text-muted-foreground text-[10px]">最終来館</p>
        <p className="text-xs font-medium">
          {frequency?.lastVisitAt ? formatDateMDWeekday(frequency.lastVisitAt) : '—'}
        </p>
      </div>
    </div>
  );
}

/** レッスン履歴 badge per booking status — short labels like the attendance column (D01A-09). */
const HISTORY_STATUS_BADGE: Record<
  AdminLimitedLessonHistoryItemDto['status'],
  { label: string; className: string }
> = {
  attended: { label: '出席', className: 'bg-success/10 text-success border-success/20' },
  no_show: {
    label: '無断欠席',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  reserved: { label: '予約済', className: 'bg-info/10 text-info border-info/20' },
  pending: { label: '仮予約', className: 'bg-warning/10 text-warning border-warning/20' },
  cancelled_by_member: {
    label: 'キャンセル済',
    className: 'bg-muted text-muted-foreground border-border',
  },
  cancelled_by_staff: {
    label: 'キャンセル済',
    className: 'bg-muted text-muted-foreground border-border',
  },
  cancelled_by_trainer: {
    label: 'キャンセル済',
    className: 'bg-muted text-muted-foreground border-border',
  },
};

/** レッスン履歴（自分担当分） — one row per past session with its booking status. */
export function LessonHistoryList({ profile }: { profile: LimitedMemberProfileResponseDto }) {
  return (
    <div>
      <p className="text-muted-foreground mb-1 text-[10px]">レッスン履歴（自分担当分）</p>
      {/* The section stays visible when empty so the reader can tell "no history" from "not loaded" (BUG-D01A-05). */}
      {profile.lessonHistorySelf.length === 0 && (
        <p className="text-muted-foreground text-xs">レッスン履歴はありません</p>
      )}
      <div className="space-y-1">
        {profile.lessonHistorySelf.map((h, i) => {
          const badge = HISTORY_STATUS_BADGE[h.status];
          return (
            <div
              key={`${h.scheduledDate}-${i}`}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-muted-foreground">
                {formatDateMDWeekday(h.scheduledDate, h.scheduledDate)} {h.lessonName ?? '—'}
              </span>
              <Badge variant="outline" className={`${badge.className} text-[10px]`}>
                {badge.label}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatMetric(value: number | null, unit: string): string {
  return value != null ? `${value}${unit}` : '—';
}

/** ボディデータ — hidden without consent / data; the caller decides on the heading. */
export function BodyDataGrid({ profile }: { profile: LimitedMemberProfileResponseDto }) {
  if (!profile.hasBodyDataConsent) {
    return <p className="text-muted-foreground/70 text-[10px]">ボディデータ: 本人の同意なし</p>;
  }
  const body = profile.bodyData;
  if (!body) return null;
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="bg-muted/50 rounded p-2">
        <p className="text-muted-foreground text-[10px]">身長</p>
        <p className="text-xs font-medium">{formatMetric(body.heightCm, 'cm')}</p>
      </div>
      <div className="bg-muted/50 rounded p-2">
        <p className="text-muted-foreground text-[10px]">体重</p>
        <p className="text-xs font-medium">{formatMetric(body.weightKg, 'kg')}</p>
      </div>
      <div className="bg-muted/50 rounded p-2">
        <p className="text-muted-foreground text-[10px]">体脂肪率</p>
        <p className="text-xs font-medium">{formatMetric(body.bodyFatPercent, '%')}</p>
      </div>
    </div>
  );
}

export function ProfileAvatar({
  profile,
  fallbackName,
  className,
}: {
  profile: LimitedMemberProfileResponseDto | undefined;
  fallbackName: string;
  className: string;
}) {
  if (profile?.facePhotoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={profile.facePhotoUrl} alt="" className={`${className} object-cover`} />;
  }
  return (
    <div
      className={`bg-muted text-muted-foreground flex items-center justify-center font-bold ${className}`}
    >
      {fallbackName.charAt(0)}
    </div>
  );
}
