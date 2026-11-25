import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { NOTICE_BRAND_LABELS, NOTICE_SCOPE_LABELS } from '../_constants/notice.constants';
import type { NoticeDetail } from '../_types/notice.type';
import { getTargetBrandCodes } from '../_utils/notice-row.util';

interface NoticeDetailTargetCardProps {
  detail: NoticeDetail;
}

/** 配信対象 card of ブログ詳細 / お知らせ詳細. */
export function NoticeDetailTargetCard({ detail }: NoticeDetailTargetCardProps) {
  const brandCodes = getTargetBrandCodes(detail);
  const storeLabel =
    detail.brandScope === 'store' && detail.targetStores.length > 0
      ? detail.targetStores.map((store) => store.name).join('・')
      : '全店舗';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">配信対象</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <p className="text-muted-foreground mb-1 text-xs">配信スコープ</p>
            <Badge variant="secondary" className="text-xs">
              {NOTICE_SCOPE_LABELS[detail.brandScope]}
            </Badge>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">対象ブランド</p>
            {brandCodes.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1">
                {brandCodes.map((code) => (
                  <Badge key={code} variant="outline" className="text-xs">
                    {NOTICE_BRAND_LABELS[code]}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">全ブランド</p>
            )}
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">対象店舗</p>
            <p className="text-muted-foreground text-sm wrap-anywhere">{storeLabel}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
