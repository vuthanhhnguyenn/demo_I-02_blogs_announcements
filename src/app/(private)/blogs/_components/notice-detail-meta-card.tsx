import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { NoticeDetail } from '../_types/notice.type';

const EMPTY_VALUE = '—';

/** Name with its initial avatar; a missing name renders "—" without the avatar. */
function PersonValue({ name }: Readonly<{ name: string | null }>) {
  if (!name) return <p className="text-sm">{EMPTY_VALUE}</p>;

  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted flex size-6 items-center justify-center rounded-full text-[10px] font-medium">
        {name.charAt(0)}
      </div>
      <p className="text-sm">{name}</p>
    </div>
  );
}

interface NoticeDetailMetaCardProps {
  detail: NoticeDetail;
}

/** その他情報 card of ブログ詳細 / お知らせ詳細 (I-02 FR-003 editor / edit time). */
export function NoticeDetailMetaCard({ detail }: Readonly<NoticeDetailMetaCardProps>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">その他情報</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-muted-foreground mb-1 text-xs">作成日時</p>
            <p className="text-sm">{formatDateYYYYMMDD_HHMM(detail.createdAt, EMPTY_VALUE)}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">作成者</p>
            <PersonValue name={detail.createdByName} />
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">更新日時</p>
            <p className="text-sm">{formatDateYYYYMMDD_HHMM(detail.updatedAt, EMPTY_VALUE)}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">最終更新者</p>
            <PersonValue name={detail.updatedByName} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
