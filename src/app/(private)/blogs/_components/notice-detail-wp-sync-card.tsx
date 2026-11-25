import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import type { LucideIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { cn } from '@/lib/utils';

import type { NoticeDetail, NoticeWpSyncStatus } from '../_types/notice.type';

const MUTED_BADGE_CLASS = 'bg-muted text-muted-foreground border-border text-xs font-medium';

/** Per-screen copy of the card (ブログ: 同期済み / 未連携 …, お知らせ: 成功 / 未同期 …). */
export interface NoticeDetailWpSyncConfig {
  labels: Record<NoticeWpSyncStatus, string>;
  /** `null` renders the label without an icon. */
  icons: Record<NoticeWpSyncStatus, LucideIcon | null>;
  badgeClasses: Record<NoticeWpSyncStatus, string>;
  /** WEB channel off. */
  excludedLabel: string;
  /** 下書き / 公開予定: never linked yet. */
  notLinkedLabel: string;
  /** Label of the time row for a failed sync (success always reads 最終同期). */
  failedTimeLabel: string;
  notes: {
    excluded: string;
    notLinked: string;
    deleted: string;
    unpublishedSynced: string;
    /** Shown under a failed sync; none when omitted. */
    failed?: string;
  };
}

const SYNCED_TIME_LABEL = '最終同期';

type WpSyncView =
  | { kind: 'excluded' }
  | { kind: 'notLinked' }
  | { kind: 'sync'; status: NoticeWpSyncStatus; syncedAt: string | null };

/** WEB off → excluded; draft / scheduled → not linked; else the sync state. */
function getWpSyncView(detail: NoticeDetail): WpSyncView {
  if (!detail.channelWeb) return { kind: 'excluded' };
  if (detail.publishStatus === 'draft' || detail.publishStatus === 'scheduled') {
    return { kind: 'notLinked' };
  }
  return {
    kind: 'sync',
    // Never attempted (null) reads as 未同期 (blog-list Q1).
    status: detail.wordpressSync?.status ?? 'pending',
    syncedAt: detail.wordpressSync?.syncedAt ?? null,
  };
}

function getWpSyncNote(
  detail: NoticeDetail,
  view: WpSyncView,
  notes: NoticeDetailWpSyncConfig['notes'],
): string | null {
  if (view.kind === 'excluded') return notes.excluded;
  // A deleted article that was never linked has nothing on WordPress to unpublish: no note.
  if (view.kind === 'notLinked') return detail.deletedAt ? null : notes.notLinked;
  if (detail.deletedAt) return notes.deleted;
  if (view.status === 'failed') return notes.failed ?? null;
  if (detail.publishStatus === 'unpublished' && view.status === 'success') {
    return notes.unpublishedSynced;
  }
  return null;
}

function WpSyncBadge({
  view,
  config,
}: Readonly<{ view: WpSyncView; config: NoticeDetailWpSyncConfig }>) {
  if (view.kind !== 'sync') {
    return (
      <Badge variant="outline" className={MUTED_BADGE_CLASS}>
        {view.kind === 'excluded' ? config.excludedLabel : config.notLinkedLabel}
      </Badge>
    );
  }

  const Icon = config.icons[view.status];
  return (
    <Badge
      variant="outline"
      className={cn('gap-1 text-xs font-medium', config.badgeClasses[view.status])}
    >
      {Icon && <Icon className="size-3" />}
      {config.labels[view.status]}
    </Badge>
  );
}

interface NoticeDetailWpSyncCardProps {
  detail: NoticeDetail;
  config: NoticeDetailWpSyncConfig;
}

/** WordPress連携 card of ブログ詳細 / お知らせ詳細. Display-only: no 再同期 action (blog-detail Q2). */
export function NoticeDetailWpSyncCard({ detail, config }: Readonly<NoticeDetailWpSyncCardProps>) {
  const view = getWpSyncView(detail);
  const note = getWpSyncNote(detail, view, config.notes);
  // The sync state's own time, for success / failed only; hidden when null.
  const syncedAt = view.kind === 'sync' && view.status !== 'pending' ? view.syncedAt : null;
  const timeLabel =
    view.kind === 'sync' && view.status === 'failed' ? config.failedTimeLabel : SYNCED_TIME_LABEL;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">WordPress連携</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-muted-foreground mb-1 text-xs">同期ステータス</p>
            <WpSyncBadge view={view} config={config} />
          </div>
          {syncedAt && (
            <div>
              <p className="text-muted-foreground mb-1 text-xs">{timeLabel}</p>
              <p className="text-sm">{formatDateYYYYMMDD_HHMM(syncedAt)}</p>
            </div>
          )}
          {note && <p className="text-muted-foreground text-xs">{note}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
