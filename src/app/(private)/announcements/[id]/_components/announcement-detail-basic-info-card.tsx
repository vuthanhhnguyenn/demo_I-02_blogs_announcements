import { BlogBodyViewer } from '@/app/(private)/blogs/_components/blog-body-viewer';
import { NoticeDetailThumbnail } from '@/app/(private)/blogs/_components/notice-detail-thumbnail';
import { NOTICE_DETAIL_EMPTY_BODY } from '@/app/(private)/blogs/_constants/notice-detail.constants';
import type { NoticeDetail } from '@/app/(private)/blogs/_types/notice.type';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AnnouncementDetailBasicInfoCardProps {
  detail: NoticeDetail;
}

/** 基本情報 card: タイトル, カテゴリ, サムネイル画像, 本文 (prototype L236-L265, FR-004). */
export function AnnouncementDetailBasicInfoCard({
  detail,
}: Readonly<AnnouncementDetailBasicInfoCardProps>) {
  const body = detail.body.trim();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">基本情報</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-muted-foreground mb-1 text-xs">タイトル</p>
            <p className="text-sm font-medium wrap-anywhere">{detail.title}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">カテゴリ</p>
            {detail.categoryName ? (
              <Badge variant="outline" className="text-xs">
                {detail.categoryName}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-muted-foreground border-dashed text-xs font-normal"
              >
                未分類
              </Badge>
            )}
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">サムネイル画像</p>
            <NoticeDetailThumbnail thumbnailUrl={detail.thumbnailUrl} alt={detail.title} />
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">本文</p>
            {body ? (
              <BlogBodyViewer
                html={body}
                className="text-sm leading-relaxed [&_.ql-editor]:text-sm"
              />
            ) : (
              <p className="text-muted-foreground text-sm leading-relaxed">
                {NOTICE_DETAIL_EMPTY_BODY}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
