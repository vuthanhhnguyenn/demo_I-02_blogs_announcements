import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { NoticeDetailThumbnail } from '../../_components/notice-detail-thumbnail';
import type { BlogDetail } from '../../_types/blog.type';

interface BlogDetailBasicInfoCardProps {
  detail: BlogDetail;
}

/** 基本情報 card (PAR011; no 種別 field — PAR012). */
export function BlogDetailBasicInfoCard({ detail }: BlogDetailBasicInfoCardProps) {
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
        </div>
      </CardContent>
    </Card>
  );
}
