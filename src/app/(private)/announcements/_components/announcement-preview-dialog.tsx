'use client';
// Client component: controlled Dialog + interactive Tabs (PC / モバイル) and the body query.
import { BlogBodyViewer } from '@/app/(private)/blogs/_components/blog-body-viewer';
import type { NoticeRow } from '@/app/(private)/blogs/_types/notice.type';
import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { formatDateYYYYMMDD, formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { useQuery } from '@tanstack/react-query';
import { Monitor, RefreshCcw, Smartphone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { getCrmNoticesByIdOptions } from '@/lib/api/@tanstack/react-query.gen';

import { ANNOUNCEMENT_PREVIEW_URL_BASE } from '../_constants/announcement.constants';

interface AnnouncementPreviewDialogProps {
  /** Row to preview; null closes the dialog. */
  row: Pick<NoticeRow, 'id' | 'title' | 'publishStartAt'> | null;
  /** Body already loaded (detail screen): no fetch. Omitted → loaded from the detail endpoint. */
  body?: string;
  /** `list` = date + time on both tabs; `detail` = PC "YYYY/MM/DD 公開", mobile "YYYY/MM/DD". */
  dateFormat?: 'list' | 'detail';
  /** Form preview: shown while the title is empty (announcement-form.tsx L595). */
  titlePlaceholder?: string;
  /** Form preview: shown while the given body is empty (announcement-form.tsx L597). */
  bodyPlaceholder?: string;
  onOpenChange: (open: boolean) => void;
}

/**
 * Body of the article. List rows carry no body (real DTO), so it loads from the detail endpoint
 * while the dialog is open (research R6); the header store is sent as `storeId` like the detail.
 */
function FetchedPreviewBody({ id, className }: { id: string; className: string }) {
  const { currentStoreId } = useCurrentStore();
  const query = currentStoreId === ALL_STORES ? undefined : { storeId: currentStoreId };
  const { data, isLoading, isError, refetch } = useQuery(
    getCrmNoticesByIdOptions({ path: { id }, query }),
  );

  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-destructive text-xs">本文の取得に失敗しました</p>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-xs"
          onClick={() => void refetch()}
        >
          <RefreshCcw className="size-3" />
          再試行する
        </Button>
      </div>
    );
  }

  return <BlogBodyViewer html={data.body} className={className} />;
}

/** Given body (detail) or one loaded on open (list). */
function PreviewBody({
  id,
  body,
  placeholder,
  className,
  placeholderClassName,
}: {
  id: string;
  body: string | undefined;
  placeholder: string | undefined;
  /** Classes for the Quill viewer (`[&_.ql-editor]:…`). */
  className: string;
  /** Classes for the plain placeholder text (prototype announcement-form.tsx L596-L597, L624-L626). */
  placeholderClassName: string;
}) {
  if (body === undefined) return <FetchedPreviewBody id={id} className={className} />;
  if (!body && placeholder) return <p className={placeholderClassName}>{placeholder}</p>;
  return <BlogBodyViewer html={body} className={className} />;
}

/** "YYYY/MM/DD 公開" (detail PC, prototype announcement-detail.tsx L692); "未公開" when unset. */
function formatDetailPublishedAt(publishStartAt: string | null | undefined) {
  const date = formatDateYYYYMMDD(publishStartAt, '');
  return date ? `${date} 公開` : '未公開';
}

/**
 * プレビュー: PC browser frame and 375px phone frame (list: announcement-list.tsx L901-L976;
 * detail: announcement-detail.tsx L653-L733).
 */
export function AnnouncementPreviewDialog({
  row,
  onOpenChange,
  body,
  dateFormat = 'list',
  titlePlaceholder,
  bodyPlaceholder,
}: AnnouncementPreviewDialogProps) {
  const title = row?.title || titlePlaceholder;
  const isDetail = dateFormat === 'detail';
  const pcDate = isDetail
    ? formatDetailPublishedAt(row?.publishStartAt)
    : formatDateYYYYMMDD_HHMM(row?.publishStartAt, '未公開');
  const mobileDate = isDetail
    ? formatDateYYYYMMDD(row?.publishStartAt, '未公開')
    : formatDateYYYYMMDD_HHMM(row?.publishStartAt, '未公開');

  return (
    <Dialog open={row !== null} onOpenChange={onOpenChange}>
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
                      {ANNOUNCEMENT_PREVIEW_URL_BASE}
                      {row?.id}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-8">
                <div className="mx-auto max-w-[720px]">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">{pcDate}</span>
                  </div>
                  <h3 className="mb-4 text-lg font-bold">{title}</h3>
                  {row && (
                    <PreviewBody
                      id={row.id}
                      body={body}
                      placeholder={bodyPlaceholder}
                      className="[&_.ql-editor]:text-sm"
                      placeholderClassName="text-sm leading-relaxed"
                    />
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
                  <p className="text-muted-foreground text-xs">お知らせ</p>
                </div>
                <div className="max-h-[480px] overflow-auto p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-muted-foreground text-[10px]">{mobileDate}</span>
                  </div>
                  <p className="mb-3 text-sm font-bold">{title}</p>
                  {row && (
                    <PreviewBody
                      id={row.id}
                      body={body}
                      placeholder={bodyPlaceholder}
                      className="[&_.ql-editor]:text-muted-foreground [&_.ql-editor]:text-xs"
                      placeholderClassName="text-muted-foreground text-xs leading-relaxed"
                    />
                  )}
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
