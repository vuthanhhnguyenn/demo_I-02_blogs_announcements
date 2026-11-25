import { formatDateYYYYMMDD, formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { Globe, Smartphone } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { NoticeDetail } from '../_types/notice.type';
import { getDisplayStatus } from '../_utils/notice-row.util';
import { NoticeDetailStatusBadge } from './notice-detail-status-badge';

interface NoticeDetailPublishCardProps {
  detail: NoticeDetail;
}

/** 公開設定 card of ブログ詳細 / お知らせ詳細. */
export function NoticeDetailPublishCard({ detail }: NoticeDetailPublishCardProps) {
  const status = getDisplayStatus(detail);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">公開設定</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <p className="text-muted-foreground mb-1 text-xs">公開ステータス</p>
            <NoticeDetailStatusBadge status={status} />
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">掲載先</p>
            <div className="flex items-center gap-2">
              {detail.channelWeb && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Globe className="size-3" />
                  WEBサイト
                </Badge>
              )}
              {detail.channelApp && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Smartphone className="size-3" />
                  モバイルアプリ
                </Badge>
              )}
            </div>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">
              {status === 'scheduled' ? '公開予定日時' : '公開日時'}
            </p>
            <p className="text-sm font-medium">
              {/* 下書き is unpublished: no publish date even if one was saved, also after deletion
                  (FR-006, V0 L316-L317) */}
              {detail.publishStatus === 'draft'
                ? '—'
                : formatDateYYYYMMDD_HHMM(detail.publishStartAt, '—')}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">掲載終了日</p>
            <p className="text-sm font-medium">{formatDateYYYYMMDD(detail.publishEndAt, '—')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
