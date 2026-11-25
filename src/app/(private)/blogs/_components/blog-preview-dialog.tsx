'use client';
// Client component: controlled Dialog + interactive Tabs (PC / モバイル) need client state.
import Image from 'next/image';

import { formatDateYYYYMMDD, formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { ImageIcon, Monitor, Smartphone } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import type { GetCrmNoticesResponse } from '@/lib/api/types.gen';
import { cn } from '@/lib/utils';

import { BlogBodyViewer } from './blog-body-viewer';

/**
 * `body` / `thumbnailUrl` are optional: without them the placeholder copy / image icon is shown.
 */
export type BlogPreviewArticle = Pick<
  GetCrmNoticesResponse['items'][number],
  'id' | 'title' | 'categoryName' | 'publishStartAt'
> & { body?: string | null; thumbnailUrl?: string | null };

interface BlogPreviewDialogProps {
  /** Article to preview; null closes the dialog. */
  article: BlogPreviewArticle | null;
  onOpenChange: (open: boolean) => void;
  /** Date line: `list` = date + time; `detail` = "YYYY/MM/DD 公開" (detail prototype L595 / L648). */
  dateFormat?: 'list' | 'detail';
}

function formatPublishedAt(
  publishStartAt: string | null | undefined,
  dateFormat: 'list' | 'detail',
) {
  if (dateFormat === 'list') return formatDateYYYYMMDD_HHMM(publishStartAt, '未公開');
  const date = formatDateYYYYMMDD(publishStartAt, '');
  return date ? `${date} 公開` : '未公開';
}

/** 16:9 image area: the thumbnail when there is one, else the placeholder icon. */
function PreviewThumbnail({
  thumbnailUrl,
  sizes,
  className,
  iconClassName,
}: {
  thumbnailUrl: string | null | undefined;
  sizes: string;
  className: string;
  iconClassName: string;
}) {
  return (
    <div
      className={cn(
        'bg-muted relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border',
        className,
      )}
    >
      {thumbnailUrl ? (
        <Image
          src={thumbnailUrl}
          alt="サムネイル"
          fill
          sizes={sizes}
          unoptimized
          className="object-cover"
        />
      ) : (
        <ImageIcon className={cn('text-muted-foreground/40', iconClassName)} />
      )}
    </div>
  );
}

/** Category badge; a null category reads 未分類 like the detail 基本情報 card. */
function PreviewCategoryBadge({
  categoryName,
  className,
}: {
  categoryName: string | null | undefined;
  className: string;
}) {
  return categoryName ? (
    <Badge variant="outline" className={className}>
      {categoryName}
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className={cn('text-muted-foreground border-dashed font-normal', className)}
    >
      未分類
    </Badge>
  );
}

export function BlogPreviewDialog({
  article,
  onOpenChange,
  dateFormat = 'list',
}: BlogPreviewDialogProps) {
  const publishedAt = formatPublishedAt(article?.publishStartAt, dateFormat);
  const body = article?.body?.trim() ?? '';

  return (
    <Dialog open={article !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>プレビュー</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="pc">
          <TabsList>
            <TabsTrigger value="pc" className="gap-1">
              <Monitor className="size-4" />
              PC
            </TabsTrigger>
            <TabsTrigger value="mobile" className="gap-1">
              <Smartphone className="size-4" />
              モバイル
            </TabsTrigger>
          </TabsList>

          {/* PC Preview */}
          <TabsContent value="pc" className="mt-4">
            <div className="bg-background overflow-hidden rounded-lg border shadow-lg">
              <div className="bg-muted/50 flex items-center gap-2 border-b px-4 py-2">
                <div className="flex items-center gap-1">
                  <div className="bg-foreground/20 size-2.5 rounded-full" />
                  <div className="bg-foreground/20 size-2.5 rounded-full" />
                  <div className="bg-foreground/20 size-2.5 rounded-full" />
                </div>
                <div className="mx-8 flex-1">
                  <div className="bg-muted flex h-6 items-center rounded px-3">
                    <span className="text-muted-foreground text-[10px]">
                      https://www.joyfit.jp/blog/{article?.id}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-8">
                <div className="mx-auto max-w-[720px]">
                  <PreviewCategoryBadge
                    categoryName={article?.categoryName}
                    className="mb-3 text-[10px]"
                  />
                  <h3 className="mb-2 text-lg font-bold">{article?.title}</h3>
                  <div className="text-muted-foreground mb-6 flex items-center gap-3 text-xs">
                    <span>{publishedAt}</span>
                  </div>
                  <PreviewThumbnail
                    thumbnailUrl={article?.thumbnailUrl}
                    sizes="720px"
                    className="mb-6"
                    iconClassName="size-12"
                  />
                  {body ? (
                    <BlogBodyViewer html={body} className="[&_.ql-editor]:text-sm" />
                  ) : (
                    <div className="text-muted-foreground text-sm leading-relaxed">
                      <p>記事の本文がここに表示されます...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <p className="text-muted-foreground mt-4 text-center text-xs">
              ※ 実際のWEBサイト表示と異なる場合があります
            </p>
          </TabsContent>

          {/* Mobile Preview */}
          <TabsContent value="mobile" className="mt-4">
            <div className="flex justify-center">
              <div className="border-foreground/80 bg-background w-[375px] overflow-hidden rounded-[2.5rem] border-[8px] shadow-xl">
                <div className="bg-muted/50 flex items-center justify-between px-6 py-2">
                  <span className="text-[10px] font-medium">9:41</span>
                  <div className="flex items-center gap-1">
                    <div className="border-foreground/30 size-3 rounded-full border" />
                    <div className="border-foreground/30 h-2 w-4 rounded-sm border" />
                  </div>
                </div>
                <div className="border-b px-4 py-3">
                  <p className="text-muted-foreground text-xs">ブログ</p>
                </div>
                <div className="max-h-[480px] overflow-auto p-4">
                  <PreviewThumbnail
                    thumbnailUrl={article?.thumbnailUrl}
                    sizes="343px"
                    className="mb-4"
                    iconClassName="size-8"
                  />
                  <PreviewCategoryBadge
                    categoryName={article?.categoryName}
                    className="mb-2 text-[10px]"
                  />
                  <p className="mb-3 text-sm font-bold">{article?.title}</p>
                  {body ? (
                    <BlogBodyViewer
                      html={body}
                      className="text-muted-foreground [&_.ql-editor]:text-xs"
                    />
                  ) : (
                    <div className="text-muted-foreground text-xs leading-relaxed">
                      <p>記事の本文がここに表示されます...</p>
                    </div>
                  )}
                  <p className="text-muted-foreground mt-3 text-[10px]">{publishedAt}</p>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground mt-4 text-center text-xs">
              ※ 実際のアプリ表示と異なる場合があります
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
