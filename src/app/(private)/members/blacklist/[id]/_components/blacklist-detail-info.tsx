import { formatDateYYYYMMDD, formatDateYYYYMMDD_HHMM } from '@/utils/date.util';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import {
  BLACKLIST_SOURCE_LABEL,
  type BlacklistDetail,
  formatBlacklistReasons,
  getBlacklistSourceBadgeClass,
} from '../../_constants/blacklist.constants';

interface BlacklistDetailInfoProps {
  blacklist: BlacklistDetail;
}

function InfoRow({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="text-sm">{children}</div>
    </div>
  );
}

/**
 * FR-058 — 登録経路 / 登録理由 / 登録日 / 登録者, plus メモ across both columns. The path
 * (how the entry was created) and the reason (why) are separate items, as on the list.
 *
 * Member identity is deliberately absent: it lives in the head-up card above, so
 * repeating 会員ID / 氏名 / 店舗名 here would duplicate it. V0 does the same.
 */
export function BlacklistDetailInfo({ blacklist }: Readonly<BlacklistDetailInfoProps>) {
  const isReleased = !blacklist.isActive;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">登録情報</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <InfoRow label="登録経路">
            <Badge
              variant="outline"
              className={`text-[10px] ${getBlacklistSourceBadgeClass(blacklist.source)}`}
            >
              {BLACKLIST_SOURCE_LABEL[blacklist.source]}
            </Badge>
          </InfoRow>
          <InfoRow label="登録理由">
            <span className="font-medium">
              {formatBlacklistReasons(blacklist.reasonCategories)}
            </span>
          </InfoRow>
          <InfoRow label="登録日">
            <span className="font-medium">{formatDateYYYYMMDD(blacklist.registeredAt, '—')}</span>
          </InfoRow>
          <InfoRow label="登録者">
            <span className="font-medium">{blacklist.registeredBy?.displayName ?? '—'}</span>
          </InfoRow>

          {/**
           * FR-069b — a released entry has to say who released it and when. Without this
           * the release facts the contract retains for audit would be invisible, and the
           * only route to a released entry is its own URL (FR-069a).
           */}
          {isReleased && (
            <>
              <InfoRow label="解除日時">
                <span className="font-medium">
                  {formatDateYYYYMMDD_HHMM(blacklist.removedAt, '—')}
                </span>
              </InfoRow>
              <InfoRow label="解除者">
                <span className="font-medium">{blacklist.removedBy?.displayName ?? '—'}</span>
              </InfoRow>
            </>
          )}

          <div className="col-span-2">
            <InfoRow label="メモ">
              {/* v0.4 — `reason` carries the screen's メモ (registration `memo` is stored in it). */}
              <span className="text-sm [overflow-wrap:anywhere]">{blacklist.reason || '—'}</span>
            </InfoRow>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
