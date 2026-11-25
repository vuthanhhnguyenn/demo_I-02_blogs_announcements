import type {
  GetCrmNoticesByIdResponse,
  GetCrmNoticesData,
  GetCrmNoticesResponse,
} from '@/lib/api/types.gen';

/*
 * List types shared by the I-02 article lists (ブログ / お知らせ), specs/announcement-list research R1.
 * Both read `GET /crm/notices`; the blog route owns them and `/announcements` imports them.
 */

/** Query of `GET /crm/notices` (mirrors the real `/admin/notices`, blog-list research R1). */
export type NoticeQuery = NonNullable<GetCrmNoticesData['query']>;

/** One list row (`NoticeDto` + mock gap fields, blog-list data-model.md). */
export type NoticeRow = GetCrmNoticesResponse['items'][number];

export type NoticeType = NonNullable<NoticeQuery['type']>;
export type NoticeBrandScope = NoticeRow['brandScope'];
export type NoticeBrandCode = NonNullable<NoticeRow['brandCode']>;
export type NoticeChannel = NonNullable<NoticeQuery['channel']>;
export type NoticeSortKey = NonNullable<NoticeQuery['sort']>;
export type NoticeSortOrder = NonNullable<NoticeQuery['order']>;
export type NoticeWpSyncStatus = NonNullable<NoticeRow['wordpressSync']>['status'];

/** UI status: the 4 publish states + 削除済み (blog-list data-model.md "Derived display status"). */
export type NoticeDisplayStatus = NonNullable<NoticeQuery['publishStatus']>;

/** Detail of one article (`NoticeDetailDto` + mock gap fields, specs/blog-detail data-model.md). */
export type NoticeDetail = GetCrmNoticesByIdResponse;
