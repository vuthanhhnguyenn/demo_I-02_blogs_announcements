import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface NoticeDetailSkeletonProps {
  /** ブログ: separate 本文 card (default). お知らせ keeps 本文 inside 基本情報. */
  withBodyCard?: boolean;
  /** お知らせ: extra 通知到達サマリー card in the right column. */
  withReachCard?: boolean;
}

/** Loading state of the detail body: 60/40 columns matching ブログ詳細 / お知らせ詳細. */
export function NoticeDetailSkeleton({
  withBodyCard = true,
  withReachCard = false,
}: Readonly<NoticeDetailSkeletonProps>) {
  return (
    <div className="flex gap-4 px-6 py-4">
      <div className="flex w-[60%] flex-col gap-4">
        {/* 基本情報 */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-4">
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-1/2" />
          </CardContent>
        </Card>
        {/* 本文 */}
        {withBodyCard && (
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-16" />
            </CardHeader>
            <CardContent className="space-y-2 px-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        )}
        {/* 配信対象 */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-8 gap-y-4 px-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        {/* 公開設定 */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-8 gap-y-4 px-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
      <div className="flex w-[40%] flex-col gap-4">
        {/* ステータス */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-20" />
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3 px-4">
            <Skeleton className="size-20 rounded-full" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-40" />
          </CardContent>
        </Card>
        {/* WordPress連携 */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-40" />
          </CardContent>
        </Card>
        {/* 通知到達サマリー */}
        {withReachCard && (
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4 px-4">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-28" />
            </CardContent>
          </Card>
        )}
        {/* その他情報 */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-4">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
